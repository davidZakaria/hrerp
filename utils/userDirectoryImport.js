const XLSX = require('xlsx');

const EXPECTED_COLUMNS = [
  'Code2',
  'National ID',
  'English Name',
  'Arabic Name',
  'Job Title',
  'Department',
  'Location'
];

const DEPARTMENT_ALIASES = {
  'customer service': 'Customer Service',
  operation: 'Operations',
  operations: 'Operations',
  engineering: 'Engineer',
  engineer: 'Engineer',
  'information technology': 'Information Technology',
  it: 'Information Technology',
  'human resources': 'Human Resources',
  hr: 'Human Resources',
  executive: 'Executive',
  finance: 'Finance',
  marketing: 'Marketing',
  sales: 'Sales',
  legal: 'Legal',
  community: 'Community',
  administration: 'Administration',
  security: 'Security'
};

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmployeeCode(code) {
  const raw = normalizeWhitespace(code);
  if (!raw) return '';
  if (!/^\d+$/.test(raw)) return raw;
  const trimmed = raw.replace(/^0+/, '') || '0';
  return trimmed.padStart(3, '0');
}

function employeeCodeKeys(code) {
  const raw = normalizeWhitespace(code);
  if (!raw) return [];
  const keys = new Set([raw]);
  if (/^\d+$/.test(raw)) {
    const trimmed = raw.replace(/^0+/, '') || '0';
    keys.add(trimmed);
    keys.add(trimmed.padStart(3, '0'));
  }
  return [...keys];
}

