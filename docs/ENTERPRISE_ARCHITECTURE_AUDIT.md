# HR-ERP Enterprise Architecture Audit

**Project:** NEW JERSEY DEVELOPMENTS — HR ERP (`hr-njd.com`)  
**Stack:** Node.js / Express / MongoDB / React (CRA) / Nginx / PM2 / ZKTeco ADMS  
**Audit date:** June 2026  
**Purpose:** Baseline for upgrading to top-tier enterprise grade

---

## Executive Summary

The system is a **feature-rich, production HR platform** covering leave workflows, attendance (Excel + biometric), OT reconciliation, payroll-style deductions, ATS recruiting, audit logging, and backup/restore. Architecture is **modular at the route/util level** but **monolithic in dashboards** and **policy-heavy in code** (many business rules are hardcoded rather than stored in configuration).

**Top upgrade priorities:**

1. **Security:** ZKTeco endpoint authentication, centralized RBAC, input validation library, registration hardening  
2. **Data layer:** `Form` collection indexes, schema drift fix (`excuseHoursLeft` vs `excuseRequestsLeft`)  
3. **Configuration:** Move pay-period rules, grace periods, quotas, and department catalogs to admin-managed settings  
4. **Performance:** Paginate admin list endpoints; batch attendance/ZKTeco ingestion  
5. **Frontend:** Unify HTTP client, shared constants, complete i18n, split mega-dashboards  

---

## 1. Major Modules (Built & Active)

### 1.1 Backend API Modules

| Module | Route prefix | Key files | Description |
|--------|--------------|-----------|-------------|
| **Authentication** | `/api/auth` | `routes/auth.js` | Login, register, JWT (24h), password reset, `/me` |
| **Users & HR master data** | `/api/users` | `routes/users.js` | CRUD, vacation/excuse balances, team scope, title/location Excel import, employee insights, bootstrap super-admin |
| **Forms & leave** | `/api/forms` | `routes/forms.js` | Vacation (incl. half-day), sick leave, WFH, OT, mission; manager → HR approval; document serving |
| **Attendance** | `/api/attendance` | `routes/attendance.js` | XLS upload, reports, OT reconciliation API, deduction reports, punch corrections |
| **ZKTeco ADMS** | `/iclock` | `routes/zkteco.js` | Device handshake + ATTLOG ingestion (HTTP, no TLS on port 80 for devices) |
| **Job applications (ATS)** | `/api/job-applications` | `routes/jobApplications.js` | Public apply + resume parse; admin/manager review & evaluations |
| **Recruitment tracker (legacy)** | `/api/recruitment` | `routes/recruitment.js` | Older pipeline CRUD (admin-only; super_admin blocked) |
| **Employee flags** | `/api/employee-flags` | `routes/employee-flags.js` | Manager deduction/reward flags for pay-period review |
| **Audit trail** | `/api/audit` | `routes/audit.js` | Immutable-style action log, stats, export (super_admin) |
| **Backup & restore** | `/api/backup` | `routes/backup.js`, `utils/backup.js`, `utils/restore.js` | mongodump + uploads + manifest; UI restore via shared module |
| **Excuse hours (stub)** | `/api/excuse-hours` | `routes/excuse-hours.js` | Deprecated — returns 404 |

### 1.2 Backend Domain Utilities

| Utility | File | Role |
|---------|------|------|
| Attendance XLS parser | `utils/attendanceParser.js` | Late/early/OT, weekend Fri/Sat |
| Attendance detail builder | `utils/attendanceDetailBuilder.js` | Per-employee date-range rows |
| OT reconciliation | `utils/otReconciliation.js`, `utils/buildOtReconciliationPayload.js` | 8h threshold, fingerprint vs approved OT |
| Deduction calculator | `utils/deductionCalculator.js` | 3-pillar payroll deductions + half-day vacation waiver |
| Vacation days | `utils/vacationDays.js` | Calendar days, half-day = 0.5 |
| Excuse type | `utils/excuseType.js` | Paid/unpaid normalization |
| Excuse reset | `utils/excuseResetHelper.js` | Monthly reset anchored on 25th |
| Form submission bounds | `utils/formSubmissionMonthBounds.js` | Rolling 25th→25th pay period |
| Form month filters | `utils/formMonthFilters.js` | TZ-aware month filtering (+02:00 default) |
| Manager scope | `utils/effectiveManagedDepartments.js`, `utils/departmentQueryExpansion.js` | Dept groups + IT alias |
| Employee insights | `utils/employeeInsights.js` | Admin pay-period summary |
| CV parser | `utils/cvParser.js` | PDF resume extraction |
| ZKTeco parser | `utils/zktecoParser.js` | ATTLOG line parsing |
| User import | `utils/userTitleLocationImport.js` | Job title / location bulk update |

