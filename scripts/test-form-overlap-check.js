/**
 * Unit tests for form overlap detection (no DB required for logic smoke test).
 * Usage: node scripts/test-form-overlap-check.js
 */
const assert = require('assert');
const { overlapFilterForType } = require('../utils/formOverlapCheck');

const start = new Date('2026-03-10');
const end = new Date('2026-03-12');

const vacationFilter = overlapFilterForType('vacation', start, end);
assert.ok(vacationFilter.startDate);
assert.ok(vacationFilter.endDate);

const wfhFilter = overlapFilterForType('wfh', start, start);
assert.ok(wfhFilter.wfhDate);

console.log('formOverlapCheck smoke tests passed');
