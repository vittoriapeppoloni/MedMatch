import * as pdfjs from 'pdfjs-dist';

// Set a valid URL for the worker - in this case, we're creating a fake one in memory
const pdfjsWorker = `
  self.onmessage = function(e) {
    console.log('Fake worker received message:', e.data);
    self.postMessage({});
  };
`;

// Create a blob from our worker code
const blob = new Blob([pdfjsWorker], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Print out the version to help debug
console.log("Using PDF.js version:", pdfjs.version);

/**
 * Extracts text from a PDF file with a timeout
 * @param file The PDF file to extract text from
 * @returns The extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Create a promise that rejects after a timeout
  const timeout = (ms: number) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`PDF extraction timed out after ${ms}ms`)), ms)
  );
  
  try {
    // Set a 5-second timeout for the entire extraction process
    const result = await Promise.race([
      extractPDFText(file),
      timeout(5000) // 5 seconds timeout
    ]);
    
    return result as string;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('timed out')) {
      return `The PDF is taking too long to process. It may be too large or complex. Please copy and paste the text directly from your PDF reader.`;
    }
    
    return `Error extracting text from PDF: ${errorMessage}. Please copy and paste the text manually.`;
  }
}

/**
 * Helper function that performs the actual PDF text extraction
 */
async function extractPDFText(file: File): Promise<string> {
  // Convert the File to an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document with caching enabled
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/cmaps/',
    cMapPacked: true,
  });
  
  const pdf = await loadingTask.promise;
  
  // Only process the first 3 pages for faster extraction
  const MAX_PAGES = Math.min(pdf.numPages, 3);
  let fullText = '';
  
  // Process pages in parallel for speed
  const pagePromises = [];
  for (let i = 1; i <= MAX_PAGES; i++) {
    pagePromises.push(processPage(pdf, i));
  }
  
  const pageTexts = await Promise.all(pagePromises);
  fullText = pageTexts.join('\n\n');
  
  if (pdf.numPages > MAX_PAGES) {
    fullText += `\n\n[Note: Only showing text from the first ${MAX_PAGES} pages of ${pdf.numPages} total]`;
  }
  
  return fullText;
}

/**
 * Process a single page of a PDF
 */
async function processPage(pdf: any, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  // Extract and join text items
  const textItems = textContent.items.map((item: any) => 
    typeof item.str === 'string' ? item.str : ''
  );
  
  return textItems.join(' ');
}

/**
 * Reads a file and returns its content as text
 * @param file The file to read
 * @returns The file content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  
  // For text files, use the standard FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result.toString());
      } else {
        reject(new Error('Failed to read file content'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}