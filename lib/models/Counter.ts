/**
 * lib/models/Counter.ts
 * Atomic sequential counter for generating collision-safe grievance tracking IDs.
 *
 * Uses MongoDB's findOneAndUpdate with $inc for atomic increment,
 * guaranteeing uniqueness even under concurrent writes.
 *
 * Tracking ID format: GRV-{STATE_CODE}-{DISTRICT_CODE}-{YYYY}-{SEQ_6_DIGITS}
 * Example: GRV-AR-PAP-2026-000012
 *
 * Each counter is scoped to state+district+year so that:
 * - Numbers reset to 1 each year
 * - Different districts have independent sequences
 * - The ID encodes geographic origin
 */

import mongoose, { Schema, Model } from 'mongoose';

export interface ICounter {
  _id: string; // Compound key: e.g., "GRV-AR-PAP-2026"
  seq: number;
  updatedAt: Date;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Disable auto-generation of _id since we provide our own
    _id: false,
  }
);

const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

// ---------------------------------------------------------------------------
// State abbreviation mapping (Indian states + UTs)
// ---------------------------------------------------------------------------
export const STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TS',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  // Union Territories
  'andaman and nicobar islands': 'AN',
  'chandigarh': 'CH',
  'dadra and nagar haveli and daman and diu': 'DD',
  'delhi': 'DL',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
  'lakshadweep': 'LD',
  'puducherry': 'PY',
};

/**
 * Generate a district code from the district name.
 * Takes the first 3 uppercase characters, stripping non-alpha.
 * e.g., "Papum Pare" → "PAP", "East Siang" → "EAS"
 */
export function getDistrictCode(district: string): string {
  const cleaned = district.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.slice(0, 3) || 'GEN';
}

/**
 * Get the 2-letter state code from a state name.
 * Falls back to first 2 characters if not found in mapping.
 */
export function getStateCode(state: string): string {
  const normalized = state.toLowerCase().trim();
  return STATE_CODES[normalized] || state.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2) || 'XX';
}

/**
 * Generate a nationally-unique grievance tracking ID.
 *
 * Format: GRV-{STATE}-{DISTRICT}-{YYYY}-{SEQ_6_DIGITS}
 * Example: GRV-AR-PAP-2026-000012
 *
 * @param state - Full state name (e.g., "Arunachal Pradesh")
 * @param district - District name (e.g., "Papum Pare")
 * @returns The unique tracking ID
 */
export async function generateTrackingId(
  state: string = 'Arunachal Pradesh',
  district: string = 'General'
): Promise<string> {
  const stateCode = getStateCode(state);
  const districtCode = getDistrictCode(district);
  const year = new Date().getFullYear();
  const prefix = `GRV-${stateCode}-${districtCode}-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = counter.seq.toString().padStart(6, '0');
  return `${prefix}-${seq}`;
}

export default Counter;
