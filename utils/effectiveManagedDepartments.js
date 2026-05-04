const { expandDepartmentGroups } = require('../config/departmentGroups');
const { expandDepartmentsForDbQuery } = require('./departmentQueryExpansion');

/**
 * Union of direct managedDepartments and departments implied by managedDepartmentGroups.
 * @param {{ managedDepartments?: string[], managedDepartmentGroups?: string[] }} user
 * @returns {string[]}
 */
function getEffectiveManagedDepartments(user) {
    if (!user || user.role !== 'manager') return [];
    const direct = (user.managedDepartments || []).filter(
        (d) => typeof d === 'string' && d.trim()
    );
    const fromGroups = expandDepartmentGroups(user.managedDepartmentGroups || []);
    return [...new Set([...direct, ...fromGroups])];
}

/**
 * Same as getEffectiveManagedDepartments plus known aliases (IT ↔ Information Technology)
 * for User.department matching and $in queries.
 * @param {{ role?: string, managedDepartments?: string[], managedDepartmentGroups?: string[] }} user
 * @returns {string[]}
 */
function getEffectiveManagedDepartmentsForQueries(user) {
    return expandDepartmentsForDbQuery(getEffectiveManagedDepartments(user));
}

module.exports = {
    getEffectiveManagedDepartments,
    getEffectiveManagedDepartmentsForQueries
};
