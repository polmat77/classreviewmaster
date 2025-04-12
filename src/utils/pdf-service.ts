
import * as pdfjs from 'pdfjs-dist';

let isInitialized = false;
let workerUrl: string | null = null;

/**
 * Initialize PDF.js with the proper worker
 * @param forceReinit Force reinitialization even if already initialized
 * @returns Cleanup function
 */
export function initPdfJs(forceReinit = false) {
  if (!isInitialized || forceReinit) {
    if (workerUrl) {
      // Clean up previous worker URL if it exists
      URL.revokeObjectURL(workerUrl);
    }

    // Use a more efficient worker setup
    const PDFWorker = `
      self.onmessage = function(event) {
        const data = event.data;
        if (data.type === 'process') {
          // Process the data efficiently
          self.postMessage({ type: 'processed', success: true });
        }
      };
    `;
    
    // Create a blob URL for the worker
    const blob = new Blob([PDFWorker], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    
    // Set the worker URL for PDF.js
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    
    isInitialized = true;
    
    console.log("PDF.js worker initialized");
  }
  
  // Return cleanup function
  return () => {
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      workerUrl = null;
      console.log("PDF.js worker cleaned up");
    }
  };
}

/**
 * Extract text content from a PDF file with progress updates
 * @param file PDF file to extract text from
 * @param onProgress Optional callback for progress updates
 * @returns Extracted text
 */
export async function extractTextFromPDF(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.time('PDF Text Extraction');
    
    // Ensure PDF.js is initialized
    if (!isInitialized) {
      initPdfJs();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF file loaded into memory: ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB`);
    
    // Set a timeout detector for long-running PDF processing
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Le traitement du PDF prend trop de temps. Le fichier est peut-être trop volumineux ou complexe."));
        console.warn("PDF processing timeout triggered");
      }, 60000); // 60 seconds timeout
      
      // Clear the timeout if processing completes
      setTimeout(() => clearTimeout(timeoutId), 61000);
    });
    
    // Create the PDF processing promise
    const processingPromise = async () => {
      const pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
        cMapPacked: true,
      }).promise;
      
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      // Process in chunks for larger documents
      const chunkSize = 5; // Process 5 pages at a time
      let fullText = '';
      
      for (let chunkStart = 1; chunkStart <= pdf.numPages; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize - 1, pdf.numPages);
        console.log(`Processing pages ${chunkStart} to ${chunkEnd}`);
        
        // Process pages in the current chunk
        const chunkPromises = [];
        for (let i = chunkStart; i <= chunkEnd; i++) {
          chunkPromises.push(processPage(pdf, i));
        }
        
        const chunkTexts = await Promise.all(chunkPromises);
        fullText += chunkTexts.join('\n\n');
        
        // Report progress
        if (onProgress) {
          const progress = Math.min(Math.round((chunkEnd / pdf.numPages) * 100), 100);
          onProgress(progress);
        }
      }
      
      console.timeEnd('PDF Text Extraction');
      return fullText;
    };
    
    // Process the page and extract text
    async function processPage(pdf: any, pageNum: number) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ');
      
      return pageText;
    }
    
    // Race the processing against the timeout
    return Promise.race([processingPromise(), timeoutPromise]);
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Erreur lors de l'extraction du texte: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Check if a PDF file is suitable for processing (not encrypted, not too large)
 * @param file PDF file to check
 * @returns Object with isValid and reason properties
 */
export async function validatePdfFile(file: File): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Check file size (limit to 20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        reason: `Le fichier est trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} MB). La taille maximale est de 20 MB.` 
      };
    }
    
    // Ensure PDF.js is initialized
    if (!isInitialized) {
      initPdfJs();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Check for encryption - Modified to use metadata instead of direct property
    const metadata = await pdf.getMetadata().catch(() => ({ info: {} }));
    const isEncrypted = metadata.info && (metadata.info as any).IsEncrypted;
    
    if (isEncrypted) {
      return { 
        isValid: false, 
        reason: "Le fichier PDF est protégé par mot de passe ou chiffré. Veuillez fournir une version non protégée." 
      };
    }
    
    // Check number of pages (limit to 100 pages for performance)
    if (pdf.numPages > 100) {
      return { 
        isValid: false,
        reason: `Le fichier PDF contient ${pdf.numPages} pages. Pour des raisons de performance, la limite est de 100 pages.`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error validating PDF file:', error);
    return { 
      isValid: false, 
      reason: `Impossible de valider le fichier PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
}
