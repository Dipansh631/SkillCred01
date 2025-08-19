import { useState } from 'react';
import { Send, ArrowLeft, MessageCircle, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { callSupabaseFunction } from '@/lib/supabase';
import { config } from '@/lib/config';
import { generateWithGemini } from '@/lib/utils';

// Heuristics to improve dev-mode answers using local content
function extractMainTitle(content: string, fileName: string): string {
  const nameFromFile = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 50); // Only inspect the first 50 lines

  // Prefer the first reasonably short non-generic heading-like line
  const generic = new Set(['abstract', 'introduction', 'table of contents', 'contents']);
  for (const line of lines) {
    const s = line.replace(/\s+/g, ' ').trim();
    if (s.length >= 6 && s.length <= 120) {
      const lower = s.toLowerCase();
      if (!generic.has(lower)) {
        return s;
      }
    }
  }

  return nameFromFile || 'Document';
}

function isGreeting(text: string): boolean {
  const t = text.toLowerCase().trim();
  return /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening))\b/.test(t);
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface QuestionInterfaceProps {
  pdfContent: string;
  fileName: string;
  onBack: () => void;
}

export const QuestionInterface = ({ pdfContent, fileName, onBack }: QuestionInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hello! I've analyzed your PDF "${fileName}" and I'm ready to answer any questions you have about its content. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateAnswer = async (question: string): Promise<string> => {
    try {
      // In development mode, prefer Gemini if API key is provided; otherwise use mock
      if (import.meta.env.DEV) {
        if (config.gemini?.apiKey) {
          console.log('Development mode: Generating AI response with Gemini')
          const title = extractMainTitle(pdfContent, fileName)

          // Handle greetings locally for a better UX
          if (isGreeting(question)) {
            return `Hi! This document appears to be "${title}". Ask me something specific from it (e.g., "summarize the introduction", "list key points", or "what are the main challenges discussed?").`;
          }

          // Handle explicit title/topic questions locally
          const qLower = question.toLowerCase();
          if (qLower.includes('title') || qLower.includes('topic') || qLower.includes('name of the pdf')) {
            return `The document's main title appears to be: "${title}".`;
          }

          const prompt = `You are an assistant answering questions strictly from the provided PDF text. 
Return direct, specific answers without prefacing like "The provided text". If the answer is not in the PDF, say so plainly.
If the user asks for the title/topic, extract the likely main title from the beginning.

Question: ${question}
File Name: ${fileName}
PDF Excerpt (truncated):
${pdfContent.substring(0, 15000)}

Answer:`
          try {
            const text = await generateWithGemini(prompt, config.gemini.apiKey)
            return text
          } catch (e) {
            console.warn('Gemini dev answer failed, falling back to mock:', e)
            return generateMockAnswer(question, pdfContent)
          }
        } else {
          console.log('Development mode: Generating mock AI response locally')
          return generateMockAnswer(question, pdfContent);
        }
      }

      // Production mode: call Supabase function
      const result = await callSupabaseFunction('answer-pdf-question', { question, pdfContent });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate answer');
      }

      return result.answer;
    } catch (error) {
      console.error('Answer generation error:', error);
      
      // Fallback to mock response if Supabase function fails
      if (import.meta.env.DEV) {
        console.log('Falling back to mock response due to error')
        return generateMockAnswer(question, pdfContent);
      }
      
      return `I'm having trouble analyzing your PDF content right now. Please ensure your PDF was uploaded successfully and try asking your question again. If the issue persists, try rephrasing your question or asking about a more general topic from the document.`;
    }
  };

  // Generate mock AI responses for development
  const generateMockAnswer = (question: string, content: string): string => {
    const questionLower = question.toLowerCase();
    const contentLength = content.length;
    
    // Generate contextual responses based on question content
    if (questionLower.includes('what') || questionLower.includes('explain')) {
      return `Based on the document content (${contentLength} characters), this appears to be a comprehensive document covering various topics. The content suggests this is a detailed analysis or report that would require careful review to provide specific answers. In a production environment, this would be analyzed by AI to give you precise, contextual responses.`;
    }
    
    if (questionLower.includes('how') || questionLower.includes('process')) {
      return `The document outlines several processes and methodologies. Given its length and detail, it likely contains step-by-step instructions or procedural information. To get specific process details, you would need to ask about particular sections or topics covered in the document.`;
    }
    
    if (questionLower.includes('why') || questionLower.includes('reason')) {
      return `The document provides various reasons and justifications for its recommendations or findings. The comprehensive nature suggests it addresses multiple aspects and considerations. For specific reasoning, please ask about particular topics or sections.`;
    }
    
    if (questionLower.includes('when') || questionLower.includes('timeline')) {
      return `The document may contain temporal information, deadlines, or historical context. Given its length, it likely covers various time periods or implementation timelines. Ask about specific time-related aspects for detailed information.`;
    }
    
    if (questionLower.includes('where') || questionLower.includes('location')) {
      return `The document may reference various locations, contexts, or environments where the discussed concepts apply. The comprehensive coverage suggests it addresses multiple scenarios and contexts.`;
    }
    
    // Default response
    return `This is a development mode response. The document contains ${contentLength} characters of content covering various topics. In production, an AI would analyze the specific content to provide detailed, contextual answers to your questions. Please ask about specific topics or concepts you'd like to understand better.`;
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion('');
    setIsLoading(true);

    try {
      const answer = await generateAnswer(currentQuestion);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting answer:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-gradient-secondary p-4 rounded-2xl w-fit mx-auto mb-4 shadow-button-education">
          <MessageCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Ask Questions</h2>
        <p className="text-muted-foreground text-lg">
          Ask me anything about "{fileName}" and I'll provide detailed answers.
        </p>
      </div>

      <Card className="bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
        {/* Chat Messages */}
        <ScrollArea className="h-96 p-6 mb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`p-2 rounded-full ${
                    message.type === 'user' 
                      ? 'bg-education-primary' 
                      : 'bg-gradient-primary'
                  } shadow-button-education`}>
                    {message.type === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-education-primary text-white'
                      : 'bg-secondary/70 text-foreground'
                  } shadow-sm`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex space-x-3 max-w-3xl">
                  <div className="p-2 rounded-full bg-gradient-primary shadow-button-education">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/70 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-education-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-education-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-education-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">Analyzing your question...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border/50 p-6">
          <div className="flex space-x-4">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your PDF content..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendQuestion}
              disabled={!question.trim() || isLoading}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-button-education"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Ask about summaries, key points, examples, or specific topics
          </p>
        </div>
      </Card>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mode Selection</span>
        </Button>
      </div>
    </div>
  );
};