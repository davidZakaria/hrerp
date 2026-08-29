# Screenshot assets for the showcase docs

Place PNG or JPG screenshots here, then reference them from the markdown files.

## Recommended naming

| File | Screen to capture |
|------|-------------------|
| `01-login.png` | Login page (`/`) |
| `02-employee-dashboard.png` | Employee dashboard hero + leave wallet |
| `03-form-submission.png` | Leave request modal |
| `04-manager-approvals.png` | Manager pending approvals queue |
| `05-admin-forms-pipeline.png` | Admin forms tab (pending → HR) |
| `06-admin-users.png` | Admin user management table |
| `07-attendance-upload.png` | Admin attendance upload + summary |
| `08-deduction-report.png` | 3-pillar deduction report |
| `09-ot-reconciliation.png` | OT reconciliation report |
| `10-ats-public-apply.png` | Public `/apply` job form |
| `11-ats-admin-dashboard.png` | Admin ATS statistics + list |
| `12-ats-evaluation.png` | Evaluation form |
| `13-super-admin-audit.png` | Audit log viewer |
| `14-super-admin-backup.png` | Backup management UI |
| `15-super-admin-settings.png` | System settings |
| `16-mobile-employee.png` | Capacitor / mobile employee view |
| `17-arabic-rtl.png` | Arabic RTL layout example |

## How to reference in docs

From any file in `docs/showcase/`:

```markdown
![Employee dashboard](./assets/02-employee-dashboard.png)
```

From the root `APP_SHOWCASE.md`:

```markdown
![Employee dashboard](./docs/showcase/assets/02-employee-dashboard.png)
```
