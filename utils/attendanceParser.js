const xlsx = require('xlsx');

/**
 * Parse XLS file and extract attendance data
 * Expected columns: Employee Code, Name, Date, Clock In, Clock Out
 * @param {String} filePath - Path to the XLS file
 * @returns {Array} Array of attendance records
 */
function parseXLSFile(filePath) {
    try {
        // Read the workbook
        const workbook = xlsx.readFile(filePath);
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
            raw: false, // Don't parse dates automatically
            defval: null // Default value for empty cells
        });
        
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
            error: `Failed to parse XLS file: ${error.message}`,
            data: [],
            errors: []
        };
    }
}

/**
 * Parse a single attendance row
 * @param {Object} row - Row data from Excel
 * @param {Number} rowNumber - Row number for error reporting
 * @returns {Object} Parsed attendance record
 */
function parseAttendanceRow(row, rowNumber) {
    // Try different possible column name variations
    const employeeCode = row['Employee Code'] || row['EmployeeCode'] || row['Code'] || row['ID'] || row['AC-No.'] || row['AC-No'] || row['Ac-No'] || row['AC No'] || row['Employee ID'];
    const name = row['Name'] || row['Employee Name'] || row['EmployeeName'];
    const date = row['Date'] || row['date'];
    const clockIn = row['Clock In'] || row['ClockIn'] || row['In'] || row['Time In'] || row['Time'] || row['CheckIn'];
    const clockOut = row['Clock Out'] || row['ClockOut'] || row['Out'] || row['Time Out'] || row['CheckOut'];
    
    // Validate required fields
    if (!employeeCode) {
        throw new Error(`Row ${rowNumber}: Missing Employee Code`);
    }
    
    if (!date) {
        throw new Error(`Row ${rowNumber}: Missing Date`);
    }
    
    if (!clockIn) {
        throw new Error(`Row ${rowNumber}: Missing Clock In time`);
    }
    
    // Parse and validate date
    const parsedDate = parseDate(date);
    if (!parsedDate) {
        throw new Error(`Row ${rowNumber}: Invalid date format: ${date}`);
    }
    
    // Parse times
    const parsedClockIn = parseTime(clockIn);
    if (!parsedClockIn) {
        throw new Error(`Row ${rowNumber}: Invalid Clock In time format: ${clockIn}`);
    }
    
    let parsedClockOut = null;
    if (clockOut) {
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
    if (!dateValue) return null;
    
    // If already a Date object
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
    }
    
    const dateStr = String(dateValue).trim();
    
    // Try parsing different date formats
    const datePatterns = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
    ];
    
    for (const pattern of datePatterns) {
        const match = dateStr.match(pattern);
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
    
    // Try native Date parsing as last resort
    const parsed = new Date(dateStr);
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
    
    if (!clockIn) {
        return { 
            status: 'absent', 
            minutesLate: 0, 
            minutesOvertime: 0,
            missedClockIn: true,
            missedClockOut: missedClockOut
        };
    }
    
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
 * Validate XLS file structure
 * @param {String} filePath 
 * @returns {Object} {isValid, message, columns}
 */
function validateXLSStructure(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get headers (first row)
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        const headers = [];
        
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                headers.push(String(cell.v).trim());
            }
        }
        
        // Check for required columns (flexible matching)
        const hasEmployeeCode = headers.some(h => 
            /employee\s*code|code|id|employee\s*id|ac[-\s]*no\.?|emp[-\s]*no/i.test(h)
        );
        const hasDate = headers.some(h => /date/i.test(h));
        const hasClockIn = headers.some(h => 
            /clock\s*in|time\s*in|in|check\s*in|time|check[-\s]*in/i.test(h)
        );
        
        if (!hasEmployeeCode || !hasDate || !hasClockIn) {
            return {
                isValid: false,
                message: 'Missing required columns. Expected: Employee Code, Date, Clock In (Clock Out optional)',
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