### 1.3 Frontend Modules

| Module | Primary component(s) | Users |
|--------|---------------------|-------|
| **Employee dashboard** | `EmployeeDashboard.js` | Leave submit, form history, personal OT report |
| **Manager dashboard** | `ManagerDashboard.js` | Team approvals, team attendance, ATS, personal forms |
| **Admin dashboard** | `AdminDashboard.js` | Users, all forms, attendance, OT, deductions, ATS |
| **Super Admin dashboard** | `SuperAdminDashboard.js` | Users, forms, audit, backup/restore, attendance |
| **Form submission** | `FormSubmission.js` | Shared leave/OT/mission/WFH UI |
| **User management** | `users/*` | Table, cards, title/location import |
| **ATS** | `ATS/ATSDashboard.js`, `JobApplicationForm.js`, `EvaluationForm.js` | Recruiting |
| **Attendance admin** | `AttendanceManagement.js`, `ManagerTeamAttendance.js` | Upload & team views |
| **OT reports** | `OtReconciliationReports.js`, `EmployeeOtReport.js` | Admin + employee |
| **Deduction reports** | `DeductionReports.js` | 3-pillar detailed + payroll export |
| **Auth** | `Auth/Login.js`, `Register.js`, `ForgotPassword.js`, `ResetPassword.js` | Public + authenticated |
| **Public job apply** | `/apply` → `JobApplicationForm.js` | External candidates |
| **i18n** | `i18n.js`, `locales/en.json`, `locales/ar.json` | English + Arabic RTL |
| **Mobile** | Capacitor (`android/`, `capacitor.config.ts`) | Native shell |

### 1.4 Orphan / Legacy (not routed)

| Module | Location | Notes |
|--------|----------|-------|
| ALS recruitment UI | `components/ALS/*` | Not linked from `App.js` |
| Legacy login | `components/Login.js` | Superseded by `Auth/Login.js` |
| Excuse-hours API | `routes/excuse-hours.js` | Intentionally disabled |

### 1.5 Infrastructure & Ops

| Concern | Location |
|---------|----------|
| Nginx (SPA + API proxy + ZKTeco) | `nginx.conf` |
| PM2 | `ecosystem.config.js` |
| Daily backup cron | `server.js` (02:00) |
| Monthly excuse reset cron | `server.js` (1st of month — **bug: wrong field**) |
| Env templates | `env.production.example` |

---

## 2. Database Schema & Relationships

**Database:** MongoDB (default DB name `hr-erp` via `MONGODB_URI`)  
**ODM:** Mongoose 7.x

### 2.1 Entity Relationship Overview

```mermaid
erDiagram
    User ||--o{ Form : submits
    User ||--o{ Attendance : has
    User ||--o{ Audit : performs
    User ||--o{ EmployeeFlag : flagged_on
    User ||--o{ Evaluation : evaluates
    User ||--o{ JobApplication : assigned_interviewer
    Form ||--o| Attendance : relatedForm
    JobApplication ||--o{ Evaluation : has
    User {
        ObjectId _id
        string email UK
        string role
        string department
        number vacationDaysLeft
        number excuseRequestsLeft
        string employeeCode UK
    }
    Form {
        ObjectId _id
        ObjectId user FK
        string type
        string status
        date startDate
    }
    Attendance {
        ObjectId _id
        ObjectId user FK
        string employeeCode
        date date UK_with_user
        ObjectId relatedForm FK
    }
    JobApplication {
        ObjectId _id
        string email
        ObjectId assignedInterviewer FK
    }
    Evaluation {
        ObjectId _id
        ObjectId jobApplication FK
        ObjectId evaluator FK
    }
    EmployeeFlag {
        ObjectId _id
        ObjectId employee FK
        ObjectId flaggedBy FK
    }
    Audit {
        ObjectId _id
        Mixed performedBy
        ObjectId targetUser FK
        string action
    }
    Recruitment {
        ObjectId _id
        string source
        string finalStatus
    }
```

