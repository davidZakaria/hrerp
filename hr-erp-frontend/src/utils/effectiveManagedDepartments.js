/**
 * Client-side mirror of server union: managedDepartments ∪ expand(catalog[groupKeys]).
 * @param {string[]} direct
 * @param {string[]} groupKeys
 * @param {Record<string, string[]>} catalog
 * @returns {string[]}
 */
export function getEffectiveManagedDepartmentsClient(direct, groupKeys, catalog) {
  const set = new Set((direct || []).filter(Boolean));
  (groupKeys || []).forEach((k) => {
    if (catalog && catalog[k]) {
      catalog[k].forEach((d) => set.add(d));
    }
  });
  return [...set];
}
