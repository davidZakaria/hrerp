## 2024-07-11 - Add aria-hidden to decorative emojis in Export/Print buttons
**Learning:** Decorative emojis (like 📥 or 🖨️) without `aria-hidden` attributes cause screen readers to read out their literal names, cluttering the experience.
**Action:** When adding or encountering purely visual emojis, wrap them in `<span aria-hidden="true">` to improve accessibility.
