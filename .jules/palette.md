## 2024-07-10 - Accessible Icon-only Buttons
**Learning:** Purely visual icon buttons (like the '🔑' reset password button) need explicit `aria-label`s, and the visual emoji itself should be hidden from screen readers using `aria-hidden="true"` to prevent confusing announcements.
**Action:** Always wrap emojis or purely visual icons in `<span aria-hidden="true">` when adding `aria-label`s to the parent button element.
