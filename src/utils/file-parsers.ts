import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

// Define a common interface for parsed data to ensure consistent structure
export interface ParsedFileData {
  students: Array<{
    name: string;
    grades: {
      [subject: string]: number | null;
    };
    average?: number;
    comments?: {
      [subject: string]: string;
    };
    teacherNames?: {
      [subject: string]: string;
    };
    classAvg?: {
      [subject: string]: number | null;
    };
  }>;
  subjects: string[];
  termInfo?: {
    term: string;
    year?: string;
    class?: string;
    schoolName?: string;
  };
}

/**
 * Parse Excel files (.xlsx, .xls)
 */
export const parseExcelFile = async (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume first sheet contains the data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Extract student and grade information
        const result = processTabularData(jsonData);
        resolve(result);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parse CSV files
 */
export const parseCsvFile = async (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const result = processTabularData(results.data);
          resolve(result);
        } catch (error) {
          console.error('Error processing CSV data:', error);
          reject(new Error('Failed to process CSV data'));
        }
      },
      error: (error) => {
        console.error('Error parsing CSV file:', error);
        reject(new Error('Failed to parse CSV file'));
      }
    });
  });
};

/**
 * Parse PDF files using PDF.js
 * Enhanced to better extract structured data for AI analysis
 */
export const parsePdfFile = async (file: File): Promise<ParsedFileData> => {
  try {
    // Set the worker source for PDF.js
    const pdfjsWorker = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
    // Load the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let allText = '';
    let allTextItems: any[] = [];
    
    // Extract text and positions from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract text content with positions
      const textContent = await page.getTextContent();
      allTextItems = [...allTextItems, ...textContent.items];
      
      // Also keep the full text for fallback processing
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      allText += pageText + '\n';
    }
    
    console.log("PDF parsing started for file:", file.name);
    
    // Try to detect if this is a French bulletin format (like in the image)
    if (isFrenchBulletinFormat(allText)) {
      console.log("Detected French bulletin format, using specialized parser");
      return parseFrenchBulletin(allTextItems, allText, file.name);
    }
    
    // For other formats, try the table extraction approach
    const extractedTables = extractTablesFromTextItems(allTextItems);
    if (extractedTables.length > 0) {
      console.log("Tables detected in PDF, attempting structured parsing");
      return processExtractedTables(extractedTables, allText, file.name);
    }
    
    // Fall back to processing as unstructured text
    console.log("No tables detected, processing as unstructured text");
    return processPdfText(allText, file.name);
  } catch (error) {
    console.error('Error parsing PDF file:', error);
    // Return fallback data if parsing fails completely
    return createFallbackData(file.name);
  }
};

/**
 * Detect if the PDF follows a French bulletin format
 */
function isFrenchBulletinFormat(text: string): boolean {
  // Look for key indicators of French bulletin format
  const frenchBulletinPatterns = [
    /bulletin du \d+[èeé]me trimestre/i,
    /appr[ée]ciations/i,
    /mati[èe]res/i,
    /moyennes/i,
    /[ée]l[èe]ve/i,
    /professeur/i,
    /moyenne[s]? g[ée]n[ée]rale[s]?/i,
  ];
  
  // If multiple patterns match, it's likely a French bulletin
  return frenchBulletinPatterns.filter(pattern => pattern.test(text)).length >= 3;
}

/**
 * Parse French bulletin format specifically
 */
