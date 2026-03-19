/*
 * PHE complaint migration script
 *
 * Purpose:
 * 1) Convert legacy complaint IDs to AP-PHE-YYYY-NNNNNN format
 * 2) Preserve old IDs in legacyIds[]
 * 3) Normalize department values to PHE department IDs
 * 4) Report ambiguous/unmapped records for manual review
 * 5) Ensure required indexes exist
 *
 * Usage:
 *   node scripts/migrate_phe_complaints.js --dry-run
 *   node scripts/migrate_phe_complaints.js --execute
 *
 * Env:
 *   MONGODB_URI=<mongodb-uri>
 */

const mongoose = require('mongoose');

const PHE_PREFIX = 'AP-PHE';
const PHE_TRACKING_REGEX = /^AP-PHE-(\d{4})-(\d{6})$/;
const LEGACY_GRV_REGEX = /^GRV-([A-Z]{2})-([A-Z]{3})-(\d{4})-(\d{6})$/;
const DEFAULT_TARGET_DEPARTMENT = 'complaint_cell';

// Canonical PHE departments
const PHE_DEPARTMENT_IDS = new Set([
  'water_supply_operations',
  'water_treatment_quality',
  'pipeline_maintenance',
  'project_construction',
  'rural_water_supply',
  'urban_water_supply',
  'complaint_cell',
  'technical_engineering',
  'monitoring_inspection',
  'it_digital_systems',
]);

// Legacy department mapping to canonical PHE department IDs
const LEGACY_DEPARTMENT_MAP = {
  // legacy generic / intake buckets
  unassigned: 'complaint_cell',
  pending_ai: 'complaint_cell',
  phe: 'complaint_cell',
  phe_ws: 'complaint_cell',
  'public health engineering': 'complaint_cell',
  'complaint cell': 'complaint_cell',

  // water-domain aliases
  water: 'water_supply_operations',
  'water supply': 'water_supply_operations',
  'water dept': 'water_supply_operations',
  water_resources: 'water_supply_operations',
  'water resources': 'water_supply_operations',

  // likely infrastructure aliases
  pipeline: 'pipeline_maintenance',
  maintenance: 'pipeline_maintenance',
  'pipeline maintenance': 'pipeline_maintenance',

  // IT aliases
  it: 'it_digital_systems',
  'digital systems': 'it_digital_systems',
};

function normalizeDepartment(value) {
  if (!value || typeof value !== 'string') return { mapped: DEFAULT_TARGET_DEPARTMENT, ambiguous: true };
  const raw = value.trim();
  const key = raw.toLowerCase();

  if (PHE_DEPARTMENT_IDS.has(key)) {
    return { mapped: key, ambiguous: false };
  }

  if (LEGACY_DEPARTMENT_MAP[key]) {
    return { mapped: LEGACY_DEPARTMENT_MAP[key], ambiguous: false };
  }

  return { mapped: DEFAULT_TARGET_DEPARTMENT, ambiguous: true };
}

function buildPheId(year, seq) {
  return `${PHE_PREFIX}-${year}-${String(seq).padStart(6, '0')}`;
}

