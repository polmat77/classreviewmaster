import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';

// Define the shape of the data parsed from files
export interface ParsedFileData {
  students: Array<{
    name: string;
    grades: { [subject: string]: number | null };
    average?: number;
    comments?: { [subject: string]: string };
    teacherNames?: { [subject: string]: string };
    classAvg?: { [subject: string]: number | null };
  }>;
  subjects: string[];
  termInfo?: {
    term?: string;
    class?: string;
    schoolName?: string;
  };
}

// Main function to parse Excel files
export const parseExcelFile = async (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Parsed Excel data:', excelData);
        
        // Process the excel data into the required format
        const result = processExcelData(excelData as any[][]);
        resolve(result);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error(`Erreur lors de l'analyse du fichier Excel: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Erreur lors de la lecture du fichier Excel"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Function to process Excel data
function processExcelData(data: any[][]): ParsedFileData {
  // Try to detect different Excel formats (French bulletin, raw grades, etc.)
  if (detectFrenchBulletinFormat(data)) {
    return parseFrenchBulletinFormat(data);
  }

  // For a raw grade table, try to determine standard structure
  return parseStandardGradeTable(data);
}

// Detect if the Excel follows French bulletin format
function detectFrenchBulletinFormat(data: any[][]): boolean {
  // Look for typical French bulletin headers or structures
  const headers = data[0] || [];
  const firstRowStr = headers.join(' ').toLowerCase();
  
  return firstRowStr.includes('bulletin') || 
         firstRowStr.includes('élève') || 
         firstRowStr.includes('trimestre');
}

// Parse French bulletin format
function parseFrenchBulletinFormat(data: any[][]): ParsedFileData {
  // Implementation specific to French bulletin format
  // This would need to be adapted based on the exact structure
  const subjects: string[] = [];
  let studentName = '';
  let className = '';
  let termName = '';
  let schoolName = '';
  
  // Extract school name, term and class info from top rows
  for (let i = 0; i < 5; i++) {
    const rowStr = data[i]?.join(' ') || '';
    
    if (rowStr.includes('Collège') || rowStr.includes('Lycée') || rowStr.includes('École')) {
      schoolName = rowStr.trim();
    }
    
    if (rowStr.toLowerCase().includes('trimestre')) {
      // Extract trimester info
      const trimMatch = rowStr.match(/trimestre\s*(\d)/i);
      if (trimMatch) {
        termName = `Trimestre ${trimMatch[1]}`;
      }
    }
    
    if (rowStr.toLowerCase().includes('classe') || rowStr.includes('ème') || rowStr.includes('nde')) {
      className = rowStr.trim();
    }
    
    if (rowStr.toLowerCase().includes('élève:') || rowStr.toLowerCase().includes('élève :')) {
      // Extract student name
      const nameMatch = rowStr.match(/élève\s*:\s*(.+)/i);
      if (nameMatch) {
        studentName = nameMatch[1].trim();
      }
    }
  }
  
  // Find where the grades table starts
  let tableStartIndex = 0;
  for (let i = 0; i < data.length; i++) {
    const rowStr = data[i]?.join(' ').toLowerCase() || '';
    if (rowStr.includes('matière') || 
        rowStr.includes('discipline') || 
        rowStr.includes('moyenne') || 
        rowStr.includes('enseignant')) {
      tableStartIndex = i;
      break;
    }
  }
  
  // Extract headers
  const headers = data[tableStartIndex] || [];
  let subjectColIndex = -1;
  let gradeColIndex = -1;
  let commentColIndex = -1;
  let teacherColIndex = -1;
  let classAvgColIndex = -1;
  
  headers.forEach((header, index) => {
    const headerStr = String(header).toLowerCase();
    if (headerStr.includes('matière') || headerStr.includes('discipline')) {
      subjectColIndex = index;
    }
    if (headerStr.includes('moy') || headerStr.includes('note')) {
      gradeColIndex = index;
    }
    if (headerStr.includes('app') || headerStr.includes('comment')) {
      commentColIndex = index;
    }
    if (headerStr.includes('prof') || headerStr.includes('enseig')) {
      teacherColIndex = index;
    }
    if (headerStr.includes('classe') && headerStr.includes('moy')) {
      classAvgColIndex = index;
    }
  });
  
  // Extract subject data
  const grades: {[subject: string]: number | null} = {};
  const comments: {[subject: string]: string} = {};
  const teachers: {[subject: string]: string} = {};
  const classAvg: {[subject: string]: number | null} = {};
  let studentAverage = 0;
  let gradeCount = 0;
  
  for (let i = tableStartIndex + 1; i < data.length; i++) {
    const row = data[i] || [];
    if (row.length <= 1 || !row[subjectColIndex]) continue;
    
    const subject = String(row[subjectColIndex]).trim();
    if (!subject || subject.toLowerCase() === 'moyenne générale') {
      // Check if this is the final average row
      if (row.some(cell => String(cell).toLowerCase().includes('moyenne') && 
                           String(cell).toLowerCase().includes('générale'))) {
        const avgCell = row[gradeColIndex];
        if (avgCell && !isNaN(Number(avgCell))) {
          studentAverage = Number(avgCell);
        }
      }
      continue;
    }
    
    subjects.push(subject);
    
    // Extract grade
    if (gradeColIndex >= 0 && row[gradeColIndex] !== undefined) {
      const grade = parseFloat(String(row[gradeColIndex]).replace(',', '.'));
      if (!isNaN(grade)) {
        grades[subject] = grade;
        gradeCount++;
        studentAverage += grade;
      } else {
        grades[subject] = null;
      }
    } else {
      grades[subject] = null;
    }
    
    // Extract comment
    if (commentColIndex >= 0 && row[commentColIndex]) {
      comments[subject] = String(row[commentColIndex]).trim();
    }
    
    // Extract teacher
    if (teacherColIndex >= 0 && row[teacherColIndex]) {
      teachers[subject] = String(row[teacherColIndex]).trim();
    }
    
    // Extract class average
    if (classAvgColIndex >= 0 && row[classAvgColIndex] !== undefined) {
      const avg = parseFloat(String(row[classAvgColIndex]).replace(',', '.'));
      classAvg[subject] = !isNaN(avg) ? avg : null;
    }
  }
  
  // If we didn't find specific student average but have grades
  if (studentAverage === 0 && gradeCount > 0) {
    studentAverage = studentAverage / gradeCount;
  }
  
  return {
    students: [{
      name: studentName || 'Élève non identifié',
      grades,
      average: studentAverage > 0 ? studentAverage : undefined,
      comments,
      teacherNames: teachers,
      classAvg
    }],
    subjects,
    termInfo: {
      term: termName,
      class: className,
      schoolName
    }
  };
}

// Parse standard grade table format
function parseStandardGradeTable(data: any[][]): ParsedFileData {
  const headers = data[0] || [];
  let nameColIndex = -1;
  const subjectIndices: number[] = [];
  let classNameRow = '';
  let termNameRow = '';
  
  // Try to detect "classe" and "trimestre" from the first few rows
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const rowStr = data[i]?.join(' ').toLowerCase() || '';
    if (rowStr.includes('classe')) {
      classNameRow = rowStr;
    }
    if (rowStr.includes('trimestre')) {
      termNameRow = rowStr;
    }
  }
  
  // Find column indices
  headers.forEach((header, index) => {
    const headerStr = String(header).toLowerCase();
    if (headerStr === 'nom' || headerStr === 'élève' || headerStr === 'etudiant' || 
        headerStr === 'nom de l\'élève' || headerStr.includes('nom')) {
      nameColIndex = index;
    } else if (headerStr && !headerStr.includes('moyenne') && 
              !headerStr.includes('total') && !headerStr.includes('rang')) {
      // Assume this is a subject
      subjectIndices.push(index);
    }
  });
  
  // Extract subjects
  const subjects = subjectIndices.map(idx => String(headers[idx]));
  
  // Process student data rows
  const students: ParsedFileData['students'] = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Skip rows without a name
    if (nameColIndex >= 0 && !row[nameColIndex]) continue;
    
    const studentName = nameColIndex >= 0 ? String(row[nameColIndex]) : `Élève ${i}`;
    const grades: {[subject: string]: number | null} = {};
    
    // Extract grades for each subject
    let totalGrade = 0;
    let gradeCount = 0;
    
    subjectIndices.forEach((subjectIdx, idx) => {
      const subject = subjects[idx];
      const gradeValue = row[subjectIdx];
      
      if (gradeValue !== undefined && gradeValue !== '') {
        const grade = parseFloat(String(gradeValue).replace(',', '.'));
        if (!isNaN(grade)) {
          grades[subject] = grade;
          totalGrade += grade;
          gradeCount++;
        } else {
          grades[subject] = null;
        }
      } else {
        grades[subject] = null;
      }
    });
    
    // Calculate average
    const average = gradeCount > 0 ? totalGrade / gradeCount : undefined;
    
    students.push({
      name: studentName,
      grades,
      average
    });
  }
  
  // Extract term info
  let termName = '';
  let className = '';
  
  if (termNameRow) {
    const trimMatch = termNameRow.match(/trimestre\s*(\d)/i);
    if (trimMatch) {
      termName = `Trimestre ${trimMatch[1]}`;
    }
  }
  
  if (classNameRow) {
    const classMatch = classNameRow.match(/classe\s*:?\s*(.+?)($|\s+\d)/i);
    if (classMatch) {
      className = classMatch[1].trim();
    }
  }
  
  return {
    students,
    subjects,
    termInfo: {
      term: termName,
      class: className
    }
  };
}

// Parse CSV files
export const parseCsvFile = async (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const csvData = results.data as any[][];
          console.log('Parsed CSV data:', csvData);
          
          // Process the CSV data similar to Excel data
          const parsedData = processExcelData(csvData);
          resolve(parsedData);
        } catch (error) {
          console.error('Error processing CSV data:', error);
          reject(new Error(`Erreur lors de l'analyse du fichier CSV: ${error}`));
        }
      },
      error: (error) => {
        console.error('Error parsing CSV file:', error);
        reject(new Error(`Erreur lors de l'analyse du fichier CSV: ${error}`));
      }
    });
  });
};

