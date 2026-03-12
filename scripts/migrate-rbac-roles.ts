/**
 * Migration script: Update existing admin users to new RBAC role system.
 * 
 * Maps old roles → new roles:
 *   - head_admin → head_admin (no change, add locationScope)
 *   - department_admin → department_head (level 5)
 *   - staff → officer (level 7)
 * 
 * Also adds locationScope and effectivePermissions fields to all admins.
 * 
 * Usage: npx tsx scripts/migrate-rbac-roles.ts [--dry-run]
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:nopass@cluster0.rxtd27k.mongodb.net/samadhan?retryWrites=true&w=majority';

const ROLE_MIGRATION_MAP: Record<string, string> = {
  head_admin: 'head_admin',
  department_admin: 'department_head',
  staff: 'officer',
};

// Default locationScope for Arunachal Pradesh
const DEFAULT_LOCATION_SCOPE = {
  country: 'India',
  state: 'Arunachal Pradesh',
};

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) console.log('🔍 DRY RUN MODE — no changes will be written\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;
  const usersCol = db.collection('users');

  // Find all admin users (not citizens)
  const adminUsers = await usersCol
    .find({ role: { $in: ['head_admin', 'department_admin', 'staff'] } })
    .toArray();

  console.log(`📋 Found ${adminUsers.length} admin users to migrate\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of adminUsers) {
    const oldRole = user.role;
    const newRole = ROLE_MIGRATION_MAP[oldRole] || oldRole;
    const hasLocationScope = user.locationScope && Object.keys(user.locationScope).length > 0;

    // Skip if already migrated (role is valid new role and has locationScope)
    if (newRole === oldRole && hasLocationScope) {
      console.log(`  ⏭ ${user.email} — already migrated (${oldRole})`);
      skippedCount++;
      continue;
    }

    const updates: Record<string, unknown> = {};

    if (newRole !== oldRole) {
      updates.role = newRole;
    }

    if (!hasLocationScope) {
      // head_admin gets empty scope (global access)
      // Others get state-level scope
      updates.locationScope = newRole === 'head_admin' ? {} : DEFAULT_LOCATION_SCOPE;
    }

    if (!user.effectivePermissions) {
      updates.effectivePermissions = [];
    }

    if (!user.lastLoginIP) {
      updates.lastLoginIP = '';
    }

    console.log(`  🔄 ${user.email}: ${oldRole} → ${newRole}`, hasLocationScope ? '' : '(+ locationScope)');

    if (!isDryRun) {
      await usersCol.updateOne(
        { _id: user._id },
        { $set: updates }
      );
    }

    migratedCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped:  ${skippedCount}`);
  console.log(`   Total:    ${adminUsers.length}`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN — no changes were written. Remove --dry-run to apply.');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
