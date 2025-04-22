
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface MappingTemplate {
  studentNamePattern: string;
  studentIdPattern: string;
  subjectPattern: string;
  gradePattern: string;
  classAveragePattern: string;
  teacherCommentPattern: string;
  termPattern: string;
  classNamePattern: string;
  schoolNamePattern: string;
  customRegex: string;
  delimiters: {
    student: string;
    subject: string;
  };
  columnMappings: {
    studentName: number;
    studentId: number;
    subject: number;
    grade: number;
    classAverage: number;
    teacherComment: number;
  };
}

/**
 * Tente de créer automatiquement un template de mapping basé sur les données
 */
export function createMappingTemplate(
  data: string | any[],
  fileType: 'pdf' | 'csv' | 'excel'
): MappingTemplate {
  const template: MappingTemplate = {
    studentNamePattern: '',
    studentIdPattern: '',
    subjectPattern: '',
    gradePattern: '',
    classAveragePattern: '',
    teacherCommentPattern: '',
    termPattern: '',
    classNamePattern: '',
    schoolNamePattern: '',
    customRegex: '',
    delimiters: {
      student: '',
      subject: '',
    },
    columnMappings: {
      studentName: -1,
      studentId: -1,
      subject: -1,
      grade: -1,
      classAverage: -1,
      teacherComment: -1,
    }
  };
  
  if (fileType === 'pdf') {
    const text = data as string;
    
    // Essayer de détecter automatiquement les patterns
    // Nom d'élève (chercher des motifs comme "Élève:", "Nom:")
    const studentNameRegexes = [
      /(?:Élève|Nom|NOM|Étudiant)[\s:]+([\p{L}\s\-]+)/u,
      /^([\p{L}\s\-]+)[\s]+(?:\d{1,2}[,.]\d{1,2})/um,  // Nom suivi d'une note
    ];
    
    for (const regex of studentNameRegexes) {
      const match = text.match(regex);
      if (match) {
        template.studentNamePattern = regex.source;
        break;
      }
    }
    
    // Matières (chercher des motifs courants de matières scolaires)
    const subjectRegexes = [
      /(?:Matière|MATIÈRE)[\s:]+([\p{L}\s\-]+)/u,
      /(Mathématiques|Français|Histoire|SVT|Physique|Anglais|EPS)[\s:]+/u
    ];
    
    for (const regex of subjectRegexes) {
      const match = text.match(regex);
      if (match) {
        template.subjectPattern = regex.source;
        break;
      }
    }
    
    // Notes (chercher des nombres avec virgule/point décimal)
    const gradeRegexes = [
      /(?:Note|Moyenne|MOY)[\s:]+(\d{1,2}[.,]\d{1,2})/,
      /(\d{1,2}[.,]\d{1,2})[\s\/]+20/
    ];
    
    for (const regex of gradeRegexes) {
      const match = text.match(regex);
      if (match) {
        template.gradePattern = regex.source;
        break;
      }
    }
    
    // Délimiteurs entre élèves (lignes vides, séparateurs)
    if (text.includes('------')) {
      template.delimiters.student = '------';
    } else if (text.includes('======')) {
      template.delimiters.student = '======';
    } else if (text.includes('\n\n\n')) {
      template.delimiters.student = '\n\n\n';
    } else {
      template.delimiters.student = '\n\n';
    }
    
    // Moyennes de classe
    const classAvgRegexes = [
      /(?:Moyenne de classe|Moy\. Classe|Moyenne générale)[\s:]+(\d{1,2}[.,]\d{1,2})/,
      /Classe[\s:]+(\d{1,2}[.,]\d{1,2})/
    ];
    
    for (const regex of classAvgRegexes) {
      const match = text.match(regex);
      if (match) {
        template.classAveragePattern = regex.source;
        break;
      }
    }
    
    // Commentaires
    const commentRegexes = [
      /(?:Commentaire|Appréciation|APPRECIATION)[\s:]+(.+?)(?=\n\n|\n[A-Z])/s,
      /(?:Commentaire|Appréciation)[\s:]+(.+)/
    ];
    
    for (const regex of commentRegexes) {
      const match = text.match(regex);
      if (match) {
        template.teacherCommentPattern = regex.source;
        break;
      }
    }
    
    // Trimestre
    const termRegexes = [
      /(?:Trimestre|TRIMESTRE)[\s:]+(Premier|Deuxième|Troisième|1er|2ème|3ème|\d)/i,
      /Bulletin du (Premier|Deuxième|Troisième|1er|2ème|3ème) trimestre/i
    ];
    
    for (const regex of termRegexes) {
      const match = text.match(regex);
      if (match) {
        template.termPattern = regex.source;
        break;
      }
    }
    
    // Nom de classe
    const classNameRegexes = [
      /(?:Classe|CLASSE)[\s:]+([\p{L}\d\s\-]+)/u,
      /Bulletin de ([\p{L}\d\s\-]+)/u
    ];
    
    for (const regex of classNameRegexes) {
      const match = text.match(regex);
      if (match) {
        template.classNamePattern = regex.source;
        break;
      }
    }
    
  } else if (fileType === 'csv' || fileType === 'excel') {
    const rows = data as any[];
    
    if (rows && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      
      // Essayer de déterminer les colonnes automatiquement
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes('élève') || headerLower.includes('nom') || 
            headerLower.includes('etudiant') || headerLower.includes('student')) {
          template.columnMappings.studentName = index;
        } 
        else if (headerLower.includes('matière') || headerLower.includes('discipline') || 
                headerLower.includes('subject')) {
          template.columnMappings.subject = index;
        }
        else if (headerLower.includes('note') || headerLower.includes('moyenne') || 
                headerLower.includes('moy') || headerLower.includes('grade')) {
          template.columnMappings.grade = index;
        }
        else if (headerLower.includes('classe') && 
                (headerLower.includes('moy') || headerLower.includes('average'))) {
          template.columnMappings.classAverage = index;
        }
        else if (headerLower.includes('comment') || headerLower.includes('appréciation') || 
                headerLower.includes('appreciation')) {
          template.columnMappings.teacherComment = index;
        }
        else if (headerLower.includes('id')) {
          template.columnMappings.studentId = index;
        }
      });
    }
  }
  
  return template;
}

