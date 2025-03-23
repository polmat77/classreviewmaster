import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';

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

export interface BulletinData {
  nom: string;
  classe: string;
  moyenne_generale: number;
  matieres: { [key: string]: number };
  appreciation: string;
}

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

function processExcelData(data: any[][]): ParsedFileData {
  if (detectFrenchBulletinFormat(data)) {
    return parseFrenchBulletinFormat(data);
  }

  return parseStandardGradeTable(data);
}

function detectFrenchBulletinFormat(data: any[][]): boolean {
  const headers = data[0] || [];
  const firstRowStr = headers.join(' ').toLowerCase();
  
  return firstRowStr.includes('bulletin') || 
         firstRowStr.includes('élève') || 
         firstRowStr.includes('trimestre');
}

function parseFrenchBulletinFormat(data: any[][]): ParsedFileData {
  const subjects: string[] = [];
  let studentName = '';
  let className = '';
  let termName = '';
  let schoolName = '';
  
  for (let i = 0; i < 5; i++) {
    const rowStr = data[i]?.join(' ') || '';
    
    if (rowStr.includes('Collège') || rowStr.includes('Lycée') || rowStr.includes('École')) {
      schoolName = rowStr.trim();
    }
    
    if (rowStr.toLowerCase().includes('trimestre')) {
      const trimMatch = rowStr.match(/trimestre\s*(\d)/i);
      if (trimMatch) {
        termName = `Trimestre ${trimMatch[1]}`;
      }
    }
    
    if (rowStr.toLowerCase().includes('classe') || rowStr.includes('ème') || rowStr.includes('nde')) {
      className = rowStr.trim();
    }
    
    if (rowStr.toLowerCase().includes('élève:') || rowStr.toLowerCase().includes('élève :')) {
      const nameMatch = rowStr.match(/élève\s*:\s*(.+)/i);
      if (nameMatch) {
        studentName = nameMatch[1].trim();
      }
    }
  }
  
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
    
    if (commentColIndex >= 0 && row[commentColIndex]) {
      comments[subject] = String(row[commentColIndex]).trim();
    }
    
    if (teacherColIndex >= 0 && row[teacherColIndex]) {
      teachers[subject] = String(row[teacherColIndex]).trim();
    }
    
    if (classAvgColIndex >= 0 && row[classAvgColIndex] !== undefined) {
      const avg = parseFloat(String(row[classAvgColIndex]).replace(',', '.'));
      classAvg[subject] = !isNaN(avg) ? avg : null;
    }
  }
  
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

function parseStandardGradeTable(data: any[][]): ParsedFileData {
  const headers = data[0] || [];
  let nameColIndex = -1;
  const subjectIndices: number[] = [];
  let classNameRow = '';
  let termNameRow = '';
  
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const rowStr = data[i]?.join(' ').toLowerCase() || '';
    if (rowStr.includes('classe')) {
      classNameRow = rowStr;
    }
    if (rowStr.includes('trimestre')) {
      termNameRow = rowStr;
    }
  }
  
  headers.forEach((header, index) => {
    const headerStr = String(header).toLowerCase();
    if (headerStr === 'nom' || headerStr === 'élève' || headerStr === 'etudiant' || 
        headerStr === 'nom de l\'élève' || headerStr.includes('nom')) {
      nameColIndex = index;
    } else if (headerStr && !headerStr.includes('moyenne') && 
              !headerStr.includes('total') && !headerStr.includes('rang')) {
      subjectIndices.push(index);
    }
  });
  
  const subjects = subjectIndices.map(idx => String(headers[idx]));
  
  const students: ParsedFileData['students'] = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    if (nameColIndex >= 0 && !row[nameColIndex]) continue;
    
    const studentName = nameColIndex >= 0 ? String(row[nameColIndex]) : `Élève ${i}`;
    const grades: {[subject: string]: number | null} = {};
    
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
    
    const average = gradeCount > 0 ? totalGrade / gradeCount : undefined;
    
    students.push({
      name: studentName,
      grades,
      average
    });
  }
  
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

