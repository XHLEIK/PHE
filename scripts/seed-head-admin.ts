/**
 * Seed script: Create Head Admin with full RBAC fields
 * Usage: npx tsx scripts/seed-head-admin.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:nopass@cluster0.rxtd27k.mongodb.net/samadhan?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;
  const usersCol = db.collection('users');

  const email = process.argv[2] || 'admin@appsc.gov.in';
  const password = process.argv[3] || 'ChangeMe@12345';

  // Check if head_admin already exists
  const existing = await usersCol.findOne({ email });
  if (existing) {
    console.log(`⚠️  User ${email} already exists (role: ${existing.role}). Updating to head_admin with RBAC fields...`);
    await usersCol.updateOne(
      { email },
      {
        $set: {
          role: 'head_admin',
          locationScope: {},
          effectivePermissions: [],
          departments: [],
          mustRotatePassword: false,
          isActive: true,
          isLocked: false,
          failedLoginAttempts: 0,
        },
      }
    );
    console.log(`✅ Updated ${email} to head_admin`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await usersCol.insertOne({
      name: 'Head Administrator',
      email,
      passwordHash,
      role: 'head_admin',
      departments: [],
      locationScope: {},
      effectivePermissions: [],
      mustRotatePassword: true,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      lastLoginIP: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Created head_admin: ${email} (password: ${password})`);
    console.log('⚠️  User will be prompted to change password on first login.');
  }

  await mongoose.disconnect();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
