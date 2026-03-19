/**
 * Unit tests — Zod Validation Schemas
 * Tests all Zod schemas from lib/validations.ts with valid, invalid, and edge inputs.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  rotatePasswordSchema,
  createAdminSchema,
  createComplaintSchema,
  updateComplaintSchema,
  revealContactSchema,
  complaintQuerySchema,
  citizenRegisterSchema,
  citizenLoginSchema,
  citizenVerifyOtpSchema,
  citizenSendOtpSchema,
  trackComplaintSchema,
} from '@/lib/validations';

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'Admin@Gov.in', password: 'Password123!' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@gov.in'); // trimmed + lowercased
    }
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ password: '12345678' }).success).toBe(false);
  });

  it('rejects excessively long email', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(loginSchema.safeParse({ email: longEmail, password: '12345678' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rotatePasswordSchema
// ---------------------------------------------------------------------------
describe('rotatePasswordSchema', () => {
  it('accepts valid password rotation', () => {
    const result = rotatePasswordSchema.safeParse({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewStrongP@ss1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects new password without uppercase', () => {
    const result = rotatePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'alllowercase1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new password without special char', () => {
    const result = rotatePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'NoSpecialChar1A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new password shorter than 12 chars', () => {
    const result = rotatePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'Short1!aA',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createAdminSchema
// ---------------------------------------------------------------------------
describe('createAdminSchema', () => {
  it('accepts valid admin creation', () => {
    const result = createAdminSchema.safeParse({
      email: 'new@gov.in',
      name: 'Test Admin',
      role: 'department_head',
      departments: ['water_supply_operations'],
      temporaryPassword: 'TempPassword1!AA',
    });
    expect(result.success).toBe(true);
  });

  it('defaults role to citizen_support', () => {
    const result = createAdminSchema.safeParse({
      email: 'staff@gov.in',
      name: 'Staff User',
      temporaryPassword: 'TempPassword1!AA',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('citizen_support');
    }
  });

  it('rejects name with special characters beyond allowed', () => {
    const result = createAdminSchema.safeParse({
      email: 'staff@gov.in',
      name: 'Admin <script>',
      temporaryPassword: 'TempPassword1!AA',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createComplaintSchema
// ---------------------------------------------------------------------------
describe('createComplaintSchema', () => {
  const validComplaint = {
    title: 'Road damage near my house',
    description: 'There is a large pothole on Main Street that is causing traffic problems and vehicle damage.',
    submitterName: 'Ramesh Kumar',
    submitterPhone: '9876543210',
    submitterEmail: 'ramesh@example.com',
  };

  it('accepts valid complaint', () => {
    const result = createComplaintSchema.safeParse(validComplaint);
    expect(result.success).toBe(true);
  });

  it('rejects short title', () => {
    const result = createComplaintSchema.safeParse({ ...validComplaint, title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects short description', () => {
    const result = createComplaintSchema.safeParse({ ...validComplaint, description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone number', () => {
    const result = createComplaintSchema.safeParse({ ...validComplaint, submitterPhone: '12345' });
    expect(result.success).toBe(false);
  });

  it('accepts +91 prefix phone', () => {
    const result = createComplaintSchema.safeParse({ ...validComplaint, submitterPhone: '+919876543210' });
    expect(result.success).toBe(true);
  });

  it('rejects phone starting with 0-5', () => {
    const result = createComplaintSchema.safeParse({ ...validComplaint, submitterPhone: '5876543210' });
    expect(result.success).toBe(false);
  });

  it('defaults attachments to empty array', () => {
    const result = createComplaintSchema.safeParse(validComplaint);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachments).toEqual([]);
    }
  });

  it('rejects more than 5 attachments', () => {
    const sixAttachments = Array(6).fill({
      fileName: 'a.jpg',
      fileType: 'image/jpeg',
      fileSize: 100,
      url: 'https://example.com/a.jpg',
      publicId: 'abc',
    });
    const result = createComplaintSchema.safeParse({ ...validComplaint, attachments: sixAttachments });
    expect(result.success).toBe(false);
  });

  it('accepts valid coordinates', () => {
    const result = createComplaintSchema.safeParse({
      ...validComplaint,
      coordinates: { lat: 28.6139, lng: 77.2090 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    const result = createComplaintSchema.safeParse({
      ...validComplaint,
      coordinates: { lat: 200, lng: 77 },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateComplaintSchema
// ---------------------------------------------------------------------------
describe('updateComplaintSchema', () => {
  it('accepts status update', () => {
    const result = updateComplaintSchema.safeParse({ status: 'in_progress' });
    expect(result.success).toBe(true);
  });

  it('accepts priority update', () => {
    const result = updateComplaintSchema.safeParse({ priority: 'critical' });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields)', () => {
    const result = updateComplaintSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects only reason/comment without actual fields', () => {
    const result = updateComplaintSchema.safeParse({ reason: 'Just because', comment: 'Note' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = updateComplaintSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable assignedTo', () => {
    const result = updateComplaintSchema.safeParse({ assignedTo: null });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// complaintQuerySchema
// ---------------------------------------------------------------------------
describe('complaintQuerySchema', () => {
  it('provides defaults for empty input', () => {
    const result = complaintQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('-createdAt');
    }
  });

  it('coerces string numbers', () => {
    const result = complaintQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limit over 100', () => {
    const result = complaintQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// citizenRegisterSchema
// ---------------------------------------------------------------------------
describe('citizenRegisterSchema', () => {
  const validRegister = {
    name: 'Priya Sharma',
    phone: '9123456789',
    email: 'priya@example.com',
    password: 'SecurePass1',
  };

  it('accepts valid registration', () => {
    const result = citizenRegisterSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = citizenRegisterSchema.safeParse({ ...validRegister, name: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const result = citizenRegisterSchema.safeParse({ ...validRegister, phone: '1234' });
    expect(result.success).toBe(false);
  });

  it('defaults state and district to empty strings', () => {
    const result = citizenRegisterSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('');
      expect(result.data.district).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// citizenVerifyOtpSchema
// ---------------------------------------------------------------------------
describe('citizenVerifyOtpSchema', () => {
  it('accepts valid OTP', () => {
    const result = citizenVerifyOtpSchema.safeParse({ email: 'test@test.com', code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects non-6-digit code', () => {
    expect(citizenVerifyOtpSchema.safeParse({ email: 'test@test.com', code: '12345' }).success).toBe(false);
    expect(citizenVerifyOtpSchema.safeParse({ email: 'test@test.com', code: '1234567' }).success).toBe(false);
    expect(citizenVerifyOtpSchema.safeParse({ email: 'test@test.com', code: 'abcdef' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// trackComplaintSchema
// ---------------------------------------------------------------------------
describe('trackComplaintSchema', () => {
  it('accepts AP-PHE tracking format', () => {
    const result = trackComplaintSchema.safeParse({ complaintId: 'AP-PHE-2026-000001' });
    expect(result.success).toBe(true);
  });

  it('accepts legacy GRV tracking format for backward compatibility', () => {
    const result = trackComplaintSchema.safeParse({ complaintId: 'GRV-AR-PAP-2026-000001' });
    expect(result.success).toBe(true);
  });
});
