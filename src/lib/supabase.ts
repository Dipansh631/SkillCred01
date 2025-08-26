import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import { generateWithGemini } from './utils'

export const supabase = createClient(config.supabase.url, config.supabase.anonKey)

export const callSupabaseFunction = async (functionName: string, body: any) => {
  // In development mode, only intercept extract-pdf-text to use local PDF.co processing
  if (config.isDevelopment && functionName === 'extract-pdf-text') {
    console.log('Development mode: Using PDF.co API directly for text extraction')
    return await processPDFWithPDFCo(body)
  }

  // Production mode: call Supabase function
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: JSON.stringify(body),
    })

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Supabase function invoke failed, considering fallback:', err)
    // Fallback only for PDF extraction if Edge Functions are not available
    if (functionName === 'extract-pdf-text') {
      console.log('Falling back to direct PDF.co processing in production')
      return await processPDFWithPDFCo(body)
    }
    
    // Fallback for quiz question generation using Gemini in production
    if (functionName === 'generate-quiz-questions' && config.gemini?.apiKey) {
      console.log('Falling back to Gemini for quiz generation in production')
      const pdfContent: string = body?.pdfContent || ''
      const requestedCount: number = Math.min(Math.max(typeof body?.questionCount === 'number' ? body.questionCount : 10, 1), 50)
      try {
        const prompt = `Based on the following PDF content, generate exactly ${requestedCount} multiple choice questions in JSON format.
Each question must have: id, question, options (4), correctAnswer (0-3), difficulty (easy|intermediate|advanced|logical|mathematical), explanation.

PDF Content (truncated):\n${pdfContent.substring(0, 8000)}\n
Return ONLY a JSON object like: { "questions": [...], "hasMathContent": boolean }`;
        let text = await generateWithGemini(prompt, config.gemini.apiKey)
        text = text.replace(/```json\n?/g, '').replace(/```/g, '')
        const parsed = JSON.parse(text)
        const questions = Array.isArray(parsed?.questions) ? parsed.questions : []
        const validQuestions = questions.filter((q: any) =>
          q && q.id && q.question && Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.correctAnswer === 'number' && q.difficulty && q.explanation
        )
        return { success: true, questions: validQuestions.slice(0, requestedCount), hasMathContent: !!parsed?.hasMathContent }
      } catch (e) {
        console.error('Gemini fallback failed for quiz generation:', e)
        throw e
      }
    }
    
    // Fallback for answering questions using Gemini in production
    if (functionName === 'answer-pdf-question' && config.gemini?.apiKey) {
      console.log('Falling back to Gemini for answer generation in production')
      const pdfContent: string = body?.pdfContent || ''
      const question: string = body?.question || ''
      try {
        const prompt = `Return direct, specific answers without prefacing like "The provided text". If the answer is not in the PDF, say so plainly.\n\nQuestion: ${question}\nFile Name: ${body?.fileName || ''}\nPDF Excerpt (truncated):\n${pdfContent.substring(0, 15000)}\n\nAnswer:`
        const text = await generateWithGemini(prompt, config.gemini.apiKey)
        return { success: true, answer: text }
      } catch (e) {
        console.error('Gemini fallback failed for answer generation:', e)
        throw e
      }
    }
    throw err
  }
}

