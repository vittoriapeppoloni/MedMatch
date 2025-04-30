import * as pdfjs from 'pdfjs-dist';

// Set up the PDF.js worker
// Note: In a real production environment, you would want to use a more robust worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Extracts text from a PDF file
 * @param file The PDF file to extract text from
 * @returns The extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert the File to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => 
        typeof item.str === 'string' ? item.str : ''
      );
      
      fullText += textItems.join(' ') + '\n\n';
    }
    
    return fullText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error.message || 'Unknown error';
    return `Error extracting text from PDF: ${errorMessage}. Please copy and paste the text manually.`;
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