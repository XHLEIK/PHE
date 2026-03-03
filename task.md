TASK: Update Complaint UI + Redesign Admin Dashboard + Backend behaviors (no code in this prompt)

Project context: This is a state-level grievance system (not just IT helpdesk). The complaint intake form must collect basic contact details, store complaints in the database, and admins must be able to review and manage complaints. The system must automatically analyze incoming complaints (classification + short summary) using the Gemini 2.5 Flash API (free tier) and persist analysis results. Admin users are department-scoped (department admins see only their department complaints) and a root/head admin can see everything.

Important constraints for the agent:
• Do not commit any secret values into the repo. API keys and credentials must be read from environment variables or secret store.
• Do not leave demo or dummy data enabled in production. Any dev fixtures must be gated behind an explicit dev-mode.
• Maintain accessibility, security, and professional state-gov grade UI standards.
• No low-quality UX: make everything clear for diverse citizens.

PHASE A — Frontend complaint page changes (candidate-facing)

Form fields

Add three new input fields to the candidate complaint page: Name, Phone number, Email. These fields must be required and validated on the frontend:

Name: non-empty, reasonable length limit (e.g., 3–100 chars).

Phone: valid national phone format (+91 optional), length and numeric validation.

Email: standard email validation.

Save these three contact fields with every complaint record in the database (stored server-side).

Remove elements

Remove the AI Analysis button from the candidate form UI.

Remove visible Category dropdown and Priority dropdown from the candidate form UI. (These will now be assigned automatically by backend AI.)

Location

Keep the Incident Location field visible.

Add a “Use my current location” button next to the location field.

When the user clicks it, request browser geolocation permission and capture latitude/longitude.

Show a short human-readable approximate address (reverse-geocoded if possible) in the location input, but store coordinates as the authoritative location in the DB.

If the browser denies permission, gracefully fallback to manual location entry and show clear guidance for the user.

UI polish

Make the whole candidate form more professional, accessible and visually aligned with state-level UI:

Clean, calm color palette (soft beige/ivory background, deep-gold accents, high-contrast labels).

Larger readable fonts, clear required field indicators, consistent spacing, rounded cards.

Accessible labels, aria attributes, keyboard friendly.

Mobile-responsive, fields stacked vertically on small screens.

Ensure error messages are friendly and actionable (e.g., “Enter a valid phone number so we can reach you about your complaint”).

UX flow

On form submit, show a clear acknowledgement: complaint received + complaint ID.

Do not block user while backend AI processes the complaint — immediately acknowledge and queue analysis.

PHASE B — Backend behaviour (functional description only, no routes or code)

Persist contact info

Every complaint stored must include: title, description, name, phone, email, incident_location (coordinates + optional text), attachments metadata, timestamps, and a status field.

Automatic analysis

After persistence, every complaint is automatically queued for AI analysis.

The AI analysis must produce at least:

a single category (one of the departments / subcategory),

a priority score (Low / Medium / High),

a short human-friendly summary (1–3 sentences) suitable for admin triage,

a confidence score for category/priority.

Use Gemini 2.5 Flash (free tier) as the primary analysis engine, calling it via a secure, monitored integration. The agent must:

Read the Gemini API key from a secure env variable.

Implement timeouts and retry rules.

Implement a circuit-breaker/fallback: if Gemini is unavailable, fall back to a local lightweight model or enqueue for later re-analysis and mark analysis_status=deferred.

Store the analysis results along with the complaint record (category, priority, summary, model version, confidence, prompt hash) and mark analyzed_at.

Audit & immutability

Every automatic or manual change to a complaint (status changes, assignment changes, analysis results, admin overrides) must create an append-only audit record with timestamp, actor (system or admin id), and a hash that links to the complaint for later tamper-detection.

Department list & mapping

Replace current department values with the provided comprehensive department list (primary departments and optional advanced categories). Each category must map to a canonical department id/name. This mapping must live in the database so admins can edit or add sub-departments later via Settings.

Primary departments to include (exact list to add):

Public Works Department (PWD) — roads, bridges, government buildings, drainage, street infrastructure

Water Resources / Jal Shakti Department — drinking water supply, pipelines, borewells, irrigation, scarcity

Food & Civil Supplies Department — ration cards, PDS, rice/wheat supply, FPS complaints, duplicate deductions

Electricity / Power Department — power cuts, billing errors, transformers, new connections, voltage

Health & Family Welfare — hospitals, staff issues, medicine shortages, ambulances, PHC

Education Department — schools, teachers, scholarships, exams, colleges

Agriculture Department — crop insurance, subsidies, seeds/fertilizers, compensation, MSP

Revenue Department — land records, mutation, certificates, property disputes

Municipal / Urban Development — garbage, sewerage, streetlights, encroachment, permits

Rural Development / Panchayati Raj — village roads, rural water, housing schemes, MGNREGA

Transport Department — licenses, registrations, permits

Social Welfare Department — pensions, widow/disability benefits

Women & Child Development — anganwadi, child welfare, safety programs

Police / Home Department — FIR delays, local policing, public safety

Labour Department — wages, factory issues, worker rights

Optional advanced categories (configurable): Environment & Forest, Housing Board, Mining, Tourism, IT & E-Governance, Minority Affairs, Skill Development

Admin creation & access control

In Settings, admins can create new admin accounts. The agent must implement the following behavior (conceptual):

Each admin is assigned to either:

root/head role (sees all complaints), or

department-admin role tied to one or more specific departments (sees only complaints assigned to their department(s)).

