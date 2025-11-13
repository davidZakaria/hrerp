# 🚀 ATS Quick Start Guide

## Start Testing in 3 Steps!

### Step 1: Start Backend (Terminal 1)
```bash
cd C:\Users\David.s\hrerp
npm run dev
```
✅ Server running on http://localhost:5000

### Step 2: Start Frontend (Terminal 2)
```bash
cd C:\Users\David.s\hrerp\hr-erp-frontend
npm start
```
✅ Frontend running on http://localhost:3000

### Step 3: Test the Public Form
Open in browser (no login needed):
```
http://localhost:3000/apply
```

## Quick Test Flow

### 1. Submit a Job Application (Public)
- Go to: `http://localhost:3000/apply`
- Upload a PDF resume (CV)
- Watch it auto-fill the form
- Complete missing fields
- Submit

### 2. Login as Admin
- Go to: `http://localhost:3000/login`
- Login with admin credentials
- Click "🎯 ATS System" button

### 3. Assign an Interviewer
- Find the new application
- Select a manager from dropdown
- Status changes to "Under Review"

### 4. Submit Admin Evaluation
- Click "👁️ View" on the application
- Click "✍️ Submit Evaluation"
- Rate all criteria
- Select overall impression
- Submit

### 5. Login as Manager
- Logout from admin
- Login as manager
- Click "🎯 ATS System" button
- See your assigned application

### 6. Submit Technical Evaluation
- Click "👁️ View"
- Click "✍️ Submit Evaluation"
- Complete the evaluation
- Submit

### 7. Verify Results
- Login back as admin
- View the application
- See both evaluations (✅ Admin ✅ Technical)
- Status should be "Evaluated"

## 🎯 Key URLs

| URL | Description | Authentication |
|-----|-------------|----------------|
| `http://localhost:3000/apply` | Job Application Form | None (Public) |
| `http://localhost:3000/login` | Login Page | None (Public) |
| Admin Dashboard → ATS System | View all applications | Admin/Super Admin |
| Manager Dashboard → ATS System | View assigned applications | Manager |

## 🔑 Access Levels

| Role | Can Do |
|------|--------|
| **Public** | Submit job applications |
| **Admin** | View all applications, assign interviewers, submit admin evaluations, view statistics |
| **Manager** | View assigned applications, submit technical evaluations |

## 📊 Application Status Flow

```
Pending → Under Review → Evaluated → Accepted/Rejected
   ↓            ↓             ↓
(Submit)   (Assigned)  (Both evals done)
```

## 🎨 Features to Test

- [ ] Resume upload & auto-fill (PDF)
- [ ] Multiple education entries
- [ ] Multiple work experience entries
- [ ] Rate limiting (try 4 applications)
- [ ] Admin dashboard statistics
- [ ] Search & filter applications
- [ ] Assign interviewer (admin)
- [ ] Admin evaluation
- [ ] Manager evaluation
- [ ] View resume/CV
- [ ] Both evaluations visible

## ⚠️ Common Issues

**Resume not parsing?**
→ Only PDF files are currently parsed for auto-fill

**Manager can't see applications?**
→ Admin must assign them first

**Evaluation button missing?**
→ Check if evaluation already submitted for that role

## 📝 Need More Help?

See `ATS_IMPLEMENTATION_COMPLETE.md` for full documentation.

---

**Ready to test! 🎉**

