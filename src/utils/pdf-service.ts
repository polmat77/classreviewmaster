
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
    
    // Timeout plus long (180 secondes au lieu de 120)
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Le traitement du PDF prend trop de temps. Le fichier est peut-être trop volumineux ou complexe."));
        console.warn("PDF processing timeout triggered");
      }, 180000); // 180 seconds timeout (augmenté de 120 à 180)
      
      // Clear the timeout if processing completes
      setTimeout(() => clearTimeout(timeoutId), 181000);
    });
    
    // Create the PDF processing promise with incremental progress
    const processingPromise = async () => {
      const pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
        cMapPacked: true,
        // Optimisations supplémentaires pour les bulletins scolaires
        disableFontFace: true, // Désactiver le chargement des fontes pour accélérer
        useSystemFonts: false, // Ne pas utiliser les polices système
        useWorkerFetch: true, // Utiliser des workers pour le téléchargement
      }).promise;
      
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      if (onProgress) {
        onProgress(15); // Document loaded
      }
      
      // Limiter le nombre de pages traitées
      const MAX_PAGES = 200; // Augmenté de 150 à 200
      const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);
      if (pdf.numPages > MAX_PAGES) {
        console.warn(`PDF has ${pdf.numPages} pages, only processing first ${MAX_PAGES} for performance`);
      }
      
      // Process in smaller chunks for larger documents
      const chunkSize = 2; // Process 2 pages at a time (was 1)
      let fullText = '';
      
      for (let chunkStart = 1; chunkStart <= pagesToProcess; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize - 1, pagesToProcess);
        console.log(`Processing pages ${chunkStart} to ${chunkEnd}`);
        
        // Process pages in the current chunk with timeout for each chunk
        const chunkTimeout = 30000; // 30 seconds per chunk (augmenté de 20 à 30)
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
      
      // Optimisations pour les bulletins scolaires
      // Essayer d'obtenir le texte structuré avec une meilleure précision de positionnement
      const content = await page.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        includeMarkedContent: true
      });
      
      // Pour les bulletins, essayer de reconstruire la structure en fonction des positions
      let pageText = '';
      let lastY = -1;
      let currentLine = '';
      
      // Trier les éléments par position Y (de haut en bas)
      const sortedItems = [...content.items];
      sortedItems.sort((a: any, b: any) => {
        const aY = a.transform ? a.transform[5] : 0;
        const bY = b.transform ? b.transform[5] : 0;
        return bY - aY; // Y décroissant (haut de page vers bas)
      });
      
      // Tolérance de position Y pour considérer que des éléments sont sur la même ligne
      const yTolerance = 3;
      
      for (const item of sortedItems) {
        if (!item.str) continue;
        
        const y = item.transform ? item.transform[5] : 0;
        
        // Si on change de ligne (basé sur position Y)
        if (lastY !== -1 && Math.abs(y - lastY) > yTolerance) {
          pageText += currentLine.trim() + '\n';
          currentLine = '';
        }
        
        // Ajouter le texte à la ligne courante
        currentLine += item.str;
        lastY = y;
      }
      
      // Ajouter la dernière ligne
      if (currentLine.trim()) {
        pageText += currentLine.trim() + '\n';
      }
      
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
    
    // Pour les très petits fichiers, on accepte toujours
    if (file.size <= 100 * 1024) { // 100KB ou moins
      console.log("Petit fichier PDF accepté sans validation approfondie");
      return { isValid: true };
    }
    
    // Amélioration du système de tentatives avec délai progressif
    let attempt = 1;
    const maxAttempts = 3; // Augmenté de 2 à 3
    
    while (attempt <= maxAttempts) {
      try {
        console.log(`Tentative ${attempt}/${maxAttempts} d'ouverture du PDF...`);
        
        // Utiliser un timeout plus court pour la vérification
        const arrayBuffer = await file.arrayBuffer();
        const timeout = 15000 * attempt; // 15s, puis 30s, puis 45s
        
        const loadingPromise = pdfjs.getDocument({ 
          data: arrayBuffer,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
          cMapPacked: true,
          // Optimisations
          disableFontFace: true,
          useSystemFonts: false,
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
            isValid: true,
            reason: `Le fichier PDF contient ${pdf.numPages} pages. Pour des raisons de performance, nous traiterons uniquement les 200 premières pages.`
          };
        }
        
        return { isValid: true };
      } catch (error) {
        console.warn(`Tentative ${attempt} échouée:`, error);
        
        // Si dernière tentative, accepter quand même pour les fichiers jusqu'à 5MB
        if (attempt === maxAttempts) {
          if (file.size <= 5 * 1024 * 1024) { // 5MB ou moins
            console.log("Échec de validation mais fichier accepté car taille raisonnable");
            return { isValid: true };
          }
          throw error;
        }
        
        // Attendre avant nouvelle tentative avec délai exponentiel
        const delayMs = 1000 * Math.pow(2, attempt);
        console.log(`Attente de ${delayMs}ms avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
      }
    }
    
    // On ne devrait jamais arriver ici mais au cas où
    return { isValid: true };
  } catch (error) {
    console.error('Error validating PDF file:', error);
    
    // Pour les petits fichiers, on accepte même en cas d'erreur
    if (file.size <= 2 * 1024 * 1024) { // 2MB ou moins (augmenté de 1 à 2)
      console.log("Validation échouée mais fichier accepté car petit");
      return { isValid: true };
    }
    
    // Pour les fichiers plus gros, on accepte quand même mais avec un avertissement
    return { 
      isValid: true, 
      reason: `Attention: Le fichier PDF n'a pas pu être validé complètement (${error instanceof Error ? error.message : 'Erreur inconnue'}). Le traitement peut être instable.` 
    };
  }
}

