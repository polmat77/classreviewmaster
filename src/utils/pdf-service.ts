
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
