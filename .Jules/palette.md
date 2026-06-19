## 2026-06-19 - Missing ARIA labels on generic modal close buttons
**Learning:** Found an accessibility pattern across the app where modal close buttons displaying a generic '×' symbol lack an `aria-label` or `aria-hidden` text, making them uninterpretable by screen readers.
**Action:** Add `aria-label={t('common.close') || 'Close'}` to all such icon-only buttons to ensure they announce their specific action cleanly.
