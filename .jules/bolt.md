## 2024-06-30 - Routine `.lean()` Optimization Additions
**Learning:** Adding `.lean()` to Mongoose read-only queries successfully bypasses Document instantiation and improves query performance. However, lockfile auto-generation from isolated package manager usage in test environments might exceed line footprint rules and should be removed before committing.
**Action:** Reverted unintended `pnpm-lock.yaml` creation before proceeding with final PR creation. Ensure clean Git state is maintained for performance commits.
