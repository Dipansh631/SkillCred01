import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const PDFCO_API_KEY = Deno.env.get('PDFCO_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileData, fileName } = await req.json()

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileData or fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!PDFCO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'PDF.co API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing PDF:', fileName)
    console.log('File data length:', fileData.length)

    // Step 1: Upload PDF to PDF.co
    console.log('Uploading PDF to PDF.co...')
    const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
      method: 'POST',
      headers: {
        'x-api-key': PDFCO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        name: fileName
      })
    })

    console.log('Upload response status:', uploadResponse.status)
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('PDF.co upload error:', errorText)
      throw new Error(`PDF.co upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    console.log('Upload result:', uploadResult)
    
    if (!uploadResult.url) {
      throw new Error('Failed to upload PDF to PDF.co')
    }

    // Step 2: Extract text from PDF
    console.log('Extracting text from PDF...')
    const extractResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'x-api-key': PDFCO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: uploadResult.url,
        pages: "1-50" // Limit to first 50 pages for performance
      })
    })

    console.log('Extract response status:', extractResponse.status)
    
    if (!extractResponse.ok) {
      const errorText = await extractResponse.text()
      console.error('PDF.co extract error:', errorText)
      throw new Error(`PDF.co extract failed: ${extractResponse.status} - ${errorText}`)
    }

    const extractResult = await extractResponse.json()
    console.log('Extract result:', extractResult)
    
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
    
    console.log('Extracted text length:', extractedText.length)
    console.log('PDF processing completed successfully')

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('PDF extraction error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})