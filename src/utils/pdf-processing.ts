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
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Set PDF loading complete (40% of total progress)
    overallProgress = 40;
    if (onProgress) {
      onProgress(overallProgress);
    }
    
    const textItems: Array<{ text: string; x: number; y: number; page: number }> = [];
    const totalPages = pdf.numPages;

    // Extract text with coordinates from all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Only log every few pages for large documents
      if (pageNum === 1 || pageNum === totalPages || pageNum % 5 === 0) {
        console.log(`Processing page ${pageNum} of ${totalPages}`);
      }
      
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      content.items.forEach((item: any) => {
        if (item.str) {
          // Capture text and its position
          textItems.push({
            text: item.str,
            x: item.transform[4],    // horizontal position
            y: item.transform[5],    // vertical position
            page: pageNum
          });
        }
      });
      
      // Update progress during page processing
      updateProgress(pageNum, totalPages);
    }

    console.log(`Extracted ${textItems.length} text items from PDF`);

    // Group items by line (y-coordinate, within a tolerance to account for minor differences)
    const rowsMap = new Map<number, Array<{ text: string; x: number }>>();
    const yTolerance = 5;
    for (const item of textItems) {
      // Use page number to avoid mixing lines across pages
      const key = Math.round(item.y / yTolerance) + item.page * 10000;
      if (!rowsMap.has(key)) {
        rowsMap.set(key, []);
      }
      rowsMap.get(key)!.push({ text: item.text, x: item.x });
    }
    
    // Sort rows by their Y (to go top-down)
    const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => b - a);
    const rows = sortedRowKeys.map(yKey => {
      const rowItems = rowsMap.get(yKey)!;
      // Sort items in the row by X (left-to-right)
      rowItems.sort((a, b) => a.x - b.x);
      // Map to just the text
      const rowText = rowItems.map(cell => cell.text.trim());
      return rowText;
    });

    console.log(`Reconstructed ${rows.length} rows from PDF`);

    // Identify header row by searching for a known column identifier
    let header: string[] = [];
    let headerIndex = -1;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const headerLine = row.map(cell => cell.toLowerCase()).join(" ");
      if (headerLine.includes("nom") || headerLine.includes("élève")) {
        header = row;
        headerIndex = i;
        break;
      }
    }
    
    if (header.length === 0) {
      throw new Error("Impossible de trouver l'en-tête du tableau dans ce PDF.");
    }

    // Determine index of the name column and subject columns
    const nameColIndex = header.findIndex(col => 
      col.toLowerCase().includes("nom") || col.toLowerCase().includes("élève")
    );
    
    if (nameColIndex === -1) {
      throw new Error("Impossible d'identifier la colonne du nom dans le tableau.");
    }
    
    const subjects: string[] = [];
    header.forEach((colText, idx) => {
      if (idx !== nameColIndex && 
          !colText.toLowerCase().includes("moyenne") &&
          !colText.toLowerCase().includes("total") &&
          !colText.toLowerCase().includes("rang")) {
        subjects.push(colText.trim() || `Matière ${idx}`); // Use placeholder if blank
      }
    });

    console.log(`Identified ${subjects.length} subjects in table`);

    const students: StudentGrades[] = [];
    
    // Process student rows (skip the header)
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;
      if (nameColIndex >= row.length) continue;  // Row too short to contain name
      
      const rawName = row[nameColIndex].trim();
      if (!rawName || rawName.toLowerCase().includes("nom") || rawName.toLowerCase().includes("élève")) {
        // Skip header or invalid name
        continue;
      }
      
      // Some PDFs might include class or other info in name cell; we keep just the name
      const name = rawName.replace(/\b3\d\b/g, "").trim();  // E.g., remove class code like "33" if present
      const grades: {[subject: string]: number | null} = {};
      let total = 0, count = 0;

      subjects.forEach((subject, sIdx) => {
        // Find corresponding cell in the row 
        // If header and row length are the same, use index offset for alignment
        let gradeValue: number | null = null;
        const dataColIndex = row.length === header.length ? 
          (nameColIndex < sIdx ? sIdx + 1 : sIdx) : // Adjust if name column shifts index
          sIdx + 1;
        
        if (dataColIndex < row.length) {
          const cellText = row[dataColIndex].trim();
          if (cellText === "" || /Abs\b/i.test(cellText)) {
            gradeValue = null; // absent or missing grade
          } else {
            // Replace comma with dot for decimal, and parse
            const num = parseFloat(cellText.replace(',', '.'));
            gradeValue = isNaN(num) ? null : num;
          }
        }
        
        grades[subject] = gradeValue;
        if (gradeValue !== null) {
          total += gradeValue;
          count++;
        }
      });

      const average = count > 0 ? parseFloat((total / count).toFixed(2)) : undefined;
      students.push({ name, grades, average });
    }

    console.log(`Parsed ${students.length} students with grade data`);

    // Extract class name if available
    let className = "Inconnu";
    for (let i = 0; i < Math.min(headerIndex, 5); i++) {
      const rowText = rows[i].join(" ");
      const classMatch = rowText.match(/classe\s*:?\s*(\S+)/i);
      if (classMatch) {
        className = classMatch[1];
        break;
      }
    }

    console.timeEnd("Grade Table Parsing");
    
    if (onProgress) {
      onProgress(100); // Parsing complete
    }
    
    return {
      className,
      subjects,
      students
    };
  } catch (error) {
    console.error('Error parsing grade table PDF:', error);
    throw new Error(`Erreur lors de l'analyse du tableau des notes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
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
            if (avgMatch && currentSubject.average === null) {
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
      
      console.timeEnd("Class Bulletins Parsing");
      
      if (onProgress) {
        onProgress(100); // Processing complete
      }
      
      return { students, classSummary };
    };
    
    // Exécuter avec le timeout
    return Promise.race([processingPromise(), timeoutPromise]);
  } catch (error) {
    console.error('Error parsing class bulletins:', error);
    throw new Error(`Erreur lors de l'analyse des bulletins: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
