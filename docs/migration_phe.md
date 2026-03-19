# PHE Complaint Migration Guide

This migration enforces Arunachal Pradesh PHE-only data rules:
- Tracking ID format: AP-PHE-YYYY-NNNNNN
- Department taxonomy: fixed PHE department IDs
- Legacy traceability: old IDs are preserved in legacyIds[]

## 1) Preconditions

- Ensure `MONGODB_URI` is set.
- Ensure latest code is deployed locally.
- Stop write-heavy jobs during execute mode (recommended maintenance window).

## 2) Backup

Create a full backup before execution.

Windows PowerShell example:

mongodump --uri="$env:MONGODB_URI" --out="backup-phe-$(Get-Date -Format yyyyMMdd-HHmmss)"

## 3) Dry run (mandatory)

Run:

node scripts/migrate_phe_complaints.js --dry-run

Review:
- Planned `complaintId` conversions
- Planned department normalizations
- Ambiguous records list
- Planned counter/index sync actions

Do not proceed if ambiguous records are unexpected.

## 4) Execute

Run:

node scripts/migrate_phe_complaints.js --execute

Expected outcomes:
- Legacy IDs migrated to AP-PHE format
- Old IDs preserved in `legacyIds`
- Non-canonical departments normalized to PHE IDs
- Counter collection synced for AP-PHE yearly prefix
- Required indexes verified/created

## 5) Validation checks

Mongo shell checks:

- No non-PHE IDs:
  db.complaints.countDocuments({ complaintId: { $not: /^AP-PHE-\d{4}-\d{6}$/ } })

- No non-PHE departments:
  db.complaints.countDocuments({ department: { $nin: [
    'water_supply_operations','water_treatment_quality','pipeline_maintenance','project_construction',
    'rural_water_supply','urban_water_supply','complaint_cell','technical_engineering',
    'monitoring_inspection','it_digital_systems'
  ] } })

- Legacy ID coverage sample:
  db.complaints.find({ legacyIds: { $exists: true, $ne: [] } }).limit(5)

## 6) Rollback

If rollback is required:
1. Stop application writes.
2. Restore from backup:
   mongorestore --uri="$env:MONGODB_URI" --drop <backup-folder>
3. Redeploy previous stable build.
4. Re-run smoke tests.

## 7) Post-migration smoke tests

- Track complaint via canonical AP-PHE ID
- Track complaint via migrated legacy ID
- Create complaint (should generate AP-PHE-YYYY-NNNNNN)
- Admin stats/analytics/export should return only PHE department-scoped data
