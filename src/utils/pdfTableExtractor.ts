import * as pdfjs from 'pdfjs-dist';

export async function extractGradesTable(pdfBuffer: ArrayBuffer): Promise<any> {
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
    const textItems: Array<{ text: string; x: number; y: number; page: number }> = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
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
    }
    
    // Group text items into lines based on Y-coordinate proximity
    const groupedLines = groupTextIntoLines(textItems);
    
    // Find header row by looking for keywords
    const headerRow = findHeaderRow(groupedLines);
    if (!headerRow) {
      throw new Error("Impossible de trouver l'en-tête du tableau dans ce PDF.");
    }
    
    // Identify columns based on header
    const columns = identifyColumns(headerRow);
    
    // Extract data rows based on the identified structure
    const dataRows = extractDataRows(groupedLines, headerRow, columns);
    
    // Process the data rows to create student objects
    const students = createStudentObjects(dataRows, columns);
    
    // Identify subjects from columns
    const subjects = identifySubjects(columns);
    
    // Determine class information
    const className = extractClassName(textItems);
    
    return {
      className,
      subjects,
      students
    };
  } catch (error) {
    console.error("Error extracting grades table:", error);
    throw new Error("Erreur lors de l'extraction du tableau. Vérifiez le format de vos fichiers.");
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
    .filter(row => {
      const name = row.get(nameColumnText!);
      return name && name.trim && name.trim().length > 0;
    })
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
