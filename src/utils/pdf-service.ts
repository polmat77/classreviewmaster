import * as pdfjs from 'pdfjs-dist';

// Set the worker source for PDF.js
const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120";

/**
 * Initialize PDF.js worker
 */
export function initPdfJs(forceReinit: boolean = false): void {
  if (forceReinit || !pdfjs.GlobalWorkerOptions.workerSrc) {
    console.info("PDF.js worker initialized from CDN");
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_URL}/pdf.worker.min.js`;
  }
}

/**
 * Validate if file is a PDF
 */
export async function validatePdfFile(
  file: File
): Promise<{ isValid: boolean; reason: string }> {
  try {
    // Initialize PDF.js if not already done
    initPdfJs();

    // Basic file type check
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return { isValid: false, reason: "Le fichier n'est pas un PDF" };
    }

    // Read first few bytes to verify PDF signature
    const fileHeader = await readFileHeader(file);
    if (!fileHeader.startsWith('%PDF')) {
      return { isValid: false, reason: 'Signature PDF invalide' };
    }

    // Try to load the PDF with PDF.js for deeper validation
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });

    // Add timeout for slow PDFs
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout reading PDF')), 10000);
    });

    await Promise.race([loadingTask.promise, timeoutPromise]);

    return { isValid: true, reason: '' };
  } catch (error) {
    console.warn(`PDF validation warning for ${file.name}:`, error);
    // Accept the file with a warning
    return {
      isValid: true,
      reason: "Le PDF pourrait être corrompu mais sera utilisé quand même"
    };
  }
}

/**
 * Read the first few bytes of a file
 */
async function readFileHeader(file: File): Promise<string> {
  const slice = file.slice(0, 5);
  const arrayBuffer = await slice.arrayBuffer();
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(file: File, onProgress?: (progress: number) => void): Promise<string> {
  try {
    // Ensure PDF.js worker is set
    initPdfJs();
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    
    // Add progress callback if provided
    if (onProgress) {
      loadingTask.onProgress = (data: { loaded: number, total: number }) => {
        const progressPercentage = (data.loaded / data.total) * 100;
        onProgress(Math.min(progressPercentage, 90)); // Cap at 90% for processing phase
      };
    }
    
    const pdfDocument = await loadingTask.promise;
    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    const totalPages = pdfDocument.numPages;
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
      
      // Update progress if callback provided
      if (onProgress) {
        const progressPercentage = 90 + (pageNum / totalPages) * 10;
        onProgress(Math.min(progressPercentage, 100));
      }
    }
    
    // Log successful extraction
    console.log(`Successfully extracted text from PDF (${fullText.length} chars)`);
    
    return fullText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    
    // Provide more helpful error message
    const errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('worker')) {
      throw new Error(`Erreur de chargement du worker PDF.js: ${errorMessage}`);
    } else if (errorMessage.includes('corrupt') || errorMessage.includes('invalid')) {
      throw new Error('Le fichier PDF semble être corrompu ou non valide');
    } else {
      throw new Error(`Erreur lors de l'extraction du texte: ${errorMessage}`);
    }
  }
}

/**
 * Extract structured data from a PDF file
 * This is a more advanced extraction that attempts to preserve layout information
 */
export async function extractStructuredDataFromPDF(file: File): Promise<any> {
  try {
    // Ensure PDF.js worker is set
    initPdfJs();
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdfDocument = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    const structuredData = {
      metadata: {},
      pages: []
    };
    
    // Extract metadata
    const metadata = await pdfDocument.getMetadata();
    structuredData.metadata = metadata;
    
    // Process each page
    const totalPages = pdfDocument.numPages;
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Get text content with position information
      const textContent = await page.getTextContent();
      
      // Extract text items with their positions
      const pageItems = textContent.items.map((item: any) => {
        // Convert PDFjs transform to x,y coordinates
        const tx = item.transform[4];
        const ty = viewport.height - item.transform[5]; // Flip y-coordinate
        
        return {
          text: item.str,
          x: tx,
          y: ty,
          width: item.width,
          height: item.height,
          fontName: item.fontName
        };
      });
      
      // Add to structured data
      structuredData.pages.push({
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        items: pageItems
      });
    }
    
    return structuredData;
  } catch (error) {
    console.error('Error extracting structured data from PDF:', error);
    throw error;
  }
}

