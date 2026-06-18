## 2024-06-16 - Mongoose Lean Queries
**Learning:** Mongoose queries without `.lean()` return full Mongoose documents, which are heavy and slow to process compared to plain JavaScript objects. There are many reads in `routes/users.js` and `routes/attendance.js` and other routes that don't need Mongoose document features like `save()`.
**Action:** Use `.lean()` for read-only Mongoose queries to significantly improve performance.