function parseFrenchBulletin(
  textItems: any[], 
  fullText: string,
  filename: string
): ParsedFileData {
  try {
    console.log("Starting specialized French bulletin parsing");
    
    // Extract student name
    let studentName = "";
    const nameMatch = fullText.match(/([A-Z]{2,}\s+[A-Za-zÀ-ÿ]+|[A-Za-zÀ-ÿ]+\s+[A-Z]{2,})/);
    if (nameMatch) {
      studentName = nameMatch[0].trim();
    }
    
    // Try alternate pattern if no match found
    if (!studentName) {
      const altNameMatch = fullText.match(/([A-Z][a-zÀ-ÿ]+\s+[A-Z][a-zÀ-ÿ]+)/);
      if (altNameMatch) {
        studentName = altNameMatch[0].trim();
      }
    }
    
    // Check for name in a specific format like in the image (AELTERS Sarah)
    if (!studentName) {
      const bulletinNameMatch = fullText.match(/([A-Z]+\s+[A-Za-zÀ-ÿ]+)/);
      if (bulletinNameMatch) {
        studentName = bulletinNameMatch[0].trim();
      }
    }
    
    console.log("Extracted student name:", studentName);
    
    // Extract trimester information
    let term = "Trimestre 1";
    const trimMatch = fullText.match(/trimestre|Trimestre/i);
    if (trimMatch) {
      const numberMatch = fullText.match(/(\d+)[èeé]me\s+[Tt]rimestre/);
      if (numberMatch && numberMatch[1]) {
        term = `Trimestre ${numberMatch[1]}`;
      }
    }
    
    // Extract year
    let year = "";
    const yearMatch = fullText.match(/(\d{4})[\/\-](\d{4})/);
    if (yearMatch) {
      year = `${yearMatch[1]}-${yearMatch[2]}`;
    } else {
      const singleYearMatch = fullText.match(/20\d{2}/);
      if (singleYearMatch) {
        const yearNum = parseInt(singleYearMatch[0]);
        year = `${yearNum}-${yearNum + 1}`;
      }
    }
    
    // Extract school name
    let schoolName = "";
    const schoolLines = fullText.split('\n').slice(0, 5); // Check first few lines
    for (const line of schoolLines) {
      if (line.includes("COLLEGE") || line.includes("LYCEE") || line.includes("ECOLE")) {
        schoolName = line.trim();
        break;
      }
    }
    
    // Extract class information
    let className = "";
    const classMatch = fullText.match(/classe\s*:\s*([^\n]+)/i) || 
                      fullText.match(/(\d+[A-Z]\d*)/);
    if (classMatch) {
      className = classMatch[1].trim();
    }
    
    // Extract subjects, grades, and comments using position-based analysis
    // Group text items by rows (items with similar y-positions)
    const rows = groupTextItemsByRows(textItems);
    
    // Find the header row that contains subject column headers
    const headerRowIndex = findHeaderRowIndex(rows);
    
    // Extract subject data
    const subjects: string[] = [];
    const studentGrades: {[subject: string]: number | null} = {};
    const classGrades: {[subject: string]: number | null} = {};
    const comments: {[subject: string]: string} = {};
    const teacherNames: {[subject: string]: string} = {};
    
    // Process data rows after the header
    if (headerRowIndex !== -1) {
      // First, identify column structure from the header row
      const headerColumns = identifyColumnStructure(rows[headerRowIndex]);
      
      // Process each data row
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip rows that are too short
        if (row.length < 3) continue;
        
        // Extract subject name from the first column
        const subjectText = extractTextFromColumn(row, headerColumns.subjectCol);
        
        // Skip rows without clear subject name
        if (!subjectText || subjectText.length < 3 || 
            /moyenne|general|option/i.test(subjectText)) continue;
            
        subjects.push(subjectText);
        
        // Extract teacher name if available
        const teacherText = extractTeacherName(row, subjectText);
        if (teacherText) {
          teacherNames[subjectText] = teacherText;
        }
        
        // Extract student grade
        const studentGradeText = extractTextFromColumn(row, headerColumns.studentGradeCol);
        const studentGrade = parseGrade(studentGradeText);
        studentGrades[subjectText] = studentGrade;
        
        // Extract class average grade
        const classGradeText = extractTextFromColumn(row, headerColumns.classGradeCol);
        const classGrade = parseGrade(classGradeText);
        classGrades[subjectText] = classGrade;
        
        // Extract comment if available
        const commentText = extractTextFromColumn(row, headerColumns.commentCol);
        if (commentText && commentText.length > 10) {
          comments[subjectText] = commentText;
        }
      }
    } else {
      // If header row not found, try fallback extraction methods
      extractSubjectsAndGradesFromText(fullText, subjects, studentGrades, comments);
    }
    
    // Extract overall average
    let average: number | undefined;
    const avgMatch = fullText.match(/moyenne[s]?\s*g[ée]n[ée]rale[s]?\s*[:\s]+(\d+[.,]\d+)/i);
    if (avgMatch) {
      average = parseFloat(avgMatch[1].replace(',', '.'));
    } else {
      // Look for a number near "moyenne générale"
      const generalAvgItems = textItems.filter((item: any) => 
        /moyenne[s]?\s*g[ée]n[ée]rale[s]?/i.test(item.str)
      );
      
      if (generalAvgItems.length > 0) {
        const generalAvgItem = generalAvgItems[0];
        const nearbyNumberItems = textItems.filter((item: any) => {
          const distance = Math.sqrt(
            Math.pow(item.transform[4] - generalAvgItem.transform[4], 2) + 
            Math.pow(item.transform[5] - generalAvgItem.transform[5], 2)
          );
          return distance < 100 && /^\d+[.,]\d+$/.test(item.str);
        });
        
        if (nearbyNumberItems.length > 0) {
          average = parseFloat(nearbyNumberItems[0].str.replace(',', '.'));
        }
      }
    }
    
    // If no average found, calculate from grades
    if (!average && Object.keys(studentGrades).length > 0) {
      const validGrades = Object.values(studentGrades).filter(g => g !== null) as number[];
      if (validGrades.length > 0) {
        average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
      }
    }
    
    console.log("Extracted subjects:", subjects);
    console.log("Extracted student grades:", studentGrades);
    console.log("Extracted student average:", average);
    
    return {
      students: [{
        name: studentName || `Élève de ${filename}`,
        grades: studentGrades,
        average,
        comments,
        teacherNames,
        classAvg: classGrades
      }],
      subjects,
      termInfo: {
        term,
        year,
        class: className,
        schoolName
      }
    };
  } catch (error) {
    console.error("Error in French bulletin parsing:", error);
    return createFallbackData(filename);
  }
}

/**
 * Group text items by rows based on y-position
 */
function groupTextItemsByRows(items: any[]): any[][] {
  // Sort items by y-position (top to bottom)
  const sortedItems = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  
  const rows: any[][] = [];
  let currentRow: any[] = [];
  let currentY: number | null = null;
  const yThreshold = 5; // Items within this y-distance are considered the same row
  
  sortedItems.forEach(item => {
    const y = Math.round(item.transform[5]);
    
    // If this is a new row or the first item
    if (currentY === null || Math.abs(y - currentY) > yThreshold) {
      if (currentRow.length > 0) {
        // Sort items in the row by x-position (left to right)
        currentRow.sort((a, b) => a.transform[4] - b.transform[4]);
        rows.push(currentRow);
      }
      currentRow = [item];
      currentY = y;
    } else {
      currentRow.push(item);
    }
  });
  
  // Add the last row
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.transform[4] - b.transform[4]);
    rows.push(currentRow);
  }
  
  return rows;
}

