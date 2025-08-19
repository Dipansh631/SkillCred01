import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const supabase = createClient(config.supabase.url, config.supabase.anonKey)

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