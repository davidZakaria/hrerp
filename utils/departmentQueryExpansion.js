/**
 * Expand department names for DB queries so legacy / alternate spellings match.
 *
 * Example: employees often have department "IT" (registration) while managers are
 * assigned "Information Technology" (admin UI) — both must resolve to the same team.
 */
const ALIAS_GROUPS=[
  ['IT', 'Information Technology'],
];

/**
 * @param {string[]} depts
 * @returns {string[]}
 */
function expandDepartmentsForDbQuery(depts) {
  const list = (depts || []).filter((d) => typeof d === 'string' && String(d).trim());
  const set = new Set(list);
  for (const group of ALIAS_GROUPS) {
    if (group.some((g) => set.has(g))) {
      group.forEach((g) => set.add(g));
    }
  }
  return [...set];
}

module.exports = {
  expandDepartmentsForDbQuery
};