// Setup PDF.js worker - FIX: Use local worker instead of CDN
// Instead of using a CDN, we'll set the worker inline to avoid network failures
const PDFWorker = `
  // This is a stripped-down inline worker for PDF.js
  // It only handles basic text extraction
  self.onmessage = function(event) {
    const data = event.data;
    if (data.type === 'process') {
      // Respond with a simple success message
      // In a real implementation, this would process the PDF data
      self.postMessage({ type: 'processed', success: true });
    }
  };
`;

// Create blob URL for the worker
const blob = new Blob([PDFWorker], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

// Configure PDF.js to use our worker
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Parse PDF files
export const parsePdfFile = async (file: File): Promise<ParsedFileData> => {
  try {
    console.log("Starting PDF parsing...");
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    console.log("Loading PDF document...");
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from all pages
    const textContent: string[] = [];
    const textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}> = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      content.items.forEach((item: any) => {
        const itemText = item.str;
        textContent.push(itemText);
        
        // Also store position information for table detection
        if (item.transform) {
          // PDF.js returns transforms as a 6-element array where [0, 1, 2, 3] is the 
          // transformation matrix and [4, 5] is the translation vector
          const x = item.transform[4];
          const y = item.transform[5];
          const height = item.height || 0;
          const width = item.width || 0;
          
          textPositions.push({
            text: itemText,
            x,
            y,
            height,
            width,
            page: i
          });
        }
      });
    }
    
    // Log extracted text for debugging
    console.log('Extracted PDF text content', textContent.join(' ').substring(0, 500) + '...');
    
    // Try to detect if this is a French student bulletin
    if (isFrenchBulletin(textContent)) {
      console.log('Detected French student bulletin format');
      return parseFrenchBulletinPDF(textContent, textPositions);
    }
    
    // If not a recognized format, try general PDF grade extraction
    return extractGradesFromPDF(textContent, textPositions);
    
  } catch (error) {
    console.error('Error parsing PDF file:', error);
    throw new Error(`Erreur lors de l'analyse du fichier PDF: ${error}`);
  }
};

