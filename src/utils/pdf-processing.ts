import * as pdfjs from 'pdfjs-dist';
import { toast } from 'sonner';
import { OpenAIService } from './openai-service';

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
 * Parse a class grade table PDF to extract structured data
 * @param pdfBuffer The PDF file buffer
 * @returns Structured table data with students, grades, and subjects
 */
export async function parseGradeTable(pdfBuffer: ArrayBuffer): Promise<GradeTableResult> {
  try {
    console.log("Parsing grade table PDF...");
    
    // Load PDF with pdfjs
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    const textItems: Array<{ text: string; x: number; y: number; page: number }> = [];

    // Extract text with coordinates from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
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
      throw new Error("Unable to find header row in grade table PDF.");
    }

    // Determine index of the name column and subject columns
    const nameColIndex = header.findIndex(col => 
      col.toLowerCase().includes("nom") || col.toLowerCase().includes("élève")
    );
    
    if (nameColIndex === -1) {
      throw new Error("Unable to identify student name column in table.");
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
 * Split bulletin text into individual student bulletins
 */
function splitBulletins(fullText: string): string[] {
  const anchor = /Bulletin du [0-9ᵉ]{1,3}(?:er|ème|e|nd)? ?(?:Trimestre|Semestre)/i;  // Regex for "Bulletin du ... Trimestre/Semestre"
  const parts: string[] = [];
  let current: string[] = [];
  const lines = fullText.split(/\r?\n/);
  
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
  
  return parts;
}

/**
 * Parse a PDF containing multiple student bulletins
 * @param pdfBuffer The PDF file buffer
 * @returns Structured data with student bulletins and class summary
 */
export async function parseClassBulletins(pdfBuffer: ArrayBuffer): Promise<ClassBulletinResult> {
  try {
    console.log("Parsing class bulletins PDF...");
    
    // Extract all text from PDF using pdfjs for better handling
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    const fullTextArray: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str || '').join(' ');
      fullTextArray.push(pageText);
    }
    
    const fullText = fullTextArray.join('\n');
    
    // Split into individual bulletin texts
    const bulletinTexts = splitBulletins(fullText);
    console.log(`Identified ${bulletinTexts.length} individual student bulletins`);
    
    const students: StudentBulletin[] = [];
    const allRemarks: string[] = [];

    for (const bulletinText of bulletinTexts) {
      // Extract student name and class
      const nameMatch = bulletinText.match(/(?:Nom|Élève)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)(?=\s|\n|$)/i) || 
                        bulletinText.match(/Bulletin[^:]*?:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)(?=\s|\n|$)/i);
      
      const classMatch = bulletinText.match(/Classe\s*:?\s*([\wÀ-ÖØ-öø-ÿ\s\-]+)(?=\s|\n|$)/i);
      
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
    }

    // Generate class summary with NLP if we have enough data
    let classSummary = "";
    
    if (allRemarks.length > 0) {
      console.log(`Generating class summary based on ${allRemarks.length} subject remarks`);
      
      try {
        // Prepare prompt for OpenAI
        const prompt = `Vous êtes un professeur principal qui doit rédiger une synthèse pour le conseil de classe.
Voici des extraits d'appréciations des professeurs pour l'ensemble des élèves:

${allRemarks.slice(0, 30).map(r => `- ${r}`).join("\n")}

Rédigez un paragraphe de synthèse pour la classe entière (150-200 mots) qui:
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

    return { students, classSummary };
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
 * Process a single student bulletin PDF
 * @param pdfBuffer The PDF file buffer
 * @returns A generated appreciation paragraph
 */
export async function summarizeStudentBulletin(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("Processing individual student bulletin...");
    
    // Parse the PDF using the same logic as parseClassBulletins
    const { students } = await parseClassBulletins(pdfBuffer);
    
    if (!students || students.length === 0) {
      throw new Error("Aucun bulletin étudiant n'a été trouvé dans le PDF.");
    }
    
    // We assume the first student is the target (since it's a single bulletin PDF)
    const student = students[0];
    
    // Generate a summary for this student
    return await generateStudentSummary(student);
  } catch (error) {
    console.error('Error processing student bulletin:', error);
    throw new Error(`Erreur lors du traitement du bulletin: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