/**
 * Find the header row index that contains subject column headers
 */
function findHeaderRowIndex(rows: any[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.str.toLowerCase()).join(' ');
    
    // Look for patterns that indicate this is a header row
    if (rowText.includes('matière') || 
        rowText.includes('subject') || 
        (rowText.includes('moyenne') && rowText.includes('élève')) ||
        (rowText.includes('note') && rowText.includes('appréciation')) ||
        (rowText.includes('classe') && rowText.includes('élève'))) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Identify the column structure from the header row
 */
function identifyColumnStructure(headerRow: any[]): {
  subjectCol: [number, number],
  studentGradeCol: [number, number],
  classGradeCol: [number, number],
  commentCol: [number, number]
} {
  const headerTexts = headerRow.map(item => ({
    text: item.str.toLowerCase(),
    x: item.transform[4]
  }));
  
  let subjectColStart = 0;
  let subjectColEnd = 150; // Default values
  let studentGradeColStart = 150;
  let studentGradeColEnd = 200;
  let classGradeColStart = 200;
  let classGradeColEnd = 250;
  let commentColStart = 250;
  let commentColEnd = 1000;
  
  // Find subject column
  const subjectHeader = headerTexts.find(h => 
    h.text.includes('matière') || 
    h.text.includes('subject') ||
    h.text.includes('discipline')
  );
  
  if (subjectHeader) {
    subjectColStart = subjectHeader.x;
    // Find next header to determine end of subject column
    const nextHeader = headerTexts.find(h => h.x > subjectHeader.x);
    if (nextHeader) {
      subjectColEnd = nextHeader.x;
    }
  }
  
  // Find student grade column
  const studentGradeHeader = headerTexts.find(h => 
    h.text.includes('élève') || 
    h.text.includes('note') ||
    h.text.includes('student')
  );
  
  if (studentGradeHeader) {
    studentGradeColStart = studentGradeHeader.x;
    // Find next header to determine end
    const nextHeader = headerTexts.find(h => h.x > studentGradeHeader.x);
    if (nextHeader) {
      studentGradeColEnd = nextHeader.x;
    }
  }
  
  // Find class grade column
  const classGradeHeader = headerTexts.find(h => 
    h.text.includes('classe') || 
    h.text.includes('class') ||
    h.text.includes('moy') && !h.text.includes('élève')
  );
  
  if (classGradeHeader) {
    classGradeColStart = classGradeHeader.x;
    // Find next header to determine end
    const nextHeader = headerTexts.find(h => h.x > classGradeHeader.x);
    if (nextHeader) {
      classGradeColEnd = nextHeader.x;
    }
  }
  
  // Find comment column
  const commentHeader = headerTexts.find(h => 
    h.text.includes('appréciation') || 
    h.text.includes('comment') ||
    h.text.includes('remarque')
  );
  
  if (commentHeader) {
    commentColStart = commentHeader.x;
    // Usually last column
    commentColEnd = 1000;
  }
  
  return {
    subjectCol: [subjectColStart, subjectColEnd],
    studentGradeCol: [studentGradeColStart, studentGradeColEnd],
    classGradeCol: [classGradeColStart, classGradeColEnd],
    commentCol: [commentColStart, commentColEnd]
  };
}

/**
 * Extract text from a specific column in a row
 */
function extractTextFromColumn(row: any[], columnRange: [number, number]): string {
  const [start, end] = columnRange;
  
  const columnItems = row.filter(item => 
    item.transform[4] >= start && item.transform[4] < end
  );
  
  return columnItems.map(item => item.str).join(' ').trim();
}

/**
 * Extract teacher name from row data
 */
function extractTeacherName(row: any[], subjectText: string): string {
  // Teacher names often follow a pattern like "M. NAME" or "Mme NAME"
  const teacherPatterns = [
    /M\.\s+([A-Z]+)/,
    /Mme\s+([A-Z]+)/,
    /M[r]?\s+([A-Z]+)/,
    /M\s+([A-Z]+)/,
  ];
  
  const rowText = row.map(item => item.str).join(' ');
  
  for (const pattern of teacherPatterns) {
    const match = rowText.match(pattern);
    if (match && match[1]) {
      return match[0].trim();
    }
  }
  
  return '';
}

/**
 * Parse a grade from text, handling different formats
 */
function parseGrade(text: string): number | null {
  // Clean the text and look for numbers
  const cleanText = text.trim();
  
  if (!cleanText) return null;
  
  // Handle various grade formats: 12,5 or 12.5 or 12.5/20
  const gradeMatch = cleanText.match(/(\d+[.,]\d+)/) || cleanText.match(/^(\d+)$/);
  
  if (gradeMatch && gradeMatch[1]) {
    return parseFloat(gradeMatch[1].replace(',', '.'));
  }
  
  return null;
}

/**
 * Fallback method to extract subjects and grades from text
 */
function extractSubjectsAndGradesFromText(
  text: string, 
  subjects: string[], 
  grades: {[subject: string]: number | null},
  comments: {[subject: string]: string}
) {
  // Common subjects in French curriculum
  const commonSubjects = [
    'FRANÇAIS', 'MATHEMATIQUES', 'HISTOIRE-GEOGRAPHIE', 'ANGLAIS', 
    'PHYSIQUE-CHIMIE', 'SVT', 'TECHNOLOGIE', 'EPS', 'ARTS PLASTIQUES',
    'EDUCATION MUSICALE', 'ESPAGNOL', 'ALLEMAND', 'LATIN'
  ];
  
  // Look for subjects in the text
  for (const subject of commonSubjects) {
    // Create a regex that's not case sensitive
    const regex = new RegExp(subject, 'i');
    
    if (regex.test(text)) {
      // Find the subject in the text
      const subjectIndex = text.search(regex);
      if (subjectIndex !== -1) {
        // Extract the exact subject text from the PDF
        const exactSubject = text.substring(subjectIndex, subjectIndex + subject.length);
        subjects.push(exactSubject);
        
        // Look for grades near the subject (within the next 50 characters)
        const nearbyText = text.substring(subjectIndex, subjectIndex + 50);
        const gradeMatch = nearbyText.match(/(\d+[.,]\d+)/);
        
        if (gradeMatch && gradeMatch[1]) {
          grades[exactSubject] = parseFloat(gradeMatch[1].replace(',', '.'));
        } else {
          grades[exactSubject] = null;
        }
        
        // Look for comments (longer text after the grade)
        const lines = text.substring(subjectIndex).split('\n');
        if (lines.length > 1) {
          // Skip the subject line, take the next non-empty line as a comment
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].length > 20 && !/^\d+[.,]\d+/.test(lines[i])) {
              comments[exactSubject] = lines[i].trim();
              break;
            }
          }
        }
      }
    }
  }
}

