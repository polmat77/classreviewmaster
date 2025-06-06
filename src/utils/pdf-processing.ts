import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';
import { OpenAIService } from './openai-service';
import { extractTextFromPDF, validatePdfFile } from './pdf-service';
import { initPdfJs } from './pdf-service';

// Interfaces for structured output
export interface StudentGrades {
  name: string;
  grades: { [subject: string]: number | null };
  average: number | undefined;
  comments?: { [subject: string]: string };
  teacherNames?: { [subject: string]: string };
}

export interface GradeTableResult {
  className: string;
  subjects: string[];
  students: StudentGrades[];
}

export interface SubjectFeedback {
  subject: string;
  average: number | null;
  teacher?: string;
  remark: string;
}

export interface StudentBulletin {
  name: string;
  class: string;
  subjects: SubjectFeedback[];
}

export interface ClassBulletinResult {
  students: StudentBulletin[];
  classSummary: string;
}

/**
 * Parse a class grade table PDF to extract structured data with progress tracking
 * @param pdfBuffer The PDF file buffer
 * @param onProgress Optional callback for progress updates
 * @returns Structured table data with students, grades, and subjects
 */
async function parseGradeTable(
  pdfBuffer: ArrayBuffer, 
  onProgress?: (progress: number) => void
): Promise<GradeTableResult> {
  // Initialize PDF.js worker
  initPdfJs();
  
  try {
    console.time("Grade Table Parsing");
    console.log("Parsing grade table PDF...");
    
    // Track overall progress
    let overallProgress = 0;
    const updateProgress = (step: number, total: number = 100) => {
      if (onProgress) {
        // Calculate weighted progress (PDF loading: 40%, table processing: 60%)
        const weightedProgress = Math.min(Math.round((step / total) * 60) + overallProgress, 100);
        onProgress(weightedProgress);
      }
    };
    
    if (onProgress) {
      onProgress(0); // Start progress at 0
    }
    
    // Ajout d'un timeout pour éviter un blocage indéfini
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Le chargement du PDF a pris trop de temps")), 30000); // 30 secondes
    });
    
    // Création de la promesse de chargement
    const loadingPromise = pdfjs.getDocument({ data: pdfBuffer }).promise;
    
    // Utilise Promise.race pour avoir une limite de temps
    const pdf = await Promise.race([loadingPromise, timeoutPromise]);
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Set PDF loading complete (40% of total progress)
    overallProgress = 40;
    if (onProgress) {
      onProgress(overallProgress);
    }
    
    // Extract text with position information for better table reconstruction
    const textItems: Array<{ text: string; x: number; y: number; page: number }> = [];
    const totalPages = pdf.numPages;

    // Extract text with coordinates from all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      textContent.items.forEach((item: any) => {
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
      
      // Update progress during page processing
      updateProgress(pageNum, totalPages);
    }

    console.log(`Extracted ${textItems.length} text items from PDF`);

    // Try to identify tables in the document by grouping text by Y-coordinate proximity
    // This uses a more precise algorithm to recognize table structures
    const groupedLines = groupTextIntoLines(textItems);
    console.log(`Identified ${groupedLines.length} potential table rows`);
    
    // Find header row by looking for keywords
    const headerRow = findHeaderRow(groupedLines);
    if (!headerRow) {
      throw new Error("Impossible de trouver l'en-tête du tableau dans ce PDF.");
    }
    
    console.log("Found header row:", headerRow.map(item => item.text).join(", "));
    
    // Identify columns based on header
    const columns = identifyColumns(headerRow);
    console.log("Identified columns:", columns);
    
    // Extract data rows based on the identified structure
    const dataRows = extractDataRows(groupedLines, headerRow, columns);
    console.log(`Extracted ${dataRows.length} data rows`);
    
    // Process the data rows to create student objects
    const students = createStudentObjects(dataRows, columns);
    console.log(`Created ${students.length} student objects`);
    
    // Identify subjects from columns
    const subjects = identifySubjects(columns);
    console.log(`Identified ${subjects.length} subjects: ${subjects.join(", ")}`);
    
    // Determine class information
    const className = extractClassName(textItems);
    
    return {
      className,
      subjects,
      students
    };
  } catch (error) {
    console.error('Error in parseGradeTable:', error);
    throw new Error(`Erreur lors de l'analyse du tableau de notes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    console.timeEnd("Grade Table Parsing");
  }
}

/**
 * Group text items into lines based on Y-coordinate proximity
 */
function groupTextIntoLines(textItems: Array<{ text: string; x: number; y: number; page: number }>) {
  // Sort by page and Y coordinate
  const sortedItems = [...textItems].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return Math.abs(a.y - b.y) < 5 ? a.x - b.x : a.y - b.y;
  });
  
  const lines: Array<typeof textItems> = [];
  let currentLine: typeof textItems = [];
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

/**
 * Find the header row in the table
 */
function findHeaderRow(lines: Array<Array<{ text: string; x: number; y: number; page: number }>>) {
  const headerKeywords = ['nom', 'élève', 'élèves', 'prénom', 'matière', 'matières', 'moyenne', 'moy'];
  
  for (const line of lines) {
    // Check if line has at least some of the header keywords
    const lineText = line.map(item => item.text.toLowerCase()).join(' ');
    if (headerKeywords.some(keyword => lineText.includes(keyword))) {
      // Make sure the line has at least 3 items (likely a table header)
      if (line.length >= 3) {
        return line;
      }
    }
  }
  
  // Si aucun en-tête n'est trouvé avec les mots-clés, essayer de détecter un modèle de ligne avec "Moy" répété
  for (const line of lines) {
    const moyCount = line.filter(item => item.text === 'Moy').length;
    if (moyCount >= 3) {  // Si nous trouvons plusieurs "Moy" sur une ligne, c'est probablement l'en-tête du tableau
      return line;
    }
  }
  
  return null;
}

/**
 * Identify and categorize columns from the header row
 */
function identifyColumns(headerRow: Array<{ text: string; x: number; y: number; page: number }>) {
  const columns: {
    type: 'name' | 'subject' | 'average' | 'other';
    text: string;
    x: number;
    width?: number;
  }[] = [];
  
  headerRow.forEach((item, index) => {
    let type: 'name' | 'subject' | 'average' | 'other' = 'other';
    const text = item.text.toLowerCase();
    
    if (text.includes('nom') || text.includes('élève') || text.includes('prénom')) {
      type = 'name';
    } else if ((text.includes('moyenne') || text === 'moy') && 
              (text.includes('général') || text.includes('classe'))) {
      type = 'average';
    } else if (!text.includes('rang') && !text.includes('total')) {
      // Assume it's a subject if it's not any of the special columns
      // Dans le format spécifique du Collège Romain Rolland, nous avons 'Moy' sous chaque matière
      if (text === 'moy' || text.startsWith('moy')) {
        type = 'subject';
      } else {
        // Vérifier si c'est un nom de matière (en majuscules généralement)
        if (item.text === item.text.toUpperCase() && item.text.length > 1) {
          type = 'subject';
        }
      }
    }
    
    // Calculate approximate width based on next column
    const width = index < headerRow.length - 1 ? 
      headerRow[index + 1].x - item.x : 
      100; // default width for the last column
    
    columns.push({
      type,
      text: item.text,
      x: item.x,
      width
    });
  });
  
  return columns;
}

/**
 * Extract data rows based on header structure
 */
function extractDataRows(
  lines: Array<Array<{ text: string; x: number; y: number; page: number }>>,
  headerRow: Array<{ text: string; x: number; y: number; page: number }>,
  columns: Array<{ type: string; text: string; x: number; width?: number }>
) {
  const headerPage = headerRow[0].page;
  const headerY = headerRow[0].y;
  
  // Find the header index in the lines array
  const headerIndex = lines.findIndex(line => 
    line[0].page === headerPage && Math.abs(line[0].y - headerY) < 5
  );
  
  if (headerIndex === -1) return [];
  
  // Get lines after the header, filter out any that look like headers again
  // ou des lignes qui semblent être des moyennes de classe (contenant 'Moyenne de classe')
  const dataLines = lines
    .slice(headerIndex + 1)
    .filter(line => {
      const lineText = line.map(item => item.text.toLowerCase()).join(' ');
      return !lineText.includes('moyenne de classe') && !lineText.includes('total') && line.length > 1;
    });
  
  // Process each data line to assign values to the right columns
  return dataLines.map(line => {
    const rowData = new Map<string, string>();
    
    // For each item in the line, find which column it belongs to
    line.forEach(item => {
      // Find the closest column by X position
      const column = columns.reduce((closest, current) => {
        const closestDist = Math.abs(closest.x - item.x);
        const currentDist = Math.abs(current.x - item.x);
        return currentDist < closestDist ? current : closest;
      }, columns[0]);
      
      // Add to the column's data (concat in case multiple items map to same column)
      const existingValue = rowData.get(column.text) || '';
      rowData.set(column.text, existingValue ? `${existingValue} ${item.text}` : item.text);
    });
    
    return rowData;
  });
}

/**
 * Create student objects from the data rows
 */
function createStudentObjects(
  dataRows: Array<Map<string, string>>,
  columns: Array<{ type: string; text: string; x: number; width?: number }>
) {
  // Trouver la colonne qui correspond au nom des élèves
  const nameColumn = columns.find(col => col.type === 'name');
  
  // Si aucune colonne de nom n'est trouvée, cherchons la première colonne
  // qui pourrait contenir les noms d'élèves (souvent la première colonne)
  let nameColumnText = nameColumn?.text;
  if (!nameColumnText && columns.length > 0) {
    nameColumnText = columns[0].text;
    console.log("Aucune colonne de nom explicite trouvée, utilisation de la première colonne comme noms d'élèves");
  }
  
  if (!nameColumnText) {
    throw new Error("Impossible de trouver la colonne du nom dans le tableau");
  }
  
  // Trouver la colonne de moyenne générale
  const averageColumn = columns.find(col => col.type === 'average');
  
  // Trouver les colonnes de matières (sujets)
  const subjectColumns = columns.filter(col => col.type === 'subject');
  
  return dataRows
    .filter(row => row.get(nameColumnText!)?.trim())
    .map(row => {
      const name = row.get(nameColumnText!) || '';
      
      // Extract grades for each subject
      const grades: { [subject: string]: number | null } = {};
      subjectColumns.forEach(col => {
        const gradeText = row.get(col.text);
        
        // Amélioration: Gestion spéciale des valeurs "Abs" pour les absences
        if (!gradeText || gradeText.trim() === '' || gradeText.includes('Abs')) {
          grades[col.text] = null;
        } else {
          // Convert to number, handling French number format (comma as decimal)
          try {
            const cleanedText = gradeText.replace(',', '.').trim();
            const parsedValue = parseFloat(cleanedText);
            grades[col.text] = !isNaN(parsedValue) ? parsedValue : null;
          } catch (e) {
            console.warn(`Impossible de convertir "${gradeText}" en nombre pour ${name} en ${col.text}`);
            grades[col.text] = null;
          }
        }
      });
      
      // Extract student average if available
      let average: number | undefined = undefined;
      if (averageColumn && row.get(averageColumn.text)) {
        try {
          const avgText = row.get(averageColumn.text) || '';
          average = parseFloat(avgText.replace(',', '.')) || undefined;
        } catch (e) {
          console.warn(`Impossible de convertir la moyenne pour ${name}`);
        }
      } else {
        // Calculate average from available grades
        const validGrades = Object.values(grades).filter(g => g !== null) as number[];
        if (validGrades.length > 0) {
          average = validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length;
        }
      }
      
      return {
        name,
        grades,
        average
      };
    });
}

/**
 * Identify subjects from column headers
 */
function identifySubjects(columns: Array<{ type: string; text: string; x: number; width?: number }>) {
  // Dans le format du Collège Romain Rolland, nous avons des colonnes avec "Moy" sous les noms de matières
  // Nous devons donc récupérer les noms de matières correctement
  
  // Regrouper les colonnes identifiées comme sujets
  const subjectColumns = columns.filter(col => col.type === 'subject');
  
  // Récupérer les noms de matières à partir des colonnes
  return subjectColumns.map(col => {
    // Si la colonne contient "Moy", essayons de trouver la matière correspondante
    // Dans notre cas, Moy est sous le nom de la matière
    if (col.text.toLowerCase() === 'moy') {
      // Chercher dans les colonnes qui précèdent pour trouver le nom de la matière
      // On prend l'index actuel de la colonne dans le tableau des colonnes
      const currentIndex = columns.findIndex(c => c.text === col.text && c.x === col.x);
      if (currentIndex > 0) {
        // Vérifier si la colonne précédente pourrait être un nom de matière
        const prevColumn = columns[currentIndex - 1];
        if (prevColumn.text === prevColumn.text.toUpperCase() && prevColumn.text.length > 1) {
          return prevColumn.text;
        }
      }
    }
    
    return col.text;
  });
}

/**
 * Extract class name from text items
 */
function extractClassName(textItems: Array<{ text: string; x: number; y: number; page: number }>) {
  // Look for common class name patterns like "Classe de 3ème A", "3A", etc.
  const classPatterns = [
    /classe\s+de\s+(\d+[A-Za-z]*)/i,
    /classe\s*:\s*(\d+[A-Za-z]*)/i,
    /classe\s*(\d+[A-Za-z]*)/i,
    /^(\d+[A-Za-z]*)$/
  ];
  
  for (const item of textItems) {
    for (const pattern of classPatterns) {
      const match = item.text.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  
  // Recherche spécifique pour le format du Collège Romain Rolland
  for (const item of textItems) {
    // Chercher quelque chose comme "Classe : 33"
    if (item.text.includes("Classe :") || item.text.includes("Classe :")) {
      const classValue = item.text.split(":")[1]?.trim();
      if (classValue) {
        return classValue;
      }
    }
  }
  
  return "Non identifiée";
}

/**
 * Split bulletin text into individual student bulletins more efficiently
 */
function splitBulletins(fullText: string): string[] {
  console.time("Bulletin Splitting");
  
  // Optimized regex for bulletin detection
  const anchor = /Bulletin du [0-9ᵉ]{1,3}(?:er|ème|e|nd)? ?(?:Trimestre|Semestre)/i;
  const parts: string[] = [];
  let current: string[] = [];
  const lines = fullText.split(/\r?\n/);
  
  // Estimate total for progress reporting
  const estimatedBulletinCount = Math.max(1, Math.floor(lines.length / 50));
  console.log(`Estimated number of bulletins: ~${estimatedBulletinCount} (${lines.length} lines)`);
  
  for (const line of lines) {
    if (anchor.test(line)) {
      // Start of a new bulletin
      if (current.length) {
        parts.push(current.join("\n"));
      }
      current = [line];
    } else {
      current.push(line);
    }
  }
  
  if (current.length) {
    parts.push(current.join("\n"));
  }
  
  console.timeEnd("Bulletin Splitting");
  console.log(`Split into ${parts.length} individual bulletins`);
  
  return parts;
}

/**
 * Process a single student bulletin PDF with progress tracking
 * @param pdfBuffer The PDF file buffer
 * @param onProgress Optional callback for progress updates
 * @returns A generated appreciation paragraph
 */
export async function summarizeStudentBulletin(
  pdfBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Initialize PDF.js worker
  initPdfJs();
  
  try {
    console.time("Student Bulletin Processing");
    console.log("Processing individual student bulletin...");
    
    if (onProgress) {
      onProgress(0); // Start progress at 0
    }
    
    // Parse the PDF using the same logic as parseClassBulletins but with progress tracking
    const { students } = await parseClassBulletins(pdfBuffer, (progress) => {
      // Map the bulletin parsing progress to 80% of our total progress
      if (onProgress) {
        onProgress(Math.round(progress * 0.8));
      }
    });
    
    if (!students || students.length === 0) {
      throw new Error("Aucun bulletin étudiant n'a été trouvé dans le PDF.");
    }
    
    if (onProgress) {
      onProgress(80); // Bulletin parsing complete
    }
    
    // We assume the first student is the target (since it's a single bulletin PDF)
    const student = students[0];
    
    // Generate a summary for this student
    console.log(`Generating summary for student: ${student.name}`);
    const summary = await generateStudentSummary(student);
    
    console.timeEnd("Student Bulletin Processing");
    
    if (onProgress) {
      onProgress(100); // Processing complete
    }
    
    return summary;
  } catch (error) {
    console.error('Error processing student bulletin:', error);
    throw new Error(`Erreur lors du traitement du bulletin: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Generate a summary for an individual student based on their bulletin
 * @param studentBulletin The student's bulletin data
 * @returns A generated appreciation paragraph
 */
export async function generateStudentSummary(studentBulletin: StudentBulletin): Promise<string> {
  try {
    console.log(`Generating summary for student: ${studentBulletin.name}`);
    
    // Collect all subject remarks
    const remarks = studentBulletin.subjects
      .filter(s => s.remark && s.remark.trim().length > 0)
      .map(s => `${s.subject} (${s.average || 'N/A'}/20): ${s.remark}`);
    
    if (remarks.length === 0) {
      return "Pas suffisamment de données pour générer une appréciation.";
    }
    
    // Calculate average based on available subject averages
    const validGrades = studentBulletin.subjects
      .map(s => s.average)
      .filter((avg): avg is number => avg !== null && avg !== undefined);
    
    const overallAverage = validGrades.length > 0
      ? (validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length).toFixed(1)
      : "N/A";
    
    // Build prompt for OpenAI
    const prompt = `Vous êtes un professeur principal qui doit rédiger une appréciation globale pour l'élève ${studentBulletin.name} de la classe ${studentBulletin.class}, dont la moyenne générale est de ${overallAverage}/20.

Voici les appréciations des professeurs par matière:

${remarks.map(r => `- ${r}`).join("\n")}

En vous basant sur ces remarques, rédigez une appréciation générale cohérente (100-150 mots) pour cet élève qui:
1. Reflète fidèlement le contenu et le ton des appréciations par matière
2. Souligne les points forts et les réussites
3. Identifie les axes d'amélioration de façon constructive
4. Maintient un style professionnel adapté à un bulletin scolaire officiel

Appréciation globale de l'élève:`;

    return await OpenAIService.generateText(prompt);
  } catch (error) {
    console.error('Error generating student summary:', error);
    return "Erreur lors de la génération de l'appréciation. Veuillez réessayer ultérieurement.";
  }
}

/**
 * Parse class bulletins from a PDF file
 * @param pdfBuffer The PDF file buffer
 * @param onProgress Optional callback for progress updates
 * @returns Structured bulletin data with students and class summary
 */
export async function parseClassBulletins(
  pdfBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<ClassBulletinResult> {
  // Initialize PDF.js worker
  initPdfJs();
  
  try {
    // Implementation of class bulletin parsing
    const result: ClassBulletinResult = {
      students: [],
      classSummary: ''
    };
    
    // Extract text from PDF
    const text = await extractTextFromPDF({ arrayBuffer: () => Promise.resolve(pdfBuffer) } as File, onProgress);
    
    if (!text) {
      throw new Error("No text could be extracted from the PDF");
    }
    
    // Split the text into individual bulletins
    const bulletins = splitBulletins(text);
    
    // Process each bulletin
    for (const bulletin of bulletins) {
      // Extract student name
      const nameMatch = bulletin.match(/Nom\s*:\s*([^\n]+)/);
      const name = nameMatch ? nameMatch[1].trim() : "Unknown Student";
      
      // Extract class
      const classMatch = bulletin.match(/Classe\s*:\s*([^\n]+)/);
      const className = classMatch ? classMatch[1].trim() : "Unknown Class";
      
      // Extract subject feedback
      const subjects: SubjectFeedback[] = [];
      const subjectPattern = /([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s&\.]+)\s+(?:M\.|Mme\.?|M)\s+([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s\-]+)\s+(\d+[,\.]\d+)?\s+([^A-ZÉÈÊÀÔÙÛÇ][^]*?)(?=(?:[A-ZÉÈÊÀÔÙÛÇ\s&\.]{5,}\s+(?:M\.|Mme\.?|M)\s+|$))/gi;
      
      let match;
      while ((match = subjectPattern.exec(bulletin)) !== null) {
        const subject = match[1].trim();
        const teacher = match[2].trim();
        const average = match[3] ? parseFloat(match[3].replace(',', '.')) : null;
        const remark = match[4].trim();
        
        subjects.push({
          subject,
          teacher,
          average,
          remark
        });
      }
      
      // Extract class summary if present
      const summaryMatch = bulletin.match(/Appréciation générale de la classe\s*:\s*([^]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (summaryMatch) {
        result.classSummary = summaryMatch[1].trim();
      }
      
      if (subjects.length > 0) {
        result.students.push({
          name,
          class: className,
          subjects
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing class bulletins:', error);
    throw new Error(`Failed to parse class bulletins: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export { parseGradeTable }