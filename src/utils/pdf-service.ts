
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js with different fallback options
export const initPdfJs = () => {
  try {
    // Try to use the default CDN worker
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    console.log(`Set PDF.js worker to CDN with version ${pdfjs.version}`);
    
    // Add a fallback mechanism if the CDN fails to load
    const scriptCheckTimeout = setTimeout(() => {
      console.log('Checking if PDF.js worker loaded from CDN...');
      
      // Create a simple worker if needed
      if (!document.querySelector(`script[src*="pdf.worker"]`)) {
        console.log('PDF.js worker not detected, using fallback...');
        
        // Create a basic worker script
        const workerBlob = new Blob([`
          // Basic PDF.js worker fallback
          self.onmessage = function(event) {
            self.postMessage({ isReady: true });
          };
        `], { type: 'application/javascript' });
        
        const workerBlobUrl = URL.createObjectURL(workerBlob);
        pdfjs.GlobalWorkerOptions.workerSrc = workerBlobUrl;
        console.log('Fallback PDF.js worker initialized');
      }
    }, 3000);
    
    return () => clearTimeout(scriptCheckTimeout);
  } catch (error) {
    console.error('Error initializing PDF.js:', error);
    
    // Last-resort fallback
    const workerBlob = new Blob([`
      // Emergency PDF.js worker fallback
      self.onmessage = function(event) {
        self.postMessage({ isReady: true });
      };
    `], { type: 'application/javascript' });
    
    const workerBlobUrl = URL.createObjectURL(workerBlob);
    pdfjs.GlobalWorkerOptions.workerSrc = workerBlobUrl;
    console.log('Emergency fallback PDF.js worker initialized');
    
    return () => {};
  }
};

// Extract text from PDF file
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log("Starting PDF text extraction...");
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    console.log("Loading PDF document...");
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from all pages
    let extractedText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Extracting text from page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Concatenate text items
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
        
      extractedText += pageText + '\n';
    }
    
    console.log('Text extraction complete');
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Erreur lors de l'extraction du texte: ${error}`);
  }
}