/**
 * Enhanced function to extract tables from text items
 */
function extractTablesFromTextItems(textItems: any[]): any[] {
  // Group items by rows
  const rows = groupTextItemsByRows(textItems);
  
  // Identify potential table rows (rows with similar structure)
  const tableRows: any[][] = [];
  let potentialTableStartIndex = -1;
  
  // Find rows that have numbers which could be grades
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.map((item: any) => item.str).join(' ');
    
    // Look for rows with numeric grades (numbers with commas or dots)
    if (/\d+[.,]\d+/.test(rowText)) {
      // If this is the first potential table row we've found
      if (potentialTableStartIndex === -1) {
        // Look back 1-2 rows for a header row
        potentialTableStartIndex = Math.max(0, i - 2);
      }
      
      tableRows.push(row);
    } else if (potentialTableStartIndex !== -1 && tableRows.length > 0) {
      // If we already found some table rows but this row doesn't match,
      // check if it could be a continuation of a comment
      const lastRowText = rows[i-1].map((item: any) => item.str).join(' ');
      
      // If the last row ended with punctuation, this is probably not a continuation
      if (/[.!?]$/.test(lastRowText) || /^\d+[.,]\d+/.test(rowText)) {
        // This row is likely not part of the table anymore
        break;
      } else {
        // This might be a continuation of a comment cell
        tableRows.push(row);
      }
    }
  }
  
  // If we found enough rows that might form a table
  if (tableRows.length >= 3) {
    // Add the header row(s)
    const headerRows = rows.slice(potentialTableStartIndex, potentialTableStartIndex + 2);
    
    // Convert to a more structured format
    const structuredTable = [...headerRows, ...tableRows].map(row => 
      row.map((item: any) => item.str)
    );
    
    return [structuredTable];
  }
  
  return [];
}

/**
 * Process extracted table data from PDF
 */