/**
 * Extract tables from a PDF file
 * This attempts to identify and extract tabular data
 */
export async function extractTablesFromPDF(file: File): Promise<any[]> {
  // Get structured data first
  const structuredData = await extractStructuredDataFromPDF(file);
  
  // Identify tables in the structured data
  const tables = [];
  
  for (const page of structuredData.pages) {
    // Attempt to identify tables based on alignment of text items
    const potentialTables = identifyTables(page.items);
    
    // Process each potential table
    for (const table of potentialTables) {
      // Convert to a more usable format (rows and columns)
      const processedTable = processTable(table, page.width, page.height);
      tables.push(processedTable);
    }
  }
  
  return tables;
}

/**
 * Identify potential tables in a collection of text items
 */
function identifyTables(items: any[]): any[] {
  // Group items by y-coordinate (with some tolerance) to identify rows
  const yTolerance = 5;
  const rows: Map<number, any[]> = new Map();
  
  for (const item of items) {
    const roundedY = Math.round(item.y / yTolerance) * yTolerance;
    if (!rows.has(roundedY)) {
      rows.set(roundedY, []);
    }
    rows.get(roundedY)!.push(item);
  }
  
  // Sort rows by y-coordinate
  const sortedRows = Array.from(rows.entries())
    .sort(([y1], [y2]) => y1 - y2)
    .map(([_, rowItems]) => rowItems.sort((a, b) => a.x - b.x));
  
  // Identify contiguous rows with similar x-coordinates as potential tables
  const potentialTables: any[][] = [];
  let currentTable: any[] = [];
  
  for (const row of sortedRows) {
    if (row.length >= 3) { // Assume a table row has at least 3 cells
      if (currentTable.length === 0) {
        // Start a new table
        currentTable = [row];
      } else {
        // Check if this row might be part of the current table
        const prevRow = currentTable[currentTable.length - 1];
        const xAligned = row.some(item => 
          prevRow.some(prevItem => Math.abs(item.x - prevItem.x) < 10)
        );
        
        if (xAligned) {
          currentTable.push(row);
        } else {
          // This row doesn't align with the previous table, start a new one
          if (currentTable.length >= 3) { // Require at least 3 rows for a table
            potentialTables.push([...currentTable]);
          }
          currentTable = [row];
        }
      }
    } else if (currentTable.length >= 3) {
      potentialTables.push([...currentTable]);
      currentTable = [];
    }
  }
  
  // Don't forget to add the last table if it exists
  if (currentTable.length >= 3) {
    potentialTables.push([...currentTable]);
  }
  
  return potentialTables;
}

/**
 * Process raw table data into a more structured format
 */
function processTable(tableRows: any[], pageWidth: number, pageHeight: number): any {
  // Find the column boundaries
  const xPositions: Set<number> = new Set();
  for (const row of tableRows) {
    for (const item of row) {
      xPositions.add(Math.round(item.x / 5) * 5);
    }
  }
  
  const sortedXPositions = Array.from(xPositions).sort((a, b) => a - b);
  
  // Create a structured table
  const table: { rows: string[][]; header: string[]; data: string[][] } = {
    rows: tableRows.map(row => {
      const cells = sortedXPositions.map(x => {
        const itemsInCell = row.filter((item: any) => 
          Math.abs(item.x - x) < 20
        );
        
        return itemsInCell.map((item: any) => item.text).join(' ');
      });
      
      return cells;
    }),
    header: [],
    data: []
  };
  
  // Attempt to identify the header row
  const headerRow = identifyHeaderRow(table.rows);
  if (headerRow >= 0) {
    table.header = table.rows[headerRow];
    table.data = table.rows.slice(headerRow + 1);
  } else {
    table.header = [];
    table.data = table.rows;
  }
  
  return table;
}

/**
 * Try to identify which row is the header based on common patterns
 */
function identifyHeaderRow(rows: string[][]): number {
  // Check for common header terms like "nom", "moyenne", etc.
  const headerKeywords = ['nom', 'élève', 'matière', 'moyenne'];
  
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].join(' ').toLowerCase();
    if (headerKeywords.some(keyword => rowText.includes(keyword))) {
      return i;
    }
  }
  
  // If no obvious header found, assume first row is header
  return 0;
}