/**
 * Applique le mapping défini pour extraire les données structurées
 */
export async function applyMapping(
  data: string | any[],
  template: MappingTemplate,
  fileType: 'pdf' | 'csv' | 'excel'
): Promise<any> {
  try {
    if (fileType === 'pdf') {
      return applyPdfMapping(data as string, template);
    } else {
      return applyTabularMapping(data as any[], template);
    }
  } catch (error) {
    console.error("Erreur lors de l'application du mapping:", error);
    throw new Error(`Erreur lors de l'application du mapping: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Applique le mapping pour les fichiers PDF
 */
async function applyPdfMapping(text: string, template: MappingTemplate): Promise<any> {
  const result = {
    students: [] as any[],
    subjects: new Set<string>(),
    termInfo: {
      term: 'Inconnu',
      class: 'Inconnue',
      schoolName: undefined
    }
  };
  
  // Extraction du trimestre si possible
  if (template.termPattern) {
    const termMatch = new RegExp(template.termPattern, 'i').exec(text);
    if (termMatch && termMatch[1]) {
      const termValue = termMatch[1].trim();
      // Convertir en format standard
      if (/premier|1er/i.test(termValue)) {
        result.termInfo.term = 'Trimestre 1';
      } else if (/deuxi[èe]me|2[èe]me/i.test(termValue)) {
        result.termInfo.term = 'Trimestre 2';
      } else if (/troisi[èe]me|3[èe]me/i.test(termValue)) {
        result.termInfo.term = 'Trimestre 3';
      } else {
        result.termInfo.term = `Trimestre ${termValue}`;
      }
    }
  }
  
  // Extraction du nom de classe si possible
  if (template.classNamePattern) {
    const classMatch = new RegExp(template.classNamePattern, 'i').exec(text);
    if (classMatch && classMatch[1]) {
      result.termInfo.class = classMatch[1].trim();
    }
  }
  
  // Extraction du nom de l'école si possible
  if (template.schoolNamePattern) {
    const schoolMatch = new RegExp(template.schoolNamePattern, 'i').exec(text);
    if (schoolMatch && schoolMatch[1]) {
      result.termInfo.schoolName = schoolMatch[1].trim();
    }
  }
  
  // Séparation par élèves
  let studentBlocks: string[] = [];
  
  if (template.delimiters.student) {
    studentBlocks = text.split(new RegExp(template.delimiters.student.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'));
  } else {
    // Essayer de détecter automatiquement des blocs d'élèves
    studentBlocks = text.split(/\n{3,}|\r\n{3,}|={3,}|-{3,}/);
  }
  
  // Traiter chaque bloc d'élève
  for (const block of studentBlocks) {
    if (!block.trim()) continue;
    
    let studentName = '';
    const grades: { [subject: string]: number } = {};
    const classAvg: { [subject: string]: number } = {};
    const comments: { [subject: string]: string } = {};
    
    // Extraire le nom de l'élève
    if (template.studentNamePattern) {
      const nameMatch = new RegExp(template.studentNamePattern, 'i').exec(block);
      if (nameMatch && nameMatch[1]) {
        studentName = nameMatch[1].trim();
      }
    }
    
    // Si aucun nom d'élève n'a été trouvé, passer ce bloc
    if (!studentName) continue;
    
    // Extraire les matières et les notes
    if (template.subjectPattern && template.gradePattern) {
      // Trouver toutes les matières
      const subjectMatches = [...block.matchAll(new RegExp(template.subjectPattern, 'gi'))];
      
      for (const match of subjectMatches) {
        if (match && match[1]) {
          const subject = match[1].trim();
          result.subjects.add(subject);
          
          // Chercher la note associée à cette matière
          // On limite la recherche à une portion du texte après la matière
          const subjectStartIndex = match.index || 0;
          const nextSubjectMatch = block.indexOf(match[0], subjectStartIndex + match[0].length);
          const searchEndIndex = nextSubjectMatch > -1 ? nextSubjectMatch : block.length;
          const subjectSection = block.substring(subjectStartIndex, searchEndIndex);
          
          // Trouver la note
          const gradeMatch = new RegExp(template.gradePattern, 'i').exec(subjectSection);
          if (gradeMatch && gradeMatch[1]) {
            const gradeStr = gradeMatch[1].replace(',', '.').trim();
            const grade = parseFloat(gradeStr);
            if (!isNaN(grade)) {
              grades[subject] = grade;
            }
          }
          
          // Trouver la moyenne de classe si disponible
          if (template.classAveragePattern) {
            const classAvgMatch = new RegExp(template.classAveragePattern, 'i').exec(subjectSection);
            if (classAvgMatch && classAvgMatch[1]) {
              const avgStr = classAvgMatch[1].replace(',', '.').trim();
              const avg = parseFloat(avgStr);
              if (!isNaN(avg)) {
                classAvg[subject] = avg;
              }
            }
          }
          
          // Trouver le commentaire si disponible
          if (template.teacherCommentPattern) {
            const commentMatch = new RegExp(template.teacherCommentPattern, 'i').exec(subjectSection);
            if (commentMatch && commentMatch[1]) {
              comments[subject] = commentMatch[1].trim();
            }
          }
        }
      }
    } else if (template.customRegex) {
      // Utiliser une regex personnalisée pour extraire les données
      try {
        const customMatches = [...block.matchAll(new RegExp(template.customRegex, 'gi'))];
        
        for (const match of customMatches) {
          if (match && match.groups) {
            const { subject, grade, classAverage, comment } = match.groups;
            
            if (subject) {
              result.subjects.add(subject);
              
              if (grade) {
                const gradeValue = parseFloat(grade.replace(',', '.'));
                if (!isNaN(gradeValue)) {
                  grades[subject] = gradeValue;
                }
              }
              
              if (classAverage) {
                const avgValue = parseFloat(classAverage.replace(',', '.'));
                if (!isNaN(avgValue)) {
                  classAvg[subject] = avgValue;
                }
              }
              
              if (comment) {
                comments[subject] = comment;
              }
            }
          }
        }
      } catch (e) {
        console.error("Erreur avec la regex personnalisée:", e);
      }
    }
    
    // Calculer la moyenne générale de l'élève
    const validGrades = Object.values(grades).filter(g => !isNaN(g));
    const average = validGrades.length > 0
      ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
      : 0;
    
    // Ajouter l'élève au résultat
    result.students.push({
      name: studentName,
      grades,
      classAvg,
      comments,
      average: parseFloat(average.toFixed(2))
    });
  }
  
  // Convertir le Set en Array pour le retour
  return {
    ...result,
    subjects: Array.from(result.subjects)
  };
}

/**
 * Applique le mapping pour les fichiers CSV/Excel
 */
function applyTabularMapping(data: any[], template: MappingTemplate): any {
  const result = {
    students: [] as any[],
    subjects: new Set<string>(),
    termInfo: {
      term: 'Inconnu',
      class: 'Inconnue'
    }
  };
  
  if (!data || data.length === 0) {
    throw new Error("Aucune donnée à traiter");
  }
  
  // Récupérer les indices de colonnes
  const {
    studentName: nameIndex,
    subject: subjectIndex,
    grade: gradeIndex,
    classAverage: classAvgIndex,
    teacherComment: commentIndex
  } = template.columnMappings;
  
  // Vérifier que les colonnes essentielles sont définies
  if (nameIndex === -1 || subjectIndex === -1 || gradeIndex === -1) {
    throw new Error("Veuillez définir au moins les colonnes pour le nom, la matière et la note");
  }
  
  // Extraire les clés (noms de colonnes) pour avoir des références claires
  const headers = Object.keys(data[0]);
  const nameKey = headers[nameIndex];
  const subjectKey = headers[subjectIndex];
  const gradeKey = headers[gradeIndex];
  const classAvgKey = classAvgIndex !== -1 ? headers[classAvgIndex] : null;
  const commentKey = commentIndex !== -1 ? headers[commentIndex] : null;
  
  // Collecter toutes les matières uniques
  data.forEach(row => {
    const subject = row[subjectKey]?.toString().trim();
    if (subject) {
      result.subjects.add(subject);
    }
  });
  
  // Organisation par élève
  const studentMap = new Map<string, {
    grades: { [subject: string]: number };
    classAvg: { [subject: string]: number };
    comments: { [subject: string]: string };
  }>();
  
  data.forEach(row => {
    const studentName = row[nameKey]?.toString().trim();
    const subject = row[subjectKey]?.toString().trim();
    
    if (!studentName || !subject) return;
    
    // Récupérer ou créer l'entrée de l'élève
    if (!studentMap.has(studentName)) {
      studentMap.set(studentName, {
        grades: {},
        classAvg: {},
        comments: {}
      });
    }
    
    const studentData = studentMap.get(studentName)!;
    
    // Ajouter la note
    const gradeStr = row[gradeKey]?.toString().replace(',', '.').trim();
    if (gradeStr) {
      const grade = parseFloat(gradeStr);
      if (!isNaN(grade)) {
        studentData.grades[subject] = grade;
      }
    }
    
    // Ajouter la moyenne de classe si disponible
    if (classAvgKey) {
      const avgStr = row[classAvgKey]?.toString().replace(',', '.').trim();
      if (avgStr) {
        const avg = parseFloat(avgStr);
        if (!isNaN(avg)) {
          studentData.classAvg[subject] = avg;
        }
      }
    }
    
    // Ajouter le commentaire si disponible
    if (commentKey && row[commentKey]) {
      studentData.comments[subject] = row[commentKey].toString().trim();
    }
  });
  
  // Convertir la map en tableau de résultats
  studentMap.forEach((data, name) => {
    // Calculer la moyenne de l'élève
    const validGrades = Object.values(data.grades).filter(g => !isNaN(g));
    const average = validGrades.length > 0
      ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
      : 0;
    
    result.students.push({
      name,
      grades: data.grades,
      classAvg: data.classAvg,
      comments: data.comments,
      average: parseFloat(average.toFixed(2))
    });
  });
  
  // Trier les élèves par nom
  result.students.sort((a, b) => a.name.localeCompare(b.name));
  
  // Convertir le Set en Array pour le retour
  return {
    ...result,
    subjects: Array.from(result.subjects)
  };
}

/**
 * Parse un fichier Excel ou CSV en tableau d'objets
 */
export async function parseTabularFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            return reject(new Error("Impossible de lire le fichier"));
          }
          
          if (file.name.endsWith('.csv')) {
            // Parsing CSV avec PapaParse
            Papa.parse(data as string, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              encoding: "UTF-8",
              complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                  console.warn("Avertissements lors du parsing CSV:", results.errors);
                }
                resolve(results.data);
              },
              error: (error) => {
                reject(new Error(`Erreur lors du parsing CSV: ${error.message}`));
              }
            });
          } else {
            // Parsing Excel avec XLSX
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            resolve(rows);
          }
        } catch (error) {
          reject(new Error(`Erreur lors du parsing du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Erreur lors de la lecture du fichier"));
      };
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      reject(new Error(`Erreur lors du traitement du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`));
    }
  });
}