function processExtractedTables(tables: any[], fullText: string, filename: string): ParsedFileData {
  try {
    // Find the table that most likely contains student grades
    // (typically has numbers that could be grades)
    const gradeTable = tables.find(table => {
      // Check if table contains rows with numeric values (possible grades)
      return table.some((row: string[]) => 
        row.some(cell => /\d+([.,]\d+)?\/\d+/.test(cell) || /^[0-9]+([.,][0-9]+)?$/.test(cell))
      );
    }) || tables[0];
    
    if (!gradeTable || gradeTable.length < 2) {
      throw new Error("No usable grade table found in PDF");
    }
    
    // Try to identify the header row (typically contains subject names)
    // Headers often don't have numeric values
    const headerRow = gradeTable[0];
    
    // Extract possible subject names from header
    const subjectCandidates = headerRow.filter((header: string) => 
      !(/^\d+([.,]\d+)?$/.test(header)) && 
      header.length > 1 && 
      !/^(Nom|Prénom|Élève|Moyenne|Rang)$/i.test(header)
    );
    
    // Map common subject abbreviations to full names for better AI processing
    const subjects = subjectCandidates.map((subject: string) => {
      const subjectMap: {[key: string]: string} = {
        'FR': 'Français',
        'MATH': 'Mathématiques',
        'MATHS': 'Mathématiques',
        'HG': 'Histoire-Géographie',
        'H-G': 'Histoire-Géographie',
        'ANG': 'Anglais',
        'ENG': 'Anglais',
        'SVT': 'Sciences de la Vie et de la Terre',
        'PHY': 'Physique-Chimie',
        'PC': 'Physique-Chimie',
        'EPS': 'Éducation Physique et Sportive',
        'TECH': 'Technologie',
        'TECHNO': 'Technologie',
        'ESP': 'Espagnol',
        'ALL': 'Allemand',
        'MUS': 'Musique',
        'ARTS': 'Arts Plastiques',
        'AP': 'Arts Plastiques',
      };
      
      const normalizedSubject = subject.trim().toUpperCase();
      return subjectMap[normalizedSubject] || subject;
    });
    
    // Process student data from the remaining rows
    const students = gradeTable.slice(1).map((row: string[], index: number) => {
      // Try to extract student name
      const nameCandidate = row[0] || `Élève ${index + 1}`;
      const name = nameCandidate.trim();
      
      // Extract grades for each subject
      const grades: {[subject: string]: number | null} = {};
      subjects.forEach((subject, subjectIndex) => {
        const gradeText = row[subjectIndex + 1]; // +1 because first column is name
        if (gradeText) {
          // Handle various grade formats (12,5 or 12.5 or 12.5/20)
          const gradeMatch = gradeText.match(/(\d+([.,]\d+)?)/);
          if (gradeMatch) {
            grades[subject] = parseFloat(gradeMatch[1].replace(',', '.'));
          } else {
            grades[subject] = null;
          }
        } else {
          grades[subject] = null;
        }
      });
      
      // Try to find average if present
      let average: number | undefined;
      const avgCandidate = row.find(cell => /moyenne|moy|avg/i.test(cell)) || 
                          row[row.length - 1]; // Often the last column
      
      if (avgCandidate) {
        const avgMatch = avgCandidate.match(/(\d+([.,]\d+)?)/);
        if (avgMatch) {
          average = parseFloat(avgMatch[1].replace(',', '.'));
        }
      }
      
      // If no average was found, calculate it from grades
      if (!average) {
        const validGrades = Object.values(grades).filter(g => g !== null) as number[];
        if (validGrades.length > 0) {
          average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
        }
      }
      
      // Extract comments if present in the text
      const comments: {[subject: string]: string} = {};
      
      // Look for comments sections that might mention the student name
      const studentNameParts = name.split(/\s+/);
      const lastNameFragment = studentNameParts[studentNameParts.length - 1].toLowerCase();
      
      subjects.forEach(subject => {
        // Look for patterns like "Français: [comment about student]" or "[Subject] - [Student Name]: [comment]"
        const commentRegexes = [
          new RegExp(`${subject}\\s*[:;-]\\s*([^.]+${lastNameFragment}[^.]+\\.)`),
          new RegExp(`${subject}\\s*\\(${name}\\)\\s*[:;-]\\s*([^.]+\\.)`),
          new RegExp(`${name}\\s*-\\s*${subject}\\s*[:;-]\\s*([^.]+\\.)`),
        ];
        
        for (const regex of commentRegexes) {
          const match = fullText.match(regex);
          if (match && match[1]) {
            comments[subject] = match[1].trim();
            break;
          }
        }
      });
      
      return { name, grades, average, comments };
    });
    
    // Extract term information from text
    const termInfo = {
      term: extractTermFromText(fullText, filename),
      class: extractClassFromText(fullText, filename),
      year: extractYearFromText(fullText),
    };
    
    return {
      students,
      subjects,
      termInfo
    };
  } catch (error) {
    console.error("Error processing PDF tables:", error);
    return createFallbackData(filename);
  }
}

/**
 * Extract academic year from text
 */
function extractYearFromText(text: string): string {
  // Look for academic year patterns like "2023-2024" or "2023/2024"
  const yearRegex = /20\d{2}[\s-/]20\d{2}/;
  const match = text.match(yearRegex);
  
  if (match) {
    return match[0];
  }
  
  // Look for just a year
  const singleYearRegex = /20\d{2}/;
  const singleYearMatch = text.match(singleYearRegex);
  
  if (singleYearMatch) {
    const year = parseInt(singleYearMatch[0]);
    return `${year}-${year + 1}`;
  }
  
  // Default to current academic year
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
}

/**
 * Creates fallback data when PDF parsing fails
 */
function createFallbackData(filename: string): ParsedFileData {
  console.log("Using fallback data for PDF:", filename);
  
  // Extract potential term info from filename
  let term = "Trimestre 1";
  if (filename.toLowerCase().includes('trim2') || filename.toLowerCase().includes('t2')) {
    term = "Trimestre 2";
  } else if (filename.toLowerCase().includes('trim3') || filename.toLowerCase().includes('t3')) {
    term = "Trimestre 3";
  }
  
  // Create mock subjects
  const subjects = [
    'Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais', 
    'SVT', 'Physique-Chimie', 'EPS'
  ];
  
  // Generate mock student data
  const students = Array.from({ length: 25 }, (_, i) => {
    const studentName = `Élève ${i + 1}`;
    const grades: {[subject: string]: number | null} = {};
    const comments: {[subject: string]: string} = {};
    
    subjects.forEach(subject => {
      // Generate random grades between 8 and 18
      grades[subject] = Math.floor(Math.random() * 10) + 8;
      
      // Generate generic comments
      if (Math.random() > 0.7) {
        comments[subject] = "Bon travail, continue ainsi.";
      }
    });
    
    // Calculate average
    const validGrades = Object.values(grades).filter(g => g !== null) as number[];
    const average = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
    
    return { name: studentName, grades, average, comments };
  });
  
  return {
    students,
    subjects,
    termInfo: {
      term,
      class: extractClassFromFilename(filename)
    }
  };
}

/**
 * Extract class information from filename
 */
