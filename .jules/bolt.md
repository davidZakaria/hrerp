## 2024-07-01 - [Avoid O(N*M) in multiple Mongoose datasets processing]
**Learning:** Mongoose queries return full models which can be heavy. Using `.lean()` helps. Also grouping datasets by foreign key avoids O(N*M) performance when processing multiple un-joined Mongoose datasets.
**Action:** Always append `.lean()` to Mongoose read-only queries. Pre-group items in an O(N) hash map by foreign key to avoid O(N*M) nested `.filter()` operations when processing multiple un-joined Mongoose datasets.
