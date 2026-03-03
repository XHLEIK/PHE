/**
 * seed-departments.ts
 * Upserts all department entries from constants.ts into MongoDB.
 * Run: npm run seed:departments
 *
 * Must be run BEFORE seed:admin and seed:dept-admin
 * Environment variables required: MONGODB_URI
 */
import mongoose from 'mongoose';
import { DEPARTMENTS } from '../lib/constants';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  console.log('✅ Connected.\n');

  // Import model AFTER connection so mongoose is ready
  const { default: Department } = await import('../lib/models/Department');

  let created = 0;
  let updated = 0;

  for (const dept of DEPARTMENTS) {
    const result = await Department.findOneAndUpdate(
      { id: dept.id },
      {
        $setOnInsert: { id: dept.id },
        $set: {
          label: dept.label,
          description: dept.description,
          subcategories: dept.subcategories,
          sla_days: dept.sla_days,
          escalation_level: dept.escalation_level,
          active: dept.active,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
      created++;
      console.log(`  ✨ Created:  ${dept.id} — ${dept.label}`);
    } else {
      updated++;
      console.log(`  🔄 Updated:  ${dept.id} — ${dept.label}`);
    }
  }

  console.log(`\n📊 Done. ${created} created, ${updated} updated. Total: ${DEPARTMENTS.length} departments.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
