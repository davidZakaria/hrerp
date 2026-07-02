## 2024-05-18 - O(N*M) nested filter optimization in attendance route
**Learning:** Found an O(N*M) performance bottleneck in `routes/attendance.js` `/api/attendance/data-summary/:month` where filtering attendance records for each user involved iterating the entire records array within the users loop.
**Action:** Always pre-group records into a hash map by foreign key before looping over users to turn O(N*M) lookups into O(N+M) processing.