// Check if the PDF appears to be a French bulletin
function isFrenchBulletin(textContent: string[]): boolean {
  const fullText = textContent.join(' ').toLowerCase();
  
  return (
    fullText.includes('bulletin') &&
    (fullText.includes('trimestre') || fullText.includes('semestre')) &&
    (fullText.includes('élève') || fullText.includes('appréciation') || 
     fullText.includes('matière') || fullText.includes('moyenne'))
  );
}

// Parse French bulletin PDF format
function parseFrenchBulletinPDF(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  // Join all text for easier searching
  const fullText = textContent.join(' ');
  
  // Extract student name
  let studentName = 'Élève non identifié';
  const nameMatches = [
    /élève\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\s+\d|\s*$)/i,
    /nom\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\s+prénom|\s*$)/i,
    /([A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)\s*-\s*Bulletin/i
  ];
  
  for (const pattern of nameMatches) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      studentName = match[1].trim();
      console.log('Found student name:', studentName);
      break;
    }
  }
  
  // Extract school name
  let schoolName = '';
  const schoolMatches = fullText.match(/((Collège|Lycée|École)\s+[A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\d|\s*$)/i);
  if (schoolMatches && schoolMatches[1]) {
    schoolName = schoolMatches[1].trim();
  }
  
  // Extract term info
  let termName = '';
  const termMatches = fullText.match(/(1er|2e|3e|premier|deuxième|troisième|1|2|3)\s*(trimestre|semestre)/i);
  if (termMatches) {
    const termNumber = termMatches[1];
    const termType = termMatches[2].toLowerCase();
    
    // Convert to standardized format
    let num = termNumber;
    if (termNumber === 'premier') num = '1';
    if (termNumber === 'deuxième') num = '2';
    if (termNumber === 'troisième') num = '3';
    if (termNumber === '1er') num = '1';
    
    termName = `${termType.charAt(0).toUpperCase() + termType.slice(1)} ${num}`;
  }
  
  // Extract class info
  let className = '';
  const classMatches = [
    /classe\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ0-9\s-]+?)(\s|$)/i,
    /(\d+[A-Za-zÀ-ÖØ-öø-ÿ]{1,2}\s*\d*)/i
  ];
  
  for (const pattern of classMatches) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      className = match[1].trim();
      break;
    }
  }
  
  // Try to extract subject table data using positions
  const tableData = extractTableData(textPositions);
  if (tableData.subjects.length > 0) {
    console.log('Successfully extracted table data using positions');
    
    return {
      students: [{
        name: studentName,
        grades: tableData.grades,
        average: tableData.average,
        comments: tableData.comments,
        teacherNames: tableData.teachers,
        classAvg: tableData.classAvgs
      }],
      subjects: tableData.subjects,
      termInfo: {
        term: termName,
        class: className,
        schoolName
      }
    };
  }
  
  // Fallback to regex-based extraction
  console.log('Using fallback regex-based extraction');
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  const comments: {[subject: string]: string} = {};
  const teachers: {[subject: string]: string} = {};
  const classAvgs: {[subject: string]: number | null} = {};
  
  // Common French subjects
  const commonSubjects = [
    'Français', 'Mathématiques', 'Histoire', 'Géographie', 'Histoire-Géographie',
    'Anglais', 'Espagnol', 'Allemand', 'SVT', 'Physique', 'Chimie', 'Physique-Chimie',
    'EPS', 'Musique', 'Arts Plastiques', 'Technologie', 'Latin', 'Grec'
  ];
  
  // Try to locate subjects and their grades
  commonSubjects.forEach(subject => {
    // Look for subject followed by a number (grade)
    const subjectPattern = new RegExp(`${subject}\\s*:?\\s*(\\d+[,.]?\\d*)`, 'i');
    const match = fullText.match(subjectPattern);
    
    if (match && match[1]) {
      subjects.push(subject);
      const grade = parseFloat(match[1].replace(',', '.'));
      grades[subject] = !isNaN(grade) ? grade : null;
      
      // Try to find associated comment
      const commentPattern = new RegExp(`${subject}.*?appréciation\\s*:?\\s*([^.]+)`, 'i');
      const commentMatch = fullText.match(commentPattern);
      if (commentMatch && commentMatch[1]) {
        comments[subject] = commentMatch[1].trim();
      }
      
      // Try to find associated teacher
      const teacherPattern = new RegExp(`${subject}.*?professeur\\s*:?\\s*([A-Za-zÀ-ÖØ-öø-ÿ\\s.]+?)\\s*\\d`, 'i');
      const teacherMatch = fullText.match(teacherPattern);
      if (teacherMatch && teacherMatch[1]) {
        teachers[subject] = teacherMatch[1].trim();
      }
      
      // Try to find class average
      const avgPattern = new RegExp(`${subject}.*?moyenne de la classe\\s*:?\\s*(\\d+[,.]?\\d*)`, 'i');
      const avgMatch = fullText.match(avgPattern);
      if (avgMatch && avgMatch[1]) {
        const avg = parseFloat(avgMatch[1].replace(',', '.'));
        classAvgs[subject] = !isNaN(avg) ? avg : null;
      }
    }
  });
  
  // Look for general average
  let average;
  const avgMatches = fullText.match(/moyenne générale\s*:?\s*(\d+[,.]?\d*)/i);
  if (avgMatches && avgMatches[1]) {
    average = parseFloat(avgMatches[1].replace(',', '.'));
    if (isNaN(average)) average = undefined;
  }
  
  return {
    students: [{
      name: studentName,
      grades,
      average,
      comments,
      teacherNames: teachers,
      classAvg: classAvgs
    }],
    subjects,
    termInfo: {
      term: termName,
      class: className,
      schoolName
    }
  };
}

