## 2024-05-18 - Read-only Mongoose query optimization
**Learning:** We need to use `.lean()` for all Mongoose queries that are read-only to improve performance. The system's rules explicitly state this.
**Action:** Append `.lean()` to queries like `Attendance.find({ ... })`, `User.find({ ... })`, `Form.find({ ... })`, etc., where the resulting documents are not being modified.
