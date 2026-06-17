const {
  CANONICAL_DEPARTMENTS,
  isCanonicalDepartment,
  suggestCanonicalDepartment
} = require('../config/departments');
const {
  parseImportBuffer,
  buildImportPreview,
  normalizeEmployeeCode,
  normalizeDepartment
} = require('./userDirectoryImport');

function getDepartmentBeforeImport(user) {
  const hist = Array.isArray(user.modificationHistory) ? user.modificationHistory : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const entry = hist[i];
    if (entry.field !== 'department') continue;
    const reason = String(entry.reason || '').toLowerCase();
    if (reason.includes('directory import') || reason.includes('employee directory')) {
      return entry.oldValue != null ? String(entry.oldValue) : null;
    }
  }
  return null;
}

function getLastDepartmentChange(user) {
  const hist = Array.isArray(user.modificationHistory) ? user.modificationHistory : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].field === 'department') {
      return hist[i].oldValue != null ? String(hist[i].oldValue) : null;
    }
  }
  return null;
}

function resolveMappedDepartment(excelRaw, excelNormalized, mapping = {}) {
  const raw = String(excelRaw || '').trim();
  const normalized = String(excelNormalized || '').trim();
  if (mapping[raw]) return mapping[raw];
  if (mapping[normalized]) return mapping[normalized];
  const suggested = suggestCanonicalDepartment(raw) || suggestCanonicalDepartment(normalized);
  return suggested || normalized;
}

function buildDepartmentCompareReport(fileRows, users, departmentMapping = {}) {
  const preview = buildImportPreview(fileRows, users);
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  const excelDeptCounts = {};
  for (const row of fileRows) {
    const raw = String(row.departmentRaw || row.department || '').trim();
    if (!raw) continue;
    excelDeptCounts[raw] = (excelDeptCounts[raw] || 0) + 1;
  }

  const excelDepartments = Object.entries(excelDeptCounts)
    .map(([excelDepartment, count]) => {
      const normalized = normalizeDepartment(excelDepartment);
      const suggested = resolveMappedDepartment(excelDepartment, normalized, departmentMapping);
      return {
        excelDepartment,
        normalized,
        count,
        suggested,
        mapped: departmentMapping[excelDepartment] || departmentMapping[normalized] || suggested || '',
        isValidExcel: !/^\d+(\.\d+)?$/.test(excelDepartment)
      };
    })
    .sort((a, b) => a.excelDepartment.localeCompare(b.excelDepartment));

  const rows = preview
    .filter((p) => p.userId && p.status !== 'skipped' && p.status !== 'duplicate')
    .map((p) => {
      const user = usersById.get(String(p.userId));
      const excelRaw = fileRows[p.rowIndex]?.departmentRaw
        || fileRows[p.rowIndex]?.department
        || p.department;
      const excelNormalized = normalizeDepartment(excelRaw);
      const beforeImport = user ? getDepartmentBeforeImport(user) : null;
      const lastChange = user ? getLastDepartmentChange(user) : null;
      const suggested = resolveMappedDepartment(excelRaw, excelNormalized, departmentMapping);
      const current = user?.department || '';
      const target = suggested || beforeImport || current;

      const issues = [];
      if (!isCanonicalDepartment(current)) issues.push('non_canonical_current');
      if (current !== excelNormalized && current !== suggested) issues.push('differs_from_excel');
      if (beforeImport && beforeImport !== current) issues.push('changed_by_import');
      if (!suggested && !isCanonicalDepartment(excelNormalized)) issues.push('excel_not_mapped');

      return {
        rowIndex: p.rowIndex,
        userId: p.userId,
        name: user?.name || p.name,
        email: user?.email || '',
        employeeCode: p.employeeCode,
        role: user?.role || '',
        currentDepartment: current,
        excelDepartmentRaw: excelRaw,
        excelDepartmentNormalized: excelNormalized,
        departmentBeforeImport: beforeImport,
        lastDepartmentBeforeChange: lastChange,
        suggestedDepartment: suggested,
        proposedDepartment: target,
        managedDepartments: user?.managedDepartments || [],
        managedDepartmentGroups: user?.managedDepartmentGroups || [],
        issues,
        apply: issues.length > 0
      };
    });

  const systemDepartmentsInUse = {};
  for (const u of users) {
    const d = String(u.department || '').trim() || '(empty)';
    systemDepartmentsInUse[d] = (systemDepartmentsInUse[d] || 0) + 1;
  }

  const summary = {
    totalUsers: users.length,
    matchedRows: rows.length,
    needsFix: rows.filter((r) => r.issues.length > 0).length,
    nonCanonicalInSystem: Object.keys(systemDepartmentsInUse).filter(
      (d) => d !== '(empty)' && !isCanonicalDepartment(d)
    ).length,
    managers: users.filter((u) => u.role === 'manager').length
  };

  return {
    summary,
    excelDepartments,
    systemDepartmentsInUse,
    canonicalDepartments: CANONICAL_DEPARTMENTS,
    rows
  };
}

async function applyDepartmentFixes({ rows, usersById, modifiedBy, modificationReason }) {
  const results = { updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    if (!row.apply || !row.userId || !row.proposedDepartment) {
      results.skipped += 1;
      continue;
    }
    const user = usersById.get(String(row.userId));
    if (!user) {
      results.errors.push({ userId: row.userId, message: 'User not found' });
      continue;
    }
    const next = String(row.proposedDepartment).trim();
    if (!next || next === user.department) {
      results.skipped += 1;
      continue;
    }
    try {
      user.modificationHistory.push({
        field: 'department',
        oldValue: user.department,
        newValue: next,
        modifiedBy,
        reason: modificationReason || 'Department repair from directory compare'
      });
      user.department = next;
      if (user.role === 'manager') {
        const managed = Array.isArray(user.managedDepartments) ? [...user.managedDepartments] : [];
        if (managed.length === 1 && managed[0] !== next) {
          user.managedDepartments = [next];
        }
      }
      await user.save();
      results.updated += 1;
    } catch (err) {
      results.errors.push({ userId: row.userId, message: err.message });
    }
  }

  return results;
}

async function resetAllManagerScopes({ User, modifiedBy, reason }) {
  const managers = await User.find({ role: 'manager' });
  let updated = 0;
  for (const user of managers) {
    const oldDepts = [...(user.managedDepartments || [])];
    const oldGroups = [...(user.managedDepartmentGroups || [])];
    if (oldDepts.length === 0 && oldGroups.length === 0) continue;
    user.managedDepartments = [];
    user.managedDepartmentGroups = [];
    user.modificationHistory.push({
      field: 'managedDepartments',
      oldValue: { managedDepartments: oldDepts, managedDepartmentGroups: oldGroups },
      newValue: { managedDepartments: [], managedDepartmentGroups: [] },
      modifiedBy,
      reason: reason || 'Reset manager scopes for reassignment'
    });
    await user.save();
    updated += 1;
  }
  return { managers: managers.length, updated };
}

module.exports = {
  buildDepartmentCompareReport,
  applyDepartmentFixes,
  resetAllManagerScopes,
  getDepartmentBeforeImport,
  resolveMappedDepartment
};
