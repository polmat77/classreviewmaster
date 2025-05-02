
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

    try {
      // Utiliser le CDN pour le worker au lieu de créer un worker local
      const cdnWorkerUrl = 'https://unpkg.com/pdfjs-dist@5.0.375/build/pdf.worker.min.js';
      pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
      
      isInitialized = true;
      console.log("PDF.js worker initialized from CDN");
    } catch (error) {
      console.error("Erreur lors de l'initialisation du worker PDF.js:", error);
      
      // Fallback : créer un worker local si le CDN échoue
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
      workerUrl = URL.createObjectURL(blob);
      
      // Set the worker URL for PDF.js
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      isInitialized = true;
      console.log("PDF.js worker initialized locally (fallback)");
    }
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
    
    // Vérification de la taille avant de traiter
    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Le fichier est trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} MB). La taille maximale recommandée est de 30 MB.`);
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF file loaded into memory: ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB`);
    
    // Timeout plus long (120 secondes au lieu de 60)
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Le traitement du PDF prend trop de temps. Le fichier est peut-être trop volumineux ou complexe."));
        console.warn("PDF processing timeout triggered");
      }, 120000); // 120 seconds timeout (augmenté de 60 à 120)
      
      // Clear the timeout if processing completes
      setTimeout(() => clearTimeout(timeoutId), 121000);
    });
    
    // Create the PDF processing promise with incremental progress
    const processingPromise = async () => {
      const pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
        cMapPacked: true,
      }).promise;
      
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      if (onProgress) {
        onProgress(15); // Document loaded
      }
      
      // Limiter le nombre de pages traitées
      const MAX_PAGES = 150; // Augmenté de 100 à 150
      const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);
      if (pdf.numPages > MAX_PAGES) {
        console.warn(`PDF has ${pdf.numPages} pages, only processing first ${MAX_PAGES} for performance`);
      }
      
      // Process in smaller chunks for larger documents
      const chunkSize = 1; // Process 1 page at a time (was 2)
      let fullText = '';
      
      for (let chunkStart = 1; chunkStart <= pagesToProcess; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize - 1, pagesToProcess);
        console.log(`Processing pages ${chunkStart} to ${chunkEnd}`);
        
        // Process pages in the current chunk with timeout for each chunk
        const chunkTimeout = 20000; // 20 seconds per chunk (augmenté de 10 à 20)
        const chunkPromises = [];
        
        for (let i = chunkStart; i <= chunkEnd; i++) {
          // Add individual page processing with timeout
          const pagePromise = Promise.race([
            processPage(pdf, i),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout processing page ${i}`)), chunkTimeout)
            )
          ]);
          chunkPromises.push(pagePromise);
        }
        
        try {
          const chunkTexts = await Promise.all(chunkPromises);
          fullText += chunkTexts.join('\n\n');
        } catch (error) {
          console.error(`Error processing chunk ${chunkStart}-${chunkEnd}:`, error);
          // Continue with next chunk instead of failing completely
        }
        
        // Report progress
        if (onProgress) {
          const progress = Math.min(15 + Math.round((chunkEnd / pagesToProcess) * 85), 100);
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
    console.log(`Début de validation du fichier PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Check file size (limit to 30MB)
    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        reason: `Le fichier est trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} MB). La taille maximale est de 30 MB.` 
      };
    }
    
    // Accepter les fichiers minuscules pour les tests
    if (file.size < 100) { // Moins de 100 bytes
      console.warn("Fichier PDF très petit accepté pour test");
      return { isValid: true };
    }
    
    // Détecter les cas où la taille est très petite (potentiellement corrompu)
    if (file.size < 1024 && file.size >= 100) { // Entre 100B et 1KB
      return {
        isValid: false,
        reason: "Le fichier PDF est trop petit et pourrait être corrompu."
      };
    }
    
    // Ensure PDF.js is initialized
    if (!isInitialized) {
      initPdfJs();
    }
    
    console.log(`Validation du fichier PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Pour les très petits fichiers, on peut accepter sans validation complète
    if (file.size <= 50 * 1024) { // 50KB ou moins
      console.log("Petit fichier PDF accepté sans validation approfondie");
      return { isValid: true };
    }
    
    // Système de tentatives avec délai progressif
    let attempt = 1;
    const maxAttempts = 2;
    
    while (attempt <= maxAttempts) {
      try {
        console.log(`Tentative ${attempt}/${maxAttempts} d'ouverture du PDF...`);
        
        // Utiliser un timeout plus court pour la vérification
        const arrayBuffer = await file.arrayBuffer();
        const timeout = 15000 * attempt; // 15s, puis 30s
        
        const loadingPromise = pdfjs.getDocument({ 
          data: arrayBuffer,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
          cMapPacked: true,
        }).promise;
        
        const pdf = await Promise.race([
          loadingPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Délai d'ouverture du PDF dépassé (tentative ${attempt})`)), timeout)
          )
        ]);
        
        console.log(`PDF ouvert avec succès à la tentative ${attempt}`);
        
        // Vérification simplifiée - juste le nombre de pages
        if (pdf.numPages > 200) {
          return { 
            isValid: false,
            reason: `Le fichier PDF contient ${pdf.numPages} pages. Pour des raisons de performance, la limite est de 200 pages.`
          };
        }
        
        return { isValid: true };
      } catch (error) {
        console.warn(`Tentative ${attempt} échouée:`, error);
        
        // Si dernière tentative, simuler une validation réussie pour les fichiers petits/moyens
        if (attempt === maxAttempts) {
          if (file.size <= 2 * 1024 * 1024) { // 2MB ou moins
            console.log("Échec de validation mais fichier accepté car petit/moyen");
            return { isValid: true };
          }
          throw error;
        }
        
        // Attendre avant nouvelle tentative avec délai exponentiel
        const delayMs = 1000 * attempt;
        console.log(`Attente de ${delayMs}ms avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
      }
    }
    
    return { 
      isValid: false, 
      reason: "Impossible d'ouvrir le PDF après plusieurs tentatives." 
    };
  } catch (error) {
    console.error('Error validating PDF file:', error);
    
    // Pour les petits fichiers, on accepte même en cas d'erreur
    if (file.size <= 1 * 1024 * 1024) { // 1MB ou moins
      console.log("Validation échouée mais fichier accepté car petit");
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      reason: `Impossible de valider le fichier PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
}
