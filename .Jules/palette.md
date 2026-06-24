## 2024-06-24 - Accessibility pattern: Icon-only modal close buttons

**Learning:** Found multiple instances where the generic icon-only close button (`<button className="close-btn" onClick={...}>`) in large components like `SuperAdminDashboard` and `ManagerDashboard` lacked `aria-label`s. Screen reader users would just hear "button" with no context that it closes the modal.
**Action:** When implementing new modals or reusing `close-btn`, always enforce that `aria-label="Close"` or a localized equivalent is included.