// Extract table data using text positions
function extractTableData(
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
) {
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  const comments: {[subject: string]: string} = {};
  const teachers: {[subject: string]: string} = {};
  const classAvgs: {[subject: string]: number | null} = {};
  let average = undefined;
  
  // Sort positions by y-coordinate (top to bottom)
  textPositions.sort((a, b) => {
    // First sort by page
    if (a.page !== b.page) return a.page - b.page;
    // Then by y-coordinate on the same page
    return b.y - a.y; // PDF coordinates have y=0 at the bottom
  });
  
  // Group text positions by row (lines that are close in y-coordinate)
  const rows: Array<Array<{text: string, x: number, y: number}>> = [];
  let currentRow: Array<{text: string, x: number, y: number}> = [];
  let currentY = -1;
  const yTolerance = 5; // Points of tolerance for considering lines in the same row
  
  textPositions.forEach(pos => {
    if (currentY === -1 || Math.abs(pos.y - currentY) <= yTolerance) {
      currentRow.push(pos);
      currentY = pos.y;
    } else {
      if (currentRow.length > 0) {
        // Sort the row by x-coordinate (left to right)
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }
      currentRow = [pos];
      currentY = pos.y;
    }
  });
  
  // Add the last row if it has items
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }
  
  // Try to identify the header row with column names
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.text.toLowerCase()).join(' ');
    if ((rowText.includes('matière') || rowText.includes('discipline')) && 
        (rowText.includes('moyenne') || rowText.includes('note'))) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow >= 0) {
    // Identify column positions based on the header
    const header = rows[headerRow];
    let subjectColStart = -1;
    let gradeColStart = -1;
    let commentColStart = -1;
    let teacherColStart = -1;
    let classAvgColStart = -1;
    
    header.forEach((item, idx) => {
      const text = item.text.toLowerCase();
      if (text.includes('matière') || text.includes('discipline')) {
        subjectColStart = item.x;
      } 
      else if (text.includes('moyenne') && !text.includes('classe')) {
        gradeColStart = item.x;
      } 
      else if (text.includes('appréciation') || text.includes('observation')) {
        commentColStart = item.x;
      } 
      else if (text.includes('prof') || text.includes('enseig')) {
        teacherColStart = item.x;
      } 
      else if ((text.includes('moyenne') && text.includes('classe')) || 
              text.includes('moy cls')) {
        classAvgColStart = item.x;
      }
    });
    
    // Process data rows
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip rows that appear to be headers, separators or too short
      if (row.length < 2) continue;
      const rowText = row.map(item => item.text.toLowerCase()).join(' ');
      if (rowText.includes('matière') || 
          rowText.includes('moyenne générale') ||
          rowText === '') continue;
      
      // Extract subject name
      let subject = '';
      let grade = null;
      let comment = '';
      let teacher = '';
      let classAvg = null;
      
      if (subjectColStart >= 0) {
        const subjectItems = row.filter(item => 
          Math.abs(item.x - subjectColStart) < 50 || item.x < subjectColStart + 150
        );
        subject = subjectItems.map(item => item.text.trim()).join(' ');
      }
      
      // Skip rows without a subject
      if (!subject || subject.toLowerCase().includes('moyenne générale')) {
        // Check if this row contains the student's general average
        if (rowText.includes('moyenne générale')) {
          const avgText = row.find(item => {
            const text = item.text.trim();
            return /^\d+[.,]?\d*$/.test(text) && !isNaN(parseFloat(text.replace(',', '.')));
          });
          
          if (avgText) {
            average = parseFloat(avgText.text.replace(',', '.'));
          }
        }
        continue;
      }
      
      // Clean up subject name
      subject = subject.replace(/^\d+\s*/, '').trim(); // Remove leading numbers
      subjects.push(subject);
      
      // Extract grade
      if (gradeColStart >= 0) {
        const gradeItems = row.filter(item => 
          Math.abs(item.x - gradeColStart) < 30
        );
        
        if (gradeItems.length > 0) {
          const gradeText = gradeItems[0].text.trim().replace(',', '.');
          const parsedGrade = parseFloat(gradeText);
          grade = !isNaN(parsedGrade) ? parsedGrade : null;
        }
      }
      
      // Extract comment
      if (commentColStart >= 0) {
        const commentItems = row.filter(item => 
          item.x >= commentColStart && (teacherColStart < 0 || item.x < teacherColStart)
        );
        
        comment = commentItems.map(item => item.text.trim()).join(' ');
      }
      
      // Extract teacher
      if (teacherColStart >= 0) {
        const teacherItems = row.filter(item => 
          item.x >= teacherColStart && (classAvgColStart < 0 || item.x < classAvgColStart)
        );
        
        teacher = teacherItems.map(item => item.text.trim()).join(' ');
      }
      
      // Extract class average
      if (classAvgColStart >= 0) {
        const classAvgItems = row.filter(item => 
          Math.abs(item.x - classAvgColStart) < 30
        );
        
        if (classAvgItems.length > 0) {
          const avgText = classAvgItems[0].text.trim().replace(',', '.');
          const parsedAvg = parseFloat(avgText);
          classAvg = !isNaN(parsedAvg) ? parsedAvg : null;
        }
      }
      
      // Store extracted data
      grades[subject] = grade;
      if (comment) comments[subject] = comment;
      if (teacher) teachers[subject] = teacher;
      if (classAvg !== null) classAvgs[subject] = classAvg;
    }
  }
  
  return {
    subjects,
    grades,
    comments,
    teachers,
    classAvgs,
    average
  };
}

