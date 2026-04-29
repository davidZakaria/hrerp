const { expandDepartmentGroups } = require('../config/departmentGroups');

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

module.exports = {
    getEffectiveManagedDepartments
};
