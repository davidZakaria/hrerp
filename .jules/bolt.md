## 2024-05-14 - Mongoose Memory Overhead in Reports
**Learning:** Reporting queries in `routes/attendance.js` retrieving large sets of data were missing `.lean()`, instantiating heavy Mongoose Document objects instead of POJOs, leading to excessive memory consumption and CPU overhead for read-only aggregation logic.
**Action:** Always append `.lean()` to Mongoose queries that are strictly read-only, especially when returning large arrays of documents for internal processing or reports.
