
## 2024-06-21 - Added ARIA Labels to UserManagementUsersTable Buttons
**Learning:** Icon-only buttons (like the key icon for password reset) must have `aria-label` and `title` for accessibility and better UX. Action buttons like "Remove flag" also need clear ARIA labels to describe their action rather than just their content.
**Action:** Always ensure icon-only buttons have both `aria-label` and `title` attributes. Provide descriptive `aria-label`s for buttons that perform actions on specific items (e.g., "Remove flag: [type]").
