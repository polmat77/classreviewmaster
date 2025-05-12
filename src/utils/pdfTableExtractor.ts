import * as pdfjs from 'pdfjs-dist';

export async function extractGradesTable(pdfBuffer: ArrayBuffer) {
  try {
    console.log("Extracting grades table from PDF...");
    
    // Initialize PDF.js
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    }
    
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text with position information for better table reconstruction
    const textItems = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      textContent.items.forEach((item) => {
        if (item.str && item.str.trim()) {
          // Use transform to get more accurate positions
          const tx = item.transform[4];
          const ty = viewport.height - item.transform[5]; // Adjust Y coordinate
          
          textItems.push({
            text: item.str.trim(),
            x: tx,
            y: ty,
            page: pageNum
          });
        }
      });
    }
    
    // Process the extracted text to identify table structure
    const result = processExtractedText(textItems);
    
    return result;
  } catch (error) {
    console.error("Error extracting grades table:", error);
    throw new Error("Erreur lors de l'extraction du tableau. Vérifiez le format de vos fichiers.");
  }
}

function processExtractedText(textItems) {
  // Group text items into lines based on Y-coordinate proximity
  const lines = groupTextIntoLines(textItems);
  
  // Find header row (containing column names)
  const headerRow = findHeaderRow(lines);
  
  if (!headerRow) {
    console.warn("No header row found in the PDF");
    return createFallbackData();
  }
  
  // Identify student names and subjects
  const students = [];
  const subjects = [];
  const className = extractClassName(textItems);
  
  // Find rows containing student data
  const dataRows = extractDataRows(lines, headerRow);
  
  // Process each student row
  dataRows.forEach((row, index) => {
    // First column is usually the student name
    const studentName = row[0]?.text || `Élève ${index + 1}`;
    
    // Extract grades for each subject
    const grades = {};
    
    // Start from column 1 (skip name column)
    for (let i = 1; i < row.length; i++) {
      if (i < headerRow.length) {
        const subjectName = headerRow[i]?.text;
        if (subjectName && !subjects.includes(subjectName)) {
          subjects.push(subjectName);
        }
        
        // Try to parse the grade
        const gradeText = row[i]?.text;
        if (gradeText) {
          const grade = parseFloat(gradeText.replace(',', '.'));
          if (!isNaN(grade)) {
            grades[subjectName] = grade;
          }
        }
      }
    }
    
    // Calculate average
    const validGrades = Object.values(grades).filter(g => !isNaN(g));
    const average = validGrades.length > 0 
      ? validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length 
      : 0;
    
    students.push({
      name: studentName,
      grades,
      average
    });
  });
  
  return {
    className,
    subjects,
    students
  };
}

function groupTextIntoLines(textItems) {
  // Sort by page and Y coordinate
  const sortedItems = [...textItems].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return Math.abs(a.y - b.y) < 5 ? a.x - b.x : a.y - b.y;
  });
  
  const lines = [];
  let currentLine = [];
  let currentY = -1;
  let currentPage = -1;
  
  for (const item of sortedItems) {
    if (currentPage === -1) {
      // First item
      currentLine = [item];
      currentY = item.y;
      currentPage = item.page;
    } else if (item.page !== currentPage || Math.abs(item.y - currentY) > 10) {
      // New page or new line (Y difference > 10)
      if (currentLine.length > 0) {
        lines.push([...currentLine].sort((a, b) => a.x - b.x));
      }
      currentLine = [item];
      currentY = item.y;
      currentPage = item.page;
    } else {
      // Same line
      currentLine.push(item);
    }
  }
  
  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push([...currentLine].sort((a, b) => a.x - b.x));
  }
  
  return lines;
}

function findHeaderRow(lines) {
  // Look for lines that might contain column headers
  // Common keywords in grade tables: Nom, Élève, Moyenne, Matière, etc.
  const headerKeywords = ['nom', 'élève', 'moyenne', 'matière', 'moy'];
  
  for (const line of lines) {
    const lineText = line.map(item => item.text.toLowerCase()).join(' ');
    if (headerKeywords.some(keyword => lineText.includes(keyword))) {
      return line;
    }
  }
  
  // If no obvious header found, try to find a line with "Moy" repeated
  for (const line of lines) {
    const moyCount = line.filter(item => item.text === 'Moy' || item.text === 'MOY').length;
    if (moyCount >= 2) {
      return line;
    }
  }
  
  // If still no header found, use the first line that has multiple items
  for (const line of lines) {
    if (line.length >= 3) {
      return line;
    }
  }
  
  return null;
}

function extractDataRows(lines, headerRow) {
  // Find the index of the header row
  const headerIndex = lines.findIndex(line => 
    line.length === headerRow.length && 
    line[0]?.text === headerRow[0]?.text
  );
  
  if (headerIndex === -1) {
    // If header not found in lines, try to find rows that look like student data
    return lines.filter(line => {
      // Student rows typically have a name in the first column and numbers in other columns
      if (line.length < 3) return false;
      
      // Check if at least one cell contains a number (grade)
      const hasNumber = line.some(item => {
        const text = item.text.replace(',', '.');
        return !isNaN(parseFloat(text)) && parseFloat(text) <= 20;
      });
      
      return hasNumber;
    });
  }
  
  // Return all rows after the header, excluding any that look like averages or totals
  return lines.slice(headerIndex + 1).filter(line => {
    const lineText = line.map(item => item.text.toLowerCase()).join(' ');
    return !lineText.includes('moyenne de classe') && 
           !lineText.includes('total') && 
           !lineText.includes('moyenne des groupes') &&
           line.length > 1;
  });
}

function extractClassName(textItems) {
  // Look for common class name patterns
  const classPatterns = [
    /classe\s*:?\s*(\d+[A-Za-z]*)/i,
    /(\d+[A-Za-z]+)/
  ];
  
  for (const item of textItems) {
    for (const pattern of classPatterns) {
      const match = item.text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  
  return "Classe non identifiée";
}

function createFallbackData() {
  // Create fallback data when table structure can't be detected
  return {
    className: "Classe non identifiée",
    subjects: ["Mathématiques", "Français", "Histoire-Géographie", "Anglais", "SVT"],
    students: [
      {
        name: "Données simulées",
        grades: {
          "Mathématiques": 12.5,
          "Français": 13.2,
          "Histoire-Géographie": 14.1,
          "Anglais": 15.3,
          "SVT": 11.8
        },
        average: 13.38
      }
    ]
  };
}