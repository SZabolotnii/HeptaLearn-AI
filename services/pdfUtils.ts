import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker. Note: In a production bundler environment, this is handled differently.
// For ESM/Browser usage via importmap, we point to the CDN worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

export interface PdfPageContent {
  pageNumber: number;
  text: string;
}

export const extractTextFromPdf = async (file: File): Promise<PdfPageContent[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    const pages: PdfPageContent[] = [];
    
    // Iterate through all pages
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      // Basic text stitching. 
      // More advanced logic might check 'transform' to detect columns, but this suffices for general reading.
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      // Filter out empty pages if necessary, but keeping page numbers consistent is usually better
      if (pageText.trim().length > 0) {
        pages.push({
          pageNumber: i,
          text: pageText
        });
      }
    }

    return pages;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file. Ensure it is a valid PDF.");
  }
};