
## 2024-05-18 - Improve accessibility of icon-only buttons
**Learning:** Icon-only buttons (like emojis or Unicode characters such as `\u00D7` for 'close') are often illegible to screen readers without proper labels.
**Action:** When using icon-only buttons, always provide an `aria-label` describing the action, and wrap the visual icon itself in a `<span aria-hidden="true">` to prevent screen readers from reading out meaningless characters (like "Cross Mark" or "Key emoji").
