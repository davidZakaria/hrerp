## 2024-05-24 - Document Object Allocation Bottlenecks in Mongoose Analytics
**Learning:** Returning large numbers of Mongoose Document objects for complex analytics calculations creates a severe memory overhead that isn't strictly necessary since reports are generally read-only computations.
**Action:** Append `.lean()` to all read-heavy Mongoose queries (e.g. analytical endpoints and report builders). Leave off `.lean()` for queries whose results must later be saved (e.g., using `.save()`).
