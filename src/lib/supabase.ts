import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import { generateWithGemini } from './utils'

// Prefer calling Edge Functions via the dedicated functions subdomain to avoid DNS issues with the project domain
const resolvedFunctionsUrl = (() => {
  try {
    const url = new URL(config.supabase.url)
    const projectRef = url.hostname.split('.')[0]
    return `https://${projectRef}.functions.supabase.co`
  } catch {
    return undefined
  }
})()

export const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
  functions: resolvedFunctionsUrl ? { url: resolvedFunctionsUrl } : undefined,
})

export const callSupabaseFunction = async (functionName: string, body: any) => {
  // In development mode, use local PDF processing with PDF.co API
  if (config.isDevelopment) {
    console.log('Development mode: Using PDF.co API directly')
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
    return {
      error: error.message,
      success: false
    }
  }
}