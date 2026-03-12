/**
 * lib/email.ts
 * Email service powered by Brevo (formerly Sendinblue) REST API.
 *
 * Provides:
 * - OTP verification emails
 * - Status update notifications
 * - Resolution confirmation emails
 * - Generic transactional email sending
 *
 * All emails use a consistent template with government branding.
 * Uses Brevo's SMTP transactional email API directly via fetch.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@samadhan.gov.in';
const FROM_NAME = process.env.BREVO_FROM_NAME || 'Samadhan AI';
const APP_NAME = 'Samadhan AI';
const APP_TAGLINE = 'National Grievance Redressal Platform';

// ---------------------------------------------------------------------------
// Email templates (HTML)
// ---------------------------------------------------------------------------

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf7f0;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #d97706;">
      <h1 style="margin:0;color:#92400e;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
        ${APP_NAME}
      </h1>
      <p style="margin:4px 0 0;color:#78716c;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
        ${APP_TAGLINE}
      </p>
    </div>

    <!-- Content -->
    <div style="padding:32px 0;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e7e5e4;padding:20px 0;text-align:center;">
      <p style="margin:0;color:#a8a29e;font-size:11px;">
        This is an automated message from ${APP_NAME}. Please do not reply directly.
      </p>
      <p style="margin:8px 0 0;color:#a8a29e;font-size:11px;">
        Government of India — National Grievance Portal
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Send functions
// ---------------------------------------------------------------------------

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[EMAIL] Missing BREVO_API_KEY');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      }),
    });

    const data = await response.json() as { messageId?: string; message?: string };

    if (!response.ok) {
      console.error('[EMAIL] Brevo API error:', data);
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    console.log(`[EMAIL] ✅ Sent to ${options.to}: ${options.subject} (messageId: ${data.messageId || 'n/a'})`);
    return { success: true, id: data.messageId };
  } catch (err) {
    console.error('[EMAIL] Exception:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// OTP Verification Email
// ---------------------------------------------------------------------------

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: 'registration' | 'login' | 'phone_change' = 'registration'
): Promise<{ success: boolean; error?: string }> {
  const purposeLabels = {
    registration: 'complete your registration',
    login: 'log in to your account',
    phone_change: 'verify your new phone number',
  };

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Verify Your Identity</h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;">
      Use the verification code below to ${purposeLabels[purpose]}:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:16px 40px;background:#fef3c7;border:2px solid #d97706;border-radius:12px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#92400e;">${code}</span>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;">
      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
      If you did not request this code, please ignore this email.
    </p>
  `);

  return sendEmail({
    to,
    subject: `${APP_NAME} — Verification Code: ${code}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Grievance Status Update Email
// ---------------------------------------------------------------------------

export async function sendStatusUpdateEmail(
  to: string,
  complaintId: string,
  newStatus: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    triage: '#3b82f6',
    in_progress: '#8b5cf6',
    resolved: '#10b981',
    closed: '#6b7280',
    escalated: '#ef4444',
  };

  const color = statusColors[newStatus] || '#6b7280';
  const statusLabel = newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Grievance Update</h2>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
        Tracking ID
      </p>
      <p style="margin:0;color:#1e293b;font-size:18px;font-weight:700;">${complaintId}</p>
    </div>
    <div style="margin:16px 0;">
      <span style="display:inline-block;padding:6px 16px;background:${color};color:white;border-radius:20px;font-size:13px;font-weight:600;">
        ${statusLabel}
      </span>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:16px 0;">
      ${message}
    </p>
    <p style="color:#64748b;font-size:13px;margin:24px 0 0;">
      Track your grievance anytime by visiting the portal and entering your Tracking ID.
    </p>
  `);

  return sendEmail({
    to,
    subject: `${APP_NAME} — Grievance ${complaintId} Status: ${statusLabel}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Resolution Confirmation Email
// ---------------------------------------------------------------------------

export async function sendResolutionEmail(
  to: string,
  complaintId: string,
  resolutionSummary: string
): Promise<{ success: boolean; error?: string }> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Grievance Resolved ✓</h2>
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#047857;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
        Tracking ID
      </p>
      <p style="margin:0;color:#065f46;font-size:18px;font-weight:700;">${complaintId}</p>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:16px 0;">
      ${resolutionSummary}
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.7;">
      If you feel the issue has not been fully addressed, you may log in to the portal
      and reopen the grievance within 15 days.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <p style="color:#64748b;font-size:13px;">
        Thank you for helping us improve public services.
      </p>
    </div>
  `);

  return sendEmail({
    to,
    subject: `${APP_NAME} — Grievance ${complaintId} Resolved`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Welcome Email (after registration)
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Welcome, ${name}!</h2>
    <p style="color:#475569;font-size:15px;line-height:1.7;">
      Your account has been successfully created on <strong>${APP_NAME}</strong> — 
      the national grievance redressal platform.
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.7;">
      You can now:
    </p>
    <ul style="color:#475569;font-size:15px;line-height:2;">
      <li>Submit grievances with evidence</li>
      <li>Track your complaints in real time</li>
      <li>Communicate directly with assigned officials via AI chat</li>
      <li>Receive automated updates on resolution progress</li>
    </ul>
    <p style="color:#64748b;font-size:13px;margin:24px 0 0;">
      If you have questions, use the in-app chat or contact the helpdesk.
    </p>
  `);

  return sendEmail({
    to,
    subject: `Welcome to ${APP_NAME} — Your account is ready`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Generic email (for custom messages)
// ---------------------------------------------------------------------------

export async function sendGenericEmail(
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; error?: string }> {
  const html = baseTemplate(bodyHtml);
  return sendEmail({ to, subject: `${APP_NAME} — ${subject}`, html });
}
