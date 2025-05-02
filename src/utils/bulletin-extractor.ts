
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
    
    // Ajouter des logs détaillés pour le debugging
    console.log(`📊 Taille du buffer PDF: ${(pdfBuffer.byteLength / (1024 * 1024)).toFixed(2)} Mo`);
    
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
      
      // Version plus robuste qui cherche plusieurs patterns
      const collegePatterns = [
        /COLLEGE\s([A-Z\s]+)/i,
        /LYCEE\s([A-Z\s]+)/i,
        /ÉCOLE\s([A-Z\s]+)/i,
        /INSTITUTION\s([A-Z\s]+)/i
      ];
      
      for (const pattern of collegePatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[0].trim();
        }
      }
    }
  }
  return "École inconnue";
}

function extractClassName(students: StudentBulletin[]): string {
  // Utiliser la propriété class des bulletins des élèves
  const classes = students.map(s => s.class).filter(Boolean);
  
  // Si pas de classe définie, chercher dans le texte des remarques
  if (classes.length === 0) {
    const classPatterns = [
      /classe:?\s*([0-9][A-Za-z][0-9]?)/i,
      /([0-9]e[0-9]?)/i,
      /classe:?\s*([A-Za-z0-9]+)/i
    ];
    
    for (const student of students) {
      for (const subject of student.subjects) {
        const text = subject.remark || "";
        
        for (const pattern of classPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
    }
    
    return "Classe inconnue";
  }
  
  return classes.length > 0 ? mostFrequent(classes) : "Classe inconnue";
}

function extractMainTeacher(students: StudentBulletin[]): string | undefined {
  // Patterns pour trouver le professeur principal
  const patterns = [
    /Professeur\s+principal\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s.]+)/i,
    /PP\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s.]+)/i,
    /Professeur\s+référent\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s.]+)/i
  ];
  
  for (const student of students) {
    const text = student.subjects.map(s => s.remark).join(" ");
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Nettoyer le résultat (enlever caractères spéciaux en fin)
        return match[1].trim().replace(/[.,;:]$/, "");
      }
    }
  }
  
  return undefined;
}

function detectTrimesters(students: StudentBulletin[]): string[] {
  // Détecter les mentions de trimestres dans le texte
  const trimesters = new Set<string>();
  
  // Patterns pour détecter les trimestres
  const trimesterPatterns = [
    /Bulletin du (\d+)(?:er|ème|e)?[\s]*Trimestre/gi,
    /Trimestre\s+(\d+)/gi, 
    /(\d+)(?:er|ème|e)?[\s]*Trimestre/gi,
    /Trimestre[\s:]*(\d+)/gi
  ];
  
  for (const student of students) {
    const allText = student.subjects.map(s => s.remark).join(" ");
    
    for (const pattern of trimesterPatterns) {
      const matches = allText.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          trimesters.add(match[0]);
        }
      }
    }
  }
  
  // Si aucun trimestre détecté, on force le trimestre 1
  if (trimesters.size === 0) {
    console.log("⚠️ Aucun trimestre détecté, utilisation du trimestre 1 par défaut");
    trimesters.add("Trimestre 1");
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
  const counts = new Map<string, number>();
  
  // Convertir tous les éléments en string pour le comptage
  arr.forEach(val => {
    const strVal = String(val).trim();
    counts.set(strVal, (counts.get(strVal) || 0) + 1);
  });
  
  let maxCount = 0;
  let maxVal: string = String(arr[0]);
  
  for (const [val, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }
  
  // Reconvertir au type original en trouvant l'élément original
  const originalVal = arr.find(v => String(v).trim() === maxVal) || arr[0];
  return originalVal;
}

/**
 * Détecte automatiquement le format du bulletin scolaire
 * et applique l'extracteur approprié
 */
export function detectBulletinFormat(text: string): string {
  if (text.includes("COLLEGE ROMAN ROLLAND") || 
      text.includes("COLLEGE ROMAIN ROLLAND") || 
      text.includes("Appréciations générales de la classe")) {
    return "roman-rolland";
  }
  
  // Détecter d'autres formats
  if (text.includes("Bulletin scolaire") || text.includes("Bulletin de notes")) {
    return "standard-bulletin";
  }
  
  if (text.includes("Tableau des moyennes")) {
    return "moyennes-tableau";
  }
  
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
    case "standard-bulletin":
      return {
        studentNamePattern: '(?:Élève|Nom):\\s*([A-Za-z\\s\\-]+)',
        subjectPattern: '([A-Z][A-Za-z\\s]+)\\s*:\\s*\\d',
        gradePattern: '(\\d+[,.]\\d+)(?:\\s*/\\s*\\d+)?',
        classAveragePattern: '(?:Moyenne|générale)\\s*:?\\s*(\\d+[,.]\\d+)',
        teacherCommentPattern: '(?:Appréciation|Commentaire)\\s*:?\\s*([^\\n]+)',
        termPattern: '(?:Trimestre|Période)\\s*(\\d+)',
        delimiters: {
          student: '(?:-{10,}|={10,}|\\*{10,})',
          subject: '(?:-{5,}|={5,})'
        }
      };
    case "moyennes-tableau":
      return {
        studentNamePattern: '([A-Z][A-Za-z\\-\\s]+)',
        subjectPattern: '([A-Z][A-Za-z\\s]+)',
        gradePattern: '(\\d+[,.]\\d+)',
        tableRowPattern: '^([^|]+)\\|([^|]+)\\|([^|]+)',
        columnDelimiter: '\\|'
      };
    // Ajouter d'autres formats ici
    default:
      return {
        studentNamePattern: '([A-Z][A-Za-z\\-\\s]+)',
        subjectPattern: '([A-Z][A-Za-z\\s]+)',
        gradePattern: '(\\d+[,.]\\d+)',
      }; // Template de détection générique
  }
}