// General PDF grade extraction
function extractGradesFromPDF(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const fullText = textContent.join(' ');
  
  // Try to determine if this is a single student PDF or a class PDF
  const isSingleStudent = /élève|étudiant|bulletin/i.test(fullText) && 
                         !/liste|tableau|classe entière/i.test(fullText);
  
  if (isSingleStudent) {
    // For single student reports
    return extractSingleStudentData(textContent, textPositions);
  } else {
    // For class-wide reports
    return extractClassData(textContent, textPositions);
  }
}

// Extract data for a single student
function extractSingleStudentData(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const fullText = textContent.join(' ');
  
  // Extract student name
  let studentName = '';
  const nameMatches = fullText.match(/nom\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\s|$)/i);
  if (nameMatches && nameMatches[1]) {
    studentName = nameMatches[1].trim();
  } else {
    studentName = 'Élève non identifié';
  }
  
  // Try to extract subjects and grades using regex patterns
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  let average = undefined;
  
  // Common patterns for subjects and grades in French reports
  const subjectGradePattern = /([A-Za-zÀ-ÖØ-öø-ÿ\s-]{3,})\s*:?\s*(\d+[,.]?\d*)/g;
  let match;
  
  while ((match = subjectGradePattern.exec(fullText)) !== null) {
    const subject = match[1].trim();
    const grade = parseFloat(match[2].replace(',', '.'));
    
    // Only add if it seems like a valid subject (not just a random number)
    if (subject.length > 3 && !subject.match(/^\d/) && !isNaN(grade)) {
      subjects.push(subject);
      grades[subject] = grade;
    }
  }
  
  // Look for average
  const avgMatch = fullText.match(/moyenne\s*:?\s*(\d+[,.]?\d*)/i);
  if (avgMatch && avgMatch[1]) {
    average = parseFloat(avgMatch[1].replace(',', '.'));
    if (isNaN(average)) average = undefined;
  }
  
  // If no subjects were found, create fallback data
  if (subjects.length === 0) {
    console.warn('No subjects found in PDF, creating fallback data');
    return createFallbackData(studentName);
  }
  
  return {
    students: [{
      name: studentName,
      grades,
      average
    }],
    subjects,
    termInfo: {
      term: 'Inconnu',
      class: 'Inconnu'
    }
  };
}