### 2.2 Collection: `users` — `models/User.js`

| Field | Type | Constraints / default | Notes |
|-------|------|----------------------|-------|
| `name`, `email`, `password` | String | required; email unique | Password not `select: false` |
| `role` | String | enum: employee, manager, admin, super_admin | |
| `department` | String | required | Free-text, not FK |
| `jobTitle`, `location` | String | optional | Import-supported |
| `managedDepartments` | [String] | | Manager scope |
| `managedDepartmentGroups` | [String] | | Keys → `config/departmentGroups.js` |
| `permissions.canEditDepartmentForms` | Boolean | default false | |
| `employeeCode` | String | unique, sparse | Links to attendance |
| `workSchedule.startTime`, `endTime` | String | e.g. `"10:00"`, `"19:00"` | Per-user shift |
| `vacationDaysLeft` | Number | **default 21** | Deducted on HR approval |
| `excuseRequestsLeft` | Number | **default 2** | Paid excuse quota |
| `excuseRequestsResetDate` | Date | | 25th-cycle reset |
| `sickDaysLeft` | Number | null = unlimited | |
| `fingerprintMissCount`, `fingerprintMissResetMonth`, `totalFingerprintDeduction` | Number/String | | Legacy fingerprint tiers on user |
| `status` | String | active, inactive, suspended, pending, draft | |
| `resetPasswordToken`, `resetPasswordExpires` | String, Date | | |
| `modificationHistory[]` | subdoc | modifiedBy → User | |
| `lastLogin`, `createdAt` | Date | | |

**Indexes:** `email` (unique), `employeeCode` (unique sparse), `role`, `department`, `status`, `managedDepartments`, `createdAt`, `lastLogin`, compounds `{role,status}`, `{department,status}`, `{role,department}`.

### 2.3 Collection: `forms` — `models/Form.js`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId → User | Submitter |
| `type` | enum | vacation, excuse, wfh, sick_leave, extra_hours, mission |
| `vacationType` | enum | annual (only) |
| `startDate`, `endDate`, `isHalfDay` | Date, Boolean | Vacation; half-day = 0.5 |
| `excuseDate`, `excuseType`, `fromHour`, `toHour` | | Excuse |
| `sickLeaveStartDate`, `sickLeaveEndDate`, `medicalDocument` | | Sick leave |
| `wfhDate`, `wfhWorkingOn` | | WFH (Marketing-gated in API) |
| `extraHoursDate`, `extraHoursWorked`, `approvedHours` | | OT |
| `missionStartDate`, `missionEndDate`, `missionDestination`, times | | Mission |
| `reason` | String | required |
| `status` | enum | pending → manager_approved → approved / rejected |
| `managerApprovedBy`, `adminApprovedBy`, comments, timestamps | | Workflow |
| `modificationHistory[]` | subdoc | Super-admin corrections |

**Indexes:** ⚠️ **None defined** — highest-impact gap for scale.

### 2.4 Collection: `attendances` — `models/Attendance.js`

| Field | Type | Notes |
|-------|------|-------|
| `employeeCode`, `user` | String, ObjectId | Required |
| `date` | Date | One row per user per day |
| `clockIn`, `clockOut` | String HH:MM | |
| `status` | enum | present, late, absent, excused, on_leave, wfh |
| `source` | enum | manual, zkteco |
| `minutesLate`, `minutesOvertime` | Number | |
| `missedClockIn`, `missedClockOut`, `fingerprintDeduction` | | Legacy tier fields |
| `isExcused`, `relatedForm` | Boolean, ObjectId → Form | |
| `month` | String YYYY-MM | |
| `uploadedBy`, `adjustmentHistory[]` | | Audit of manual fixes |

