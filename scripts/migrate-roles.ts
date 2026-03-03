/**
 * Role Migration Script
 *
 * Migrates the database from the old role system to the new 3-role RBAC system:
 * - superadmin → head_admin
 * - admin → staff
 * - department_admin → department_admin (unchanged)
 *
 * Also removes the securityLevel field from all user documents.
 *
 * Specific admins (subhooo224@gmail.com, alsaifi08017@gmail.com) are set to head_admin.
 *
 * Usage:
 *   npx tsx scripts/migrate-roles.ts
 *
 * Required environment variables:
 *   MONGODB_URI — MongoDB connection string
 */

import mongoose from 'mongoose';

const HEAD_ADMIN_EMAILS = [
  'subhooo224@gmail.com',
  'alsaifi08017@gmail.com',
];

async function migrateRoles() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.');

  const db = mongoose.connection.db!;
  const usersCollection = db.collection('users');

  // Step 1: Set specified emails to head_admin
  for (const email of HEAD_ADMIN_EMAILS) {
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: { role: 'head_admin', updatedAt: new Date() },
        $unset: { securityLevel: '' },
      }
    );
    if (result.matchedCount > 0) {
      console.log(`✅ ${email} → head_admin`);
    } else {
      console.log(`⚠️  ${email} not found in database (will be set on next seed/login)`);
    }
  }

  // Step 2: Migrate remaining superadmin → head_admin
  const superadminResult = await usersCollection.updateMany(
    { role: 'superadmin' },
    {
      $set: { role: 'head_admin', updatedAt: new Date() },
      $unset: { securityLevel: '' },
    }
  );
  console.log(`✅ superadmin → head_admin: ${superadminResult.modifiedCount} user(s) migrated`);

  // Step 3: Migrate admin → staff
  const adminResult = await usersCollection.updateMany(
    { role: 'admin' },
    {
      $set: { role: 'staff', updatedAt: new Date() },
      $unset: { securityLevel: '' },
    }
  );
  console.log(`✅ admin → staff: ${adminResult.modifiedCount} user(s) migrated`);

  // Step 4: Clean up securityLevel from department_admin users too
  const deptAdminResult = await usersCollection.updateMany(
    { role: 'department_admin' },
    {
      $unset: { securityLevel: '' },
      $set: { updatedAt: new Date() },
    }
  );
  console.log(`✅ department_admin cleanup (remove securityLevel): ${deptAdminResult.modifiedCount} user(s)`);

  // Step 5: Remove securityLevel from any remaining documents
  const cleanupResult = await usersCollection.updateMany(
    { securityLevel: { $exists: true } },
    { $unset: { securityLevel: '' } }
  );
  console.log(`✅ Final cleanup: removed securityLevel from ${cleanupResult.modifiedCount} remaining document(s)`);

  // Summary
  const allUsers = await usersCollection.find({}).project({ email: 1, role: 1, departments: 1 }).toArray();
  console.log('\n📋 Current user roles:');
  for (const u of allUsers) {
    const depts = (u.departments as string[])?.length ? ` [${(u.departments as string[]).join(', ')}]` : '';
    console.log(`   ${u.email} → ${u.role}${depts}`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
  console.log('✅ Migration complete!');
  process.exit(0);
}

migrateRoles().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
