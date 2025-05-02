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
 * Extracts text from a PDF file
 * @param file The PDF file to extract text from
 * @returns The extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Start a timer to measure extraction performance
    const startTime = performance.now();
    
    // Call the PDF extraction function
    const extractedText = await extractPDFText(file);
    
    // Calculate extraction time
    const extractionTime = (performance.now() - startTime) / 1000;
    console.log(`PDF text extraction completed in ${extractionTime.toFixed(2)} seconds`);
    
    return extractedText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error.message || 'Unknown error';
    
    return `Error extracting text from PDF: ${errorMessage}. Please copy and paste the text manually from your PDF reader application.`;
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
  
  // Process the first 5 pages for a better sample of the document
  const MAX_PAGES = Math.min(pdf.numPages, 5);
  let fullText = '';
  
  try {
    // Process pages in parallel for speed
    const pagePromises = [];
    for (let i = 1; i <= MAX_PAGES; i++) {
      pagePromises.push(processPage(pdf, i));
    }
    
    const pageTexts = await Promise.all(pagePromises);
    fullText = pageTexts.join('\n\n');
    
    // Check if the extracted text is meaningful
    const meaningfulContent = fullText.replace(/\s+/g, ' ').trim();
    if (!meaningfulContent || meaningfulContent.length < 50) {
      return `The PDF extraction didn't produce readable text. This could be because:
1. The PDF contains scanned images rather than text
2. The PDF has special security restrictions
3. The text formatting is unusual

Please either:
- Copy and paste the text directly from your PDF reader
- Try a different PDF with searchable text content`;
    }
    
    if (pdf.numPages > MAX_PAGES) {
      fullText += `\n\n[Note: Only showing text from the first ${MAX_PAGES} pages of ${pdf.numPages} total]`;
    }
    
    return fullText;
  } catch (error) {
    console.error('Error during PDF text extraction:', error);
    return `Error extracting text from the PDF. Please try a different file or copy and paste the text manually.`;
  }
}

/**
 * Process a single page of a PDF
 */
async function processPage(pdf: any, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({
      normalizeWhitespace: true,  // Normalize whitespace for better readability
      disableCombineTextItems: false  // Combine text items for better extraction
    });
    
    // Extract text with better formatting
    if (!textContent.items || textContent.items.length === 0) {
      return `[Page ${pageNum} - No text content detected]`;
    }
    
    // Track the last y position to detect line breaks
    let lastY: number | null = null;
    let textChunks: string[] = [];
    
    // Define interface for text item
    interface TextItem {
      str: string;
      transform: number[];
    }
    
    // Process each text item with better positioning awareness
    textContent.items.forEach((item: TextItem) => {
      if (typeof item.str !== 'string' || item.str.trim() === '') {
        return; // Skip empty items
      }
      
      // Ensure transform array exists and has enough elements
      if (!item.transform || item.transform.length < 6) {
        textChunks.push(item.str + ' ');
        return;
      }
      
      // Check if we need to add a line break (when y position changes significantly)
      if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
        textChunks.push('\n');
      }
      
      // Add a space if the last chunk doesn't end with whitespace
      if (textChunks.length > 0 && !textChunks[textChunks.length - 1].endsWith(' ') && 
          !textChunks[textChunks.length - 1].endsWith('\n')) {
        textChunks.push(' ');
      }
      
      // Add the text content
      textChunks.push(item.str);
      
      // Update the last y position
      lastY = item.transform[5];
    });
    
    return textChunks.join('');
  } catch (error) {
    console.error(`Error processing page ${pageNum}:`, error);
    return `[Error processing page ${pageNum}]`;
  }
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