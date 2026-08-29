# Roles, Security & Platform

[← Back to showcase index](../../APP_SHOWCASE.md) · [← Governance](./06-governance.md)

---

## Four roles, four dashboards

Each user lands on exactly one experience — no confusion, no privilege leaks.

| Role | Route | Tagline |
|------|-------|---------|
| **Employee** | `/employee` | "My leave, my attendance, my requests" |
| **Manager** | `/manager` | "My team, my approvals, my interviews" |
| **Admin** | `/admin` | "HR operations center" |
| **Super Admin** | `/super-admin` | "Full control + audit + backup" |

Frontend **route isolation** enforces this: an employee cannot navigate to `/admin` even by typing the URL.

---

## Permission highlights

| Capability | Employee | Manager | Admin | Super Admin |
|------------|:--------:|:-------:|:-----:|:-----------:|
| Submit & track leave | ✓ | ✓ | ✓ | ✓ |
| Approve team leave | — | ✓ | — | ✓ |
| HR final approval | — | — | ✓ | ✓ |
| User management | — | — | ✓ | ✓ |
| Delete users | — | — | — | ✓ |
| Attendance upload & reports | — | — | ✓ | ✓ |
| ATS full access | — | assigned | ✓ | ✓ |
| Audit & backup | — | — | — | ✓ |
| System settings | — | — | — | ✓ |

---

## Security built in

| Layer | Implementation |
|-------|----------------|
| **Passwords** | bcrypt hashed, never stored plain |
| **Sessions** | JWT via `x-auth-token` header |
| **Rate limiting** | Auth endpoints: 30 req / 15 min (production) |
| **Headers** | Helmet security headers |
| **CORS** | Web + Capacitor origins |
| **File access** | Path traversal checks on uploads |
| **Privilege escalation** | Role/permission fields never from client input |
| **ATS spam** | IP limits + duplicate email window |
| **ZKTeco** | Device serial + secret token validation |
| **Backups** | Encrypted; verify before restore |

---

## Internationalization

- **English** and **Arabic** with full **RTL** layout
- Language switcher on every dashboard
- Translation files: `hr-erp-frontend/src/locales/en.json`, `ar.json`

> 📸 **Screenshot placeholder**
>
> ![Arabic RTL layout](./assets/17-arabic-rtl.png)
> *Capture: Any dashboard with Arabic selected*

---

## Mobile-ready (Capacitor)

- Android project included (`hr-erp-frontend/android/`)
- Same React app wrapped for native shell
- Status bar and splash screen configured
- API auto-routes to backend in emulator/device context

> 📸 **Screenshot placeholder**
>
> ![Mobile employee view](./assets/16-mobile-employee.png)
> *Capture: Capacitor app or narrow browser viewport*

---

## Light & dark theme

User preference persisted in localStorage — comfortable for long HR sessions.

---

## Key files (for developers)

| Area | Path |
|------|------|
| Auth middleware | `middleware/auth.js` |
| Route protection | `hr-erp-frontend/src/App.js` |
| i18n setup | `hr-erp-frontend/src/i18n.js` |
| Theme | `hr-erp-frontend/src/context/ThemeContext.js` |
| API config | `hr-erp-frontend/src/config/api.js` |

---

[← Governance](./06-governance.md) · [Next: Technical Reference →](./08-technical-reference.md)
