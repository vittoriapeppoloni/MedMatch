/**
 * Server-side PDF processing with optimized text extraction
 * This provides much better performance than client-side processing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
// @ts-ignore -- pdf-parse doesn't have type definitions
import pdfParse from 'pdf-parse';

// Cache directory for extracted PDF text
const CACHE_DIR = path.join(os.tmpdir(), 'pdf-cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Process a PDF file and extract its text content using pdf-parse library
 * This provides reliable text extraction for most PDF files
 * 
 * @param pdfBuffer Buffer containing the PDF data
 * @returns Extracted text from the PDF
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log(`Processing PDF (${pdfBuffer.length} bytes)`);
    
    // Create a hash of the PDF content to use as cache key
    const hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
    const cachePath = path.join(CACHE_DIR, `${hash}.txt`);
    
    // Check if we have a cached version
    if (fs.existsSync(cachePath)) {
      console.log('Using cached PDF extraction result');
      return fs.readFileSync(cachePath, 'utf-8');
    }
    
    // First check if it's a valid PDF
    if (!pdfBuffer.toString('ascii', 0, 5).startsWith('%PDF-')) {
      return 'The uploaded file does not appear to be a valid PDF. Please upload a proper PDF document.';
    }
    
    // Create a temporary file for the PDF
    const tempPdfPath = path.join(os.tmpdir(), `${hash}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // Primary PDF extraction using pdf-parse
    console.log('Using pdf-parse library for extraction...');
    
    // Options for pdf-parse
    const options = {
      // Use page to get the page number within the callback render function
      pagerender: function(pageData: any) {
        // Return only page text (do additional processing if needed)
        return pageData.getTextContent()
          .then(function(textContent: any) {
            let lastY = -1;
            let text = '';
            
            // Process each text item
            for (const item of textContent.items) {
              // Check if we need a new line based on Y-position change
              const y = item.transform[5];
              if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                text += '\n';
              } else if (text && !text.endsWith(' ') && !text.endsWith('\n')) {
                text += ' ';
              }
              
              text += item.str;
              lastY = y;
            }
            
            return text;
          });
      }
    };
    
    let pdfData;
    try {
      // Use pdf-parse to extract text
      pdfData = await pdfParse(pdfBuffer, options);
    } catch (err) {
      console.error('Error while parsing PDF with pdf-parse:', err);
      throw new Error('Unable to parse PDF file. The file may be damaged, encrypted, or in an unsupported format.');
    }
    
    // Get the text from the PDF
    let extractedText = pdfData.text || '';
    
    // Clean up the text a bit
    extractedText = extractedText
      // Replace multiple spaces with a single space
      .replace(/\s+/g, ' ')
      // Replace multiple newlines with double newlines
      .replace(/\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();
    
    // If we got very little text, the PDF might be scanned/image-based
    if (extractedText.length < 100 && pdfBuffer.length > 50000) {
      return `This PDF appears to be primarily image-based or scanned content.
We extracted ${extractedText.length} characters of text, but the file is ${Math.round(pdfBuffer.length / 1024)} KB.

This usually means:
- The PDF contains scanned pages rather than digital text
- The PDF might use custom fonts that can't be extracted
- The content is stored as images

Please try:
1. Copy the text manually from your PDF reader
2. Use a different PDF with selectable text
3. Enter the key medical information manually`;
    }
    
    // Extract metadata for medical document detection
    let isMedicalDocument = false;
    const medicalTerms = ['diagnosi', 'patient', 'cancer', 'therapy', 'treatment', 
                         'storia clinica', 'clinical', 'malattia', 'disease', 
                         'oncologia', 'oncology', 'chemio', 'radio', 'medic'];
    
    for (const term of medicalTerms) {
      if (extractedText.toLowerCase().includes(term)) {
        isMedicalDocument = true;
        console.log('Medical document detected');
        break;
      }
    }
    
    // Look for Italian medical document patterns
    if (extractedText.includes('anamnesi') || 
        extractedText.includes('paziente') ||
        extractedText.includes('referto') ||
        extractedText.match(/data.{1,10}nascita/i)) {
      isMedicalDocument = true;
      console.log('Italian medical document detected');
    }
    
    // Look for patient age/gender information
    const ageMatch = extractedText.match(/età:?\s*(\d+)/i);
    if (ageMatch) {
      console.log(`Patient age detected: ${ageMatch[1]}`);
    }
    
    const genderMatch = extractedText.match(/sesso:?\s*([MF])/i);
    if (genderMatch) {
      console.log(`Patient gender detected: ${genderMatch[1]}`);
    }
    
    // Cache the result
    fs.writeFileSync(cachePath, extractedText);
    console.log(`Extracted text (${extractedText.length} characters) successfully`);
    
    // Clean up temporary file
    try {
      fs.unlinkSync(tempPdfPath);
    } catch (err) {
      // Ignore cleanup errors
    }
    
    return extractedText;
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    const errorMessage = error?.message || 'Unknown error';
    return `Error processing PDF: ${errorMessage}

Please try:
1. Using a different PDF document
2. Copying text directly from your PDF reader
3. Manually entering the medical information`;
  }
}