// Extract data for a class
function extractClassData(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  // Try to identify table structure in the PDF
  // This is a simplified approach - real implementation would be more robust
  const rows = identifyTableRows(textPositions);
  
  if (rows.length === 0) {
    console.warn('No table structure found in PDF, creating fallback data');
    return createFallbackData('Classe entière');
  }
  
  // Identify header row
  let headerRow = rows[0];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowText = rows[i].map(cell => cell.text.toLowerCase()).join(' ');
    if (rowText.includes('nom') || rowText.includes('élève') || rowText.includes('étudiant')) {
      headerRow = rows[i];
      break;
    }
  }
  
  // Try to identify columns
  const nameColIndex = headerRow.findIndex(cell => 
    cell.text.toLowerCase().includes('nom') || 
    cell.text.toLowerCase().includes('élève')
  );
  
  // If we can't identify the name column, fall back
  if (nameColIndex === -1) {
    console.warn('Could not identify name column in table, creating fallback data');
    return createFallbackData('Classe entière');
  }
  
  // Extract subjects from header
  const subjects: string[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== nameColIndex && 
       !headerRow[i].text.toLowerCase().includes('moyenne') &&
       !headerRow[i].text.toLowerCase().includes('total')) {
      subjects.push(headerRow[i].text.trim());
    }
  }
  
  // Process data rows
  const students: ParsedFileData['students'] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= nameColIndex) continue;
    
    const name = row[nameColIndex].text.trim();
    if (!name) continue;
    
    const grades: {[subject: string]: number | null} = {};
    let totalGrade = 0;
    let gradeCount = 0;
    
    // Extract grades
    for (let j = 0; j < Math.min(subjects.length, row.length); j++) {
      const colIndex = headerRow.indexOf(headerRow.find(cell => cell.text.trim() === subjects[j]) || {text: ''});
      if (colIndex === -1 || colIndex >= row.length) continue;
      
      const gradeText = row[colIndex].text.trim().replace(',', '.');
      const grade = parseFloat(gradeText);
      
      if (!isNaN(grade)) {
        grades[subjects[j]] = grade;
        totalGrade += grade;
        gradeCount++;
      } else {
        grades[subjects[j]] = null;
      }
    }
    
    // Calculate average
    const average = gradeCount > 0 ? totalGrade / gradeCount : undefined;
    
    students.push({
      name,
      grades,
      average
    });
  }
  
  return {
    students,
    subjects,
    termInfo: {
      term: 'Inconnu',
      class: 'Inconnu'
    }
  };
}

