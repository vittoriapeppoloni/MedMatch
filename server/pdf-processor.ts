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
    
    // First check if it's a valid PDF
    if (!pdfBuffer.toString('ascii', 0, 5).startsWith('%PDF-')) {
      return 'The uploaded file does not appear to be a valid PDF. Please upload a proper PDF document.';
    }
    
    // Quick check for binary data or encrypted content
    const sampleText = pdfBuffer.toString('utf8', 0, Math.min(2000, pdfBuffer.length));
    
    // If sample contains a lot of non-ASCII characters or binary markers, reject immediately
    if (
      sampleText.match(/endstream|endobj|startxref|xref|obj|\0[^\s]/g) ||
      (sampleText.match(/[^\x20-\x7E\r\n]/g)?.length || 0) > 200
    ) {
      return `This PDF appears to be encrypted, secured, or contains binary data that cannot be extracted as text.

Please try one of the following options:
1. Open the PDF in a PDF reader application and copy/paste the text directly
2. Upload a different PDF that contains directly extractable text
3. Use a text file format instead (.txt)

For medical documents, you can also manually enter the key patient information.`;
    }
    
    // We'll use a multi-stage approach for reliable text extraction
    console.log('Starting enhanced PDF text extraction process...');
    
    // Function to clean text - VERY strict version that only allows alphanumeric + basic punctuation
    const cleanText = (text: string): string => {
      // First, check if we're dealing with binary garbage
      if (text.includes('endstream') || text.includes('endobj') || text.includes('startxref')) {
        return 'This PDF contains binary content that cannot be directly converted to text.';
      }
      
      // SUPER AGGRESSIVE CLEANING - only keep basic alphanumeric & punctuation
      let result = text
        // First keep only basic alphanumeric chars and common punctuation
        .replace(/[^a-zA-Z0-9\s.,;:!?()\-"']/g, ' ')
        // Replace multiple spaces
        .replace(/\s+/g, ' ')
        // Look for letter-number combinations that would indicate binary content
        .replace(/([a-zA-Z][0-9]{2,}|[0-9]{2,}[a-zA-Z])/g, ' ')
        // Replace anything that looks like a filename or path
        .replace(/[a-zA-Z0-9]+\.[a-zA-Z0-9]{2,4}/g, ' ')
        // Replace short tokens with spaces
        .replace(/\b[a-zA-Z]{1,2}\b/g, ' ')
        // Replace digits with spaces
        .replace(/\b[0-9]+\b/g, ' ')
        // Replace multiple spaces again
        .replace(/\s+/g, ' ')
        .trim();
      
      // For binary PDFs with very little actual text, this will leave almost nothing
      if (result.length < text.length * 0.1) {
        return 'This PDF contains mostly binary or encoded content that cannot be processed as text.';
      }
      
      // Process line by line to remove any remaining garbage
      const lines = result.split('\n');
      const cleanedLines = lines.filter(line => {
        // Remove short lines
        if (line.trim().length < 5) return false;
        
        // Count real words (3+ chars) vs. total tokens
        const tokens = line.trim().split(/\s+/);
        const realWords = tokens.filter(token => token.length > 2 && /[a-zA-Z]{3,}/.test(token)).length;
        
        // If less than 30% real words, it's probably garbage
        return realWords / Math.max(1, tokens.length) > 0.3;
      });
      
      result = cleanedLines.join('\n');
      
      // Finally, check if the result has enough content to be useful
      if (result.trim().length < 50) {
        return 'This PDF does not contain extractable text or contains only binary data.';
      }
      
      return result;
    };
    
    // Stage 1: Direct text extraction from PDF text markers
    let extractedText = '';
    try {
      // Read the PDF as text with a limit to prevent memory issues
      const pdfText = pdfBuffer.toString('utf8', 0, Math.min(pdfBuffer.length, 5000000));
      
      // Use a regex to find text between BT (Begin Text) and ET (End Text) markers
      const textMarkers = /BT[\s\S]+?ET/g;
      const textMatches = pdfText.match(textMarkers) || [];
      
      // Process each text block
      for (const textBlock of textMatches) {
        // Extract text between parentheses in the text blocks
        const textContent = textBlock.match(/\(([^\)]+)\)/g) || [];
        
        // Add each text content to the extracted text
        for (const content of textContent) {
          const text = content.substring(1, content.length - 1);
          if (text.length > 0) {
            extractedText += text + ' ';
          }
        }
        
        // Add line breaks between text blocks
        extractedText += '\n';
      }
      
      // Clean the text
      extractedText = cleanText(extractedText);
    } catch (err) {
      console.warn('Stage 1 PDF extraction failed:', err);
    }
    
    // Stage 2: Analyze text streams if first stage didn't yield enough text
    if (extractedText.trim().length < 100) {
      console.log('Stage 1 yielded limited text, trying Stage 2 (stream analysis)...');
      
      try {
        // Read the PDF in binary for safer handling
        const pdfText = pdfBuffer.toString('ascii', 0, Math.min(pdfBuffer.length, 5000000));
        
        // Look for text streams in the PDF
        const streamPattern = /stream[\s\S]+?endstream/g;
        const streams = pdfText.match(streamPattern) || [];
        
        let streamText = '';
        
        // Extract text from each stream
        for (const stream of streams) {
          // Look for text in the stream
          const textInStream = stream.replace(/^\s*stream\s+/, '').replace(/\s+endstream\s*$/, '');
          
          // Find all printable ASCII text in the stream
          const textPattern = /[A-Za-z0-9][A-Za-z0-9\s.,;:!?(){}\[\]"'\-]{3,}/g;
          const matches = textInStream.match(textPattern) || [];
          
          // Add each valid match to the extracted text
          for (const match of matches) {
            if (match.length > 4 && !/^[0-9\s]+$/.test(match)) {
              streamText += match + ' ';
            }
          }
        }
        
        // If we found substantial text in the streams, replace the original extraction
        if (streamText.length > extractedText.length || extractedText.trim().length < 50) {
          extractedText = cleanText(streamText);
        }
      } catch (err) {
        console.warn('Stage 2 PDF extraction failed:', err);
      }
    }
    
    // Stage 3: Extract text that appears to be in words and sentences
    if (extractedText.trim().length < 100) {
      console.log('Stage 2 yielded limited text, trying Stage 3 (text pattern search)...');
      
      try {
        // Read the entire PDF
        const pdfText = pdfBuffer.toString('utf8');
        
        // Look for patterns that resemble words and sentences
        const wordPattern = /\b[A-Za-z]{2,}[A-Za-z\s.,;:!?(){}\[\]"'\-]{5,}\b/g;
        const words = pdfText.match(wordPattern) || [];
        
        let textPatterns = '';
        
        // Add each word-like pattern to the extracted text
        for (const word of words) {
          if (word.length > 3 && !/^[0-9\s]+$/.test(word)) {
            textPatterns += word + ' ';
          }
        }
        
        // Use this text if it's better than what we already have
        if (textPatterns.length > extractedText.length || extractedText.trim().length < 50) {
          extractedText = cleanText(textPatterns);
        }
      } catch (err) {
        console.warn('Stage 3 PDF extraction failed:', err);
      }
    }
    
    // If all stages produced a mess of special characters, provide helpful message
    const specialCharRatio = (extractedText.match(/[^a-zA-Z0-9\s.,;:!?()]/g) || []).length / 
                           Math.max(1, extractedText.length);
    
    if (specialCharRatio > 0.3 || extractedText.trim().length < 20) {
      console.log(`PDF extraction produced too many special chars (ratio: ${specialCharRatio.toFixed(2)})`);
      return `Our system had difficulty extracting readable text from this PDF file.

This PDF appears to contain:
${specialCharRatio > 0.3 ? '- Encrypted or encoded content that cannot be read directly' : ''}
${extractedText.trim().length < 20 ? '- Very little textual content' : ''}
${pdfBuffer.length > 100000 ? '- Image-based content rather than text' : ''}

Please try one of the following:
1. Upload a text-based PDF instead of an image-based or secured PDF
2. Copy the text directly from your PDF reader and paste it here
3. Save your document as a plain text file and upload that instead

For medical documents, you can also manually enter the key patient information.`;
    }
    
    // Check if this is a medical document
    if (extractedText.trim().length > 100) {
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
        console.log('Medical document detected');
      }
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