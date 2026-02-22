const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Parse XLS file and extract attendance data
 * Expected columns: Employee Code, Name, Date, Clock In, Clock Out
 * @param {String} filePath - Path to the XLS file
 * @returns {Array} Array of attendance records
 */
function parseXLSFile(filePath) {
    let workbook;
    try {
        // Try readFile first, fallback to buffer read (works better for some .xls)
        try {
            workbook = xlsx.readFile(filePath);
        } catch (readErr) {
            const buf = fs.readFileSync(filePath);
            workbook = xlsx.read(buf, { type: 'buffer' });
        }
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (default: first row = headers)
        let jsonData = xlsx.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: null
        });
        
        // Fallback: if empty, try header:1 and build objects (some .xls need this)
        if (!jsonData || jsonData.length === 0) {
            const raw = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (raw.length > 1) {
                const headers = raw[0].map((h, idx) => String(h || '').trim() || `Col${idx}`);
                jsonData = raw.slice(1).map((row, i) => {
                    const obj = {};
                    (Array.isArray(row) ? row : []).forEach((val, j) => {
                        obj[headers[j] || `Col${j}`] = val;
                    });
                    return obj;
                });
            }
        }
        
        // Parse and validate each row
        const parsedData = [];
        const errors = [];
        
        jsonData.forEach((row, index) => {
            try {
                const record = parseAttendanceRow(row, index + 2); // +2 because Excel rows start at 1 and headers are row 1
                if (record) {
                    parsedData.push(record);
                }
            } catch (error) {
                errors.push({
                    row: index + 2,
                    error: error.message,
                    data: row
                });
            }
        });
        
        return {
            success: true,
            data: parsedData,
            errors: errors,
            totalRows: jsonData.length,
            validRows: parsedData.length,
            errorCount: errors.length
        };
        
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse: ${error.message}`,
            data: [],
            errors: [{ row: 0, error: error.message, data: null }]
        };
    }
}

/**
 * Get value from row with flexible key matching (handles trimmed keys, variations)
 */
function getRowValue(row, keys) {
    const val = keys.reduce((v, k) => v || row[k], null);
    if (val != null && val !== '') return val;
    // Try trimmed keys - Excel sometimes adds trailing/leading spaces to headers
    for (const key of Object.keys(row || {})) {
        const kTrim = key.trim();
        if (keys.some(k => k.trim() === kTrim) && row[key] != null && row[key] !== '') {
            return row[key];
        }
    }
    return null;
}

/**
 * Parse a single attendance row
 * @param {Object} row - Row data from Excel
 * @param {Number} rowNumber - Row number for error reporting
 * @returns {Object} Parsed attendance record
 */
function parseAttendanceRow(row, rowNumber) {
    // Try different possible column name variations (flexible matching)
    const employeeCode = getRowValue(row, ['Employee Code', 'EmployeeCode', 'Code', 'ID', 'AC-No.', 'AC-No', 'Ac-No', 'AC No', 'Employee ID']) || row['AC-No.'] || row['AC-No'] || row['Employee Code'] || row['Code'] || row['ID'];
    const name = getRowValue(row, ['Name', 'Employee Name', 'EmployeeName']) || row['Name'];
    const date = getRowValue(row, ['Date', 'date', 'Time']) || row['Date'] || row['Time']; // "Time" = date in some biometric exports
    const clockIn = getRowValue(row, ['Clock In', 'ClockIn', 'In', 'Time In', 'C/In', 'CheckIn']) || row['C/In'] || row['Clock In'] || row['In'];
    const clockOut = getRowValue(row, ['Clock Out', 'ClockOut', 'Out', 'Time Out', 'C/Out', 'CheckOut']) || row['C/Out'] || row['Clock Out'] || row['Out'];
    
    // Validate required fields
    if (!employeeCode) {
        throw new Error(`Row ${rowNumber}: Missing Employee Code`);
    }
    
    if (!date) {
        throw new Error(`Row ${rowNumber}: Missing Date`);
    }
    
    // Parse and validate date
    const parsedDate = parseDate(date);
    if (!parsedDate) {
        throw new Error(`Row ${rowNumber}: Invalid date format: ${date}`);
    }
    
    // Parse times - clockIn can be empty (indicates absent or no scan)
    let parsedClockIn = null;
    if (clockIn && String(clockIn).trim()) {
        parsedClockIn = parseTime(clockIn);
        if (!parsedClockIn) {
            console.warn(`Row ${rowNumber}: Invalid Clock In time format: ${clockIn}, setting as null`);
        }
    }
    
    let parsedClockOut = null;
    if (clockOut && String(clockOut).trim()) {
        parsedClockOut = parseTime(clockOut);
        if (!parsedClockOut) {
            console.warn(`Row ${rowNumber}: Invalid Clock Out time format: ${clockOut}, setting as null`);
        }
    }
    
    return {
        employeeCode: String(employeeCode).trim(),
        name: name ? String(name).trim() : null,
        date: parsedDate,
        clockIn: parsedClockIn,
        clockOut: parsedClockOut,
        noClockData: !parsedClockIn && !parsedClockOut, // Flag for rows with no clock data
        rawRow: row,
        rowNumber
    };
}

/**
 * Parse date from various formats
 * @param {String|Date} dateValue - Date value from Excel
 * @returns {Date|null} Parsed date or null
 */
function parseDate(dateValue) {
    if (dateValue == null || dateValue === '') return null;
    
    // If already a Date object
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
    }
    
    // Excel date serial number (days since 1900-01-01)
    const num = Number(dateValue);
    if (!isNaN(num) && num > 0 && num < 100000) {
        const d = new Date((num - 25569) * 86400 * 1000); // Excel epoch to JS
        if (!isNaN(d.getTime())) return d;
    }
    
    const dateStr = String(dateValue).trim();
    if (!dateStr) return null;

    // Handle datetime format (e.g. "01/02/2026 09:30" or "01-Feb-2026 09:30:00") - extract date part
    const dateTimeMatch = dateStr.match(/^(.+?)\s+[\d:]+/);
    const datePart = dateTimeMatch ? dateTimeMatch[1].trim() : dateStr;

    // Month name to number mapping
    const monthNames = {
        'jan': 0, 'january': 0,
        'feb': 1, 'february': 1,
        'mar': 2, 'march': 2,
        'apr': 3, 'april': 3,
        'may': 4,
        'jun': 5, 'june': 5,
        'jul': 6, 'july': 6,
        'aug': 7, 'august': 7,
        'sep': 8, 'september': 8,
        'oct': 9, 'october': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11
    };
    
    // Handle DD-MMM-YY or DD-MMM-YYYY format (e.g., "26-Dec-25" or "26-Dec-2025")
    const monthNamePattern = /^(\d{1,2})-([A-Za-z]{3,9})-(\d{2,4})$/;
    const monthNameMatch = datePart.match(monthNamePattern);
    if (monthNameMatch) {
        const day = parseInt(monthNameMatch[1]);
        const monthStr = monthNameMatch[2].toLowerCase();
        let year = parseInt(monthNameMatch[3]);
        
        // Convert 2-digit year to 4-digit year
        if (year < 100) {
            // Assume 2000s for years 00-99
            year = year >= 50 ? 1900 + year : 2000 + year;
        }
        
        const month = monthNames[monthStr];
        if (month !== undefined && day >= 1 && day <= 31) {
            const date = new Date(year, month, day);
            // Validate the date (handles invalid dates like Feb 31)
            if (!isNaN(date.getTime()) && date.getDate() === day) {
                return date;
            }
        }
    }
    
    // Try parsing different numeric date formats
    const datePatterns = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
    ];
    
    for (const pattern of datePatterns) {
        const match = datePart.match(pattern);
        if (match) {
            // Try both DD/MM/YYYY and MM/DD/YYYY interpretations
            const variations = [
                new Date(match[3], match[1] - 1, match[2]), // MM/DD/YYYY
                new Date(match[3], match[2] - 1, match[1]), // DD/MM/YYYY
                new Date(match[1], match[2] - 1, match[3]), // YYYY-MM-DD
            ];
            
            for (const date of variations) {
                if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
                    return date;
                }
            }
        }
    }
    
    // Try native Date parsing as last resort (try both full string and date part)
    let parsed = new Date(datePart);
    if (isNaN(parsed.getTime())) parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    
    return null;
}

/**
 * Parse time from various formats and convert to HH:MM
 * @param {String|Number} timeValue - Time value from Excel
 * @returns {String|null} Time in HH:MM format or null
 */
function parseTime(timeValue) {
    if (!timeValue) return null;
    
    // Convert to string
    let timeStr = String(timeValue).trim();
    
    // Handle Excel decimal time format (e.g., 0.4375 = 10:30 AM)
    if (!isNaN(timeValue) && timeValue >= 0 && timeValue < 1) {
        const totalMinutes = Math.round(timeValue * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // Handle 24-hour format (HH:MM or H:MM)
    const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
        const hours = parseInt(time24Match[1]);
        const minutes = parseInt(time24Match[2]);
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // Handle 12-hour format with AM/PM
    const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (time12Match) {
        let hours = parseInt(time12Match[1]);
        const minutes = parseInt(time12Match[2]);
        const meridiem = time12Match[3].toUpperCase();
        
        if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
        
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    return null;
}

/**
 * Calculate minutes late based on scheduled start time and actual clock-in time
 * @param {String} clockIn - Actual clock-in time (HH:MM)
 * @param {String} scheduledStart - Scheduled start time (HH:MM)
 * @param {Number} gracePeriodMinutes - Grace period in minutes (default: 10)
 * @returns {Number} Minutes late (0 if not late)
 */
function calculateMinutesLate(clockIn, scheduledStart, gracePeriodMinutes = 10) {
    if (!clockIn || !scheduledStart) return 0;
    
    const clockInParts = clockIn.split(':');
    const scheduledParts = scheduledStart.split(':');
    
    if (clockInParts.length !== 2 || scheduledParts.length !== 2) return 0;
    
    const clockInMinutes = parseInt(clockInParts[0]) * 60 + parseInt(clockInParts[1]);
    const scheduledMinutes = parseInt(scheduledParts[0]) * 60 + parseInt(scheduledParts[1]);
    
    // Add grace period
    const scheduledWithGrace = scheduledMinutes + gracePeriodMinutes;
    
    // Calculate difference
    const diff = clockInMinutes - scheduledWithGrace;
    
    return diff > 0 ? diff : 0;
}

/**
 * Calculate overtime minutes (stayed after scheduled end time)
 * @param {String} clockOut - Actual clock-out time (HH:MM)
 * @param {String} scheduledEnd - Scheduled end time (HH:MM)
 * @returns {Number} Minutes of overtime (0 if not overtime)
 */
function calculateMinutesOvertime(clockOut, scheduledEnd) {
    if (!clockOut || !scheduledEnd) return 0;
    
    const clockOutParts = clockOut.split(':');
    const scheduledParts = scheduledEnd.split(':');
    
    if (clockOutParts.length !== 2 || scheduledParts.length !== 2) return 0;
    
    const clockOutMinutes = parseInt(clockOutParts[0]) * 60 + parseInt(clockOutParts[1]);
    const scheduledMinutes = parseInt(scheduledParts[0]) * 60 + parseInt(scheduledParts[1]);
    
    // Calculate difference
    const diff = clockOutMinutes - scheduledMinutes;
    
    return diff > 0 ? diff : 0;
}

/**
 * Determine attendance status based on clock times and schedule
 * @param {String} clockIn - Clock-in time
 * @param {String} clockOut - Clock-out time
 * @param {Object} workSchedule - Employee's work schedule {startTime, endTime}
 * @param {Number} gracePeriodMinutes - Grace period for being late
 * @returns {Object} {status, minutesLate, minutesOvertime, missedClockIn, missedClockOut}
 */
function calculateAttendanceStatus(clockIn, clockOut, workSchedule, gracePeriodMinutes = 15) {
    const missedClockIn = !clockIn;
    const missedClockOut = !clockOut;
    
    // Case 1: No clock-in AND no clock-out = truly absent
    if (!clockIn && !clockOut) {
        return { 
            status: 'absent', 
            minutesLate: 0, 
            minutesOvertime: 0,
            missedClockIn: true,
            missedClockOut: true
        };
    }
    
    // Case 2: Has clock-out but no clock-in = present but forgot to clock in
    // Treat as late (since we don't know actual arrival time, assume they were late)
    if (!clockIn && clockOut) {
        const minutesOvertime = calculateMinutesOvertime(clockOut, workSchedule.endTime);
        return { 
            status: 'late', 
            minutesLate: 0, // Can't calculate without clock-in
            minutesOvertime: minutesOvertime,
            missedClockIn: true,
            missedClockOut: false
        };
    }
    
    // Case 3: Has clock-in (with or without clock-out)
    const minutesLate = calculateMinutesLate(clockIn, workSchedule.startTime, gracePeriodMinutes);
    const minutesOvertime = calculateMinutesOvertime(clockOut, workSchedule.endTime);
    
    const status = minutesLate > 0 ? 'late' : 'present';
    
    return { 
        status, 
        minutesLate,
        minutesOvertime,
        missedClockIn: false,
        missedClockOut: missedClockOut
    };
}

/**
 * Get month string from date (YYYY-MM format)
 * @param {Date} date 
 * @returns {String} Month in YYYY-MM format
 */
function getMonthString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Check if a date is a weekend (Friday or Saturday)
 * In Egypt/Middle East, Friday and Saturday are the official weekend days
 * @param {Date|String} date - Date to check
 * @returns {Boolean} True if weekend (Friday=5 or Saturday=6)
 */
function isWeekend(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

/**
 * Get day name from date
 * @param {Date|String} date - Date to check
 * @returns {String} Day name (e.g., "Friday", "Saturday")
 */
function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(date);
    return days[d.getDay()];
}

/**
 * Validate XLS file structure - uses same parsing as parseXLSFile for consistency
 * @param {String} filePath 
 * @returns {Object} {isValid, message, columns}
 */
function validateXLSStructure(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get headers the same way sheet_to_json does - ensures consistency with parsing
        const asObject = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        const headers = asObject.length > 0
            ? Object.keys(asObject[0] || {})
            : xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })[0]?.map(h => String(h || '').trim()) || [];
        
        // Very permissive matching - biometric exports use various names
        const hasEmployeeCode = headers.some(h => {
            const lower = String(h).toLowerCase();
            return /ac[\s\-]*no|employee\s*code|emp.*code|code|^\s*id\s*$|card\s*no/i.test(h) ||
                (lower.includes('no') && (lower.includes('ac') || lower.includes('emp')));
        });
        const hasDate = headers.some(h => {
            const lower = String(h).toLowerCase();
            return /date|^time$|datetime|day|record/i.test(h);
        });
        const hasClockIn = headers.some(h => {
            const lower = String(h).toLowerCase();
            return /c\/in|clock\s*in|time\s*in|check\s*in|^\s*in\s*$|first\s*in|punch\s*in|entrance/i.test(h) ||
                (lower === 'in' || lower === 'time');
        });
        
        if (!hasEmployeeCode || !hasDate || !hasClockIn) {
            const missing = [];
            if (!hasEmployeeCode) missing.push('Employee Code (AC-No., Code, ID)');
            if (!hasDate) missing.push('Date (Date, Time)');
            if (!hasClockIn) missing.push('Clock In (C/In, In)');
            return {
                isValid: false,
                message: `Missing columns: ${missing.join(', ')}. Found: [${headers.join(', ')}]`,
                columns: headers
            };
        }
        
        return {
            isValid: true,
            message: 'File structure is valid',
            columns: headers
        };
        
    } catch (error) {
        return {
            isValid: false,
            message: `Failed to validate file: ${error.message}`,
            columns: []
        };
    }
}

module.exports = {
    parseXLSFile,
    parseAttendanceRow,
    parseDate,
    parseTime,
    calculateMinutesLate,
    calculateMinutesOvertime,
    calculateAttendanceStatus,
    getMonthString,
    validateXLSStructure,
    isWeekend,
    getDayName
};

