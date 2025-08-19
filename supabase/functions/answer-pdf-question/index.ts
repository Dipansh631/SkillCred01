import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, pdfContent } = await req.json()

    if (!question || !pdfContent) {
      return new Response(
        JSON.stringify({ error: 'Missing question or pdfContent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Question:', question)
    console.log('PDF Content length:', pdfContent.length)
    console.log('Generating answer using Gemini AI...')

    // Call Gemini API to generate intelligent answers based on PDF content
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on the following PDF content, please answer the user's question comprehensively and accurately. Use only information from the PDF content provided. If the information is not available in the PDF, clearly state that.

Question: "${question}"

PDF Content:
${pdfContent.substring(0, 10000)}

Please provide a detailed, helpful answer based on the PDF content. If you need to reference specific sections or examples from the document, please do so. If the question cannot be answered from the provided content, explain what information would be needed.`
          }]
        }]
      })
    })

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiResult = await geminiResponse.json()
    
    if (!geminiResult.candidates || !geminiResult.candidates[0]) {
      throw new Error('No response from Gemini API')
    }

    const answer = geminiResult.candidates[0].content.parts[0].text

    console.log('Generated answer length:', answer.length)

    return new Response(
      JSON.stringify({ 
        answer,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Answer generation error:', error)
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