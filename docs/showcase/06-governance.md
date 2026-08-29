# Governance — Audit, Backup & Settings

[← Back to showcase index](../../APP_SHOWCASE.md) · [← Reporting](./05-reporting.md)

---

## The problem it solves

When something changes in HR systems, nobody knows who did it or when. Data loss from a bad deploy or accidental delete can be catastrophic.

**Super admins get a full audit trail, encrypted backups, and centralized company policy — without touching code.**

---

## Audit logging

Every sensitive action is recorded with who, what, when, and old/new values:

- User created, updated, deleted, login, status changed
- Forms created, approved, rejected, edited
- Vacation balance modifications
- ATS: applications, evaluations, interviewer assignments
- Employee flags created or removed
- All backup operations

**Super admin tools:** filter by action/user/date, view statistics, download CSV, clear log (with audit of the clear itself).

> 📸 **Screenshot placeholder**
>
> ![Audit log viewer](./assets/13-super-admin-audit.png)
> *Capture: `/super-admin` → Logs tab*

---

## Encrypted backup & restore

| Feature | Detail |
|---------|--------|
| **Automated backup** | Every day at 2:00 AM |
| **Manual backup** | On-demand from super admin UI |
| **Scope** | MongoDB + all uploads (avatars, medical docs, resumes, attendance files) |
| **Verify** | Integrity check before restore |
| **Export / import** | Move backups off-server |
| **Retention** | 30-day automatic cleanup |
| **Audit** | Every backup action logged |

> 📸 **Screenshot placeholder**
>
> ![Backup management](./assets/14-super-admin-backup.png)
> *Capture: `/super-admin` → Backup tab*

See also: [`BACKUP_SYSTEM.md`](../../BACKUP_SYSTEM.md)

---

## System settings (singleton)

One configuration document drives company-wide defaults:

| Setting | Default | Impact |
|---------|---------|--------|
| Company name | NEW JERSEY DEVELOPMENTS | Branding |
| Annual vacation days | 15 | New user default |
| Casual vacation days | 6 | New user default |
| Pay period anchor | 25th | Form validation & filters |
| Lateness grace | 15 minutes | Deduction calculator |
| Standard shift | 8 hours | OT and shortfall math |

> 📸 **Screenshot placeholder**
>
> ![System settings](./assets/15-super-admin-settings.png)
> *Capture: `/super-admin` → Settings tab*

---

## Key files (for developers)

| Area | Path |
|------|------|
| Audit model & API | `models/Audit.js`, `routes/audit.js` |
| Backup utils & API | `utils/backup.js`, `routes/backup.js` |
| Settings model & API | `models/SystemSettings.js`, `routes/settings.js` |
| Cron jobs | `server.js` (2 AM backup, monthly reset) |
| Super admin UI | `SuperAdminDashboard.js`, `SystemSettings.js` |

---

[← Reporting](./05-reporting.md) · [Next: Roles & Security →](./07-roles-and-security.md)