**Indexes:** `{user, date}` **unique**, `{user, month}`, `{employeeCode, month}`, `{month, status}`.

### 2.5 Collection: `audits` — `models/Audit.js`

37-action enum (BACKUP_*, FORM_*, USER_*, etc.), `performedBy` (User or `SYSTEM`), severity, IP, userAgent.

**Indexes:** `{timestamp}`, `{performedBy, timestamp}`, `{action, timestamp}`, `{targetUser, timestamp}`.

### 2.6 Collection: `employeeflags` — `models/EmployeeFlag.js`

`employee`, `flaggedBy` → User; `type`: deduction | reward; soft-delete via `isActive`.

**Indexes:** `{employee, isActive}`, `{flaggedBy}`, `{type, isActive}`, `{createdAt}`.

### 2.7 Collections: ATS — `JobApplication.js`, `Evaluation.js`

**JobApplication:** nested education/professional arrays, `status` pipeline, `assignedInterviewer` → User.  
**Indexes:** `{email, appliedAt}`, `{status}`, `{assignedInterviewer}`.

**Evaluation:** Scored dimensions + `overallImpression`; links application + evaluator.  
**Indexes:** `{jobApplication, evaluatorRole}`, `{evaluator}`.

### 2.8 Collection: `recruitments` — `models/Recruitment.js` (legacy)

Hardcoded enums for sources, interviewer names, assessments. **No indexes.**

### 2.9 Relationship Summary

| From | To | Cardinality | Join field |
|------|-----|-------------|------------|
| Form | User | N:1 | `form.user` |
| Attendance | User | N:1 | `attendance.user` |
| Attendance | Form | N:0..1 | `attendance.relatedForm` |
| Evaluation | JobApplication | N:1 | `evaluation.jobApplication` |
| Evaluation | User | N:1 | `evaluation.evaluator` |
| EmployeeFlag | User | N:1 | employee + flaggedBy |
| Audit | User | N:0..1 | performedBy, targetUser |

**Not modeled as FKs:** `department` (string everywhere), `managedDepartments`, holiday calendar (file/env), pay rules (code constants).

---

## 3. Security, Validation & Performance Gaps

### 3.1 Security Middleware — Present vs Missing

| Control | Status | Location / notes |
|---------|--------|------------------|
| Helmet (CSP prod) | ✅ | `server.js` |
| CORS (env-driven prod) | ✅ | `server.js` |
| Compression | ✅ | `server.js` |
| Global rate limit | ✅ | 500/15min prod on `/api/` |
| Login rate limit | ✅ | 30/15min prod |
| JWT auth middleware | ✅ | `middleware/auth.js` — header `x-auth-token` |
| ObjectId validation | ✅ | `middleware/validateObjectId.js` |
| Upload size/type limits | ✅ | Multer in forms, attendance, ATS |
| Path traversal guard on `/uploads` | ✅ | `server.js` |
| Audit logging | ✅ | Many admin mutations |
| **Centralized RBAC** | ❌ | ~100+ inline `User.findById` + role checks |
| **Request validation (Joi/Zod)** | ❌ | Ad-hoc `if (!field)` only |
| **CSRF protection** | ❌ | JWT header reduces risk; no token for cookies |
| **JWT refresh / revocation** | ❌ | 24h expiry only |
| **Password field exclusion** | ⚠️ | Not `select: false` on schema |
| **Auth re-validation per request** | ⚠️ | JWT role/status not re-checked vs DB |
| **ZKTeco `/iclock` auth** | ❌ | **Open endpoint — anyone can inject punches** |
| **Registration role injection** | ⚠️ | Client can send `role`, `managedDepartments` |
| **Bootstrap super-admin** | ⚠️ | `POST /api/users/create-super-admin` if none exists |
| **Rate-limit localhost bypass** | ⚠️ | `127.0.0.1` skipped even in production (operator bug) |
| **ATS public rate limit** | ⚠️ | Comment says 3/IP; code uses 100 |

### 3.2 Data Validation Gaps

