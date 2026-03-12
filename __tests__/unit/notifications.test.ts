/**
 * Unit tests — Notification Services
 * Tests citizen notification service with mocked DB and email.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({ default: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendStatusUpdateEmail: vi.fn().mockResolvedValue({ success: true }),
  sendResolutionEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const mockCreate = vi.fn().mockResolvedValue({ _id: 'notif-1' });
const mockFindById = vi.fn();

vi.mock('@/lib/models/CitizenNotification', () => ({
  default: { create: (...args: any[]) => mockCreate(...args) },
}));

vi.mock('@/lib/models/Complaint', () => ({
  default: {
    findById: (...args: any[]) => ({
      lean: () => mockFindById(...args),
    }),
  },
}));

import { createCitizenNotification, notifyCitizenOnStatusChange } from '@/lib/citizen-notification-service';
import { sendStatusUpdateEmail, sendResolutionEmail } from '@/lib/email';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createCitizenNotification
// ---------------------------------------------------------------------------
describe('createCitizenNotification', () => {
  it('creates a notification in the database', async () => {
    const result = await createCitizenNotification({
      citizenId: 'cit-1',
      citizenEmail: 'citizen@test.com',
      type: 'status_change',
      title: 'Status Updated',
      message: 'Your complaint status changed.',
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      citizenId: 'cit-1',
      citizenEmail: 'citizen@test.com',
      type: 'status_change',
    });
    expect(result).not.toBeNull();
  });

  it('returns null on database error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'));

    const result = await createCitizenNotification({
      citizenId: 'cit-1',
      citizenEmail: 'a@b.com',
      type: 'status_change',
      title: 'Test',
      message: 'Test',
    });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// notifyCitizenOnStatusChange
// ---------------------------------------------------------------------------
describe('notifyCitizenOnStatusChange', () => {
  const mockComplaint = {
    _id: 'comp-1',
    citizenId: { toString: () => 'cit-1' },
    submitterEmail: 'citizen@test.com',
  };

  it('creates in-app notification and sends email on status change', async () => {
    mockFindById.mockResolvedValue(mockComplaint);

    await notifyCitizenOnStatusChange(
      'comp-1',
      'GRV-AP-VIS-20260101-0001',
      { status: { from: 'pending', to: 'in_progress' } }
    );

    // Should create in-app notification
    expect(mockCreate).toHaveBeenCalled();
    const notification = mockCreate.mock.calls[0][0];
    expect(notification.type).toBe('status_change');
    expect(notification.title).toContain('In Progress');

    // Should send status update email
    expect(sendStatusUpdateEmail).toHaveBeenCalledWith(
      'citizen@test.com',
      'GRV-AP-VIS-20260101-0001',
      'in_progress',
      expect.stringContaining('Pending Review')
    );
  });

  it('sends resolution email when status changes to resolved', async () => {
    mockFindById.mockResolvedValue(mockComplaint);

    await notifyCitizenOnStatusChange(
      'comp-1',
      'GRV-KA-BLR-20260101-0005',
      { status: { from: 'in_progress', to: 'resolved' } },
      { resolutionNote: 'Fixed the road.' }
    );

    // Should create resolved notification
    const notification = mockCreate.mock.calls[0][0];
    expect(notification.type).toBe('resolved');

    // Should send resolution email (not status update email)
    expect(sendResolutionEmail).toHaveBeenCalledWith(
      'citizen@test.com',
      'GRV-KA-BLR-20260101-0005',
      'Fixed the road.'
    );
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it('creates department_assigned notification', async () => {
    mockFindById.mockResolvedValue(mockComplaint);

    await notifyCitizenOnStatusChange(
      'comp-1',
      'GRV-XX-001',
      { department: { from: null, to: 'Revenue' } }
    );

    const notification = mockCreate.mock.calls[0][0];
    expect(notification.type).toBe('department_assigned');
    expect(notification.message).toContain('Revenue');
  });

  it('creates priority_change notification', async () => {
    mockFindById.mockResolvedValue(mockComplaint);

    await notifyCitizenOnStatusChange(
      'comp-1',
      'GRV-XX-002',
      { priority: { from: 'medium', to: 'critical' } }
    );

    const notification = mockCreate.mock.calls[0][0];
    expect(notification.type).toBe('priority_change');
    expect(notification.message).toContain('CRITICAL');
  });

  it('skips notifications for anonymous complaints', async () => {
    mockFindById.mockResolvedValue({ _id: 'comp-1', citizenId: null, submitterEmail: null });

    await notifyCitizenOnStatusChange(
      'comp-1',
      'GRV-XX-003',
      { status: { from: 'pending', to: 'resolved' } }
    );

    expect(mockCreate).not.toHaveBeenCalled();
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it('handles missing complaint gracefully', async () => {
    mockFindById.mockResolvedValue(null);

    // Should not throw
    await notifyCitizenOnStatusChange(
      'nonexistent',
      'GRV-XX-999',
      { status: { from: 'pending', to: 'resolved' } }
    );

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