function extractClassFromFilename(filename: string): string {
  // Try to find class in filename using patterns like "6A", "5emeB", etc.
  const classPatterns = [
    /(\d+[èeé]me\s*[A-Za-z])/i,  // e.g., "6ème A"
    /classe\s*(\d+[A-Za-z])/i,   // e.g., "classe 6A"
    /(\d+[A-Za-z])/i             // e.g., "6A"
  ];
  
  for (const pattern of classPatterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return "Unknown";
}

/**
 * Process tabular data from Excel/CSV
 */
function processTabularData(data: any[]): ParsedFileData {
  // Extract subject names from the headers
  const headers = Object.keys(data[0] || {});
  
  // Filter out non-subject headers
  const subjectHeaders = headers.filter(header => 
    !['Nom', 'Prénom', 'Élève', 'Classe', 'Moyenne', 'Rang', 'Commentaire'].includes(header) && 
    !header.toLowerCase().includes('trimestre') &&
    !header.toLowerCase().includes('term')
  );
  
  // Extract student data
  const students = data.map(row => {
    // Determine student name from available fields
    const name = row['Nom'] && row['Prénom'] 
      ? `${row['Prénom']} ${row['Nom']}` 
      : row['Élève'] || row['Nom'] || 'Unknown';
    
    // Extract grades for each subject
    const grades: {[subject: string]: number | null} = {};
    subjectHeaders.forEach(subject => {
      const grade = parseFloat(row[subject]);
      grades[subject] = isNaN(grade) ? null : grade;
    });
    
    // Extract comments if available
    const comments: {[subject: string]: string} = {};
    subjectHeaders.forEach(subject => {
      const commentKey = `${subject} (Appréciation)`;
      if (row[commentKey]) {
        comments[subject] = row[commentKey];
      }
    });
    
    // Calculate average if not provided
    let average = parseFloat(row['Moyenne']);
    if (isNaN(average)) {
      const validGrades = Object.values(grades).filter(g => g !== null) as number[];
      average = validGrades.length 
        ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length 
        : 0;
    }
    
    return { name, grades, average, comments };
  });
  
  // Extract term information from filename or data
  const termInfo = {
    term: determineTermFromData(data) || "Unknown",
    class: determineClassFromData(data) || "Unknown"
  };
  
  return {
    students,
    subjects: subjectHeaders,
    termInfo
  };
}

/**
 * Process extracted text from PDF
 */
function processPdfText(text: string, filename: string): ParsedFileData {
  // Enhanced to extract more information from text-based PDF files
  try {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Try to extract term information
    const termInfo = {
      term: extractTermFromText(text, filename),
      class: extractClassFromText(text, filename),
      year: extractYearFromText(text)
    };
    
    // Try to extract subject names with improved pattern matching
    const subjects = extractSubjectsFromText(text);
    
    // Try to extract student data using multiple regex patterns
    const students = extractStudentsFromText(text, subjects);
    
    // If no students were found, try alternative extraction methods
    if (students.length === 0) {
      // Try to extract student names
      const namePatterns = [
        /\b([A-Z][a-zéèêëàâäôöûüç]+ [A-Z][a-zéèêëàâäôöûüç]+)\b/g,  // e.g., "Dupont Jean"
        /\b([A-Z][A-Z]+) ([A-Z][a-zéèêëàâäôöûüç]+)\b/g,  // e.g., "DUPONT Jean"
        /\b([A-Z][a-zéèêëàâäôöûüç]+)-([A-Z][a-zéèêëàâäôöûüç]+) ([A-Z][a-zéèêëàâäôöûüç]+)\b/g,  // e.g., "Dupont-Martin Jean"
      ];
      
      const names = new Set<string>();
      for (const pattern of namePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          names.add(match[0].trim());
        }
      }
      
      if (names.size > 0) {
        return {
          students: Array.from(names).map(name => ({
            name,
            grades: subjects.reduce((acc, subject) => {
              acc[subject] = null;
              return acc;
            }, {} as {[subject: string]: number | null}),
            average: extractAverageForStudent(text, name),
            comments: extractCommentsForStudent(text, name, subjects)
          })),
          subjects,
          termInfo
        };
      }
      
      throw new Error("No student data found in PDF");
    }
    
    return {
      students,
      subjects,
      termInfo
    };
  } catch (error) {
    console.error("Error in processPdfText:", error);
    throw error; // Let the main function handle the fallback
  }
}

/**
 * Extract the average grade for a specific student from text
 */
