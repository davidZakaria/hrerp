## 2024-05-18 - Added ARIA Labels to Export/Print Buttons
**Learning:** Decorative emojis in action buttons can be misread or confusing to screen readers. They should be explicitly hidden. Also icon+text buttons benefit from `aria-label`s for clear context.
**Action:** Always wrap emojis or purely visual icons in `<span aria-hidden="true">` and provide a descriptive `aria-label` on the parent `<button>` if the text itself isn't perfectly self-contained or for better a11y support.