| Area | Issue |
|------|-------|
| Form submission | Date ranges, half-day, OT hours — partial server checks, no schema validator |
| User create/update | Email format, department whitelist, role escalation |
| Attendance upload | Row-level errors logged; weak batch validation |
| Recruitment / ATS | Enum mismatches between frontend and model |
| Backup import | ZIP only; limited manifest validation |
| **Schema drift** | Cron + admin reset write **`excuseHoursLeft`** but schema has **`excuseRequestsLeft`** — monthly reset likely no-op |

### 3.3 Performance Bottlenecks

#### Missing indexes (recommended)

```javascript
// Form — add to models/Form.js
formSchema.index({ user: 1, status: 1 });
formSchema.index({ status: 1, type: 1 });
formSchema.index({ type: 1, startDate: 1, endDate: 1 });
formSchema.index({ user: 1, type: 1, excuseDate: 1 });
formSchema.index({ status: 1, extraHoursDate: 1 });
formSchema.index({ createdAt: -1 });

// Recruitment
recruitmentSchema.index({ createdAt: -1 });
```

#### Query / architecture hotspots

| Pattern | Risk | File(s) |
|---------|------|---------|
| `User.find()` unfiltered | Full table scan | `routes/users.js` |
| `Form.find(filter)` no pagination | Large payloads | `routes/forms.js` |
| XLS upload: per-row User/Form lookups | N+1 | `routes/attendance.js` |
| ZKTeco batch: per-punch DB loops | N+1 | `routes/zkteco.js` |
| Extra `User.findById` after JWT | Redundant DB hit | Most protected routes |
| Audit export up to 10,000 rows | Memory | `routes/audit.js` |
| In-memory vacation-days cache | Not shared across PM2 instances | `routes/forms.js` |

#### Attendance indexes (good)

Unique `{user, date}` and `{user, month}` support most report queries well.

---

## 4. Hardcoded Values vs Dynamic Configuration

Values that should become **admin-configurable settings** (DB or `config` collection) for enterprise grade:

### 4.1 HR policy constants (currently in code)

| Value | Current location | Should be |
|-------|------------------|-----------|
| **21** annual vacation days | `User` default, `routes/auth.js`, `routes/users.js` | `CompanySettings.annualVacationDays` |
| **2** paid excuses / month | `User.excuseRequestsLeft` default | Settings + working cron field |
| **25th→25th** pay/submission period | `formSubmissionMonthBounds.js`, `excuseResetHelper.js` | Settings.payPeriodAnchorDay |
| **Half-day = 0.5** deduction | `vacationDays.js`, `deductionCalculator.js` | Policy engine |
| **15 min** deduction grace | `deductionCalculator.js` | Settings |
| **10 min** late grace (status) | `attendanceParser.js` | Settings |
| **5 min** ZKTeco grace | `routes/zkteco.js` | ⚠️ Inconsistent — unify |
| **8h / 480 min** standard shift | OT + deductions | Settings or per-user schedule |
| **Default shift 10:00–19:00** | Multiple utils | Already on User; enforce as fallback only |
| **Fri/Sat weekend** | `attendanceParser.js`, `otReconciliation.js` | Settings.workWeek |
| **Missing punch tiers** (0.25→1 day) | `deductionCalculator.js` | Settings.deductionTiers |
| **Marketing-only WFH/OT** | `routes/forms.js` dept string check | Role/dept permission matrix |
| **Unpaid excuse → 0.5 vacation** | Scripts / legacy docs | Explicit policy flag |
| **Paid excuse = 2 hours** | `excuseType.js`, frontend | Settings |
| **Company email domains** | `routes/auth.js` | Settings.allowedEmailDomains |
| **JWT 24h expiry** | `routes/auth.js` | Env + refresh tokens |
| **Backup retention 30d / max 50** | `utils/backup.js` | Env or settings |
| **Audit clear default 90 days** | SuperAdminDashboard | Settings |
| **ATS duplicate window 30 days** | `jobApplications.js` | Settings |
| **IP rate limit 100 applications** | `jobApplications.js` | Settings |

### 4.2 Organizational data (hardcoded lists)

