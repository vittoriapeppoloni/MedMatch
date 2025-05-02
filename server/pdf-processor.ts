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
    
    // We'll use a multi-stage approach for reliable text extraction
    console.log('Starting enhanced PDF text extraction process...');
    
    // Function to clean text
    const cleanText = (text: string): string => {
      return text
        // Remove non-printable characters and most symbols
        .replace(/[^\x20-\x7E\r\n]/g, '')
        // Fix common PDF encoding issues
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\\/g, '\\')
        // Replace multiple spaces with single spaces
        .replace(/\s+/g, ' ')
        // Remove spaces at the beginning and end of lines
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        // Normalize consecutive newlines
        .replace(/\n+/g, '\n\n')
        // Remove any remaining non-printable characters
        .replace(/[\x00-\x1F\x7F-\xFF]/g, '')
        // Remove isolated special characters that aren't part of words
        .replace(/\s[\^\*\|\{\}\[\]<>~`]+\s/g, ' ')
        // Remove lines that have more special characters than text
        .split('\n')
        .filter(line => {
          const specialCharCount = (line.match(/[^a-zA-Z0-9\s,.;:!?()]/g) || []).length;
          const textLength = line.trim().length;
          // Keep lines with low special char ratio or sufficient text length
          return textLength === 0 || specialCharCount / textLength < 0.3 || textLength > 20;
        })
        .join('\n')
        // Remove duplicate spaces
        .replace(/\s+/g, ' ')
        .trim();
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