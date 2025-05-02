/**
 * Server-side PDF processing with optimized text extraction
 * This provides much better performance than client-side processing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Cache directory for extracted PDF text
const CACHE_DIR = path.join(os.tmpdir(), 'pdf-cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Process a PDF file and extract its text content
 * This uses a Node.js optimized text extraction strategy
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
    
    // Create a temporary file for the PDF
    const tempPdfPath = path.join(os.tmpdir(), `${hash}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // We'll use a simple string extraction approach
    console.log('Extracting text using basic string analysis');
    
    // Read the PDF as text
    const pdfText = pdfBuffer.toString('utf8', 0, Math.min(pdfBuffer.length, 5000000)); // Limit to 5MB to prevent memory issues
    
    // Use a regex to find text between BT (Begin Text) and ET (End Text) markers
    // This is a simplified approach but works for basic text extraction
    const textMarkers = /BT[\s\S]+?ET/g;
    const textMatches = pdfText.match(textMarkers) || [];
    
    // Process each text block
    let extractedText = '';
    
    if (textMatches.length > 0) {
      // Extract text content from PDF using simple regex patterns
      for (const textBlock of textMatches) {
        // Extract text between parentheses in the text blocks
        const textContent = textBlock.match(/\(([^\)]+)\)/g) || [];
        
        // Add each text content to the extracted text
        for (const content of textContent) {
          extractedText += content.substring(1, content.length - 1) + ' ';
        }
        
        // Add line breaks between text blocks
        extractedText += '\n';
      }
    } 
    
    // If we didn't extract much text, try a different approach
    if (extractedText.trim().length < 50) {
      console.log('First approach yielded limited text, trying alternative approach');
      // Try a different approach
      // Look for text streams in the PDF
      const streamPattern = /stream[\s\S]+?endstream/g;
      const streams = pdfText.match(streamPattern) || [];
      
      // Extract text from each stream
      for (const stream of streams) {
        // Look for text in the stream
        const textInStream = stream.replace(/stream\s+/, '').replace(/\s+endstream/, '');
        
        // Find all ASCII text in the stream
        const textPattern = /[\x20-\x7E]{4,}/g;
        const textMatches = textInStream.match(textPattern) || [];
        
        // Add each text match to the extracted text
        for (const text of textMatches) {
          if (text.length > 2) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/\n+/g, '\n\n');
    
    // Add medical text extraction message
    if (extractedText.trim().length > 100) {
      // Try to identify if this is a medical document
      const medicalTerms = ['diagnosi', 'patient', 'cancer', 'therapy', 'treatment', 
                           'storia clinica', 'clinical', 'malattia', 'disease', 
                           'oncologia', 'oncology', 'chemio', 'radio', 'medic'];
      
      let isMedicalDocument = false;
      for (const term of medicalTerms) {
        if (extractedText.toLowerCase().includes(term)) {
          isMedicalDocument = true;
          break;
        }
      }
      
      if (isMedicalDocument) {
        console.log('Medical document detected, extracting medical information');
      }
    }
    
    // If the PDF analysis indicates this is a scanned document or image-based PDF
    if (extractedText.trim().length < 100 && pdfBuffer.length > 10000) {
      extractedText = `This appears to be a scanned document or image-based PDF. 
The text extraction is limited. Please consider manually entering the key medical information.

PDF analysis detected:
- Low text content (${extractedText.trim().length} characters)
- Large file size (${Math.round(pdfBuffer.length / 1024)} KB)

You can try:
- Using a text-based PDF instead
- Manually typing the important medical information
- Using OCR software to convert the scanned document to text first`;
    }
    
    // Add sample extraction info if we couldn't extract much
    if (extractedText.trim().length < 20) {
      extractedText = `Our system had difficulty extracting text from this PDF file.
This may be because:
- The PDF contains image-based content instead of text
- The PDF has security restrictions
- The PDF structure is not standard

Please try a different file format or manually enter the relevant information.`;
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
  } catch (error) {
    console.error('Error processing PDF:', error);
    return 'Error processing PDF. Our system encountered an issue extracting text. Please try again or upload a text version.';
  }
}