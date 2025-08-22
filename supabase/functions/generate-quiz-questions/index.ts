import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'intermediate' | 'advanced' | 'logical' | 'mathematical';
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfContent, questionCount } = await req.json()

    if (!pdfContent) {
      return new Response(
        JSON.stringify({ error: 'Missing pdfContent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('PDF Content length:', pdfContent.length)
    console.log('Generating questions using Gemini AI...')

    // Determine requested count with sane defaults and bounds
    const requestedCount = Math.min(Math.max(Number(questionCount) || 10, 1), 50)

    // Call Gemini API to generate questions based on actual PDF content
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on the following PDF content, generate exactly ${requestedCount} multiple choice questions in JSON format. Aim for a balanced mix across: easy, intermediate, advanced, logical, and mathematical (include mathematical only if the content warrants it).

            For each question, provide:
            - id: unique identifier (e.g., "easy1", "intermediate1", etc.)
            - question: the question text
            - options: array of 4 possible answers
            - correctAnswer: index (0-3) of the correct answer
            - difficulty: one of "easy", "intermediate", "advanced", "logical", "mathematical"
            - explanation: brief explanation of why the answer is correct

            PDF Content:
            ${pdfContent.substring(0, 8000)}

            Return ONLY a JSON object with this structure:
            {
              "questions": [...],
              "hasMathContent": boolean
            }`
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

    let responseText = geminiResult.candidates[0].content.parts[0].text
    
    // Clean up the response text to extract JSON
    responseText = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '')
    
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText)
      throw new Error('Invalid JSON response from Gemini API')
    }

    const questions = parsedResponse.questions || []
    const hasMathContent = parsedResponse.hasMathContent || false

    // Validate questions format
    const validQuestions = questions.filter((q: any) => 
      q.id && q.question && Array.isArray(q.options) && q.options.length === 4 && 
      typeof q.correctAnswer === 'number' && q.difficulty && q.explanation
    )

    if (validQuestions.length === 0) {
      throw new Error('No valid questions generated')
    }

    console.log(`Generated ${validQuestions.length} questions, math content: ${hasMathContent}`)

    return new Response(
      JSON.stringify({ 
        questions: validQuestions.slice(0, requestedCount),
        hasMathContent,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Question generation error:', error)
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