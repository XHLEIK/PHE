🏛 FINAL ROLE STRUCTURE (Revised & Locked)

There are exactly three roles:

head_admin

department_admin

staff

All non-head_admin users must have departments[].

🔴 1️⃣ HEAD ADMIN — SYSTEM GOVERNANCE LEVEL
Scope

All departments, all grievances, all admins.

Can View

All grievances

All departments

All admins

Global analytics

Full audit logs

Full unmasked PII

Can Perform

Create/remove any admin (department_admin or staff)

Assign departments to admins

Modify department metadata (SLA, label, active)

Reassign grievances across departments

Change grievance status (any state)

Close/resolve/escalate grievances

Trigger AI reanalysis

Reveal contact info

Export system-wide reports

🟠 2️⃣ DEPARTMENT ADMIN — DEPARTMENT GOVERNANCE LEVEL
Scope

Only grievances assigned to their department(s).

Example:
departments = ['pwd']
→ Only PWD grievances visible.

Can View

All grievances within their department(s)

Department analytics

Staff within their department(s)

Audit logs for grievances within scope

Masked contact info by default

Can Perform
Grievance Actions

Change status

Close grievances after resolution

Escalate grievances

Reassign grievance across departments (IMPORTANT: allowed)

Reveal contact info (with reason logged)

Trigger AI reanalysis (allowed)

Add notes

Assign grievance to staff

Admin Management (Department-Level Only)

Create staff users within their department(s)

Assign departments to staff (must be within their own scope)

Remove staff within their department(s)

Cannot create other department_admins

Cannot create head_admins

Cannot

Modify department SLAs

Modify department metadata

Access global analytics

See grievances outside their department(s)

Manage other departments’ staff

🟢 3️⃣ STAFF — OPERATIONAL LEVEL
Scope

Only grievances assigned to their department(s).

Can View

Grievances within their department(s)

Full grievance details

AI summary

Masked contact info

Audit trail (read-only)

Can Perform
Grievance Actions

Mark In Progress

Add internal notes

Trigger AI reanalysis (allowed)

Escalate grievance to department_admin (allowed)

Reassign grievance to department head (internal escalation only)

Cannot

Close grievance

Resolve grievance

Reassign across departments

Reveal contact info (recommended restricted)

Create admins

Access analytics charts

Modify department settings

🔁 REASSIGNMENT RULES (Important Clarification)
1️⃣ Staff Reassignment

Staff can:

Reassign to department_admin (internal escalation)

Cannot change department

2️⃣ Department Admin Reassignment

Department admin can:

Reassign grievance across departments

When reassigning:

Grievance.department must update

New department_admin gains access

Old department loses access (unless multi-dept scope)

3️⃣ Head Admin

Full cross-department control

🤖 AI REANALYSIS (Updated Rule)

Now allowed for:

Head Admin

Department Admin

Staff

Rules:

60-second cooldown

Logged in audit trail

Increment attempt counter

Track actor and timestamp

🔐 GRIEVANCE FILTERING (STRICT ENFORCEMENT)

All listing and detail queries must enforce:

If role == head_admin:
→ No filter

Else:
→ grievance.department ∈ user.departments

Additionally:

Staff cannot modify grievances outside department scope.

Direct ID access attempt outside scope:
→ 403 Forbidden

📊 ANALYTICS ACCESS (Revised)
Head Admin

Full system analytics

Department Admin

Analytics only for their department(s)

Staff

No analytics charts

Optional: show simple department complaint count

🔒 CONTACT REVEAL POLICY

Default:

Name visible

Phone masked

Email masked

Reveal allowed for:

head_admin

department_admin

Staff:

No reveal access (recommended)

Every reveal:

Reason required

Audit logged

🏢 ADMIN CREATION RULES
Head Admin Can Create:

head_admin

department_admin

staff

Department Admin Can Create:

staff only

Only within their department(s)

Creation must:

Validate department scope

Log audit entry

📘 FINAL PERMISSION MATRIX
Action	Head Admin	Dept Admin	Staff
View all grievances	✅	❌	❌
View own department grievances	✅	✅	✅
Change status	✅	✅	Limited
Close grievance	✅	✅	❌
Reassign across departments	✅	✅	❌
Internal escalation	✅	✅	✅
Trigger AI reanalysis	✅	✅	✅
Reveal contact info	✅	✅	❌
Create department_admin	✅	❌	❌
Create staff	✅	✅ (within dept)	❌
Modify department metadata	✅	❌	❌
View global analytics	✅	❌	❌
View department analytics	✅	✅	❌
🛡 SECURITY ENFORCEMENT RULES

All filtering must be backend-enforced.

No frontend-only restrictions.

All role checks must validate department scope.

All sensitive operations logged.

No cross-department data leakage.

No unmasked PII returned unless authorized.

🏁 FINAL GOVERNANCE LOGIC

Visibility = Department Scope
Authority = Role Level

Department admins now have strong operational power but not system governance power.

Head admin remains ultimate authority.

Staff remains execution layer.