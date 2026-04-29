/**
 * Named department groups expand to leaf department strings used on User.department.
 * Keep in sync with hr-erp-frontend registration/admin department pickers.
 */
const DEPARTMENT_GROUPS = {
    Engineering_All: [
        'Engineer',
        'Jamila Engineer',
        'Jura Engineer',
        'Green Icon Engineer',
        'Green Avenue Engineer',
        'Architectural Engineer',
        'Technical Office Engineer'
    ],
    Sales_All: ['Sales']
};

/**
 * @param {string[]} groups - keys from DEPARTMENT_GROUPS
 * @returns {string[]} deduped leaf departments (unknown keys ignored)
 */
function expandDepartmentGroups(groups) {
    if (!groups || !Array.isArray(groups)) return [];
    const out = new Set();
    for (const g of groups) {
        if (typeof g !== 'string' || !DEPARTMENT_GROUPS[g]) continue;
        DEPARTMENT_GROUPS[g].forEach((d) => out.add(d));
    }
    return [...out];
}

/**
 * Group keys whose expanded list contains `department`.
 * @param {string} department
 * @returns {string[]}
 */
function groupKeysCoveringDepartment(department) {
    if (!department || typeof department !== 'string') return [];
    return Object.keys(DEPARTMENT_GROUPS).filter((k) =>
        (DEPARTMENT_GROUPS[k] || []).includes(department)
    );
}

module.exports = {
    DEPARTMENT_GROUPS,
    expandDepartmentGroups,
    groupKeysCoveringDepartment
};
