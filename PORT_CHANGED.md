# ⚠️ PORT CHANGED TO 5001

## Quick Note

Due to port 5000 being occupied by another process, the backend server now runs on **PORT 5001** instead of 5000.

### Updated URLs:

- **Backend API**: `http://localhost:5001`
- **Frontend**: `http://localhost:3000` (unchanged)
- **Job Application Form**: `http://localhost:3000/apply`

### All API calls have been updated automatically!

The following files were updated to use port 5001:
- ✅ All ATS components (JobApplicationForm, ATSDashboard, EvaluationForm)
- ✅ Auth components (Login, Register, etc.)
- ✅ Admin Dashboard
- ✅ Manager Dashboard
- ✅ Employee Dashboard
- ✅ Form Submission
- ✅ API hooks (useApi.js)

### To Start the Server:

```bash
# Backend (runs on port 5001)
cd C:\Users\David.s\hrerp
npm run dev

# Frontend (runs on port 3000)
cd C:\Users\David.s\hrerp\hr-erp-frontend
npm start
```

### If You Want to Use Port 5000 Again:

1. Kill all Node.js processes:
   - Open Task Manager → Details tab
   - Find all `node.exe` processes
   - End each one

2. Change port back to 5000:
   - Edit `server.js` line 26: Change `5001` back to `5000`
   - Run find & replace: Replace all `localhost:5001` with `localhost:5000` in frontend

---

**Server is ready on port 5001! 🚀**