| Data | Locations | Enterprise approach |
|------|-----------|---------------------|
| **Department list** | `Register.js`, `AdminDashboard.js`, `SuperAdminDashboard.js`, `locales/*.json` | `departments` collection + API; single source |
| **Department groups** | `config/departmentGroups.js` | DB-managed groups |
| **IT ↔ Information Technology alias** | `departmentQueryExpansion.js` | Canonical dept IDs |
| **Recruitment sources / interviewer names** | `models/Recruitment.js` | Lookup tables |
| **Evaluation rating enums** | `models/Evaluation.js` | Configurable scales |
| **Form type enums** | `models/Form.js` | Fine as code enums unless plugins needed |

### 4.3 Environment / deployment (appropriate as env)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN` | Required prod |
| `BACKUP_ENCRYPTION_KEY` | Encrypted backups |
| `REACT_APP_API_URL` / origin | Frontend API |
| `attendanceHolidays.json` / env | Holiday calendar — OK as file; better as admin UI |

### 4.4 Known bugs from hardcoding / drift

| Bug | Impact |
|-----|--------|
| `excuseHoursLeft` in cron (`server.js:561`) and `routes/users.js:1049` | Monthly excuse reset **does not update** `excuseRequestsLeft` |
| Grace 5 vs 10 vs 15 minutes | Inconsistent attendance vs deduction vs ZKTeco |
| `LogoutButton` clears subset of localStorage keys | Stale `managedDepartments` after logout |

---

## 5. Recommended Enterprise Upgrade Roadmap

### Phase 1 — Stability & security (0–4 weeks)

- [ ] Authenticate ZKTeco (device serial whitelist or shared secret header)
- [ ] Add `Form` indexes + migration script
- [ ] Fix `excuseHoursLeft` → `excuseRequestsLeft` in cron and admin reset
- [ ] Introduce `express-validator` or Zod on auth, users, forms POST bodies
- [ ] Harden registration: ignore client `role`; default `pending`
- [ ] Central `authorize(...roles)` middleware
- [ ] Fix rate-limit localhost bypass in production

### Phase 2 — Configuration layer (1–2 months)

- [ ] `SystemSettings` MongoDB collection (singleton document)
- [ ] Admin UI for pay period, quotas, grace minutes, allowed domains
- [ ] Departments API replacing triple hardcoded frontend lists
- [ ] Unify grace-period constants across attendance, ZKTeco, deductions

### Phase 3 — Scale & observability (2–3 months)

- [ ] Paginate all list endpoints (forms, users, audit)
- [ ] Batch attendance upload + ZKTeco ingestion (bulkWrite)
- [ ] Redis cache for vacation-days / session (multi-instance PM2)
- [ ] Structured logging (pino) + request IDs
- [ ] Health checks beyond `/api/health` (Mongo, disk, backup age)

### Phase 4 — Frontend enterprise (parallel)

- [ ] Single API client with interceptors (`src/api/client.js`)
- [ ] Split Admin/SuperAdmin into feature routes (lazy)
- [ ] Complete i18n for backup/audit strings
- [ ] Shared `constants/departments.js` until API-driven
- [ ] Remove orphan `ALS/` module or wire routes

---

## 6. File Map (Quick Reference)

```
hrerp/
├── server.js                 # Express app, cron, middleware stack
├── config/
│   ├── db.js
│   ├── departmentGroups.js
│   └── attendanceHolidays.*
├── middleware/
│   ├── auth.js
│   ├── validateObjectId.js
│   └── zktecoRawBody.js
├── models/                   # 8 Mongoose schemas
├── routes/                   # 11 route modules
├── utils/                    # Domain logic (20+ modules)
├── hr-erp-frontend/src/
│   ├── App.js                # Routing & auth gate
│   ├── components/           # Dashboards, ATS, reports
│   ├── config/api.js
│   ├── hooks/useApi.js
│   └── locales/
└── nginx.conf                # Production reverse proxy
```

---

## 7. Document Maintenance

Re-run this audit when:

- New collections or form types are added  
- Pay policy changes (OT, deductions, vacation)  
- Multi-tenant or multi-company support is considered  
- Load testing shows slow queries on `forms` or `attendances`  

---

*Generated from full codebase scan — backend models/routes/utils, frontend components, nginx, and configuration files.*
