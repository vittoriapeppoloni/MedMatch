import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from './pdf-processor';

// Test PDF extraction with a sample PDF
async function testPDFExtraction() {
  // Use our sample PDF
  const samplePdfPath = path.join(process.cwd(), 'sample.pdf');
  
  if (!fs.existsSync(samplePdfPath)) {
    console.error('Sample PDF not found:', samplePdfPath);
    return;
  }
  
  // Read the PDF file
  const pdfBuffer = fs.readFileSync(samplePdfPath);
  
  console.log(`Test PDF read, size: ${pdfBuffer.length} bytes`);
  console.log('Extracting text...');
  
  try {
    // Extract text
    const startTime = Date.now();
    const extractedText = await extractTextFromPDF(pdfBuffer);
    const endTime = Date.now();
    
    console.log(`Text extraction completed in ${endTime - startTime}ms`);
    console.log('Extracted text:');
    console.log('------------------------------');
    console.log(extractedText);
    console.log('------------------------------');
    console.log(`Total extracted text length: ${extractedText.length} characters`);
  } catch (error) {
    console.error('Error during PDF extraction test:', error);
  }
}

// Run the test
console.log('Starting PDF extraction test...');
testPDFExtraction().catch(err => {
  console.error('Test failed with error:', err);
});