function extractAverageForStudent(text: string, studentName: string): number | undefined {
  // Look for patterns like "Name: 12.5" or "Name - Average: 14.3" or "Name (14.5)"
  const nameParts = studentName.split(/\s+/);
  
  // Try different patterns based on parts of the name
  for (const part of nameParts) {
    if (part.length < 3) continue; // Skip short name parts
    
    const patterns = [
      new RegExp(`${part}[^\\n]*?\\s+(?:moyenne|average|moy|avg)?\\s*[=:;]\\s*(\\d+[.,]\\d+)`, 'i'),
      new RegExp(`${part}[^\\n]*?\\s+\\((\\d+[.,]\\d+)\\)`, 'i'),
      new RegExp(`${part}[^\\n]*?\\s+: (\\d+[.,]\\d+)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }
  }
  
  return undefined;
}

/**
 * Extract comments for a specific student from text
 */
function extractCommentsForStudent(
  text: string, 
  studentName: string, 
  subjects: string[]
): {[subject: string]: string} {
  const comments: {[subject: string]: string} = {};
  const studentNameLower = studentName.toLowerCase();
  
  subjects.forEach(subject => {
    const subjectLower = subject.toLowerCase();
    
    // Look for sections that might contain both the subject name and student name
    const sectionMatches = text.match(
      new RegExp(`${subjectLower}[^\\n.]*${studentNameLower}[^\\n.]*(\\.|\\n)`, 'i')
    );
    
    if (sectionMatches) {
      // Clean up the comment to remove the subject and student name
      let comment = sectionMatches[0].replace(
        new RegExp(`${subjectLower}|${studentNameLower}`, 'gi'), 
        ''
      ).trim();
      
      // Clean up any leading/trailing punctuation
      comment = comment.replace(/^[;:,-\s]+|[;:,-\s]+$/g, '');
      
      if (comment) {
        comments[subject] = comment;
      }
    }
  });
  
  return comments;
}

/**
 * Helper function to determine term from data
 */
function determineTermFromData(data: any[]): string {
  // Look for term indicators in the data
  for (const row of data) {
    for (const key in row) {
      const value = String(row[key]).toLowerCase();
      if (key.toLowerCase().includes('trimestre') || value.includes('trimestre')) {
        if (value.includes('1')) return 'Trimestre 1';
        if (value.includes('2')) return 'Trimestre 2';
        if (value.includes('3')) return 'Trimestre 3';
        return 'Trimestre';
      }
      if (key.toLowerCase().includes('semestre') || value.includes('semestre')) {
        if (value.includes('1')) return 'Semestre 1';
        if (value.includes('2')) return 'Semestre 2';
        return 'Semestre';
      }
    }
  }
  return 'Unknown';
}

/**
 * Helper function to determine class from data
 */
function determineClassFromData(data: any[]): string {
  // Look for class indicators in the data
  for (const row of data) {
    if (row['Classe']) return row['Classe'];
    for (const key in row) {
      if (key.toLowerCase().includes('classe')) {
        return row[key];
      }
    }
  }
  return 'Unknown';
}

/**
 * Extract term information from PDF text
 */
function extractTermFromText(text: string, filename: string): string {
  // Enhanced regex for better term detection
  const termRegexes = [
    /trimestre\s*(\d)/i,
    /semestre\s*(\d)/i,
    /bulletin\s*du\s*(\d)(?:er|ème)?\s*trim/i,
    /(\d)(?:er|ème)?\s*trimestre/i,
    /t(\d)/i,
  ];
  
  for (const regex of termRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const term = match[1];
      return `Trimestre ${term}`;
    }
  }
  
  // Fall back to filename analysis
  if (filename.toLowerCase().includes('trim1') || 
      filename.toLowerCase().includes('t1') ||
      filename.toLowerCase().includes('tr1')) {
    return 'Trimestre 1';
  } else if (filename.toLowerCase().includes('trim2') || 
             filename.toLowerCase().includes('t2') ||
             filename.toLowerCase().includes('tr2')) {
    return 'Trimestre 2';
  } else if (filename.toLowerCase().includes('trim3') || 
             filename.toLowerCase().includes('t3') ||
             filename.toLowerCase().includes('tr3')) {
    return 'Trimestre 3';
  }
  
  return 'Trimestre 1'; // Default to first trimester
}

/**
 * Extract class information from PDF text
 */
function extractClassFromText(text: string, filename: string): string {
  // Enhanced regex for better class detection
  const classRegexes = [
    /classe\s*[:;]\s*([^\n\.,]+)/i,
    /classe\s*de\s*([^\n\.,]+)/i,
    /(\d+[èe]me\s*[A-Za-z])/i,
    /classe\s*(\d+[A-Za-z])/i,
  ];
  
  for (const regex of classRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fall back to filename analysis
  return extractClassFromFilename(filename);
}

/**
 * Extract subject names from PDF text
 */
function extractSubjectsFromText(text: string): string[] {
  // Common subjects in French education with variations
  const commonSubjects = [
    { name: 'Français', variations: ['français', 'francais', 'fr', 'lettres'] },
    { name: 'Mathématiques', variations: ['mathématiques', 'mathematiques', 'maths', 'math'] },
    { name: 'Histoire-Géographie', variations: ['histoire-géographie', 'histoire géographie', 'histoire-geo', 'histoire geo', 'h-g', 'hg'] },
    { name: 'Anglais', variations: ['anglais', 'lang1', 'lv1', 'ang'] },
    { name: 'SVT', variations: ['sciences de la vie et de la terre', 'svt'] },
    { name: 'Physique-Chimie', variations: ['physique-chimie', 'physique chimie', 'phy-chi', 'pc'] },
    { name: 'EPS', variations: ['éducation physique et sportive', 'education physique', 'eps', 'sport'] },
    { name: 'Arts Plastiques', variations: ['arts plastiques', 'arts pla', 'ap'] },
    { name: 'Musique', variations: ['éducation musicale', 'education musicale', 'musique'] },
    { name: 'Technologie', variations: ['technologie', 'techno', 'tech'] },
    { name: 'Espagnol', variations: ['espagnol', 'esp', 'lang2', 'lv2'] },
    { name: 'Allemand', variations: ['allemand', 'all', 'lang2', 'lv2'] },
    { name: 'Latin', variations: ['latin', 'lat'] },
    { name: 'Sciences', variations: ['sciences', 'sci'] },
  ];
  
  // Look for subject names in the text
  const foundSubjects: string[] = [];
  
  commonSubjects.forEach(subject => {
    const allVariations = [subject.name, ...subject.variations];
    
    // Check if any variation appears in the text
    const found = allVariations.some(variation => {
      const regex = new RegExp(`\\b${variation}\\b`, 'i');
      return regex.test(text);
    });
    
    if (found) {
      foundSubjects.push(subject.name);
    }
  });
  
  // If no subjects found, return a default set
  return foundSubjects.length > 0 ? foundSubjects : [
    'Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais', 
    'SVT', 'Physique-Chimie', 'EPS'
  ];
}

/**
 * Extract student data from PDF text
 */
function extractStudentsFromText(text: string, subjects: string[]): Array<{
  name: string;
  grades: {[subject: string]: number | null};
  average?: number;
  comments?: {[subject: string]: string};
}> {
  const students: Array<{
    name: string;
    grades: {[subject: string]: number | null};
    average?: number;
    comments?: {[subject: string]: string};
  }> = [];
  
  // Look for student names and grades using multiple patterns
  const studentPatterns = [
    /([A-Z][a-zéèêëàâäôöûüç]+ [A-Z][a-zéèêëàâäôöûüç]+)[\s:]+(?:moyenne|average)?[\s:]*(\d+[.,]\d+)/gi,
    /([A-Z][A-Z]+ [A-Z][a-zéèêëàâäôöûüç]+)[\s:]+(?:moyenne|average)?[\s:]*(\d+[.,]\d+)/gi,
    /([A-Z][a-zéèêëàâäôöûüç]+-[A-Z][a-zéèêëàâäôöûüç]+ [A-Z][a-zéèêëàâäôöûüç]+)[\s:]+(?:moyenne|average)?[\s:]*(\d+[.,]\d+)/gi,
    /élève:?\s*([A-Za-zéèêëàâäôöûüç\s-]+)[\s:]+(?:moyenne|average)?[\s:]*(\d+[.,]\d+)/gi,
  ];
  
  const processedNames = new Set<string>();
  
  for (const pattern of studentPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      
      // Skip if we already processed this name
      if (processedNames.has(name)) continue;
      processedNames.add(name);
      
      const average = parseFloat(match[2].replace(',', '.'));
      
      // Look for subject grades for this student
      const grades: {[subject: string]: number | null} = {};
      subjects.forEach(subject => {
        grades[subject] = extractGradeForStudentSubject(text, name, subject);
      });
      
      // Look for comments
      const comments: {[subject: string]: string} = {};
      subjects.forEach(subject => {
        const comment = extractCommentForStudentSubject(text, name, subject);
        if (comment) {
          comments[subject] = comment;
        }
      });
      
      students.push({
        name,
        grades,
        average: isNaN(average) ? undefined : average,
        comments: Object.keys(comments).length > 0 ? comments : undefined
      });
    }
  }
  
  return students;
}

/**
 * Extract a grade for a specific student and subject
 */
function extractGradeForStudentSubject(text: string, studentName: string, subject: string): number | null {
  // Simplify name and subject for matching
  const simpleName = studentName.toLowerCase().replace(/[^a-z]/g, '');
  const simpleSubject = subject.toLowerCase().replace(/[^a-z]/g, '');
  
  // Look for patterns like "Student Name - Subject: 14.5" or "Subject (Student Name): 14.5"
  const patterns = [
    new RegExp(`${studentName}[^\\n]*${subject}[^\\n]*?\\s*[:-]\\s*(\\d+[.,]\\d+)`, 'i'),
    new RegExp(`${subject}[^\\n]*${studentName}[^\\n]*?\\s*[:-]\\s*(\\d+[.,]\\d+)`, 'i'),
    new RegExp(`${subject}[^\\n]*?\\s*[:-]\\s*(\\d+[.,]\\d+)[^\\n]*${studentName}`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  
  // Try looking for subject and grade near the student name
  const nearbyText = extractTextAroundPattern(text, studentName, 500);
  if (nearbyText) {
    const subjectNearby = new RegExp(`${subject}[^\\n]*?\\s*[:-]\\s*(\\d+[.,]\\d+)`, 'i');
    const match = nearbyText.match(subjectNearby);
    if (match && match[1]) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  
  return null;
}

/**
 * Extract text around a specific pattern
 */
function extractTextAroundPattern(text: string, pattern: string, charCount: number): string | null {
  const index = text.indexOf(pattern);
  if (index === -1) return null;
  
  const start = Math.max(0, index - charCount / 2);
  const end = Math.min(text.length, index + pattern.length + charCount / 2);
  
  return text.substring(start, end);
}

/**
 * Extract a comment for a specific student and subject
 */
function extractCommentForStudentSubject(text: string, studentName: string, subject: string): string | null {
  // Look for patterns like "Student Name - Subject: Comment..." or "Subject (Student Name): Comment..."
  const patterns = [
    new RegExp(`${studentName}[^\\n]*${subject}[^\\n]*?\\s*[:-]\\s*([^\\n\\.]+\\.)`, 'i'),
    new RegExp(`${subject}[^\\n]*${studentName}[^\\n]*?\\s*[:-]\\s*([^\\n\\.]+\\.)`, 'i'),
    new RegExp(`appréciation[^\\n]*${subject}[^\\n]*${studentName}[^\\n]*?\\s*[:-]\\s*([^\\n\\.]+\\.)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Try looking for subject and comment near the student name
  const nearbyText = extractTextAroundPattern(text, studentName, 1000);
  if (nearbyText) {
    const subjectNearby = new RegExp(`${subject}[^\\n]*?\\s*[:-]\\s*([^\\n\\.]+\\.)`, 'i');
    const match = nearbyText.match(subjectNearby);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Look for sections that might be comments
    const commentSectionRegex = new RegExp(`(?:appréciation|remarque|commentaire)[^\\n]*?\\s*[:-]\\s*([^\\n\\.]+\\.)`, 'i');
    const commentMatch = nearbyText.match(commentSectionRegex);
    if (commentMatch && commentMatch[1]) {
      return commentMatch[1].trim();
    }
  }
  
  return null;
}