// Direct PDF.co API integration for development
async function processPDFWithPDFCo(body: any) {
  try {
    const { fileData, fileName } = body
    
    console.log('Processing PDF with PDF.co API:', fileName)
    
    // Step 1: Upload PDF to PDF.co
    console.log('Uploading PDF to PDF.co...')
    const uploadResponse = await fetch(`${config.pdfCo.baseUrl}/file/upload/base64`, {
      method: 'POST',
      headers: {
        'x-api-key': config.pdfCo.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        name: fileName
      })
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('PDF.co upload error:', errorText)
      throw new Error(`PDF.co upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    console.log('Upload successful:', uploadResult)
    
    if (!uploadResult.url) {
      throw new Error('Failed to upload PDF to PDF.co')
    }

    // Step 2: Extract text from PDF
    console.log('Extracting text from PDF...')
    let extractResponse = await fetch(`${config.pdfCo.baseUrl}/pdf/convert/to/text`, {
      method: 'POST',
      headers: {
        'x-api-key': config.pdfCo.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: uploadResult.url
        // Removed pages parameter to let PDF.co handle all pages automatically
      })
    })

    // If the first method fails, try alternative endpoint
    if (!extractResponse.ok) {
      console.log('First extraction method failed, trying alternative endpoint...')
      extractResponse = await fetch(`${config.pdfCo.baseUrl}/pdf/extract/text`, {
        method: 'POST',
        headers: {
          'x-api-key': config.pdfCo.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: uploadResult.url
        })
      })
    }

    console.log('Extract response status:', extractResponse.status)

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text()
      console.error('PDF.co extract error:', errorText)
      
      // Try to parse the error response for better user feedback
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message) {
          throw new Error(`PDF.co extraction failed: ${errorData.message}`)
        }
      } catch (parseError) {
        // If we can't parse the error, use the raw text
        throw new Error(`PDF.co extract failed: ${extractResponse.status} - ${errorText}`)
      }
      
      throw new Error(`PDF.co extract failed: ${extractResponse.status} - ${errorText}`)
    }

    const extractResult = await extractResponse.json()
    console.log('Text extraction successful:', extractResult)
    
    if (!extractResult.url) {
      throw new Error('Failed to extract text from PDF')
    }

    // Step 3: Get the extracted text
    console.log('Fetching extracted text...')
    const textResponse = await fetch(extractResult.url)
    
    if (!textResponse.ok) {
      throw new Error(`Failed to fetch extracted text: ${textResponse.status}`)
    }
    
    const extractedText = await textResponse.text()
    
    console.log('PDF processing completed successfully')
    console.log('Extracted text length:', extractedText.length)

    return {
      text: extractedText,
      success: true
    }

  } catch (error) {
    console.error('PDF.co API processing error:', error)
    
    // Check if it's a credit/402 error and fallback to browser-based extraction
    if (error.message.includes('402') || error.message.includes('credits') || error.message.includes('subscription')) {
      console.log('PDF.co credits exhausted, falling back to browser-based PDF extraction')
      try {
        return await processPDFWithBrowser(body)
      } catch (browserError) {
        console.error('Browser-based PDF extraction also failed:', browserError)
        return {
          error: `PDF processing failed: ${error.message}. Browser extraction also failed: ${browserError.message}`,
          success: false
        }
      }
    }
    
    return {
      error: error.message,
      success: false
    }
  }
}

// Browser-based PDF text extraction using PDF.js
async function processPDFWithBrowser(body: any) {
  try {
    const { fileData, fileName } = body
    
    console.log('Processing PDF with browser-based extraction:', fileName)
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(fileData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Load PDF.js from CDN if not already loaded
    if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
      await loadPDFJS()
    }
    
    // Use PDF.js to extract text
    const pdfjsLib = (window as any).pdfjsLib
    if (!pdfjsLib) {
      throw new Error('PDF.js library not available')
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: bytes })
    const pdf = await loadingTask.promise
    
    let extractedText = ''
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      extractedText += pageText + '\n\n'
    }
    
    console.log('Browser-based PDF processing completed successfully')
    console.log('Extracted text length:', extractedText.length)
    
    return {
      text: extractedText.trim() || `Unable to extract text from ${fileName}. This may be an image-based PDF.`,
      success: true
    }
    
  } catch (error) {
    console.error('Browser-based PDF processing error:', error)
    throw error
  }
}

// Load PDF.js library from CDN
async function loadPDFJS() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF.js can only be loaded in browser environment'))
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      // Set worker path
      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js library'))
    document.head.appendChild(script)
  })
}