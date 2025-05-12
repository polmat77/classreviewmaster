import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';
import { OpenAIService } from './openai-service';
import { extractTextFromPDF, validatePdfFile } from './pdf-service';

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
export async function parseGradeTable(
  pdfBuffer: ArrayBuffer, 
  onProgress?: (progress: number) => void
): Promise<GradeTableResult> {
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
    
    // Load PDF with pdfjs
    // Make sure the worker is properly loaded
    const workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
    
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
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
 * Parse a PDF containing multiple student bulletins with progress tracking
 * @param pdfBuffer The PDF file buffer
 * @param onProgress Optional callback for progress updates
 * @returns Structured data with student bulletins and class summary
 */
export async function parseClassBulletins(
  pdfBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<ClassBulletinResult> {
  try {
    console.time("Class Bulletins Parsing");
    console.log("Parsing class bulletins PDF...");
    
    if (onProgress) {
      onProgress(0); // Start progress at 0
    }
    
    // Vérifier la taille du buffer avant le traitement
    const bufferSize = pdfBuffer.byteLength / (1024 * 1024); // en MB
    if (bufferSize > 30) {
      throw new Error(`Le fichier PDF est trop volumineux (${bufferSize.toFixed(2)} MB). Maximum recommandé: 30 MB`);
    }
    
    // Ajouter un timeout global pour l'ensemble du processus
    const MAX_PROCESSING_TIME = 60000; // 60 secondes maximum
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("L'analyse du PDF a été interrompue car elle prenait trop de temps"));
      }, MAX_PROCESSING_TIME);
    });
    
    // Créer une promise pour le traitement normal
    const processingPromise = async () => {
      // Extract all text from PDF using pdfjs for better handling
      const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      if (onProgress) {
        onProgress(10); // PDF document loaded
      }
      
      // Limiter le nombre de pages traitées si nécessaire
      const MAX_PAGES = 100;
      const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);
      if (pdf.numPages > MAX_PAGES) {
        console.log(`Limiting processing to first ${MAX_PAGES} pages out of ${pdf.numPages}`);
      }
      
      // Process in batches to avoid memory issues with large documents
      const batchSize = 3; // Process 3 pages at a time (reduced from 5)
      const fullTextArray: string[] = [];
      
      for (let batchStart = 1; batchStart <= pagesToProcess; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, pagesToProcess);
        console.log(`Processing pages ${batchStart} to ${batchEnd}`);
        
        const batchPromises = [];
        for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
          batchPromises.push(extractPageText(pdf, pageNum));
        }
        
        try {
          const batchTexts = await Promise.all(batchPromises);
          fullTextArray.push(...batchTexts);
        } catch (error) {
          console.warn(`Error processing batch ${batchStart}-${batchEnd}:`, error);
          // Continue to next batch instead of failing completely
        }
        
        // Update progress during page processing (40% of total for this stage)
        if (onProgress) {
          const progressValue = Math.min(10 + Math.round((batchEnd / pagesToProcess) * 40), 50);
          onProgress(progressValue);
        }
      }
      
      async function extractPageText(pdf: any, pageNum: number): Promise<string> {
        try {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent({
            normalizeWhitespace: true
          });
          const pageText = content.items.map((item: any) => item.str || '').join(' ');
          return pageText;
        } catch (error) {
          console.error(`Error extracting text from page ${pageNum}:`, error);
          return ""; // Return empty string for failed pages
        }
      }
      
      // Extract text with position for better structure recognition
      const structuredPages = [];
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });
          
          // Convert textItems to structured format with positions
          const items = textContent.items.map((item: any) => {
            if (item.str && item.str.trim()) {
              const tx = item.transform[4];
              const ty = viewport.height - item.transform[5]; // Y is inverted
              
              return {
                text: item.str.trim(),
                x: tx,
                y: ty,
                fontSize: item.height,
                fontName: item.fontName
              };
            }
            return null;
          }).filter(Boolean);
          
          structuredPages.push({ pageNum, items });
        } catch (error) {
          console.error(`Error processing structured text from page ${pageNum}:`, error);
        }
      }
      
      // Detect if this is a class bulletin
      const firstPage = structuredPages[0];
      const isRomainRollandFormat = firstPage?.items.some((item: any) => 
        /COLLEGE ROMAIN ROLLAND/i.test(item.text)
      );
      
      // Check if this is a class bulletin with subject appreciations
      const isClassBulletinWithSubjectAppreciations = firstPage?.items.some((item: any) => 
        /Appréciation[s]? générale[s]? de la classe/i.test(item.text)
      ) || isRomainRollandFormat;
      
      let result: ClassBulletinResult;
      
      if (isClassBulletinWithSubjectAppreciations) {
        console.log("Bulletin de classe avec appréciations par matière détecté");
        
        // Extraire les appréciations du bulletin
        const { classAppreciation, subjects: subjectAppreciations } = extractClassSubjectAppreciations(fullTextArray);
        
        // Formater pour le format de retour attendu
        const student: StudentBulletin = {
          name: "Classe entière",
          class: "Bulletin de classe",
          subjects: subjectAppreciations.map(subject => ({
            subject: subject.name,
            average: subject.average || null,
            teacher: subject.teacher,
            remark: subject.appreciation
          }))
        };
        
        if (onProgress) {
          onProgress(95);
        }
        
        result = {
          students: [student],
          classSummary: classAppreciation
        };
      } else {
        // Process as before for other bulletin formats
        const fullText = fullTextArray.join('\n');
        
        // Vérifier si nous avons extrait du texte
        if (!fullText || fullText.trim().length < 100) {
          throw new Error("Le PDF semble vide ou ne contient pas de texte extractible");
        }
        
        // Update progress: text extraction complete
        if (onProgress) {
          onProgress(50);
        }
        
        // Split into individual bulletin texts
        const bulletinTexts = splitBulletins(fullText);
        console.log(`Identified ${bulletinTexts.length} individual student bulletins`);
        
        // Vérifier si nous avons trouvé des bulletins
        if (bulletinTexts.length === 0) {
          throw new Error("Aucun bulletin n'a été détecté dans le PDF. Vérifiez le format du document.");
        }
        
        // Update progress: split complete
        if (onProgress) {
          onProgress(60);
        }
        
        const students: StudentBulletin[] = [];
        const allRemarks: string[] = [];
        
        // Process each bulletin with progress updates
        for (let i = 0; i < bulletinTexts.length; i++) {
          const bulletinText = bulletinTexts[i];
          
          // Process individual bulletin (extract student name, class, etc.)
          const nameMatch = bulletinText.match(/(?:Nom|Élève)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)(?=\s|\n|$)/i) || 
                          bulletinText.match(/Bulletin[^:]*?:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)(?=\s|\n|$)/i);
          
          const classMatch = bulletinText.match(/Classe\s*:?\s*([\wÀ-ÖØ-Ü]{3,}(?:[\s\-][A-ZÀ-ÖØ-Ü]{2,})*$)/i);
          
          const studentName = nameMatch ? nameMatch[1].trim() : "Élève Inconnu";
          const className = classMatch ? classMatch[1].trim() : "Classe Inconnue";

          // Extract subjects and remarks
          const subjects: SubjectFeedback[] = [];
          const lines = bulletinText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          let currentSubject: SubjectFeedback | null = null;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // If line looks like a subject title (all caps or major subject name)
            if (/^[A-ZÀ-ÖØ-Ü]{3,}(?:[\s\-][A-ZÀ-ÖØ-Ü]{2,})*$/.test(line) || 
                /^(?:FRANÇAIS|MATHÉMATIQUES|HISTOIRE|GÉOGRAPHIE|ANGLAIS|PHYSIQUE|CHIMIE|SVT|EPS)$/i.test(line)) {
              
              // Save the previous subject feedback if any
              if (currentSubject) {
                subjects.push(currentSubject);
              }
              
              // Start a new subject feedback
              currentSubject = { subject: line, average: null, remark: "" };
              // Next line(s) may contain average and remarks
            } else if (currentSubject) {
              // Check if the line contains a numeric average
              const avgMatch = line.match(/(\d+[,.]\d+)\/20/);
              if (avgMatch &&currentSubject.average === null) {
                // Parse the first number as the student's average for that subject
                currentSubject.average = parseFloat(avgMatch[1].replace(',', '.'));
                // Remove the number from the line when taking it as comment
                const commentPart = line.replace(/(\d+[,.]\d+)\/20/, "").trim();
                if (commentPart) {
                  currentSubject.remark += commentPart;
                }
              } else if (line.includes("Professeur") || line.includes("Enseignant")) {
                // Extract teacher name if present
                const teacherMatch = line.match(/(?:Professeur|Enseignant)\s*:?\s*(.+?)(?=\s*$)/i);
                if (teacherMatch) {
                  currentSubject.teacher = teacherMatch[1].trim();
                }
              } else {
                // Append the line to the remark
                if (line) {
                  currentSubject.remark += (currentSubject.remark ? " " : "") + line;
                }
              }
            }
          }
          
          // Push the last subject if it exists
          if (currentSubject) {
            subjects.push(currentSubject);
          }

          // Collect all non-empty remarks for class summary
          subjects.forEach(sub => {
            if (sub.remark && sub.remark.length > 10) { // Only add substantial remarks
              allRemarks.push(`${sub.subject}: ${sub.remark}`);
            }
          });

          students.push({ name: studentName, class: className, subjects });
          
          // Update progress for each processed bulletin
          if (onProgress) {
            const bulletinProgress = Math.floor(60 + ((i + 1) / bulletinTexts.length) * 35);
            onProgress(Math.min(bulletinProgress, 95));
          }
        }

        // Vérifier si nous avons extrait des données d'élèves
        if (students.length === 0) {
          throw new Error("Aucune donnée d'élève n'a pu être extraite du PDF");
        }

        // Generate class summary with NLP if we have enough data
        let classSummary = "";
        
        if (allRemarks.length > 0) {
          console.log(`Generating class summary based on ${allRemarks.length} subject remarks`);
          
          if (onProgress) {
            onProgress(95); // Summary generation in progress
          }
          
          try {
            // Limiter le nombre de remarques pour la requête à OpenAI
            const maxRemarks = 20; // Réduire de 30 à 20
            
            // Prepare prompt for OpenAI
            const prompt = `Vous êtes un professeur principal qui doit rédiger une synthèse pour le conseil de classe.
Voici des extraits d'appréciations des professeurs pour l'ensemble des élèves:

${allRemarks.slice(0, maxRemarks).map(r => `- ${r}`).join("\n")}

Rédigez un paragraphe de synthèse pour la classe entière (100-150 mots) qui:
1. Identifie les points forts généraux de la classe
2. Souligne les difficultés communes rencontrées
3. Propose des axes d'amélioration
4. Maintient un ton professionnel et constructif

Synthèse pour la classe:`;

            classSummary = await OpenAIService.generateText(prompt);
          } catch (error) {
            console.error("Error generating class summary:", error);
            classSummary = "Impossible de générer une synthèse automatique. Veuillez consulter les appréciations individuelles.";
          }
        } else {
          classSummary = "Pas suffisamment de données pour générer une synthèse de classe.";
        }
        
        result = { students, classSummary };
      }
      
      console.timeEnd("Class Bulletins Parsing");
      
      if (onProgress) {
        onProgress(100); // Processing complete
      }
      
      return result;
    };
    
    // Exécuter avec le timeout
    return Promise.race([processingPromise(), timeoutPromise]);
  } catch (error) {
    console.error('Error parsing class bulletins:', error);
    throw new Error(`Erreur lors de l'analyse des bulletins: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Extrait les appréciations générales d'un bulletin de classe au format Collège Romain Rolland
 */
function extractClassSubjectAppreciations(textContent: string[] | null): {
  classAppreciation: string;
  subjects: Array<{ 
    name: string;
    teacher?: string;
    average?: number;
    appreciation: string;
  }>;
} {
  if (!textContent || !Array.isArray(textContent)) {
    console.warn('textContent is not an array, returning empty result');
    return {
      classAppreciation: '',
      subjects: []
    };
  }

  if (!Array.isArray(textContent)) {
    console.warn('textContent is not an array, returning empty result');
    return {
      classAppreciation: '',
      subjects: []
    };
  }

  const fullText = textContent.join(' ');
  if (typeof fullText !== 'string') {
    console.warn('Joined text content is not a string, returning empty result');
    return {
      classAppreciation: '',
      subjects: []
    };
  }

  if (typeof fullText !== 'string') {
    console.warn('Joined text content is not a string, returning empty result');
    return {
      classAppreciation: '',
      subjects: []
    };
  }

  const subjects: Array<{ name: string; teacher?: string; average?: number; appreciation: string }> = [];
  
  // Chercher les appréciations par matière
  // Format typique: "MATIÈRE\nM. PROFESSEUR\n10,77\nAppréciation de la matière"
  const subjectPattern = /([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s&\.]+)\s+(?:M\.|Mme\.?|M)\s+([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s\-]+)\s+(\d+[,\.]\d+)?\s+([^A-ZÉÈÊÀÔÙÛÇ][^]*?)(?=(?:[A-ZÉÈÊÀÔÙÛÇ\s&\.]{5,}\s+(?:M\.|Mme\.?|M)\s+|$))/gi;
  
  let match;
  while ((match = subjectPattern.exec(fullText)) !== null) {
    if (match[1] && match[4]) {
      const subjectName = match[1].trim();
      const teacherName = match[2]?.trim();
      const averageText = match[3]?.replace(',', '.');
      const average = averageText ? parseFloat(averageText) : undefined;
      const appreciation = match[4].trim()
        .replace(/\s+/g, ' ') // Remplacer les espaces multiples
        .replace(/POLE \w+/g, '') // Supprimer les mentions POLE
        .trim();
      
      // Ne pas ajouter de doublons (parfois le même nom apparaît plusieurs fois)
      if (!subjects.some(s => s.name === subjectName) && 
          appreciation.length > 10 && // Filtre les appréciations trop courtes
          !subjectName.includes('POLE') && // Exclure les lignes d'en-tête POLE
          !subjectName.includes('OPTIONS')) { // Exclure les lignes d'en-tête OPTIONS
        subjects.push({
          name: subjectName,
          teacher: teacherName,
          average,
          appreciation
        });
      }
    }
  }
  
  // Extraire le résumé général si disponible, ou le construire à partir des appréciations
  let classAppreciation = '';
  
  // Chercher une appréciation générale explicite
  const generalAppreciationMatch = fullText.match(/Appréciation[s]? générale[s]? de la classe[^A-ZÉÈÊÀÔÙÛÇ]+(.*?)(?=\n\s*[A-ZÉÈÊÀÔÙÛÇ]{3,}|$)/i);
  if (generalAppreciationMatch && generalAppreciationMatch[1]) {
    classAppreciation = generalAppreciationMatch[1].trim();
  } else {
    // Si pas d'appréciation générale, construire un résumé à partir des appréciations par matière
    const appreciationPhrases = subjects
      .filter(s => s.appreciation && s.appreciation.length > 15)
      .map(s => s.appreciation)
      .slice(0, 3); // Prendre les 3 premières appréciations significatives
    
    if (appreciationPhrases.length > 0) {
      classAppreciation = `Synthèse des appréciations par matière : ${appreciationPhrases.join(' ')}`;
    }
  }
  
  console.log(`Extrait ${subjects.length} matières avec appréciations`);
  
  return {
    classAppreciation,
    subjects
  };
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

export { parseClassBulletins }

export { parseGradeTable, summarizeStudentBulletin }