async function ensureIndexes(Complaint, dryRun) {
  const specs = [
    { key: { complaintId: 1 }, opts: { unique: true, name: 'complaintId_1' } },
    { key: { department: 1, complaintId: 1 }, opts: { unique: true, name: 'department_1_complaintId_1' } },
    { key: { legacyIds: 1 }, opts: { sparse: true, name: 'legacyIds_1' } },
  ];

  const existing = await Complaint.collection.indexes();
  const existingNames = new Set(existing.map((i) => i.name));

  for (const spec of specs) {
    if (existingNames.has(spec.opts.name)) continue;

    if (dryRun) {
      console.log(`  [DRY-RUN] Would create index: ${spec.opts.name}`);
    } else {
      await Complaint.collection.createIndex(spec.key, spec.opts);
      console.log(`  [INDEX] Created: ${spec.opts.name}`);
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
  }

  console.log(dryRun ? '🔍 Running in DRY-RUN mode' : '🚀 Running in EXECUTE mode');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });

  const Complaint = mongoose.connection.collection('complaints');
  const Counter = mongoose.connection.collection('counters');

  try {
    const docs = await Complaint.find({}).project({
      _id: 1,
      complaintId: 1,
      legacyIds: 1,
      department: 1,
      createdAt: 1,
    }).toArray();

    console.log(`📋 Found ${docs.length} complaint(s)`);

    // Build current max sequence by year from existing AP-PHE IDs
    const yearlyMaxSeq = new Map();
    for (const d of docs) {
      const id = d.complaintId;
      if (typeof id !== 'string') continue;
      const m = id.match(PHE_TRACKING_REGEX);
      if (!m) continue;
      const year = Number(m[1]);
      const seq = Number(m[2]);
      yearlyMaxSeq.set(year, Math.max(yearlyMaxSeq.get(year) || 0, seq));
    }

    // Prepare result collections
    const bulkOps = [];
    const ambiguousRecords = [];

    let convertedIds = 0;
    let normalizedDepartments = 0;
    let noChange = 0;

    for (const d of docs) {
      const update = {};
      const legacyIds = Array.isArray(d.legacyIds) ? [...new Set(d.legacyIds.filter(Boolean))] : [];

      // Department normalization
      const dep = normalizeDepartment(d.department);
      if (dep.mapped !== d.department) {
        update.department = dep.mapped;
        normalizedDepartments += 1;
      }

      // complaintId migration
      const currentId = typeof d.complaintId === 'string' ? d.complaintId : '';
      const isPhe = PHE_TRACKING_REGEX.test(currentId);

      if (!isPhe) {
        const date = d.createdAt ? new Date(d.createdAt) : new Date();
        const year = Number.isFinite(date.getUTCFullYear()) ? date.getUTCFullYear() : new Date().getUTCFullYear();
        const nextSeq = (yearlyMaxSeq.get(year) || 0) + 1;
        yearlyMaxSeq.set(year, nextSeq);

        const nextId = buildPheId(year, nextSeq);

        if (currentId && !legacyIds.includes(currentId)) {
          legacyIds.push(currentId);
        }

        update.complaintId = nextId;
        update.legacyIds = legacyIds;
        convertedIds += 1;

        if (!LEGACY_GRV_REGEX.test(currentId)) {
          ambiguousRecords.push({
            _id: String(d._id),
            complaintId: currentId,
            reason: 'non_standard_tracking_format',
          });
        }
      } else if (legacyIds.length !== (d.legacyIds || []).length) {
        update.legacyIds = legacyIds;
      }

      if (dep.ambiguous) {
        ambiguousRecords.push({
          _id: String(d._id),
          complaintId: currentId,
          department: d.department,
          mappedDepartment: dep.mapped,
          reason: 'ambiguous_department_mapping',
        });
      }

      if (Object.keys(update).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: d._id },
            update: { $set: update },
          },
        });
      } else {
        noChange += 1;
      }
    }

    console.log('\n📊 Migration plan');
    console.log(`  - complaintId conversions: ${convertedIds}`);
    console.log(`  - department normalizations: ${normalizedDepartments}`);
    console.log(`  - unchanged records: ${noChange}`);
    console.log(`  - ambiguous records: ${ambiguousRecords.length}`);

    if (ambiguousRecords.length > 0) {
      console.log('\n⚠️ Ambiguous records (manual review needed):');
      for (const rec of ambiguousRecords.slice(0, 200)) {
        console.log(`  - ${JSON.stringify(rec)}`);
      }
      if (ambiguousRecords.length > 200) {
        console.log(`  ... and ${ambiguousRecords.length - 200} more`);
      }
    }

    if (dryRun) {
      console.log(`\n[DRY-RUN] Would apply ${bulkOps.length} update operation(s)`);
    } else if (bulkOps.length > 0) {
      const result = await Complaint.bulkWrite(bulkOps, { ordered: false });
      console.log('\n✅ Bulk update applied');
      console.log(`  - modifiedCount: ${result.modifiedCount || 0}`);
      console.log(`  - matchedCount: ${result.matchedCount || 0}`);
    } else {
      console.log('\nℹ️ No updates required');
    }

    // Sync counters to max sequence per year
    if (!dryRun) {
      for (const [year, maxSeq] of yearlyMaxSeq.entries()) {
        await Counter.updateOne(
          { _id: `${PHE_PREFIX}-${year}` },
          { $max: { seq: maxSeq } },
          { upsert: true }
        );
      }
      console.log('✅ Counter sync complete');
    } else {
      for (const [year, maxSeq] of yearlyMaxSeq.entries()) {
        console.log(`  [DRY-RUN] Would sync counter ${PHE_PREFIX}-${year} to seq=${maxSeq}`);
      }
    }

    // Index checks / creation
    const ComplaintModel = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false }), 'complaints');
    await ensureIndexes(ComplaintModel, dryRun);

    console.log('\n✅ Migration completed');
    console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
