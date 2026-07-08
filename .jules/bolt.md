## 2024-05-24 - Use `.lean()` for read-only aggregation queries
**Learning:** Returning large sets of Mongoose documents for purely read-only aggregation/processing causes significant overhead due to internal getters/setters and change tracking.
**Action:** Always append `.lean()` to `Model.find()` queries when processing read-only dashboards, insights, or reporting data to dramatically improve parsing speed and memory efficiency.