Department-admins must only be able to view, comment, change status, and escalate complaints assigned to their department(s).

Root admins can manage departments, create/disable admins, and see all complaints.

All admin creation events are audited (who created whom, timestamps).

Enforce strong password hashing, account lockout on repeated failed logins, and first-login password rotation for seeded test accounts.

Admin UI behaviour

The admin dashboard list view must display all complaints (paginated), including the AI-assigned category and summary once analysis completes.

When an admin clicks a complaint, the complaint detail view must show:

Full complaint text

Contact info (name/phone/email; sensitive info must be masked for department-admins if policy requires)

Incident location (coordinates + map preview if available)

Attachments (signed download links)

AI summary, assigned category, priority and confidence score

Full audit trail for the complaint

Buttons for status updates, assignment, and escalation (depending on admin role)

Department-admins can only see the complaints that match their department mapping (or that they have been explicitly assigned).

Settings changes

In Settings, replace any “junior IT” role with department-specific admin roles and the head/root admin role. Settings must allow:

Creating department-admins (assign departments)

Editing department metadata (name, SLA days, active/inactive)

Viewing audit logs for admin changes

Privacy & security (non-negotiable reminders)

Read API keys and credentials from env/secret store only.

Hash passwords securely (bcrypt/argon2) and never return passwords via API or logs.

Implement per-IP and per-account rate limits for complaint submission and login attempts.

Input validation and sanitization for all fields (length limits, allowed characters, attachment type/size limits).

CORS must only allow trusted origins.

All admin actions must be append-only in the audit log.

Ensure attachments are stored in object storage and provided via time-limited signed URLs.

PHASE C — Dashboard redesign text changes and visuals

Sidebar title & slogan

Change the name in the sidebar header to a formal, state-level product name (example given below) and update the slogan below it.

Example: Samadhan AI — State Grievance Services
Slogan: “Empowering transparent and timely citizen service delivery”

The agent can propose improved naming/wording but the sidebar must reflect a state governance tone (not producty/casual).

Dashboard visuals

Keep the structural layout previously implemented (sidebar, stats cards, real-time feed, system monitor) but refresh visual styling to align with state branding: balanced whitespace, accessible contrast, official typography, and clear CTA coloring for admin actions.

Show AI summary and AI-assigned department prominently in each complaint card once available.

DELIVERABLES (what the agent must produce)

Exact list of UI changes implemented (what files/components modified).

Database schema changes describing exactly what new fields were added to complaint records and admin records (no code, just clear schema description).

Design notes describing the visual changes for the candidate page and dashboard, including accessible color tokens, spacing and responsive behavior.

AI integration design doc: how Gemini 2.5 is used, what env variables are required, fallback behavior, timeouts, and auditing of model outputs (model version, prompt hash, confidence).

Access control design doc: how root vs department-admins are separated; what data each role can see; how to add an admin to a department; how auditing is recorded.

Testing checklist and acceptance criteria (see below).

ACCEPTANCE CRITERIA / TESTS (manual QA steps)

Candidate page

The complaint form now has Name/Phone/Email. Entering valid values and submitting returns a confirmation and creates a complaint in DB with those fields stored.

Using “Use my current location” populates the location field with coordinates or address and stores coordinates in DB.

The AI analysis button, visible category and priority fields no longer appear on the candidate form.

Backend AI analysis

After complaint submission, the system sets analysis_status = queued and processes the complaint. When analysis completes, DB record contains category, priority, summary, confidence, analyzed_at.

If Gemini is down, the system marks analysis_status = deferred and the complaint remains accessible to admins but flagged for later analysis.

Dashboard & complaint details

Admin dashboard list shows all complaints (paginated). Each card shows AI summary and AI-assigned department once analysis completes.

Clicking a complaint opens a detail view with full text, contact fields, location, attachments, AI summary, assigned department, audit trail, and action buttons.

Department-admin user only sees complaints that are assigned to their department(s). Root admin can see all.

Settings & admin creation

An authenticated root admin can create new admins and assign them to one or more departments. New admin accounts are persisted with hashed passwords and the creation action is logged.

Seeded dev admin account (if present) must require password rotation on first login or be documented as a dev-only seeding mechanism and disable in production.

Security checks

No secrets hardcoded anywhere.

Passwords hashed in DB; no passwords returned by any API.

Rate limits enforced on complaint submission and login attempts (test with rapid repeated requests).

Operational checks

All admin actions and complaint state changes create audit entries; audit entries are immutable and include timestamp/actor/action.

Attachments return time-limited download links (if provided).

System logs model version and prompt hash for each AI result.

EXTRA NOTES / UX DETAILS (guidance the agent should follow)

When generating the summary, prefer concise language targeted at human administrators (e.g., “Payment deducted twice for CCE 2025; candidate ID X; requested refund.”) — do not produce long, formal legalese.

Display confidence level visibly; if confidence < 0.6, automatically mark for human verification.

Allow admins to override AI-assigned category/priority; such overrides must be recorded in audit trail along with a short reason.

Department names must be editable by root admins in Settings and any new department must be available for AI-classification mapping.

Provide clear error messages and fallback UX when AI service is unavailable.

FINAL REMARKS (for the agent)

Produce the deliverables listed above before finishing the work; include the acceptance test results.

Keep the UI accessible and professional — this is a state-level service and will be audited.

Use environment variables/secret store for Gemini key, DB credentials, and any other secrets.

Any dev-only data seeding must be clearly documented and gated; do not enable in production.