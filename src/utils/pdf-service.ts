
import * as pdfjs from 'pdfjs-dist';

let isInitialized = false;

/**
 * Initialize PDF.js with the proper worker
 * @returns Cleanup function
 */
export function initPdfJs() {
  if (!isInitialized) {
    const PDFWorker = `
      self.onmessage = function(event) {
        const data = event.data;
        if (data.type === 'process') {
          self.postMessage({ type: 'processed', success: true });
        }
      };
    `;
    
    // Create a blob URL for the worker
    const blob = new Blob([PDFWorker], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    // Set the worker URL for PDF.js
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    
    isInitialized = true;
    
    // Return cleanup function
    return () => URL.revokeObjectURL(workerUrl);
  }
  
  return () => {};
}

/**
 * Extract text content from a PDF file
 * @param file PDF file to extract text from
 * @returns Extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Ensure PDF.js is initialized
    if (!isInitialized) {
      initPdfJs();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Erreur lors de l'extraction du texte: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