function normalizeName(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeDepartment(raw) {
  const cleaned = normalizeWhitespace(raw);
  if (!cleaned) return '';
  const key = cleaned.toLowerCase();
  return DEPARTMENT_ALIASES[key] || cleaned.replace(/\s+$/, '');
}

function isLikelyValidRow(row) {
  const name = normalizeWhitespace(row.name);
  const dept = normalizeWhitespace(row.department);
  if (!name) return false;
  if (!dept) return false;
  if (/^\d+(\.\d+)?$/.test(dept)) return false;
  if (dept.length <= 2 && /^\d+$/.test(dept)) return false;
  return true;
}

function parseNationalId(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return normalizeWhitespace(value);
}

function parseImportBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Workbook has no sheets');
  }
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (!rows.length) {
    throw new Error('Sheet is empty');
  }
  const columns = Object.keys(rows[0] || {});
  const missing = EXPECTED_COLUMNS.filter((col) => !columns.includes(col));
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(', ')}`);
  }

  return rows.map((row, index) => ({
    rowIndex: index,
    employeeCode: normalizeEmployeeCode(row['Code2']),
    nationalId: parseNationalId(row['National ID']),
    name: normalizeWhitespace(row['English Name']),
    nameArabic: normalizeWhitespace(row['Arabic Name']),
    jobTitle: normalizeWhitespace(row['Job Title']),
    departmentRaw: normalizeWhitespace(row['Department']),
    department: normalizeDepartment(row['Department']),
    location: normalizeWhitespace(row['Location'])
  }));
}

function indexUsers(users) {
  const byCode = new Map();
  const byName = new Map();
  const byNationalId = new Map();

  for (const user of users) {
    if (user.employeeCode) {
      for (const key of employeeCodeKeys(user.employeeCode)) {
        if (!byCode.has(key)) byCode.set(key, user);
      }
    }
    const nameKey = normalizeName(user.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, user);
    if (user.nationalId) {
      const nid = normalizeWhitespace(user.nationalId);
      if (nid && !byNationalId.has(nid)) byNationalId.set(nid, user);
    }
  }

  return { byCode, byName, byNationalId };
}

function findUserMatch(row, indexes) {
  if (row.employeeCode) {
    for (const key of employeeCodeKeys(row.employeeCode)) {
      const hit = indexes.byCode.get(key);
      if (hit) return { user: hit, matchMethod: 'employeeCode' };
    }
  }
  if (row.nationalId) {
    const hit = indexes.byNationalId.get(row.nationalId);
    if (hit) return { user: hit, matchMethod: 'nationalId' };
  }
  const nameKey = normalizeName(row.name);
  if (nameKey) {
    const hit = indexes.byName.get(nameKey);
    if (hit) return { user: hit, matchMethod: 'name' };
  }
  return { user: null, matchMethod: null };
}

function diffField(current, incoming) {
  const a = normalizeWhitespace(current);
  const b = normalizeWhitespace(incoming);
  if (!b) return null;
  if (a === b) return null;
  return { current: a || null, incoming: b };
}

function buildImportPreview(fileRows, users) {
  const indexes = indexUsers(users);
  const usedUserIds = new Set();

  return fileRows.map((row) => {
    if (!isLikelyValidRow(row)) {
      return {
        ...row,
        apply: false,
        status: 'skipped',
        matchMethod: null,
        userId: null,
        current: null,
        changes: {},
        warnings: ['Row looks invalid or incomplete (check name and department)']
      };
    }

    const { user, matchMethod } = findUserMatch(row, indexes);
    if (!user) {
      return {
        ...row,
        apply: false,
        status: 'unmatched',
        matchMethod: null,
        userId: null,
        current: null,
        changes: {},
        warnings: ['No matching user in the system']
      };
    }

    if (usedUserIds.has(String(user._id))) {
      return {
        ...row,
        apply: false,
        status: 'duplicate',
        matchMethod,
        userId: String(user._id),
        current: snapshotUser(user),
        changes: {},
        warnings: ['Another row in this file already matched this user']
      };
    }
    usedUserIds.add(String(user._id));

    const current = snapshotUser(user);
    const changes = {};
    const fields = ['name', 'nameArabic', 'jobTitle', 'location', 'employeeCode', 'nationalId'];
    for (const field of fields) {
      const diff = diffField(current[field], row[field]);
      if (diff) changes[field] = diff;
    }

    return {
      ...row,
      apply: Object.keys(changes).length > 0,
      status: Object.keys(changes).length > 0 ? 'matched' : 'unchanged',
      matchMethod,
      userId: String(user._id),
      current,
      changes,
      warnings: []
    };
  });
}

function snapshotUser(user) {
  return {
    name: user.name || '',
    nameArabic: user.nameArabic || '',
    jobTitle: user.jobTitle || '',
    department: user.department || '',
    location: user.location || '',
    employeeCode: user.employeeCode ? normalizeEmployeeCode(user.employeeCode) : '',
    nationalId: user.nationalId || '',
    email: user.email || ''
  };
}

const APPLY_FIELDS = ['name', 'nameArabic', 'jobTitle', 'location', 'employeeCode', 'nationalId'];
// Department is NOT applied via directory import — use Department Repair tool with Excel mapping instead.

async function applyImportRows({ rows, usersById, modifiedBy, modificationReason }) {
  const results = { updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (!row.apply) {
      results.skipped += 1;
      continue;
    }
    if (!row.userId) {
      results.skipped += 1;
      results.errors.push({ rowIndex: row.rowIndex, message: 'No user linked' });
      continue;
    }

    const user = usersById.get(String(row.userId));
    if (!user) {
      results.skipped += 1;
      results.errors.push({ rowIndex: row.rowIndex, message: 'User not found' });
      continue;
    }

    try {
      const modifications = [];
      for (const field of APPLY_FIELDS) {
        const next = normalizeWhitespace(row[field]);
        if (!next && field !== 'nameArabic' && field !== 'jobTitle' && field !== 'location' && field !== 'nationalId') {
          if (field === 'name' || field === 'department') continue;
        }
        const prev = user[field] ?? '';
        const normalizedNext = field === 'employeeCode' ? normalizeEmployeeCode(next) : next;
        const normalizedPrev = field === 'employeeCode' && prev ? normalizeEmployeeCode(prev) : normalizeWhitespace(prev);
        if (normalizedNext && normalizedNext !== normalizedPrev) {
          modifications.push({ field, oldValue: normalizedPrev || null, newValue: normalizedNext });
          user[field] = normalizedNext;
        }
      }

      if (modifications.length === 0) {
        results.skipped += 1;
        continue;
      }

      modifications.forEach((mod) => {
        user.modificationHistory.push({
          ...mod,
          modifiedBy,
          reason: modificationReason || 'Employee directory import'
        });
      });

      await user.save();
      results.updated += 1;
    } catch (err) {
      results.errors.push({ rowIndex: row.rowIndex, message: err.message || 'Update failed' });
    }
  }

  return results;
}

module.exports = {
  EXPECTED_COLUMNS,
  parseImportBuffer,
  buildImportPreview,
  applyImportRows,
  normalizeEmployeeCode,
  normalizeDepartment
};
