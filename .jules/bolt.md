## 2024-05-17 - Always use lean() for Read-Only Mongoose Queries
**Learning:** Mongoose queries that return multiple documents (especially in high-volume routes like export/download endpoints) consume significant memory and CPU due to hydration.
**Action:** Always append `.lean()` to Mongoose `.find()` queries when the data is only being read and sent to the client (not updated or saved).
