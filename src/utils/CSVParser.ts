voici le contenu du csvparser.ts:
// src/utils/CSVParser.ts
import \* as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface Student {
nom: string;
prenom: string;
classe?: string;
\[matiere: string]: any;
}

export interface ParsedData {
classeInfo: {
classe: string;
periode: string;
nbEleves: number;
};
eleves: Student\[];
matieres: string\[];
}

/\*\*

* Parse le contenu d'un fichier CSV ou Excel contenant des données de bulletin scolaire
  \*/
  export const parseGradesFile = async (file: File): Promise<ParsedData> => {
  let content: string | ArrayBuffer;
  let data: any\[] = \[];
  let matieres: string\[] = \[];

try {
// Lecture du fichier selon son type
if (file.name.toLowerCase().endsWith('.csv')) {
content = await readFileAsText(file);
data = parseCSVContent(content);
} else {
content = await readFileAsArrayBuffer(file);
data = parseExcelContent(content);
}

```
// Analyse du format spécifique des données
const { eleves, classeInfo, subjects } = analyzeGradesFormat(data);

return {
  classeInfo,
  eleves,
  matieres: subjects
};
```

} catch (error) {
console.error('Erreur lors du parsing du fichier:', error);
throw new Error(`Impossible de lire le fichier: ${error.message}`);
}
};

/\*\*

* Lit un fichier sous forme de texte
  \*/
  const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
  reader.readAsText(file);
  });
  };

/\*\*

* Lit un fichier sous forme de buffer binaire
  \*/
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
  reader.readAsArrayBuffer(file);
  });
  };

/\*\*

* Parse le contenu d'un fichier CSV
  \*/
  const parseCSVContent = (content: string): any\[] => {
  const result = Papa.parse(content, {
  header: false, // Pas d'en-tête fixe dans le format spécifique
  skipEmptyLines: true,
  delimiter: ',', // À ajuster selon le format réel
  });

if (result.errors.length > 0) {
console.warn('Avertissements lors du parsing CSV:', result.errors);
}

return result.data;
};

/\*\*

* Parse le contenu d'un fichier Excel
  \*/
  const parseExcelContent = (content: ArrayBuffer): any\[] => {
  const workbook = XLSX.read(content, { type: 'array' });
  const firstSheetName = workbook.SheetNames\[0];
  const worksheet = workbook.Sheets\[firstSheetName];

// Convertir en array sans en-têtes prédéfinis
return XLSX.utils.sheet\_to\_json(worksheet, { header: 1 });
};
/\*\*

* Nettoie et uniformise les intitulés de colonnes (matières)
  \*/
  const normalizeHeader = (header: string): string => {
  return header
  .normalize('NFD') // supprime les accents
  .replace(/\[\u0300-\u036f]/g, '')
  .replace(/.\d+\$/, '') // supprime les suffixes .1, .2
  .replace(/\s+/g, ' ') // espaces multiples
  .trim()
  .toUpperCase(); // tout en majuscules
  };

/\*\*

