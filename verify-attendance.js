/**
 * Attendance Data Verification Script
 * Compares Excel file data with database records
 * Run: node verify-attendance.js "path/to/excel/file.xls" "2026-01"
 */

const mongoose = require('mongoose');
const xlsx = require('xlsx');
const config = require('./config/db');
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const { parseDate, parseTime, isWeekend, getDayName } = require('./utils/attendanceParser');

// Connect to database
async function connectDB() {
    try {
        await mongoose.connect(config.mongoURI || process.env.MONGO_URI || 'mongodb://localhost:27017/hr-erp');
        console.log('MongoDB Connected...\n');
    } catch (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
}

// Parse Excel file
function parseExcelFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    const records = [];
    
    jsonData.forEach((row, index) => {
        const employeeCode = row['AC-No.'] || row['AC-No'] || row['Employee Code'] || row['Code'] || row['ID'];
        const name = row['Name'] || row['Employee Name'];
        const date = row['Date'] || row['date'];
        const clockIn = row['Clock In'] || row['ClockIn'] || row['In'] || '';
        const clockOut = row['Clock Out'] || row['ClockOut'] || row['Out'] || '';
        
        if (employeeCode && date) {
            const parsedDate = parseDate(date);
            if (parsedDate) {
                records.push({
                    employeeCode: String(employeeCode).trim(),
                    name: name ? String(name).trim() : '',
                    date: parsedDate,
                    dateStr: date,
                    clockIn: clockIn ? parseTime(clockIn) : null,
                    clockOut: clockOut ? parseTime(clockOut) : null,
                    clockInRaw: clockIn,
                    clockOutRaw: clockOut,
                    rowNumber: index + 2
                });
            }
        }
    });
    
    return records;
}

// Group records by employee
function groupByEmployee(records) {
    const grouped = {};
    records.forEach(record => {
        if (!grouped[record.employeeCode]) {
            grouped[record.employeeCode] = {
                name: record.name,
                records: []
            };
        }
        grouped[record.employeeCode].records.push(record);
    });
    return grouped;
}

