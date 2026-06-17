/**
 * Canonical departments — keep in sync with registration / admin pickers.
 */
const CANONICAL_DEPARTMENTS = [
  'Human Resources',
  'Finance',
  'Marketing',
  'Sales',
  'Information Technology',
  'Operations',
  'Engineer',
  'Customer Service',
  'Legal',
  'Community',
  'Personal Assistant',
  'Administration',
  'Supply Chain Department',
  'Driver',
  'Reception',
  'Jamila Engineer',
  'Jura Engineer',
  'Green Icon Engineer',
  'Green Avenue Engineer',
  'Architectural Engineer',
  'Technical Office Engineer',
  'Executive',
  'Security',
  'Other'
];

/** Excel / import labels → suggested canonical department */
const EXCEL_DEPARTMENT_SUGGESTIONS = {
  Executive: 'Administration',
  Administration: 'Administration',
  Finance: 'Finance',
  'Information Technology': 'Information Technology',
  'Human Resources': 'Human Resources',
  'Customer Service': 'Customer Service',
  'Customer service': 'Customer Service',
  Community: 'Community',
  Legal: 'Legal',
  Marketing: 'Marketing',
  Operation: 'Operations',
  Operations: 'Operations',
  Sales: 'Sales',
  Engineering: 'Engineer',
  Engineer: 'Engineer',
  Security: 'Administration'
};

function isCanonicalDepartment(dept) {
  const d = String(dept || '').trim();
  return CANONICAL_DEPARTMENTS.includes(d);
}

function suggestCanonicalDepartment(excelDept) {
  const cleaned = String(excelDept || '').trim();
  if (!cleaned) return '';
  if (CANONICAL_DEPARTMENTS.includes(cleaned)) return cleaned;
  if (EXCEL_DEPARTMENT_SUGGESTIONS[cleaned]) return EXCEL_DEPARTMENT_SUGGESTIONS[cleaned];
  const key = Object.keys(EXCEL_DEPARTMENT_SUGGESTIONS).find(
    (k) => k.toLowerCase() === cleaned.toLowerCase()
  );
  if (key) return EXCEL_DEPARTMENT_SUGGESTIONS[key];
  return '';
}

module.exports = {
  CANONICAL_DEPARTMENTS,
  EXCEL_DEPARTMENT_SUGGESTIONS,
  isCanonicalDepartment,
  suggestCanonicalDepartment
};
