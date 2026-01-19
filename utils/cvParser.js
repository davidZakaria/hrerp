const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Parse resume/CV and extract information
 * This is a basic implementation that uses regex patterns
 * For production, consider using AI services like OpenAI GPT for better extraction
 */
class CVParser {
    constructor() {
        // Common patterns for extracting information
        this.patterns = {
            email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
            phone: /(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}/g,
            linkedin: /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi,
            
            // Education keywords
            education: /(bachelor|master|phd|doctorate|degree|diploma|b\.?sc|m\.?sc|mba|university|college)/gi,
            
            // Experience keywords
            experience: /(worked|work experience|professional experience|employment|position|role)/gi,
            
            // Years pattern
            years: /\b(19|20)\d{2}\b/g,
            
            // Salary patterns
            salary: /\$?\d{1,3}(,\d{3})*(\.\d{2})?|\d+k/gi
        };
    }

    /**
     * Parse PDF resume
     */
    async parsePDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            const text = data.text;
            
            return this.extractInformation(text);
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new Error('Failed to parse resume');
        }
    }

    /**
     * Extract structured information from text
     */
    extractInformation(text) {
        const extracted = {
            fullName: this.extractName(text),
            email: this.extractEmail(text),
            phoneNumber: this.extractPhone(text),
            linkedinProfile: this.extractLinkedIn(text),
            address: this.extractAddress(text),
            dateOfBirth: this.extractDateOfBirth(text),
            educationBackground: this.extractEducation(text),
            professionalBackground: this.extractExperience(text)
        };

        // Log extracted data for debugging
        console.log('📄 CV Parsing Results:');
        console.log('Name:', extracted.fullName || '❌ Not found');
        console.log('Email:', extracted.email || '❌ Not found');
        console.log('Phone:', extracted.phoneNumber || '❌ Not found');
        console.log('LinkedIn:', extracted.linkedinProfile || '❌ Not found');
        console.log('Address:', extracted.address || '❌ Not found');
        console.log('DOB:', extracted.dateOfBirth || '❌ Not found');
        console.log('Education entries:', extracted.educationBackground.length);
        console.log('Experience entries:', extracted.professionalBackground.length);

        return extracted;
    }

    /**
     * Extract email - ENHANCED
     */
    extractEmail(text) {
        // Enhanced email pattern
        const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        const emails = text.match(emailPattern);
        
        if (emails && emails.length > 0) {
            // Filter out common false positives
            const validEmail = emails.find(email => 
                !email.match(/example\.com|test\.com|sample\.com/i) &&
                email.length < 50
            );
            if (validEmail) {
                console.log('✅ Email found:', validEmail);
                return validEmail;
            }
        }
        
        console.log('❌ Email not found');
        return '';
    }

    /**
     * Extract phone number - ENHANCED
     */
    extractPhone(text) {
        // Enhanced phone patterns
        const phonePatterns = [
            /(?:phone|mobile|cell|tel|telephone)\s*:?\s*([\+\d][\d\s\-\(\)\.]{8,20})/i,
            /(\+?\d{1,4}[\s\-\.]?\(?\d{2,4}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4})/g
        ];
        
        // Try labeled patterns first
        for (let pattern of phonePatterns.slice(0, 1)) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const digits = match[1].replace(/\D/g, '');
                if (digits.length >= 10 && digits.length <= 15) {
                    console.log('✅ Phone found via label:', match[1].trim());
                    return match[1].trim();
                }
            }
        }
        
        // Try general pattern
        const phones = text.match(phonePatterns[1]);
        if (phones && phones.length > 0) {
            // Return the first phone that looks valid (10-15 digits)
            for (let phone of phones) {
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 10 && digits.length <= 15) {
                    console.log('✅ Phone found:', phone.trim());
                    return phone.trim();
                }
            }
        }
        
        console.log('❌ Phone not found');
        return '';
    }

    /**
     * Extract LinkedIn profile - ENHANCED
     */
    extractLinkedIn(text) {
        // Enhanced LinkedIn patterns
        const linkedinPatterns = [
            /(?:linkedin|linked-in)\s*:?\s*((?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i,
            /((?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/gi
        ];
        
        for (let pattern of linkedinPatterns) {
            const match = text.match(pattern);
            if (match) {
                const url = match[1] || match[0];
                // Ensure it has proper protocol
                const fullUrl = url.startsWith('http') ? url : 'https://' + url.replace(/^\/\//, '');
                console.log('✅ LinkedIn found:', fullUrl);
                return fullUrl;
            }
        }
        
        console.log('❌ LinkedIn not found');
        return '';
    }

    /**
     * Extract name - SUPER ENHANCED VERSION
     */
    extractName(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Method 1: Look for explicit name labels
        const nameLabelPatterns = [
            /(?:full\s+)?name\s*:+\s*([A-Z][a-zA-Z\s\.]+)/i,
            /candidate\s*:?\s*([A-Z][a-zA-Z\s\.]+)/i,
            /applicant\s*:?\s*([A-Z][a-zA-Z\s\.]+)/i
        ];
        
        for (let pattern of nameLabelPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const name = match[1].trim().split(/\s+/).slice(0, 4).join(' ');
                if (name.length > 3 && name.length < 50) {
                    console.log('✅ Name found via label pattern:', name);
                    return name;
                }
            }
        }
        
        // Method 2: First line that looks like a name (most common)
        for (let i = 0; i < Math.min(lines.length, 8); i++) {
            const line = lines[i];
            const words = line.split(/\s+/);
            
            // Skip common resume headers
            if (line.match(/^(resume|curriculum vitae|cv|profile|portfolio|contact|email|phone|address)/i)) {
                continue;
            }
            
            // Name characteristics:
            // - 2 to 4 words
            // - Each word starts with capital letter
            // - Contains mostly letters
            // - Not too long (< 50 chars)
            // - Doesn't contain numbers or special chars (except dots for initials)
            
            if (words.length >= 2 && words.length <= 4 && line.length >= 5 && line.length < 50) {
                const hasProperCase = words.every(word => /^[A-Z][a-zA-Z\.]*$/.test(word));
                const hasNoNumbers = !line.match(/\d/);
                const hasNoEmail = !line.match(/@/);
                const notAllCaps = line !== line.toUpperCase() || words.length === 2;
                
                if (hasProperCase && hasNoNumbers && hasNoEmail && notAllCaps) {
                    console.log('✅ Name found via first-line detection:', line);
                    return line;
                }
            }
        }
        
        // Method 3: Look for capitalized words near the top (more lenient)
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i];
            const words = line.split(/\s+/);
            
            if (words.length >= 2 && words.length <= 3) {
                // Check if all words start with capital
                const allCapitalized = words.every(word => /^[A-Z]/.test(word));
                const noSpecialChars = !line.match(/[@#$%^&*()_+=\[\]{}|\\;:'",.<>?\/]/);
                
                if (allCapitalized && noSpecialChars && line.length < 40) {
                    console.log('✅ Name found via capitalization pattern:', line);
                    return line;
                }
            }
        }
        
        // Method 4: Fallback - extract from contact info patterns
        const contactMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[|\n]\s*(?:email|phone|linkedin|contact)/i);
        if (contactMatch && contactMatch[1]) {
            console.log('✅ Name found via contact section:', contactMatch[1]);
            return contactMatch[1].trim();
        }
        
        console.log('❌ Name not found - using empty string');
        return '';
    }
    
    /**
     * Extract address - ENHANCED
     */
    extractAddress(text) {
        // Look for common address patterns
        const addressPatterns = [
            /(?:address|residence|location)\s*:+\s*([^\n]{10,100})/i,
            /(?:address|location)\s+([A-Z0-9][^\n]{10,100})/i,
            /\d+\s+[A-Z][a-z]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|city)[^\n]*/i
        ];
        
        for (let pattern of addressPatterns) {
            const match = text.match(pattern);
            if (match) {
                const address = match[1] ? match[1].trim() : match[0].trim();
                if (address.length > 10 && address.length < 150) {
                    console.log('✅ Address found:', address);
                    return address;
                }
            }
        }
        
        console.log('❌ Address not found');
        return '';
    }
    
    /**
     * Extract date of birth - ENHANCED
     */
    extractDateOfBirth(text) {
        // Look for DOB patterns with various formats
        const dobPatterns = [
            /(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s*date|born)\s*:?\s*(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/i,
            /(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s*date|born)\s*:?\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
            /(?:born|birth)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i
        ];
        
        for (let pattern of dobPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                console.log('✅ DOB found:', match[1]);
                return match[1];
            }
        }
        
        console.log('❌ DOB not found');
        return '';
    }

    /**
     * Extract education information - SUPER ENHANCED VERSION
     */
    extractEducation(text) {
        const education = [];
        // Normalize text: replace multiple spaces/newlines with single space, then split
        const normalizedText = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Enhanced section detection with more patterns
        let startIdx = -1;
        let endIdx = lines.length;
        
        const educationSectionPatterns = [
            /^(education|academic|qualifications?|academic background|educational background|academics)$/i,
            /^education\s+and\s+qualifications?$/i,
            /^academic\s+qualifications?$/i
        ];
        
        const endSectionPatterns = [
            /^(experience|work|employment|skills|projects|certifications?|languages?|references?|awards|publications)$/i,
            /^(professional experience|work history|career|technical skills|work experience|employment history)$/i,
            /^(professional|work|employment)\s+(experience|history|background)$/i
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase().trim();
            
            // Check for education section start
            if (startIdx === -1) {
                for (const pattern of educationSectionPatterns) {
                    if (pattern.test(line) && lines[i].length < 60) {
                        startIdx = i + 1;
                        console.log(`📚 Found education section header: "${lines[i]}" at line ${i}`);
                        break;
                    }
                }
            }
            
            // Check for section end (only after finding start)
            if (startIdx > 0 && i > startIdx) {
                for (const pattern of endSectionPatterns) {
                    if (pattern.test(line) && lines[i].length < 60) {
                        endIdx = i;
                        console.log(`📚 Education section ends at: "${lines[i]}" (line ${i})`);
                        break;
                    }
                }
                if (endIdx < lines.length) break;
            }
        }
        
        if (startIdx === -1) {
            console.log('❌ Education section not found - trying fallback method');
            // Fallback: look for degree keywords anywhere in first half of document
            const firstHalf = lines.slice(0, Math.floor(lines.length / 2));
            for (let i = 0; i < firstHalf.length; i++) {
                if (firstHalf[i].match(/(bachelor|master|phd|doctorate|b\.?s\.?c?\.?|m\.?s\.?c?\.?|mba|diploma)/i)) {
                    startIdx = Math.max(0, i - 2);
                    endIdx = Math.min(lines.length, i + 20);
                    console.log(`📚 Fallback: Found education around line ${i}`);
                    break;
                }
            }
        }
        
        if (startIdx === -1 || startIdx >= endIdx) {
            console.log('❌ Education section not found in resume');
            return [{university: '', majorAndDegree: '', yearOfCompletion: ''}];
        }
        
        console.log(`📚 Education section found (lines ${startIdx} to ${endIdx})`);
        
        // Extract education entries with improved parsing
        const educationLines = lines.slice(startIdx, endIdx);
        console.log('Education section text:', educationLines.slice(0, 10).join(' | '));
        
        let currentEntry = {};
        let entryLines = [];
        
        for (let i = 0; i < educationLines.length; i++) {
            const line = educationLines[i];
            const lineLower = line.toLowerCase();
            
            // Enhanced degree patterns
            const degreePatterns = [
                /(bachelor|bachelor'?s|b\.?s\.?c?\.?|b\.?a\.?|b\.?tech|b\.?e\.?|b\.?eng)/i,
                /(master|master'?s|m\.?s\.?c?\.?|m\.?a\.?|m\.?tech|m\.?e\.?|m\.?eng|mba|m\.?sc)/i,
                /(phd|ph\.?d\.?|doctorate|d\.?phil)/i,
                /(diploma|associate|certificate)/i
            ];
            
            const hasDegree = degreePatterns.some(pattern => pattern.test(line));
            const hasUniversity = /(university|college|institute|school|polytechnic|academy|faculty)/i.test(line);
            
            // Enhanced year patterns
            const yearPatterns = [
                /\b(19|20)\d{2}\b/,  // Simple year
                /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i,  // Date range
                /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,  // Month year
                /(\d{1,2})\/(\d{4})/  // Month/Year
            ];
            
            let yearMatch = null;
            for (const pattern of yearPatterns) {
                const match = line.match(pattern);
                if (match) {
                    yearMatch = match;
                    break;
                }
            }
            
            // Detect new entry: degree keyword or clear separation
            const isNewEntry = hasDegree && (currentEntry.majorAndDegree || currentEntry.university);
            
            if (isNewEntry && currentEntry.majorAndDegree) {
                // Save previous entry
                this.finalizeEducationEntry(currentEntry, entryLines);
                education.push({...currentEntry});
                currentEntry = {};
                entryLines = [];
            }
            
            // Collect lines for current entry
            if (hasDegree || hasUniversity || yearMatch || line.length > 5) {
                entryLines.push(line);
            }
            
            // Extract degree and major
            if (hasDegree && !currentEntry.majorAndDegree) {
                let degreeText = line;
                // Check next 2 lines for major/field
                for (let j = 1; j <= 2 && i + j < educationLines.length; j++) {
                    const nextLine = educationLines[i + j];
                    if (nextLine.length < 100 && !/(university|college|institute)/i.test(nextLine)) {
                        degreeText += ' in ' + nextLine;
                        i += j; // Skip processed lines
                        break;
                    }
                }
                currentEntry.majorAndDegree = degreeText.replace(/\s+/g, ' ').trim();
            }
            
            // Extract university (usually on same or next line after degree)
            if (hasUniversity && !currentEntry.university) {
                // Try to extract clean university name
                let uniName = line;
                // Remove common prefixes/suffixes
                uniName = uniName.replace(/^(at|from|studied at|graduated from)\s+/i, '');
                // Remove trailing dates/punctuation
                uniName = uniName.replace(/\s*[-–—]\s*\d{4}.*$/, '').trim();
                if (uniName.length > 3 && uniName.length < 150) {
                    currentEntry.university = uniName;
                }
            }
            
            // Extract year (prefer date ranges, then single years)
            if (yearMatch && !currentEntry.yearOfCompletion) {
                if (yearMatch[0].match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
                    // Date range - use end year
                    const endYear = yearMatch[2] || yearMatch[0].match(/\d{4}/g)?.[1];
                    currentEntry.yearOfCompletion = endYear && !/present|current/i.test(endYear) 
                        ? parseInt(endYear) 
                        : new Date().getFullYear();
                } else {
                    // Single year - extract it
                    const year = yearMatch[0].match(/\d{4}/);
                    if (year) {
                        currentEntry.yearOfCompletion = parseInt(year[0]);
                    }
                }
            }
        }
        
        // Finalize last entry
        if (currentEntry.majorAndDegree || currentEntry.university) {
            this.finalizeEducationEntry(currentEntry, entryLines);
            education.push(currentEntry);
        }
        
        console.log(`📚 Extracted ${education.length} education entries`);
        
        // Clean and format entries
        const finalEducation = education.map((edu, idx) => {
            const cleaned = {
                university: (edu.university || '').replace(/\s+/g, ' ').trim(),
                majorAndDegree: (edu.majorAndDegree || '').replace(/\s+/g, ' ').trim(),
                yearOfCompletion: edu.yearOfCompletion || ''
            };
            console.log(`  Education ${idx + 1}:`, cleaned);
            return cleaned;
        });
        
        return finalEducation.length > 0 ? finalEducation : [{university: '', majorAndDegree: '', yearOfCompletion: ''}];
    }
    
    /**
     * Helper to finalize education entry by extracting missing info from collected lines
     */
    finalizeEducationEntry(entry, lines) {
        if (!entry.university && lines.length > 0) {
            // Try to find university in collected lines
            for (const line of lines) {
                if (/(university|college|institute|school|polytechnic|academy)/i.test(line)) {
                    entry.university = line.replace(/\s*[-–—]\s*\d{4}.*$/, '').trim();
                    break;
                }
            }
        }
        
        if (!entry.yearOfCompletion && lines.length > 0) {
            // Try to find year in collected lines
            for (const line of lines) {
                const yearMatch = line.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    entry.yearOfCompletion = parseInt(yearMatch[0]);
                    break;
                }
            }
        }
    }

    /**
     * Extract professional experience - SUPER ENHANCED VERSION
     */
    extractExperience(text) {
        const experience = [];
        // Normalize text
        const normalizedText = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Enhanced section detection
        let startIdx = -1;
        let endIdx = lines.length;
        
        const experienceSectionPatterns = [
            /^(experience|work|employment|career|professional experience|work history|employment history)$/i,
            /^work\s+experience$/i,
            /^professional\s+background$/i,
            /^employment\s+history$/i
        ];
        
        const endSectionPatterns = [
            /^(education|skills|projects?|certifications?|languages?|references?|awards|publications|volunteer)$/i,
            /^(technical skills|academic background|academic qualifications|academics)$/i,
            /^(summary|objective|profile|about)$/i
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase().trim();
            
            // Check for experience section start
            if (startIdx === -1) {
                for (const pattern of experienceSectionPatterns) {
                    if (pattern.test(line) && lines[i].length < 60) {
                        startIdx = i + 1;
                        console.log(`💼 Found experience section header: "${lines[i]}" at line ${i}`);
                        break;
                    }
                }
            }
            
            // Check for section end
            if (startIdx > 0 && i > startIdx) {
                for (const pattern of endSectionPatterns) {
                    if (pattern.test(line) && lines[i].length < 60) {
                        endIdx = i;
                        console.log(`💼 Experience section ends at: "${lines[i]}" (line ${i})`);
                        break;
                    }
                }
                if (endIdx < lines.length) break;
            }
        }
        
        if (startIdx === -1) {
            console.log('❌ Experience section not found - trying fallback method');
            // Fallback: look for job title keywords in middle section
            const middleStart = Math.floor(lines.length * 0.2);
            const middleEnd = Math.floor(lines.length * 0.8);
            for (let i = middleStart; i < middleEnd; i++) {
                if (/(manager|engineer|developer|analyst|specialist|director|consultant)/i.test(lines[i])) {
                    startIdx = Math.max(0, i - 2);
                    endIdx = Math.min(lines.length, i + 30);
                    console.log(`💼 Fallback: Found experience around line ${i}`);
                    break;
                }
            }
        }
        
        if (startIdx === -1 || startIdx >= endIdx) {
            console.log('❌ Experience section not found in resume');
            return [{companyName: '', jobTitle: '', from: '', to: '', salary: ''}];
        }
        
        console.log(`💼 Experience section found (lines ${startIdx} to ${endIdx})`);
        
        // Extract experience entries
        const experienceLines = lines.slice(startIdx, endIdx);
        console.log('Experience section text:', experienceLines.slice(0, 10).join(' | '));
        
        let currentEntry = {};
        let entryLines = [];
        
        // Enhanced job title patterns
        const jobTitlePatterns = [
            /(senior|junior|lead|chief|head|principal|associate|assistant)?\s*(manager|engineer|developer|analyst|specialist|coordinator|director|consultant|designer|administrator|officer|supervisor|executive|architect|scientist|researcher|developer|programmer|tester|qa|sales|marketing|hr|accountant|auditor)/i,
            /(software|web|front.?end|back.?end|full.?stack|devops|data|business|product|project|operations|technical)/i
        ];
        
        // Enhanced company indicators
        const companyIndicators = ['inc', 'ltd', 'llc', 'corp', 'company', 'group', 'technologies', 
                                   'solutions', 'systems', 'services', 'consulting', 'pvt', 'limited',
                                   'enterprises', 'industries', 'holdings', 'international'];
        
        for (let i = 0; i < experienceLines.length; i++) {
            const line = experienceLines[i];
            const lineLower = line.toLowerCase();
            
            // Enhanced date range patterns
            const datePatterns = [
                /(\w+\s+)?(19|20)\d{2}\s*[-–—]\s*(\w+\s+)?(19|20)\d{2}/i,  // 2018 - 2022
                /(\w+\s+)?(19|20)\d{2}\s*[-–—]\s*(present|current|now)/i,  // 2020 - Present
                /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\s*[-–—]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,  // Jan 2018 - Dec 2022
                /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\s*[-–—]\s*(present|current)/i,  // Jan 2020 - Present
                /\b(19|20)\d{2}\b/  // Single year
            ];
            
            let dateMatch = null;
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    dateMatch = match;
                    break;
                }
            }
            
            const hasJobTitle = jobTitlePatterns.some(pattern => pattern.test(line));
            const hasCompanyKeyword = companyIndicators.some(keyword => lineLower.includes(keyword));
            const hasAtKeyword = /\s+at\s+/i.test(line);
            
            // Detect new entry: date range or job title with existing entry
            const isNewEntry = (dateMatch || hasJobTitle) && 
                              (currentEntry.jobTitle || currentEntry.companyName) &&
                              entryLines.length > 0;
            
            if (isNewEntry) {
                // Finalize previous entry
                this.finalizeExperienceEntry(currentEntry, entryLines);
                experience.push({...currentEntry});
                currentEntry = {};
                entryLines = [];
            }
            
            // Collect lines for current entry
            if (hasJobTitle || hasCompanyKeyword || hasAtKeyword || dateMatch || line.length > 5) {
                entryLines.push(line);
            }
            
            // Extract job title
            if (hasJobTitle && !currentEntry.jobTitle) {
                let title = line;
                // Remove "at Company" part
                title = title.split(/\s+at\s+/i)[0];
                // Remove date ranges
                title = title.replace(/\s*[-–—]\s*(\d{4}|present|current).*$/i, '').trim();
                // Remove company keywords if accidentally included
                title = title.replace(/\s+(inc|ltd|llc|corp|company)$/i, '').trim();
                if (title.length > 3 && title.length < 100) {
                    currentEntry.jobTitle = title;
                }
            }
            
            // Extract company name
            if (!currentEntry.companyName) {
                // Pattern 1: "Job Title at Company Name"
                const atMatch = line.match(/\s+at\s+([^–—\-]+?)(\s*[-–—]\s*|\s*\d{4}|$)/i);
                if (atMatch) {
                    let company = atMatch[1].trim();
                    // Clean up company name
                    company = company.replace(/\s*[-–—]\s*.*$/, '').trim();
                    if (company.length > 2 && company.length < 150) {
                        currentEntry.companyName = company;
                    }
                }
                // Pattern 2: Company on separate line (after job title)
                else if (hasCompanyKeyword && line.length < 150 && currentEntry.jobTitle) {
                    let company = line;
                    // Remove dates
                    company = company.replace(/\s*[-–—]\s*(\d{4}|present|current).*$/i, '').trim();
                    if (company.length > 2) {
                        currentEntry.companyName = company;
                    }
                }
                // Pattern 3: Company name on its own line
                else if (hasCompanyKeyword && !hasJobTitle && line.length < 150 && i > 0) {
                    currentEntry.companyName = line.replace(/\s*[-–—]\s*.*$/, '').trim();
                }
            }
            
            // Extract dates
            if (dateMatch && !currentEntry.from) {
                const dateStr = dateMatch[0];
                const years = dateStr.match(/\b(19|20)\d{2}\b/g);
                
                if (years && years.length >= 1) {
                    // Format: YYYY-MM-DD for from date
                    const fromYear = parseInt(years[0]);
                    currentEntry.from = `${fromYear}-01-01`;
                    
                    if (years.length >= 2) {
                        const toYear = parseInt(years[1]);
                        currentEntry.to = `${toYear}-12-31`;
                    } else if (/present|current|now/i.test(dateStr)) {
                        currentEntry.to = ''; // Currently working
                    }
                }
            }
        }
        
        // Finalize last entry
        if (currentEntry.jobTitle || currentEntry.companyName) {
            this.finalizeExperienceEntry(currentEntry, entryLines);
            experience.push(currentEntry);
        }
        
        console.log(`💼 Extracted ${experience.length} experience entries`);
        
        // Clean and format entries
        const finalExperience = experience.map((exp, idx) => {
            const cleaned = {
                companyName: (exp.companyName || '').replace(/\s+/g, ' ').trim(),
                jobTitle: (exp.jobTitle || '').replace(/\s+/g, ' ').trim(),
                from: exp.from || '',
                to: exp.to === undefined ? '' : exp.to,
                salary: exp.salary || ''
            };
            console.log(`  Experience ${idx + 1}:`, cleaned);
            return cleaned;
        });
        
        return finalExperience.length > 0 ? finalExperience : [{companyName: '', jobTitle: '', from: '', to: '', salary: ''}];
    }
    
    /**
     * Helper to finalize experience entry by extracting missing info from collected lines
     */
    finalizeExperienceEntry(entry, lines) {
        // Try to extract missing job title
        if (!entry.jobTitle && lines.length > 0) {
            for (const line of lines) {
                if (/(manager|engineer|developer|analyst|specialist|director|consultant)/i.test(line)) {
                    const title = line.split(/\s+at\s+/i)[0].replace(/\s*[-–—]\s*.*$/, '').trim();
                    if (title.length > 3 && title.length < 100) {
                        entry.jobTitle = title;
                        break;
                    }
                }
            }
        }
        
        // Try to extract missing company
        if (!entry.companyName && lines.length > 0) {
            for (const line of lines) {
                const atMatch = line.match(/\s+at\s+([^–—\-]+?)(\s*[-–—]|\s*\d{4}|$)/i);
                if (atMatch) {
                    entry.companyName = atMatch[1].trim();
                    break;
                }
            }
        }
        
        // Try to extract missing dates
        if (!entry.from && lines.length > 0) {
            for (const line of lines) {
                const yearMatch = line.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    entry.from = `${parseInt(yearMatch[0])}-01-01`;
                    break;
                }
            }
        }
    }

    /**
     * Parse text resume (fallback for non-PDF formats)
     */
    async parseText(text) {
        return this.extractInformation(text);
    }
}

module.exports = new CVParser();