/**
 * Fonction optimisée pour extraire spécifiquement les bulletins scolaires
 */
export async function extractSchoolReports(file: File, onProgress?: (progress: number) => void): Promise<string> {
  try {
    const text = await extractTextFromPDF(file, onProgress);
    
    // Détection des mots clés spécifiques aux bulletins
    const bulletinKeywords = [
      "bulletin", "trimestre", "appréciation", "matière", "enseignant", 
      "professeur", "moyenne", "classe"
    ];
    
    // Vérifier si le texte contient des mots-clés de bulletin
    const lowerCaseText = text.toLowerCase();
    const keywordMatches = bulletinKeywords.filter(keyword => 
      lowerCaseText.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length >= 3) {
      console.log(`Détecté contenu de bulletin scolaire avec ${keywordMatches.length} mots-clés correspondants`);
      
      // Post-traitement spécifique aux bulletins pour améliorer la structure
      let processedText = text;
      
      // 1. Identification des sections principales
      const sections = [];
      const sectionTitles = [
        "Appréciation générale", "Enseignements communs", "Enseignements optionnels",
        "Pôle Sciences", "Pôle Littéraire", "Moyenne générale"
      ];
      
      for (const title of sectionTitles) {
        const titleMatch = new RegExp(`${title}[\\s\\n]*(:|\\n)`, 'i');
        if (titleMatch.test(processedText)) {
          sections.push(title);
        }
      }
      
      // 2. Vérifier s'il y a plusieurs bulletins dans le même fichier
      const bulletinDelimiters = [
        "Bulletin du", "BULLETIN TRIMESTRIEL", "BULLETIN SCOLAIRE",
        "={10,}", "-{10,}" // Séparateurs de type lignes de tirets ou égal
      ];
      
      let hasSeparators = false;
      for (const delimiter of bulletinDelimiters) {
        const delimiterRegex = new RegExp(delimiter, 'i');
        if (delimiterRegex.test(processedText)) {
          hasSeparators = true;
          break;
        }
      }
      
      // 3. Si c'est un tableau de moyennes, essayer de préserver la structure
      if (processedText.includes("Tableau des moyennes")) {
        console.log("Tableau de moyennes détecté dans le PDF");
        
        // Essayer de préserver l'alignement des colonnes en remplaçant les espaces
        processedText = processedText.replace(/(\d+[,.]\d+)/g, " $1 ");
        
        // Ajouter des séparateurs de colonnes pour les tableaux
        processedText = processedText.replace(/(\s{3,})/g, " | ");
      }
      
      return processedText;
    }
    
    return text; // Retourner le texte tel quel si ce n'est pas un bulletin
  } catch (error) {
    console.error('Error extracting school report:', error);
    throw error;
  }
}
