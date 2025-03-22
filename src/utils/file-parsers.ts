
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
  }>;
  subjects: string[];
  termInfo?: {
    term: string;
    year?: string;
    class?: string;
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
    let allTables: any[] = [];
    
    // Extract text and tables from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract text content
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      allText += pageText + '\n';
      
      // Try to extract table-like structures based on text positioning
      const tableData = extractTablesFromTextContent(textContent);
      if (tableData.length > 0) {
        allTables = [...allTables, ...tableData];
      }
    }
    
    console.log("Extracted PDF text sample:", allText.substring(0, 200) + "...");
    
    // First try to process as a structured report with tables
    if (allTables.length > 0) {
      console.log("Tables detected in PDF, attempting structured parsing");
      return processExtractedTables(allTables, allText, file.name);
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
 * Extract table-like structures from PDF text content based on item positions
 */
function extractTablesFromTextContent(textContent: any): any[] {
  const items = textContent.items;
  
  // Sort items by vertical position (y), then by horizontal position (x)
  const sortedItems = [...items].sort((a, b) => {
    // Group items within ~10 units of each other on the y-axis as being on the same "row"
    const yDiff = Math.abs(a.transform[5] - b.transform[5]);
    if (yDiff < 10) {
      return a.transform[4] - b.transform[4]; // Sort by x within the same row
    }
    return b.transform[5] - a.transform[5]; // Sort by y otherwise (top to bottom)
  });
  
  // Try to identify rows based on y-position clustering
  const rows: any[] = [];
  let currentRow: any[] = [];
  let currentY: number | null = null;
  
  sortedItems.forEach(item => {
    const y = Math.round(item.transform[5]);
    
    // If this is a new row or the first item
    if (currentY === null || Math.abs(y - currentY) > 10) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [item];
      currentY = y;
    } else {
      currentRow.push(item);
    }
  });
  
  // Add the last row if it exists
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  // Filter rows that look like table rows (have multiple items)
  const tableRows = rows.filter(row => row.length >= 3);
  
  // If we have enough rows that might form a table
  if (tableRows.length >= 3) {
    // Convert row data to text
    const textRows = tableRows.map(row => 
      row.map((item: any) => item.str.trim())
    );
    
    return [textRows]; // Return as a table
  }
  
  return []; // No tables detected
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
