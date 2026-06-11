## 2024-05-18 - Missing indexes on frequently queried collections
**Learning:** Found that the `Form` model (which is heavily queried in `routes/forms.js` using filters like `user`, `status`, and `type`) lacked any database indexes. This could cause full collection scans and performance degradation as the database grows.
**Action:** Always verify if heavily-queried models have corresponding compound or single-field database indexes to ensure queries run efficiently. Added `user`, `status`, and `type` indexes to the `Form` schema.
