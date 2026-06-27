## 2024-06-27 - Mongoose .lean() Optimization
**Learning:** For read-only queries in the backend where documents are immediately serialized (e.g., to JSON), using `.lean()` avoids the overhead of instantiating heavy Mongoose documents.
**Action:** Always append `.lean()` to Mongoose `.find()`, `.findOne()`, or `.findById()` queries when the result is read-only and no Mongoose document methods (like `.save()`) are needed.