// Main verification function
async function verifyAttendance(filePath, month) {
    await connectDB();
    
    console.log('='.repeat(80));
    console.log('ATTENDANCE DATA VERIFICATION REPORT');
    console.log('='.repeat(80));
    console.log(`Excel File: ${filePath}`);
    console.log(`Month: ${month}`);
    console.log('='.repeat(80));
    
    // Parse Excel
    const excelRecords = parseExcelFile(filePath);
    const excelByEmployee = groupByEmployee(excelRecords);
    
    console.log(`\nTotal records in Excel: ${excelRecords.length}`);
    console.log(`Total employees in Excel: ${Object.keys(excelByEmployee).length}\n`);
    
    // Get all users
    const users = await User.find({ employeeCode: { $exists: true, $ne: null } }).select('name employeeCode');
    const userMap = {};
    users.forEach(u => {
        userMap[u.employeeCode] = u;
    });
    
    // Track issues
    const issues = [];
    const summary = {
        totalEmployees: 0,
        employeesWithIssues: 0,
        missingInDB: 0,
        extraInDB: 0,
        mismatchedData: 0,
        unmatchedCodes: []
    };
    
    // Check each employee in Excel
    for (const [code, empData] of Object.entries(excelByEmployee)) {
        summary.totalEmployees++;
        
        const user = userMap[code];
        if (!user) {
            summary.unmatchedCodes.push({ code, name: empData.name });
            continue;
        }
        
        // Get database records for this employee and month
        const dbRecords = await Attendance.find({
            user: user._id,
            month: month
        }).sort({ date: 1 });
        
        const dbRecordMap = {};
        dbRecords.forEach(r => {
            const dateKey = r.date.toISOString().split('T')[0];
            dbRecordMap[dateKey] = r;
        });
        
        let employeeHasIssues = false;
        const employeeIssues = [];
        
        // Filter Excel records for the specified month
        const monthRecords = empData.records.filter(r => {
            const recordMonth = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
            return recordMonth === month;
        });
        
        // Check each Excel record
        for (const excelRecord of monthRecords) {
            const dateKey = excelRecord.date.toISOString().split('T')[0];
            const dayName = getDayName(excelRecord.date);
            
            // Skip weekends
            if (isWeekend(excelRecord.date)) {
                continue;
            }
            
            const dbRecord = dbRecordMap[dateKey];
            
            if (!dbRecord) {
                // Record in Excel but not in DB
                if (excelRecord.clockIn || excelRecord.clockOut) {
                    employeeIssues.push({
                        type: 'MISSING_IN_DB',
                        date: dateKey,
                        day: dayName,
                        excel: { clockIn: excelRecord.clockIn, clockOut: excelRecord.clockOut },
                        db: null
                    });
                    summary.missingInDB++;
                    employeeHasIssues = true;
                }
            } else {
                // Compare data
                const excelClockIn = excelRecord.clockIn || null;
                const excelClockOut = excelRecord.clockOut || null;
                const dbClockIn = dbRecord.clockIn || null;
                const dbClockOut = dbRecord.clockOut || null;
                
                if (excelClockIn !== dbClockIn || excelClockOut !== dbClockOut) {
                    employeeIssues.push({
                        type: 'DATA_MISMATCH',
                        date: dateKey,
                        day: dayName,
                        excel: { clockIn: excelClockIn, clockOut: excelClockOut },
                        db: { clockIn: dbClockIn, clockOut: dbClockOut, status: dbRecord.status }
                    });
                    summary.mismatchedData++;
                    employeeHasIssues = true;
                }
                
                // Remove from map to track extra DB records
                delete dbRecordMap[dateKey];
            }
        }
        
        // Check for extra records in DB not in Excel (for the month)
        for (const [dateKey, dbRecord] of Object.entries(dbRecordMap)) {
            const recordDate = new Date(dateKey);
            if (!isWeekend(recordDate)) {
                employeeIssues.push({
                    type: 'EXTRA_IN_DB',
                    date: dateKey,
                    day: getDayName(recordDate),
                    excel: null,
                    db: { clockIn: dbRecord.clockIn, clockOut: dbRecord.clockOut, status: dbRecord.status }
                });
                summary.extraInDB++;
                employeeHasIssues = true;
            }
        }
        
        if (employeeHasIssues) {
            summary.employeesWithIssues++;
            issues.push({
                code,
                name: user.name,
                issues: employeeIssues
            });
        }
    }
    
    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(80));
    
    if (summary.unmatchedCodes.length > 0) {
        console.log('\n⚠️  UNMATCHED EMPLOYEE CODES (in Excel but not registered in system):');
        summary.unmatchedCodes.forEach(u => {
            console.log(`   - Code ${u.code}: ${u.name}`);
        });
    }
    
    if (issues.length === 0) {
        console.log('\n✅ ALL DATA MATCHES! No discrepancies found.');
    } else {
        console.log(`\n❌ DISCREPANCIES FOUND FOR ${issues.length} EMPLOYEE(S):\n`);
        
        for (const emp of issues) {
            console.log('-'.repeat(60));
            console.log(`👤 ${emp.name} (Code: ${emp.code})`);
            console.log('-'.repeat(60));
            
            for (const issue of emp.issues) {
                if (issue.type === 'MISSING_IN_DB') {
                    console.log(`   ❌ MISSING: ${issue.date} (${issue.day})`);
                    console.log(`      Excel: In=${issue.excel.clockIn || '-'}, Out=${issue.excel.clockOut || '-'}`);
                    console.log(`      DB: NOT FOUND`);
                } else if (issue.type === 'DATA_MISMATCH') {
                    console.log(`   ⚠️  MISMATCH: ${issue.date} (${issue.day})`);
                    console.log(`      Excel: In=${issue.excel.clockIn || '-'}, Out=${issue.excel.clockOut || '-'}`);
                    console.log(`      DB:    In=${issue.db.clockIn || '-'}, Out=${issue.db.clockOut || '-'} [${issue.db.status}]`);
                } else if (issue.type === 'EXTRA_IN_DB') {
                    console.log(`   ➕ EXTRA IN DB: ${issue.date} (${issue.day})`);
                    console.log(`      Excel: NOT IN FILE`);
                    console.log(`      DB:    In=${issue.db.clockIn || '-'}, Out=${issue.db.clockOut || '-'} [${issue.db.status}]`);
                }
            }
            console.log('');
        }
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Employees Checked: ${summary.totalEmployees}`);
    console.log(`Employees with Issues: ${summary.employeesWithIssues}`);
    console.log(`Unmatched Employee Codes: ${summary.unmatchedCodes.length}`);
    console.log(`Records Missing in DB: ${summary.missingInDB}`);
    console.log(`Data Mismatches: ${summary.mismatchedData}`);
    console.log(`Extra Records in DB: ${summary.extraInDB}`);
    console.log('='.repeat(80));
    
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node verify-attendance.js <excel-file-path> <month>');
    console.log('Example: node verify-attendance.js "./uploads/attendance.xls" "2026-01"');
    process.exit(1);
}

verifyAttendance(args[0], args[1]).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
