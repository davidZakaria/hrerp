# Internationalization (i18n) Implementation

This document explains the internationalization setup for the HR-ERP application, supporting both English and Arabic languages.

## Features

✅ **Dual Language Support**: English and Arabic  
✅ **RTL (Right-to-Left) Support**: Proper Arabic text direction  
✅ **Language Persistence**: Selected language is saved in localStorage  
✅ **Real-time Language Switching**: Switch languages without page reload  
✅ **Comprehensive Translations**: All UI elements are translated  
✅ **Responsive RTL Layout**: Proper layout adjustments for Arabic  

## Files Structure

```
src/
├── i18n.js                    # i18n configuration
├── locales/
│   ├── en.json                # English translations
│   └── ar.json                # Arabic translations
├── components/
│   └── LanguageSwitcher.js    # Language toggle component
└── App.css                    # RTL styles added
```

## How to Use

### Language Switcher
The language switcher appears in the top-right corner (top-left for Arabic) of all pages. Click the buttons to switch between:
- **EN**: English
- **عر**: Arabic

### Adding New Translations

#### 1. Add to English translations (`src/locales/en.json`):
```json
{
  "newSection": {
    "newKey": "English text here"
  }
}
```

#### 2. Add to Arabic translations (`src/locales/ar.json`):
```json
{
  "newSection": {
    "newKey": "النص العربي هنا"
  }
}
```

#### 3. Use in components:
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      {t('newSection.newKey')}
    </div>
  );
}
```

## Translation Keys Structure

### Common Elements
```
common.login          → "Login" / "تسجيل الدخول"
common.logout         → "Logout" / "تسجيل الخروج"
common.email          → "Email Address" / "عنوان البريد الإلكتروني"
common.password       → "Password" / "كلمة المرور"
common.submit         → "Submit" / "إرسال"
common.cancel         → "Cancel" / "إلغاء"
```

### Login Page
```
login.title           → "NEW JERSEY DEVELOPMENTS" / "شركة نيو جيرسي للتطوير"
login.subtitle        → "It's all about The Experience" / "كل شيء يتعلق بالتجربة"
login.loginButton     → "Login" / "تسجيل الدخول"
login.forgotPassword  → "Forgot Password?" / "نسيت كلمة المرور؟"
```

### Dashboard
```
dashboard.employee         → "Employee Dashboard" / "لوحة تحكم الموظف"
dashboard.manager          → "Manager Dashboard" / "لوحة تحكم المدير"
dashboard.admin            → "Admin Dashboard" / "لوحة تحكم المدير العام"
dashboard.vacationDays     → "Annual Vacation Days" / "أيام الإجازة السنوية"
dashboard.submitNewForm    → "Submit New Form" / "تقديم طلب جديد"
```

### Forms
```
forms.vacation        → "Vacation" / "إجازة"
forms.excuse          → "Excuse" / "استئذان"
forms.workFromHome    → "Work From Home" / "العمل من المنزل"
forms.sickLeave       → "Sick Leave" / "إجازة مرضية"
forms.startDate       → "Start Date" / "تاريخ البداية"
forms.endDate         → "End Date" / "تاريخ النهاية"
```

### Status Messages
```
status.pending          → "Pending" / "في الانتظار"
status.approved         → "Approved" / "موافق عليه"
status.rejected         → "Rejected" / "مرفوض"
status.manager_approved → "Manager Approved" / "موافقة المدير"
```

## RTL Support

### Automatic Direction Change
When Arabic is selected:
- Document direction changes to RTL
- Text alignment switches to right
- Layout elements reverse order
- Arabic font family (Noto Sans Arabic) is applied

### CSS Classes for RTL
The following CSS selectors handle RTL layout:
```css
[dir="rtl"] .component-name {
  /* RTL-specific styles */
}
```

### Font Loading
Arabic font is loaded from Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
```

## Components Updated

### ✅ Completed Components
- `App.js` - Added language switcher and RTL support
- `Login.js` - Full translation support
- `EmployeeDashboard.js` - Full translation support
- `LogoutButton.js` - Translation support
- `LanguageSwitcher.js` - New component for language switching

### 📝 Components to Update (Future)
- `AdminDashboard.js`
- `ManagerDashboard.js`
- `SuperAdminDashboard.js`
- `FormSubmission.js`
- All form components in `/Auth/` folder

## Best Practices

### 1. Consistent Key Naming
```javascript
// Good
t('dashboard.submitNewForm')
t('forms.startDate')
t('common.loading')

// Avoid
t('submit_new_form')
t('startdate')
t('Loading')
```

### 2. Nested Translation Keys
```json
{
  "dashboard": {
    "employee": "Employee Dashboard",
    "buttons": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  }
}
```

### 3. Pluralization (if needed)
```json
{
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items"
}
```

Usage:
```javascript
t('itemCount', { count: 1 })  // "1 item"
t('itemCount', { count: 5 })  // "5 items"
```

### 4. Interpolation
```json
{
  "welcome": "Welcome, {{name}}!"
}
```

Usage:
```javascript
t('welcome', { name: 'أحمد' })  // "Welcome, أحمد!"
```

## Testing

### Manual Testing
1. Load the application
2. Click the language switcher (EN/عر)
3. Verify:
   - All text changes to the selected language
   - Layout direction changes for Arabic
   - Font changes to Arabic font
   - Language preference persists after page reload

### Automated Testing (Future)
Consider adding tests for:
- Translation key existence
- RTL layout correctness
- Language persistence
- Component rendering in both languages

## Troubleshooting

### Common Issues

#### 1. Translation Key Not Found
**Error**: `Translation key 'some.key' not found`
**Solution**: Add the key to both `en.json` and `ar.json`

#### 2. RTL Layout Issues
**Problem**: Component looks broken in Arabic
**Solution**: Add RTL-specific CSS rules in `App.css`

#### 3. Font Not Loading
**Problem**: Arabic text uses fallback font
**Solution**: Check Google Fonts import and network connectivity

#### 4. Language Not Persisting
**Problem**: Language resets on page reload
**Solution**: Check localStorage functionality and browser settings

## Future Enhancements

### Additional Languages
To add more languages:
1. Create new translation file (e.g., `src/locales/fr.json`)
2. Import in `src/i18n.js`
3. Add to resources object
4. Update LanguageSwitcher component

### Date/Time Localization
Consider using libraries like:
- `date-fns` with locale support
- `moment.js` with Arabic locale
- Native `Intl.DateTimeFormat` for Arabic dates

### Number Formatting
For Arabic number formatting:
```javascript
const formatter = new Intl.NumberFormat('ar-EG');
formatter.format(1234); // "١٬٢٣٤"
```

## Contributing

When adding new components or features:
1. Extract all user-facing text to translation keys
2. Add translations to both language files
3. Test in both English and Arabic
4. Update this documentation if needed

## Support

For issues or questions about internationalization:
- Check browser console for i18n errors
- Verify translation files are valid JSON
- Test with both languages
- Check RTL layout in Arabic mode 