export const parseCsvFile = async (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const csvData = results.data as any[][];
          console.log('Parsed CSV data:', csvData);
          
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

const PDFWorker = `
  self.onmessage = function(event) {
    const data = event.data;
    if (data.type === 'process') {
      self.postMessage({ type: 'processed', success: true });
    }
  };
`;

const blob = new Blob([PDFWorker], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const parsePdfFile = async (file: File): Promise<ParsedFileData> => {
  try {
    console.log("Starting PDF parsing...");
    const arrayBuffer = await file.arrayBuffer();
    
    console.log("Loading PDF document...");
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    const textContent: string[] = [];
    const textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}> = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      content.items.forEach((item: any) => {
        const itemText = item.str;
        textContent.push(itemText);
        
        if (item.transform) {
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
    
    console.log('Extracted PDF text content', textContent.join(' ').substring(0, 500) + '...');
    
    if (isFrenchBulletin(textContent)) {
      console.log('Detected French student bulletin format');
      return parseFrenchBulletinPDF(textContent, textPositions);
    }
    
    return extractGradesFromPDF(textContent, textPositions);
  } catch (error) {
    console.error('Error parsing PDF file:', error);
    throw new Error(`Erreur lors de l'analyse du fichier PDF: ${error}`);
  }
};

function isFrenchBulletin(textContent: string[]): boolean {
  const fullText = textContent.join(' ').toLowerCase();
  
  return (
    fullText.includes('bulletin') &&
    (fullText.includes('trimestre') || fullText.includes('semestre')) &&
    (fullText.includes('élève') || fullText.includes('appréciation') || 
     fullText.includes('matière') || fullText.includes('moyenne'))
  );
}

function parseFrenchBulletinPDF(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const fullText = textContent.join(' ');
  
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
  
  let schoolName = '';
  const schoolMatches = fullText.match(/((Collège|Lycée|École)\s+[A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\d|\s*$)/i);
  if (schoolMatches && schoolMatches[1]) {
    schoolName = schoolMatches[1].trim();
  }
  
  let termName = '';
  const termMatches = fullText.match(/(1er|2e|3e|premier|deuxième|troisième|1|2|3)\s*(trimestre|semestre)/i);
  if (termMatches) {
    const termNumber = termMatches[1];
    const termType = termMatches[2].toLowerCase();
    
    let num = termNumber;
    if (termNumber === 'premier') num = '1';
    if (termNumber === 'deuxième') num = '2';
    if (termNumber === 'troisième') num = '3';
    if (termNumber === '1er') num = '1';
    
    termName = `${termType.charAt(0).toUpperCase() + termType.slice(1)} ${num}`;
  }
  
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
  
  console.log('Using fallback regex-based extraction');
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  const comments: {[subject: string]: string} = {};
  const teachers: {[subject: string]: string} = {};
  const classAvgs: {[subject: string]: number | null} = {};
  
  const commonSubjects = [
    'Français', 'Mathématiques', 'Histoire', 'Géographie', 'Histoire-Géographie',
    'Anglais', 'Espagnol', 'Allemand', 'SVT', 'Physique', 'Chimie', 'Physique-Chimie',
    'EPS', 'Musique', 'Arts Plastiques', 'Technologie', 'Latin', 'Grec'
  ];
  
  commonSubjects.forEach(subject => {
    const subjectPattern = new RegExp(`${subject}\\s*:?\\s*(\\d+[,.]?\\d*)`, 'i');
    const match = fullText.match(subjectPattern);
    
    if (match && match[1]) {
      subjects.push(subject);
      const grade = parseFloat(match[1].replace(',', '.'));
      grades[subject] = !isNaN(grade) ? grade : null;
      
      const commentPattern = new RegExp(`${subject}.*?appréciation\\s*:?\\s*([^.]+)`, 'i');
      const commentMatch = fullText.match(commentPattern);
      if (commentMatch && commentMatch[1]) {
        comments[subject] = commentMatch[1].trim();
      }
      
      const teacherPattern = new RegExp(`${subject}.*?professeur\\s*:?\\s*([A-Za-zÀ-ÖØ-öø-ÿ\\s.]+?)\\s*\\d`, 'i');
      const teacherMatch = fullText.match(teacherPattern);
      if (teacherMatch && teacherMatch[1]) {
        teachers[subject] = teacherMatch[1].trim();
      }
      
      const avgPattern = new RegExp(`${subject}.*?moyenne de la classe\\s*:?\\s*(\\d+[,.]?\\d*)`, 'i');
      const avgMatch = fullText.match(avgPattern);
      if (avgMatch && avgMatch[1]) {
        const avg = parseFloat(avgMatch[1].replace(',', '.'));
        classAvgs[subject] = !isNaN(avg) ? avg : null;
      }
    }
  });
  
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

function extractTableData(
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
) {
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  const comments: {[subject: string]: string} = {};
  const teachers: {[subject: string]: string} = {};
  const classAvgs: {[subject: string]: number | null} = {};
  let average = undefined;
  
  textPositions.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y;
  });
  
  const rows: Array<Array<{text: string, x: number, y: number}>> = [];
  let currentRow: Array<{text: string, x: number, y: number}> = [];
  let currentY = -1;
  const yTolerance = 5;
  
  textPositions.forEach(pos => {
    if (currentY === -1 || Math.abs(pos.y - currentY) <= yTolerance) {
      currentRow.push({
        text: pos.text,
        x: pos.x,
        y: pos.y
      });
      currentY = pos.y;
    } else {
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }
      currentRow = [{
        text: pos.text,
        x: pos.x,
        y: pos.y
      }];
      currentY = pos.y;
    }
  });
  
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }
  
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
    
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      
      if (row.length < 2) continue;
      const rowText = row.map(item => item.text.toLowerCase()).join(' ');
      if (rowText.includes('matière') || 
          rowText.includes('moyenne générale') ||
          rowText === '') continue;
      
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
      
      if (!subject || subject.toLowerCase().includes('moyenne générale')) {
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
      
      subject = subject.replace(/^\d+\s*/, '').trim();
      subjects.push(subject);
      
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
      
      if (commentColStart >= 0) {
        const commentItems = row.filter(item => 
          item.x >= commentColStart && (teacherColStart < 0 || item.x < teacherColStart)
        );
        
        comment = commentItems.map(item => item.text.trim()).join(' ');
      }
      
      if (teacherColStart >= 0) {
        const teacherItems = row.filter(item => 
          item.x >= teacherColStart && (classAvgColStart < 0 || item.x < classAvgColStart)
        );
        
        teacher = teacherItems.map(item => item.text.trim()).join(' ');
      }
      
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

function extractGradesFromPDF(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const fullText = textContent.join(' ');
  
  const isSingleStudent = /élève|étudiant|bulletin/i.test(fullText) && 
                         !/liste|tableau|classe entière/i.test(fullText);
  
  if (isSingleStudent) {
    return extractSingleStudentData(textContent, textPositions);
  } else {
    return extractClassData(textContent, textPositions);
  }
}

function extractSingleStudentData(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const fullText = textContent.join(' ');
  
  let studentName = 'Élève non identifié';
  const nameMatches = fullText.match(/nom\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s-]+?)(\s|$)/i);
  if (nameMatches && nameMatches[1]) {
    studentName = nameMatches[1].trim();
  }
  
  const subjects: string[] = [];
  const grades: {[subject: string]: number | null} = {};
  let average = undefined;
  
  const subjectGradePattern = /([A-Za-zÀ-ÖØ-öø-ÿ\s-]{3,})\s*:?\s*(\d+[,.]?\d*)/g;
  let match;
  
  while ((match = subjectGradePattern.exec(fullText)) !== null) {
    const subject = match[1].trim();
    const grade = parseFloat(match[2].replace(',', '.'));
    
    if (subject.length > 3 && !subject.match(/^\d/) && !isNaN(grade)) {
      subjects.push(subject);
      grades[subject] = grade;
    }
  }
  
  const avgMatch = fullText.match(/moyenne\s*:?\s*(\d+[,.]?\d*)/i);
  if (avgMatch && avgMatch[1]) {
    average = parseFloat(avgMatch[1].replace(',', '.'));
    if (isNaN(average)) average = undefined;
  }
  
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

function extractClassData(
  textContent: string[], 
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): ParsedFileData {
  const rows = identifyTableRows(textPositions);
  
  if (rows.length === 0) {
    console.warn('No table structure found in PDF, creating fallback data');
    return createFallbackData('Classe entière');
  }
  
  let headerRow = rows[0];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowText = rows[i].map(cell => cell.text.toLowerCase()).join(' ');
    if (rowText.includes('nom') || rowText.includes('élève') || rowText.includes('étudiant')) {
      headerRow = rows[i];
      break;
    }
  }
  
  const nameColIndex = headerRow.findIndex(cell => 
    cell.text.toLowerCase().includes('nom') || 
    cell.text.toLowerCase().includes('élève')
  );
  
  if (nameColIndex === -1) {
    console.warn('Could not identify name column in table, creating fallback data');
    return createFallbackData('Classe entière');
  }
  
  const subjects: string[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== nameColIndex && 
       !headerRow[i].text.toLowerCase().includes('moyenne') &&
       !headerRow[i].text.toLowerCase().includes('total')) {
      subjects.push(headerRow[i].text.trim());
    }
  }
  
  const students: ParsedFileData['students'] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= nameColIndex) continue;
    
    const name = row[nameColIndex].text.trim();
    if (!name) continue;
    
    const grades: {[subject: string]: number | null} = {};
    let totalGrade = 0;
    let gradeCount = 0;
    
    for (let j = 0; j < Math.min(subjects.length, row.length); j++) {
      const subjectHeader = headerRow.find(cell => cell.text.trim() === subjects[j]);
      if (!subjectHeader) continue;
      
      const colIndex = headerRow.indexOf(subjectHeader);
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

function identifyTableRows(
  textPositions: Array<{text: string, x: number, y: number, height: number, width: number, page: number}>
): Array<Array<{text: string, x: number, y: number}>> {
  const yGroups: Record<number, Array<{text: string, x: number, y: number}>> = {};
  const yTolerance = 5;
  
  textPositions.forEach(pos => {
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
  
  const sortedYs = Object.keys(yGroups).map(Number).sort((a, b) => b - a);
  
  const rows: Array<Array<{text: string, x: number, y: number}>> = [];
  
  sortedYs.forEach(y => {
    // Make sure all items have the required properties
    const rowItems = yGroups[y].filter(item => 
      item !== undefined && 
      typeof item.text === 'string' && 
      typeof item.x === 'number' && 
      typeof item.y === 'number'
    );
    
    if (rowItems.length > 0) {
      const sortedRow = rowItems.sort((a, b) => a.x - b.x);
      rows.push(sortedRow);
    }
  });
  
  return rows;
}

function createFallbackData(namePrefix: string): ParsedFileData {
  console.warn('Creating fallback data for PDF parsing');
  
  const fallbackSubjects = [
    'Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais', 
    'SVT', 'Physique-Chimie', 'EPS'
  ];
  
  const student = {
    name: `${namePrefix} (Données simulées)`,
    grades: {} as {[subject: string]: number},
    average: 0
  };
  
  let total = 0;
  
  fallbackSubjects.forEach(subject => {
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

export function parseBulletin(text: string): BulletinData {
  const data: BulletinData = {
    nom: '',
    classe: '',
    moyenne_generale: 0,
    matieres: {},
    appreciation: ''
  };

  const nomMatch = text.match(/Bulletin du 2ème Trimestre\s+([A-ZÉÈÊÀÂÙÎÔÇ][a-zéèêàâùîôç]+\s+[A-ZÉÈÊÀÂÙÎÔÇ][a-zéèêàâùîôç]+)/) || 
                   text.match(/Nom\s*:?\s*(.*)/i) || 
                   text.match(/Élève\s*:?\s*(.*)/i);
  if (nomMatch) {
    data.nom = nomMatch[1].trim();
  }

  const classeMatch = text.match(/Classe\s*:?\s*(\S+)/i) || 
                      text.match(/classe\s*:?\s*(.+?)(\s|\.|$)/i);
  if (classeMatch) {
    data.classe = classeMatch[1].trim();
  }

  const moyenneGenMatch = text.match(/Moyennes générales\s+([\d.,]+)/i) || 
                          text.match(/Moyenne générale\s*:?\s*([\d.,]+)/i) || 
                          text.match(/Moyenne de l['']élève\s*:?\s*([\d.,]+)/i);
  if (moyenneGenMatch) {
    data.moyenne_generale = parseFloat(moyenneGenMatch[1].replace(',', '.'));
  }

  const subjectRegex = /([A-ZÉÈÊÀÂÙÎÔÇ][A-ZÉÈÊÀÂÙÎÔÇ\s-]+)\s+[\w\.\s-]*\s+([\d.,]+)/gi;
  const simpleSubjectRegex = /([A-Za-zÀ-ÖØ-öø-ÿéèêàâùîôç -]+)\s*:\s*([\d.,]+)/gi;
  
  let match;
  while ((match = subjectRegex.exec(text)) !== null) {
    const subject = match[1].trim();
    if (!subject.match(/BULLETIN|MOYENNES|NOM|CLASSE/i)) {
      data.matieres[subject] = parseFloat(match[2].replace(',', '.'));
    }
  }
  
  if (Object.keys(data.matieres).length === 0) {
    let simpleMatch;
    while ((simpleMatch = simpleSubjectRegex.exec(text)) !== null) {
      const label = simpleMatch[1].trim().toLowerCase();
      if (!label.includes('nom') && 
          !label.includes('classe') && 
          !label.includes('moyenne') && 
          !label.includes('élève') &&
          !label.includes('eleve')) {
        data.matieres[simpleMatch[1].trim()] = parseFloat(simpleMatch[2].replace(',', '.'));
      }
    }
  }

  const appreciationMatch = text.match(/(Ensemble[^.]+\.)/i) || 
                           text.match(/Appréciation\s*:?\s*(.*?)(\n\n|\n[A-Z]|$)/is) ||
                           text.match(/Appréciation générale\s*:?\s*(.*?)(\n\n|\n[A-Z]|$)/is);
  if (appreciationMatch) {
    data.appreciation = appreciationMatch[1]?.trim() || '';
  }

  return data;
}

export function parseMultiBulletins(text: string): BulletinData[] {
  console.log("Parsing multiple bulletins from text:", text.substring(0, 500) + "...");
  
  const bulletinSeparator = "Bulletin du 2ème Trimestre";
  
  const segments = text.split(new RegExp(`(${bulletinSeparator})`, 'i')).filter(segment => segment.trim().length > 0);
  console.log(`Found ${segments.length} segments`);
  
  const bulletinSegments: string[] = [];
  let currentSegment = "";
  
  for (const segment of segments) {
    if (segment.trim() === bulletinSeparator) {
      if (currentSegment) {
        bulletinSegments.push(currentSegment);
      }
      currentSegment = bulletinSeparator;
    } else {
      currentSegment += segment;
    }
  }
  
  if (currentSegment) {
    bulletinSegments.push(currentSegment);
  }
  
  console.log(`Reconstructed ${bulletinSegments.length} bulletin segments`);
  
  const bulletins: BulletinData[] = [];
  
  for (let i = 0; i < bulletinSegments.length; i++) {
    try {
      const bulletin = parseBulletin(bulletinSegments[i]);
      
      if (bulletin.nom || bulletin.classe || Object.keys(bulletin.matieres).length > 0) {
        bulletins.push(bulletin);
        console.log(`Successfully parsed bulletin ${i+1}: ${bulletin.nom}`);
      } else {
        console.warn(`Bulletin segment ${i+1} did not yield valid data, skipping`);
      }
    } catch (error) {
      console.error(`Error parsing bulletin segment ${i+1}:`, error);
      // Continue with the next segment
    }
  }
  
  console.log(`Successfully parsed ${bulletins.length} bulletins`);
  return bulletins;
}
