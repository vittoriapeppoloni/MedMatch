/**
 * Server-side PDF processing with optimized text extraction
 * This provides much better performance than client-side processing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import crypto from 'crypto';

// Cache directory for extracted PDF text
const CACHE_DIR = path.join(os.tmpdir(), 'pdf-cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Process a PDF file and extract its text content
 * This uses pdftotext from poppler-utils which is much faster than JS-based solutions
 * 
 * @param pdfBuffer Buffer containing the PDF data
 * @returns Extracted text from the PDF
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
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
    const tempTxtPath = path.join(os.tmpdir(), `${hash}.txt`);
    
    // Write PDF buffer to temporary file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // Use pdftotext (from poppler-utils) for extraction
    // This is much faster than any JS-based solution
    const extractedText = await new Promise<string>((resolve, reject) => {
      // Check if pdftotext is available on the system
      const pdfToText = spawn('pdftotext', [
        '-layout',  // Maintain layout for better structural understanding
        '-enc', 'UTF-8',  // Ensure proper encoding
        '-nopgbrk', // Don't insert page breaks
        tempPdfPath,
        tempTxtPath
      ]);
      
      pdfToText.on('close', (code) => {
        if (code !== 0) {
          // If pdftotext failed, fallback to basic extraction
          resolve('PDF extraction failed. Please upload a text version or copy/paste the content.');
          return;
        }
        
        try {
          // Read the extracted text
          const text = fs.readFileSync(tempTxtPath, 'utf-8');
          
          // Clean up temporary files
          fs.unlinkSync(tempPdfPath);
          fs.unlinkSync(tempTxtPath);
          
          // Cache the result
          fs.writeFileSync(cachePath, text);
          
          resolve(text);
        } catch (error) {
          console.error('Error reading extracted text file:', error);
          reject(new Error('Failed to read extracted text file'));
        }
      });
      
      pdfToText.on('error', (err) => {
        console.error('Error executing pdftotext:', err);
        reject(new Error('Failed to execute pdftotext'));
      });
    }).catch((error) => {
      console.error('Error in PDF text extraction:', error);
      return 'PDF extraction failed. Please upload a text version or copy/paste the content.';
    });
    
    return extractedText;
  } catch (error) {
    console.error('Error processing PDF:', error);
    return 'Error processing PDF. Please try again or upload a text version.';
  }
}

/**
 * Alternative implementation using a lightweight JS approach if pdftotext is not available
 * This is a fallback only and not as efficient as the poppler-utils approach
 */
export async function extractTextFromPDFJS(pdfBuffer: Buffer): Promise<string> {
  // This would be implemented with a lightweight PDF parser
  // We're just providing this as a fallback interface
  return 'PDF extraction requires pdftotext. Please install poppler-utils or upload a text version.';
}