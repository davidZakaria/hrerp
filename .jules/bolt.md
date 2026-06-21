## 2024-06-21 - Read-Only Query Optimization
**Learning:** For bulk read operations like generating extensive reports (e.g., deduction reports, OT reconciliations) that fetch thousands of Mongoose documents, instantiating full Document objects causes significant memory and CPU overhead.
**Action:** Always append `.lean()` to Mongoose `find()` queries for read-only routes to return plain JavaScript objects. Ensure to add comments explaining the performance win. Note that `.lean()` works perfectly with `.populate()`.