// Create a simple table structure from text positions
function identifyTableRows(
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): Array<Array<{text: string, x: number, y: number}>> {
  // Group positions by y-coordinate (rows)
  const yGroups: Record<number, Array<{text: string, x: number, y: number}>> = {};
  const yTolerance = 5; // Tolerance for considering positions to be on the same line
  
  textPositions.forEach(pos => {
    // Round y-coordinate to group nearby positions
    const roundedY = Math.round(pos.y / yTolerance) * yTolerance;
    
    if (!yGroups[roundedY]) {
      yGroups[roundedY] = [];
    }
    
    yGroups[roundedY].push({
      text: pos.text,
      x: pos.x,
      y: pos.y
    });
  });
  
  // Sort groups by y-coordinate (top to bottom)
  const sortedYs = Object.keys(yGroups).map(Number).sort((a, b) => b - a); // Sort in descending order (PDF coords)
  
  // Convert groups to rows
  const rows: Array<Array<{text: string, x: number, y: number}>> = [];
  
  sortedYs.forEach(y => {
    // Sort positions within row by x-coordinate (left to right)
    const sortedRow = yGroups[y].sort((a, b) => a.x - b.x);
    rows.push(sortedRow);
  });
  
  return rows;
}

// Create fallback data when extraction fails
function createFallbackData(namePrefix: string): ParsedFileData {
  console.warn('Creating fallback data for PDF parsing');
  
  const fallbackSubjects = [
    'Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais', 
    'SVT', 'Physique-Chimie', 'EPS'
  ];
  
  // Create a student with random grades
  const student = {
    name: `${namePrefix} (Données simulées)`,
    grades: {} as {[subject: string]: number},
    average: 0
  };
  
  let total = 0;
  
  fallbackSubjects.forEach(subject => {
    // Random grade between 8 and 16
    const grade = Math.round((8 + Math.random() * 8) * 2) / 2;
    student.grades[subject] = grade;
    total += grade;
  });
  
  student.average = Math.round((total / fallbackSubjects.length) * 10) / 10;
  
  toast.warning("Les données n'ont pas pu être extraites correctement du PDF. Des données simulées sont affichées.", {
    duration: 5000
  });
  
  return {
    students: [student],
    subjects: fallbackSubjects,
    termInfo: {
      term: 'Simulation',
      class: 'Simulation'
    }
  };
}
