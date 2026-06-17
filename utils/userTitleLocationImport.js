const XLSX = require('xlsx');

const REQUIRED_COLUMNS = ['Code2', 'English Name', 'Job Title', 'Location'];

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
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

function parseTitleLocationBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook has no sheets');

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (!rows.length) throw new Error('Sheet is empty');

  const columns = Object.keys(rows[0] || {});
  const missing = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(', ')}`);
  }

  return rows.map((row, index) => ({
    rowIndex: index,
    employeeCode: normalizeEmployeeCode(row['Code2']),
    name: normalizeWhitespace(row['English Name']),
    jobTitle: normalizeWhitespace(row['Job Title']),
    location: normalizeWhitespace(row['Location'])
  }));
}

function indexUsersByCodeAndName(users) {
  const byCode = new Map();
  const byName = new Map();

  for (const user of users) {
    if (user.employeeCode) {
      for (const key of employeeCodeKeys(user.employeeCode)) {
        if (!byCode.has(key)) byCode.set(key, user);
      }
    }
    const nameKey = normalizeName(user.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, user);
  }

  return { byCode, byName };
}

function findUserForRow(row, indexes) {
  if (row.employeeCode) {
    for (const key of employeeCodeKeys(row.employeeCode)) {
      const hit = indexes.byCode.get(key);
      if (hit) return { user: hit, matchMethod: 'employeeCode' };
    }
  }
  const nameKey = normalizeName(row.name);
  if (nameKey) {
    const hit = indexes.byName.get(nameKey);
    if (hit) return { user: hit, matchMethod: 'name' };
  }
  return { user: null, matchMethod: null };
}

function isValidRow(row) {
  return !!(row.name && (row.jobTitle || row.location || row.employeeCode));
}

function buildTitleLocationPreview(fileRows, users) {
  const indexes = indexUsersByCodeAndName(users);
  const usedUserIds = new Set();

  return fileRows.map((row) => {
    if (!isValidRow(row)) {
      return {
        ...row,
        apply: false,
        status: 'skipped',
        userId: null,
        matchMethod: null,
        current: null,
        changes: {},
        warnings: ['Missing name or title/location data']
      };
    }

    const { user, matchMethod } = findUserForRow(row, indexes);
    if (!user) {
      return {
        ...row,
        apply: false,
        status: 'unmatched',
        userId: null,
        matchMethod: null,
        current: null,
        changes: {},
        warnings: ['No matching user (department is never changed by this import)']
      };
    }

    if (usedUserIds.has(String(user._id))) {
      return {
        ...row,
        apply: false,
        status: 'duplicate',
        userId: String(user._id),
        matchMethod,
        current: snapshotUser(user),
        changes: {},
        warnings: ['Another row already matched this user']
      };
    }
    usedUserIds.add(String(user._id));

    const current = snapshotUser(user);
    const changes = {};
    if (row.jobTitle && row.jobTitle !== (current.jobTitle || '')) {
      changes.jobTitle = { current: current.jobTitle || null, incoming: row.jobTitle };
    }
    if (row.location && row.location !== (current.location || '')) {
      changes.location = { current: current.location || null, incoming: row.location };
    }

    return {
      ...row,
      apply: Object.keys(changes).length > 0,
      status: Object.keys(changes).length > 0 ? 'matched' : 'unchanged',
      userId: String(user._id),
      matchMethod,
      current,
      changes,
      warnings: []
    };
  });
}

function snapshotUser(user) {
  return {
    name: user.name || '',
    email: user.email || '',
    department: user.department || '',
    employeeCode: user.employeeCode ? normalizeEmployeeCode(user.employeeCode) : '',
    jobTitle: user.jobTitle || '',
    location: user.location || ''
  };
}

async function applyTitleLocationRows({ rows, usersById, modifiedBy, modificationReason }) {
  const results = { updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (!row.apply || !row.userId) {
      results.skipped += 1;
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
      const nextTitle = normalizeWhitespace(row.jobTitle);
      const nextLocation = normalizeWhitespace(row.location);

      if (nextTitle && nextTitle !== normalizeWhitespace(user.jobTitle)) {
        modifications.push({
          field: 'jobTitle',
          oldValue: user.jobTitle || '',
          newValue: nextTitle
        });
        user.jobTitle = nextTitle;
      }
      if (nextLocation && nextLocation !== normalizeWhitespace(user.location)) {
        modifications.push({
          field: 'location',
          oldValue: user.location || '',
          newValue: nextLocation
        });
        user.location = nextLocation;
      }

      if (modifications.length === 0) {
        results.skipped += 1;
        continue;
      }

      modifications.forEach((mod) => {
        user.modificationHistory.push({
          ...mod,
          modifiedBy,
          reason: modificationReason || 'Job title & location import'
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
  parseTitleLocationBuffer,
  buildTitleLocationPreview,
  applyTitleLocationRows,
  normalizeEmployeeCode
};
