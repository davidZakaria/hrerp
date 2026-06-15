## 2024-06-25 - Pattern: Icon-only close buttons lacking ARIA labels
**Learning:** Found a widespread pattern across multiple dashboard components (`ManagerDashboard`, `AdminDashboard`, `SuperAdminDashboard`, `NotificationSystem`) where modal close buttons use only the `×` or `✕` text node characters without an `aria-label`. This makes them completely opaque to screen readers.
**Action:** When working on modals or dismissible elements in this codebase, always ensure `aria-label="Close"` is present on the close buttons, especially those using `className="close-btn"`.