* Analyse le format spécifique des notes
  \*/
  const analyzeGradesFormat = (rawData: any\[]): { eleves: Student\[], classeInfo: any, subjects: string\[] } => {
  // Filtrer les lignes vides ou d'en-tête
  const lines = Array.isArray(rawData) ?
  rawData.filter(line => Array.isArray(line) ? line.length > 0 : true) :
  \[];

// Rechercher les informations sur la classe
let classe = '', periode = '', nbEleves = 0;

for (let i = 0; i < lines.length; i++) {
const line = Array.isArray(lines\[i]) ? lines\[i].join(' ') : String(lines\[i]);

```
if (line.includes('Classe :')) {
  const match = line.match(/Classe\s*:\s*(\S+)/);
  if (match) classe = match[1];
}
else if (line.includes('Période :') || line.includes('Trimestre')) {
  const match = line.match(/(?:Période|Trimestre)\s*:\s*([^,]+)/i);
  if (match) periode = match[1].trim();
}
else if (line.includes('élèves')) {
  const match = line.match(/(\d+)\s*élèves/i);
  if (match) nbEleves = parseInt(match[1]);
}
```

}

// Identifier l'index où commencent les données des élèves
let dataStartIndex = -1;
for (let i = 0; i < lines.length; i++) {
const line = Array.isArray(lines\[i]) ? lines\[i].join(' ') : String(lines\[i]);

```
// Recherche d'un pattern typique de ligne d'élève (NOM Prénom suivi de chiffres)
if (line.match(/^[A-Z]+\s+[A-Za-zÀ-ÿ]+\s+\d/)) {
  dataStartIndex = i;
  break;
}
```

}

if (dataStartIndex === -1) {
throw new Error('Format du fichier non reconnu: impossible de trouver les données des élèves');
}

// Identifier les matières
// Pour le format spécifique, nous allons définir manuellement les matières
// basées sur l'ordre des colonnes dans l'exemple fourni

const subjectsMap = \[
"FRANÇAIS",
"MATHÉMATIQUES",
"HISTOIRE-GÉOGRAPHIE",
"LV1",
"LV2",
"PHYSIQUE-CHIMIE",
"SVT",
"EPS",
"ÉDUCATION MUSICALE",
"ARTS PLASTIQUES",
"TECHNOLOGIE",
"LANGUES VIVANTES",
"ITALIEN BILANGUE",
"MOYENNE"
];

// Extraire les données des élèves
const eleves: Student\[] = \[];
const elevesLines = lines.slice(dataStartIndex);

for (const line of elevesLines) {
// Ignorer la dernière ligne qui contient généralement la moyenne de classe
if (Array.isArray(line) ? line\[0]?.includes('Moyenne de classe') : String(line).includes('Moyenne de classe')) {
continue;
}

```
// Convertir la ligne en tableau s'il ne l'est pas déjà
const lineArray = Array.isArray(line) ? line : String(line).split(/\s+/);

if (lineArray.length < 5) continue; // Ignorer les lignes trop courtes

// Extraire le nom et prénom
const nom = lineArray[0];
const prenom = lineArray[1];
const classeEleve = lineArray[2];

// Extraire les notes (à partir de l'index 3)
const notes = lineArray.slice(3).map(note => {
  if (note === 'Abs') return null;
  return parseFloat(String(note).replace(',', '.'));
});

// Créer l'objet élève
const eleve: Student = { nom, prenom, classe: classeEleve };

// Associer les notes aux matières
notes.forEach((note, i) => {
  if (i < subjectsMap.length) {
    eleve[subjectsMap[i]] = note;
  }
});

eleves.push(eleve);
```

}

return {
eleves,
classeInfo: { classe, periode, nbEleves },
subjects: subjectsMap
};
};

/\*\*

* Calcule les moyennes et statistiques pour un ensemble de données
  \*/
  export const calculateStatistics = (eleves: Student\[], matieres: string\[]): {
  moyenneGenerale: number;
  moyennesParMatiere: Record\<string, number>;
  distribution: { tranche: string; count: number; pourcentage: number }\[];
  } => {
  // Calculer la moyenne par matière
  const moyennesParMatiere: Record\<string, number> = {};

matieres.forEach(matiere => {
if (matiere === 'MOYENNE') return; // Ignorer la colonne de moyenne

```
const notesValides = eleves
  .map(eleve => eleve[matiere])
  .filter(note => note !== null && note !== undefined && !isNaN(note));

if (notesValides.length > 0) {
  moyennesParMatiere[matiere] = notesValides.reduce((sum, note) => sum + note, 0) / notesValides.length;
} else {
  moyennesParMatiere[matiere] = 0;
}
```

});

// Calculer la moyenne générale
const moyennesGenerales = eleves
.map(eleve => eleve.MOYENNE || calculateStudentAverage(eleve, matieres))
.filter(moyenne => !isNaN(moyenne));

const moyenneGenerale = moyennesGenerales.length > 0
? moyennesGenerales.reduce((sum, moyenne) => sum + moyenne, 0) / moyennesGenerales.length
: 0;

// Calculer la distribution par tranches
const tranches = \[
{ min: 0, max: 5, label: '0 - 5' },
{ min: 5, max: 10, label: '5 - 10' },
{ min: 10, max: 15, label: '10 - 15' },
{ min: 15, max: 20, label: '15 - 20' }
];

const distribution = tranches.map(tranche => {
const count = moyennesGenerales.filter(
moyenne => moyenne >= tranche.min && (moyenne < tranche.max || (tranche.max === 20 && moyenne <= 20))
).length;

```
return {
  tranche: tranche.label,
  count,
  pourcentage: Math.round((count / moyennesGenerales.length) * 100)
};
```

});

return {
moyenneGenerale,
moyennesParMatiere,
distribution
};
};

/\*\*

* Calcule la moyenne d'un élève à partir de ses notes
  \*/
  const calculateStudentAverage = (eleve: Student, matieres: string\[]): number => {
  const notes = matieres
  .filter(matiere => matiere !== 'MOYENNE')
  .map(matiere => eleve\[matiere])
  .filter(note => note !== null && note !== undefined && !isNaN(note));

return notes.length > 0
? notes.reduce((sum, note) => sum + note, 0) / notes.length
: 0;
};

réécris le en mettant les corrections
