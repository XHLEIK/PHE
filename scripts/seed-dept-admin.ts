/**
 * seed-dept-admin.ts  —  DEV ONLY
 * Creates a department_admin user for testing role-based access.
 *
 * ⚠  This script will NOT run in production (NODE_ENV must be 'development').
 *
 * Run: npm run seed:dept-admin
 *
 * Required env vars (set in .env.local or export before running):
 *   MONGODB_URI
 *   SEED_DEPT_ADMIN_EMAIL
 *   SEED_DEPT_ADMIN_PASSWORD     (min 8 chars)
 *   SEED_DEPT_ADMIN_NAME         (optional, defaults to "Department Admin")
 *   SEED_DEPT_ADMIN_DEPARTMENTS  (comma-separated department IDs e.g. "pwd,health")
 *
 * Seeding order: seed:departments → seed:admin → seed:dept-admin
 */
import mongoose from 'mongoose';

async function main() {
  // ---- Safety guard: dev only ----
  const env = process.env.NODE_ENV;
  if (env && env !== 'development') {
    console.error(`❌  This script only runs in development. NODE_ENV is "${env}".`);
    process.exit(1);
  }
  if (!env) {
    console.warn('⚠️  NODE_ENV is not set — assuming development. Do NOT run this in production.\n');
  }

  const uri = process.env.MONGODB_URI;
  const email = process.env.SEED_DEPT_ADMIN_EMAIL;
  const password = process.env.SEED_DEPT_ADMIN_PASSWORD;
  const name = process.env.SEED_DEPT_ADMIN_NAME || 'Department Admin';
  const deptEnv = process.env.SEED_DEPT_ADMIN_DEPARTMENTS;

  if (!uri || !email || !password || !deptEnv) {
    console.error(
      '❌  Missing required environment variables.\n' +
      '    Required: MONGODB_URI, SEED_DEPT_ADMIN_EMAIL, SEED_DEPT_ADMIN_PASSWORD, SEED_DEPT_ADMIN_DEPARTMENTS\n' +
      '\n    Example (PowerShell):\n' +
      '    $env:MONGODB_URI="mongodb+srv://..."\n' +
      '    $env:SEED_DEPT_ADMIN_EMAIL="pwd.admin@gov.in"\n' +
      '    $env:SEED_DEPT_ADMIN_PASSWORD="ChangeMe@1234"\n' +
      '    $env:SEED_DEPT_ADMIN_DEPARTMENTS="pwd,transport"\n' +
      '    npm run seed:dept-admin'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌  SEED_DEPT_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const departments = deptEnv.split(',').map(d => d.trim()).filter(Boolean);
  if (departments.length === 0) {
    console.error('❌  SEED_DEPT_ADMIN_DEPARTMENTS must contain at least one department ID.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  console.log('✅ Connected.\n');

  const { default: User } = await import('../lib/models/User');
  const { hashPassword } = await import('../lib/auth');

  const passwordHash = await hashPassword(password);

  const result = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        name,
        role: 'department_admin',
        departments,
        mustRotatePassword: true,
        isSeeded: true,
        isLocked: false,
        failedLoginAttempts: 0,
        createdBy: 'seed-dept-admin-script',
        passwordHash,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`✅ Department admin seeded:`);
  console.log(`   Email:       ${result.email}`);
  console.log(`   Role:        ${result.role}`);
  console.log(`   Departments: ${result.departments.join(', ')}`);
  console.log(`   Name:        ${result.name}`);
  console.log('\n⚠️  User must change password on first login (mustRotatePassword=true).');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
