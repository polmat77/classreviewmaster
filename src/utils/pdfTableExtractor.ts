import { PdfDocument } from 'pdf-tables-parser';

export async function extractGradesTable(pdfBuffer: ArrayBuffer): Promise<string[][]> {
  // 1) On initialise le parser : on ignore tout texte de pied de page (© Index Education…)
  const pdfDoc = new PdfDocument({
    hasTitles: true,
    threshold: 1.2,
    ignoreTexts: [/© Index Education/i, /^COLLEGE\s+/i],
  });
  
  // 2) On charge les données binaires du PDF
  await pdfDoc.load(pdfBuffer);
  
  // 3) On extrait tous les tableaux de la première page
  const pages = await pdfDoc.extractTables();
  if (!pages[0] || !pages[0].tables[0]) {
    throw new Error('Aucun tableau trouvé dans le PDF.');
  }

  // 4) On retourne le premier tableau brut (matrice de chaînes)
  return pages[0].tables[0];
}
