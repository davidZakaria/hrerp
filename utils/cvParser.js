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
     * Extract education information - ENHANCED VERSION
     */
    extractEducation(text) {
        const education = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Find education section
        let startIdx = -1;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            // Start of education section
            if (line.match(/^(education|academic|qualifications?|academic background)$/i) || 
                line.match(/education|academic background/i) && lines[i].length < 50) {
                startIdx = i + 1;
            }
            // End of education section
            if (startIdx > 0 && i > startIdx && 
                (line.match(/^(experience|work|employment|skills|projects|certifications?|languages?)$/i) ||
                 line.match(/^(professional experience|work history|career|technical skills)$/i))) {
                endIdx = i;
                    break;
            }
        }
        
        if (startIdx === -1) {
            console.log('❌ Education section not found in resume');
            return [{university: '', majorAndDegree: '', yearOfCompletion: ''}];
        }
        
        console.log(`📚 Education section found (lines ${startIdx} to ${endIdx})`);
        
        // Extract education entries
        const educationLines = lines.slice(startIdx, endIdx);
        console.log('Education section text:', educationLines.join(' | '));
        let currentEntry = {};
        
        for (let i = 0; i < educationLines.length; i++) {
            const line = educationLines[i];
            
            // Look for degree patterns
            const degreeMatch = line.match(/(bachelor|master|phd|doctorate|b\.?s\.?c?\.?|m\.?s\.?c?\.?|mba|diploma|associate|B\.?A\.?|M\.?A\.?|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?)/i);
            
            // Look for university/college
            const universityMatch = line.match(/(university|college|institute|school|polytechnic|academy)/i);
            
            // Look for years (graduation year)
            const yearMatch = line.match(/\b(19|20)\d{2}\b/);
            
            // Look for date ranges like "2018 - 2022" or "Sept 2018 - May 2022"
            const dateRangeMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
            
            if (degreeMatch || universityMatch || yearMatch) {
                // If we have a degree, it's likely a new entry
                if (degreeMatch) {
                    if (currentEntry.majorAndDegree) {
                        education.push({...currentEntry});
                        currentEntry = {};
                    }
                    
                    // Extract full degree with major
                    let degreeText = line;
                    // Check if next line might be the major/field
                    if (i + 1 < educationLines.length && educationLines[i + 1].length < 100) {
                        degreeText += ' in ' + educationLines[i + 1];
                    }
                    
                    currentEntry.majorAndDegree = degreeText.replace(/\s+/g, ' ').trim();
                }
                
                // Extract university
                if (universityMatch && !currentEntry.university) {
                    currentEntry.university = line;
                }
                
                // Extract year
                if (dateRangeMatch) {
                    currentEntry.yearOfCompletion = parseInt(dateRangeMatch[2] === 'present' || dateRangeMatch[2] === 'current' ? new Date().getFullYear() : dateRangeMatch[2]);
                } else if (yearMatch && !currentEntry.yearOfCompletion) {
                    currentEntry.yearOfCompletion = parseInt(yearMatch[0]);
                }
            }
        }
        
        // Push last entry
        if (currentEntry.majorAndDegree || currentEntry.university) {
            education.push(currentEntry);
        }
        
        console.log(`📚 Extracted ${education.length} education entries`);
        
        // Fill in missing fields with empty strings
        const finalEducation = education.map((edu, idx) => {
            console.log(`  Education ${idx + 1}:`, {
                university: edu.university || '(empty)',
                degree: edu.majorAndDegree || '(empty)',
                year: edu.yearOfCompletion || '(empty)'
            });
            return {
                university: edu.university || '',
                majorAndDegree: edu.majorAndDegree || '',
                yearOfCompletion: edu.yearOfCompletion || ''
            };
        });
        
        return finalEducation.length > 0 ? finalEducation : [{university: '', majorAndDegree: '', yearOfCompletion: ''}];
    }

    /**
     * Extract professional experience - ENHANCED VERSION
     */
    extractExperience(text) {
        const experience = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Find experience section
        let startIdx = -1;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            // Start of experience section
            if (line.match(/^(experience|work|employment|career|professional experience|work history)$/i) ||
                line.match(/professional experience|work experience/i) && lines[i].length < 50) {
                startIdx = i + 1;
            }
            // End of experience section
            if (startIdx > 0 && i > startIdx && 
                (line.match(/^(education|skills|projects?|certifications?|languages?|references?)$/i) ||
                 line.match(/^(technical skills|academic background|volunteer)$/i))) {
                endIdx = i;
                    break;
            }
        }
        
        if (startIdx === -1) {
            console.log('❌ Experience section not found in resume');
            return [{companyName: '', jobTitle: '', from: '', to: '', salary: ''}];
        }
        
        console.log(`💼 Experience section found (lines ${startIdx} to ${endIdx})`);
        
        // Extract experience entries
        const experienceLines = lines.slice(startIdx, endIdx);
        console.log('Experience section text:', experienceLines.join(' | '));
        let currentEntry = {};
        
        for (let i = 0; i < experienceLines.length; i++) {
            const line = experienceLines[i];
            
            // Look for job titles (usually starts with capital letters and doesn't have "at" or company indicators)
            const jobTitleIndicators = ['manager', 'engineer', 'developer', 'analyst', 'specialist', 'coordinator', 
                                       'director', 'consultant', 'designer', 'administrator', 'officer', 'lead', 
                                       'senior', 'junior', 'associate', 'intern', 'supervisor', 'head', 'chief'];
            const hasJobTitle = jobTitleIndicators.some(title => line.toLowerCase().includes(title));
            
            // Look for company names (usually has company keywords or is after "at")
            const companyIndicators = ['inc', 'ltd', 'llc', 'corp', 'company', 'group', 'technologies', 
                                       'solutions', 'systems', 'services', 'consulting', 'pvt'];
            const hasCompanyKeyword = companyIndicators.some(keyword => line.toLowerCase().includes(keyword));
            
            // Look for date ranges
            const dateRangeMatch = line.match(/(\w+\s+)?(19|20)\d{2}\s*[-–]\s*(\w+\s+)?(19|20)\d{2}|present|current/i);
            const singleDateMatch = line.match(/(19|20)\d{2}/);
            
            // Parse dates more carefully
            let fromDate = null;
            let toDate = null;
            if (dateRangeMatch) {
                const fullMatch = dateRangeMatch[0];
                const years = fullMatch.match(/(19|20)\d{2}/g);
                if (years && years.length >= 1) {
                    fromDate = new Date(years[0], 0, 1);
                    if (years.length >= 2) {
                        toDate = new Date(years[1], 11, 31);
                    } else if (/present|current/i.test(fullMatch)) {
                        toDate = null; // Currently working
                    }
                }
            }
            
            // Detect new entry (usually starts with job title or has dates)
            if ((hasJobTitle || dateRangeMatch) && (currentEntry.jobTitle || currentEntry.companyName)) {
                experience.push({...currentEntry});
                currentEntry = {};
            }
            
            // Extract job title (usually the first line or line with job keywords)
            if (hasJobTitle && !currentEntry.jobTitle && line.length < 100) {
                currentEntry.jobTitle = line.split(/\s+at\s+/i)[0].trim();
            }
            
            // Extract company name
            if (!currentEntry.companyName) {
                // Check if line has "at Company Name"
                const atMatch = line.match(/\s+at\s+(.+?)(\s*[-–]|\s*\d{4}|$)/i);
                if (atMatch) {
                    currentEntry.companyName = atMatch[1].trim();
                } else if (hasCompanyKeyword && line.length < 100) {
                    currentEntry.companyName = line;
                } else if (i > 0 && currentEntry.jobTitle && !currentEntry.companyName) {
                    // Company name often comes right after job title
                    currentEntry.companyName = line.split(/\s*[-–]\s*/)[0].trim();
                }
            }
            
            // Extract dates
            if (dateRangeMatch && !currentEntry.from) {
                currentEntry.from = fromDate || '';
                currentEntry.to = toDate;
                currentEntry.salary = null;
            }
        }
        
        // Push last entry
        if (currentEntry.jobTitle || currentEntry.companyName) {
            experience.push(currentEntry);
        }
        
        console.log(`💼 Extracted ${experience.length} experience entries`);
        
        // Fill in missing fields
        const finalExperience = experience.map((exp, idx) => {
            console.log(`  Experience ${idx + 1}:`, {
                company: exp.companyName || '(empty)',
                title: exp.jobTitle || '(empty)',
                from: exp.from || '(empty)',
                to: exp.to || '(empty)'
            });
            return {
                companyName: exp.companyName || '',
                jobTitle: exp.jobTitle || '',
                from: exp.from || '',
                to: exp.to === undefined ? '' : exp.to,
                salary: exp.salary || ''
            };
        });
        
        return finalExperience.length > 0 ? finalExperience : [{companyName: '', jobTitle: '', from: '', to: '', salary: ''}];
    }

    /**
     * Parse text resume (fallback for non-PDF formats)
     */
    async parseText(text) {
        return this.extractInformation(text);
    }
}

module.exports = new CVParser();

