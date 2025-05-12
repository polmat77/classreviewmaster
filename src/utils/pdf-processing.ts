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