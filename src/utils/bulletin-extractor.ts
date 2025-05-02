import { parseClassBulletins, StudentBulletin, SubjectFeedback } from '@/utils/pdf-processing';

export interface BulletinData {
  school: string;
  className: string;
  trimester: number;
  teacherName?: string;
  averages: {
    global: number;
    bySubject: Record<string, number>;
  };
  subjects: Array<{
    name: string;
    average: number;
    teacherName?: string;
    comment: string;
  }>;
  students?: Array<{
    name: string;
    averages: Record<string, number>;
    globalAverage: number;
  }>;
}

/**
 * Analyser le contenu des bulletins scolaires au format spécifique
 * comme ceux du Collège Romain Rolland
 */
export async function analyzeBulletins(pdfBuffer: ArrayBuffer): Promise<BulletinData[]> {
  try {
    console.log("⏱️ Début de l'analyse des bulletins...");
    // Extraire les données structurées avec l'outil existant
    const result = await parseClassBulletins(pdfBuffer);
    console.log(`✅ Données extraites : ${result.students.length} bulletins d'élèves trouvés`);
    
    // Données par bulletin
    const bulletins: BulletinData[] = [];
    
    // Extraire le nom de l'école à partir d'un bulletin
    const schoolName = extractSchoolName(result.students);
    console.log(`🏫 École détectée: ${schoolName}`);
    
    // Regrouper par trimestre pour avoir une vue d'ensemble
    const trimesters = detectTrimesters(result.students);
    console.log(`📅 Trimestres détectés: ${trimesters.join(', ')}`);
    
    for (const trimester of trimesters) {
      const trimNumber = extractTrimesterNumber(trimester);
      const studentsInTrimester = result.students.filter(s => 
        s.subjects.some(sub => sub.remark && sub.remark.includes(trimester))
      );
      
      // Si pas d'élèves détectés pour ce trimestre, on saute
      if (studentsInTrimester.length === 0) {
        console.log(`⚠️ Aucun élève détecté pour ${trimester}, passage au suivant`);
        continue;
      }
      
      console.log(`📊 Traitement du ${trimester}: ${studentsInTrimester.length} élèves`);
      
      // Collecter toutes les matières de ce trimestre
      const allSubjects = new Set<string>();
      studentsInTrimester.forEach(student => 
        student.subjects.forEach(s => allSubjects.add(s.subject))
      );
      
      // Moyennes par matière
      const subjectAverages: Record<string, number[]> = {};
      allSubjects.forEach(subject => {
        subjectAverages[subject] = studentsInTrimester
          .map(st => st.subjects.find(s => s.subject === subject)?.average)
          .filter((a): a is number => a !== null && a !== undefined);
      });
      
      // Calculer les moyennes de classe par matière
      const bySubject: Record<string, number> = {};
      Object.entries(subjectAverages).forEach(([subject, grades]) => {
        if (grades.length > 0) {
          bySubject[subject] = parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2));
        }
      });
      
      // Calculer la moyenne générale
      const allGrades = Object.values(subjectAverages).flat();
      const globalAverage = allGrades.length > 0
        ? parseFloat((allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2))
        : 0;
      
      // Construire les données du bulletin pour ce trimestre
      const subjectsWithDetails = Array.from(allSubjects).map(subjectName => {
        // Trouver tous les commentaires pour cette matière
        const comments = studentsInTrimester
          .map(st => st.subjects.find(s => s.subject === subjectName)?.remark || "")
          .filter(Boolean);
          
        // Trouver le nom du prof (généralement le même pour tous les élèves)
        const teacherNames = studentsInTrimester
          .map(st => st.subjects.find(s => s.subject === subjectName)?.teacher || "")
          .filter(Boolean);
        
        return {
          name: subjectName,
          average: bySubject[subjectName] || 0,
          teacherName: teacherNames.length > 0 ? mostFrequent(teacherNames) : undefined,
          comment: comments.length > 0 ? mostFrequent(comments) : "",
        };
      });
      
      // Données des élèves si disponibles
      const students = studentsInTrimester.map(student => {
        const averages: Record<string, number> = {};
        student.subjects.forEach(s => {
          if (s.average !== null) {
            averages[s.subject] = s.average;
          }
        });
        
        // Calculer moyenne globale de l'élève
        const grades = Object.values(averages);
        const globalAverage = grades.length > 0
          ? parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2))
          : 0;
        
        return {
          name: student.name,
          averages,
          globalAverage
        };
      });
      
      bulletins.push({
        school: schoolName,
        className: extractClassName(result.students),
        trimester: trimNumber,
        teacherName: extractMainTeacher(result.students),
        averages: {
          global: globalAverage,
          bySubject
        },
        subjects: subjectsWithDetails,
        students
      });
    }
    
    console.log(`✅ Analyse terminée : ${bulletins.length} bulletins générés`);
    return bulletins;
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse des bulletins:", error);
    throw new Error(`Impossible d'analyser les bulletins: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

// Fonctions utilitaires pour l'extraction

function extractSchoolName(students: StudentBulletin[]): string {
  // Chercher des motifs comme "COLLEGE ROMAIN ROLLAND"
  for (const student of students) {
    const subjects = student.subjects || [];
    for (const subject of subjects) {
      const text = subject.remark || "";
      const collegeMatch = text.match(/COLLEGE\s([A-Z\s]+)/i);
      if (collegeMatch) {
        return collegeMatch[0].trim();
      }
    }
  }
  return "École inconnue";
}

function extractClassName(students: StudentBulletin[]): string {
  // Utiliser la propriété class des bulletins des élèves
  const classes = students.map(s => s.class).filter(Boolean);
  return classes.length > 0 ? mostFrequent(classes) : "Classe inconnue";
}

function extractMainTeacher(students: StudentBulletin[]): string | undefined {
  // Chercher des motifs comme "Professeur principal : M. ZENATI"
  for (const student of students) {
    const text = student.subjects.map(s => s.remark).join(" ");
    const match = text.match(/Professeur\s+principal\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s.]+)/i);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

function detectTrimesters(students: StudentBulletin[]): string[] {
  // Détecter les mentions de trimestres dans le texte
  const trimesters = new Set<string>();
  
  for (const student of students) {
    const allText = student.subjects.map(s => s.remark).join(" ");
    
    // Chercher des motifs comme "Bulletin du 1er Trimestre"
    const matches = allText.match(/Bulletin du (\d+)(?:er|ème|e)?[\s]*Trimestre/gi);
    if (matches) {
      matches.forEach(m => trimesters.add(m));
    }
    
    // Alternative: chercher juste "Trimestre 1", etc.
    const simpleMatches = allText.match(/Trimestre\s+\d+/gi);
    if (simpleMatches) {
      simpleMatches.forEach(m => trimesters.add(m));
    }
  }
  
  return Array.from(trimesters);
}

function extractTrimesterNumber(trimesterText: string): number {
  // Extraire le numéro du trimestre (1, 2, 3)
  const match = trimesterText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1; // Par défaut, trimestre 1
}

function mostFrequent<T>(arr: T[]): T {
  // Trouver l'élément le plus fréquent dans un tableau
  const counts = new Map<T, number>();
  arr.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
  
  let maxCount = 0;
  let maxVal: T = arr[0];
  
  for (const [val, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }
  
  return maxVal;
}

/**
 * Détecte automatiquement le format du bulletin scolaire
 * et applique l'extracteur approprié
 */
export function detectBulletinFormat(text: string): string {
  if (text.includes("COLLEGE ROMAN ROLLAND") || 
      text.includes("Appréciations générales de la classe")) {
    return "roman-rolland";
  }
  
  // Détecter d'autres formats ici
  
  return "standard"; // format par défaut
}

/**
 * Créer un template de mapping automatiquement basé sur le format détecté
 */
export function createBulletinTemplate(format: string) {
  switch (format) {
    case "roman-rolland":
      return {
        studentNamePattern: 'Élève:\\s*([A-Za-z\\s]+)',
        subjectPattern: '^([A-Z\\s]+):',
        gradePattern: '(\\d+([.,]\\d+)?)/20',
        classAveragePattern: 'Moyenne générale:\\s*(\\d+([.,]\\d+)?)',
        teacherCommentPattern: '([A-Za-z].+)(?=\\n)',
        termPattern: 'Trimestre\\s*(\\d+)',
        classNamePattern: 'Classe:\\s*([\\d]+)',
        delimiters: {
          student: '={10,}',
          subject: '-{5,}'
        }
      };
    // Ajouter d'autres formats ici
    default:
      return {}; // Template vide, détection automatique
  }
}
