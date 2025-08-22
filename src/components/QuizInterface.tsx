import { useState, useEffect } from 'react';
import { PenTool, ArrowLeft, Clock, CheckCircle, XCircle, Trophy, RotateCcw, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { callSupabaseFunction } from '@/lib/supabase';
import { config } from '@/lib/config';
import { generateWithGemini } from '@/lib/utils';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'intermediate' | 'advanced' | 'logical' | 'mathematical';
  explanation: string;
}

interface QuizInterfaceProps {
  pdfContent: string;
  fileName: string;
  onBack: () => void;
  onTestAgain: () => void;
  onScoreUpdate: (score: number, total: number) => void;
}

export const QuizInterface = ({ pdfContent, fileName, onBack, onTestAgain, onScoreUpdate }: QuizInterfaceProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isGenerating, setIsGenerating] = useState(true);
  const [questionCount, setQuestionCount] = useState(5); // Default question count
  const { toast } = useToast();

  const generateQuestions = async (): Promise<Question[]> => {
    try {
      // In development mode, prefer Gemini if API key is provided; otherwise use mock
      if (import.meta.env.DEV) {
        if (config.gemini?.apiKey) {
          console.log('Development mode: Generating quiz questions with Gemini')
          const prompt = `Based on the following PDF content, generate exactly ${questionCount} multiple choice questions in JSON format.
Each question must have: id, question, options (4), correctAnswer (0-3), difficulty (easy|intermediate|advanced|logical|mathematical), explanation.

PDF Content (truncated):\n${pdfContent.substring(0, 8000)}\n
Return ONLY a JSON object like: { "questions": [...], "hasMathContent": boolean }`;
          try {
            let text = await generateWithGemini(prompt, config.gemini.apiKey)
            text = text.replace(/```json\n?/g, '').replace(/```/g, '')
            const parsed = JSON.parse(text)
            const questions: Question[] = Array.isArray(parsed.questions) ? parsed.questions : []
            if (questions.length > 0) {
              return questions.slice(0, questionCount)
            }
          } catch (e) {
            console.warn('Gemini dev generation failed, falling back to mock:', e)
          }
          return generateMockQuestions(pdfContent);
        } else {
          console.log('Development mode: Generating mock quiz questions locally')
          return generateMockQuestions(pdfContent);
        }
      }

      // Production mode: call Supabase function
      const result = await callSupabaseFunction('generate-quiz-questions', { pdfContent, questionCount });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate questions');
      }

      // Ensure we honor the selected count even if backend returns more
      return (result.questions || []).slice(0, questionCount);
    } catch (error) {
      console.error('Question generation error:', error);
      
      // Fallback to mock questions if Supabase function fails
      if (import.meta.env.DEV) {
        console.log('Falling back to mock questions due to error')
        return generateMockQuestions(pdfContent);
      }
      
      return [];
    }
  };

  // Generate mock quiz questions for development
  const generateMockQuestions = (content: string): Question[] => {
    const baseQuestions: Question[] = [
      {
        id: '1',
        question: 'What is the main topic discussed in this document?',
        options: [
          'Technology and Innovation',
          'Business Strategy',
          'Educational Methods',
          'Scientific Research'
        ],
        correctAnswer: 0,
        difficulty: 'easy',
        explanation: 'This question tests your understanding of the document\'s primary focus.'
      },
      {
        id: '2',
        question: 'Which of the following concepts is most important according to the text?',
        options: [
          'Efficiency',
          'Creativity',
          'Accuracy',
          'Speed'
        ],
        correctAnswer: 1,
        difficulty: 'intermediate',
        explanation: 'The document emphasizes creative thinking and innovative approaches.'
      },
      {
        id: '3',
        question: 'What would be the best approach to implement the ideas from this document?',
        options: [
          'Immediate implementation without testing',
          'Gradual rollout with feedback loops',
          'Complete overhaul of existing systems',
          'Outsourcing to external consultants'
        ],
        correctAnswer: 1,
        difficulty: 'advanced',
        explanation: 'Gradual implementation allows for learning and adaptation based on real-world feedback.'
      },
      {
        id: '4',
        question: 'How does this document relate to current industry trends?',
        options: [
          'It contradicts modern practices',
          'It aligns with emerging technologies',
          'It focuses on outdated methods',
          'It ignores current developments'
        ],
        correctAnswer: 1,
        difficulty: 'logical',
        explanation: 'The document demonstrates forward-thinking approaches that align with current industry evolution.'
      },
      {
        id: '5',
        question: 'What is the expected outcome of following the document\'s recommendations?',
        options: [
          'Increased costs and complexity',
          'Improved efficiency and innovation',
          'Reduced workforce requirements',
          'Maintenance of status quo'
        ],
        correctAnswer: 1,
        difficulty: 'mathematical',
        explanation: 'The recommendations are designed to optimize processes and foster innovation.'
      },
      {
        id: '6',
        question: 'Based on the document\'s length and detail, what level of expertise is required?',
        options: [
          'Beginner level',
          'Intermediate level',
          'Advanced level',
          'Expert level'
        ],
        correctAnswer: 2,
        difficulty: 'advanced',
        explanation: 'The comprehensive nature of the document suggests it requires advanced understanding.'
      },
      {
        id: '7',
        question: 'What key challenges are addressed in this document?',
        options: [
          'Only technical challenges',
          'Only financial challenges',
          'Both technical and strategic challenges',
          'No specific challenges mentioned'
        ],
        correctAnswer: 2,
        difficulty: 'intermediate',
        explanation: 'The document appears to address multiple types of challenges comprehensively.'
      },
      {
        id: '8',
        question: 'How should stakeholders be involved in the implementation process?',
        options: [
          'Minimal involvement required',
          'Active participation and feedback',
          'Only final approval needed',
          'No stakeholder involvement'
        ],
        correctAnswer: 1,
        difficulty: 'logical',
        explanation: 'Successful implementation typically requires stakeholder engagement and feedback.'
      },
      {
        id: '9',
        question: 'What is the timeline for implementing the document\'s recommendations?',
        options: [
          'Immediate (within days)',
          'Short-term (within months)',
          'Medium-term (6-12 months)',
          'Long-term (1+ years)'
        ],
        correctAnswer: 2,
        difficulty: 'mathematical',
        explanation: 'Complex implementations typically require medium-term planning and execution.'
      },
      {
        id: '10',
        question: 'What resources are needed for successful implementation?',
        options: [
          'Only financial resources',
          'Only human resources',
          'Multiple resource types',
          'No additional resources'
        ],
        correctAnswer: 2,
        difficulty: 'advanced',
        explanation: 'Successful implementation typically requires various types of resources.'
      }
    ];

    // Return up to the requested number of questions. If more than available,
    // repeat and uniquify base questions to reach the desired count.
    if (questionCount <= baseQuestions.length) {
      return baseQuestions.slice(0, questionCount);
    }

    const extendedQuestions: Question[] = [...baseQuestions];
    for (let i = baseQuestions.length; i < questionCount; i++) {
      const base = baseQuestions[i % baseQuestions.length];
      const variantIndex = Math.floor(i / baseQuestions.length) + 1;
      extendedQuestions.push({
        ...base,
        id: `${base.id}-${variantIndex}`,
        question: `${base.question} (variant ${variantIndex})`
      });
    }
    return extendedQuestions;
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setIsGenerating(true);
      try {
        const generatedQuestions = await generateQuestions();
        setQuestions(generatedQuestions);
      } catch (error) {
        console.error('Failed to generate questions:', error);
        toast({
          title: "Error",
          description: "Failed to generate questions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    };

    // Only load questions on initial mount or when pdfContent changes
    // Don't auto-regenerate when questionCount changes
    loadQuestions();
  }, [pdfContent]); // Removed questionCount dependency

  useEffect(() => {
    if (!showResults && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults) {
      handleSubmitQuiz();
    }
  }, [timeLeft, showResults]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitQuiz = () => {
    const correctAnswers = questions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length;
    onScoreUpdate(correctAnswers, questions.length);
    setShowResults(true);
    
    toast({
      title: "Quiz Completed!",
      description: `You scored ${correctAnswers} out of ${questions.length} questions correctly.`,
    });
  };

  const handleRegenerateQuestions = async () => {
    console.log('Regenerate button clicked!', { questionCount, questionsLength: questions.length });
    
    // Prevent multiple simultaneous calls
    if (isGenerating) {
      console.log('Already generating, ignoring click');
      return;
    }
    
    // Confirm regeneration if user has already answered questions
    if (Object.keys(selectedAnswers).length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to regenerate ${questionCount} questions? This will clear your current progress and answers.`
      );
      if (!confirmed) {
        console.log('User cancelled regeneration');
        return;
      }
    }
    
    console.log('Starting regeneration...');
    setIsGenerating(true);
    
    try {
      // Clear current state
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      
      // Generate new questions with current questionCount
      const newQuestions = await generateQuestions();
      console.log('Generated new questions:', newQuestions.length);
      setQuestions(newQuestions);
      
      toast({
        title: "Questions Regenerated",
        description: `Successfully generated ${questionCount} new questions!`,
      });
      
    } catch (error) {
      console.error('Failed to regenerate questions:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      console.log('Regeneration completed');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-education-success';
    if (percentage >= 60) return 'text-education-warning';
    return 'text-education-error';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-education-success text-white';
      case 'intermediate': return 'bg-education-warning text-white';
      case 'advanced': return 'bg-education-error text-white';
      case 'logical': return 'bg-education-primary text-white';
      case 'mathematical': return 'bg-education-accent text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Debug logging to check component state
  console.log('QuizInterface Debug:', {
    questionsLength: questions.length,
    questionCount,
    isGenerating,
    showResults,
    currentQuestionIndex
  });

  if (isGenerating) {
    return (
      <Card className="p-12 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education text-center">
        <div className="bg-gradient-accent p-6 rounded-2xl w-fit mx-auto mb-6 shadow-button-education">
          <Brain className="w-16 h-16 text-white animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Generating Your Quiz</h2>
        
        <p className="text-muted-foreground text-lg mb-8">
          Creating {questionCount} engaging questions based on your PDF content...
        </p>
        
        <div className="space-y-4">
          <div className="animate-pulse w-64 h-4 bg-muted rounded mx-auto"></div>
          <div className="animate-pulse w-48 h-4 bg-muted rounded mx-auto"></div>
          <div className="animate-pulse w-56 h-4 bg-muted rounded mx-auto"></div>
        </div>
      </Card>
    );
  }

  if (showResults) {
    const correctAnswers = questions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length;
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <div className="space-y-6">
        <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education text-center">
          <div className="bg-gradient-primary p-6 rounded-2xl w-fit mx-auto mb-6 shadow-button-education">
            <Trophy className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Quiz Results</h2>
          <div className={`text-6xl font-bold mb-4 ${getScoreColor(correctAnswers, questions.length)}`}>
            {percentage}%
          </div>
          <p className="text-xl mb-6">
            You scored <span className="font-bold">{correctAnswers}</span> out of <span className="font-bold">{questions.length}</span> questions correctly!
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Button
              onClick={onTestAgain}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-button-education"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Test Again
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Menu
            </Button>
          </div>
        </Card>

        {/* Detailed Results */}
        <Card className="p-6 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
          <h3 className="text-xl font-bold mb-4">Detailed Results</h3>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const userAnswer = selectedAnswers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className="p-4 border border-border/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Question {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-education-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-education-error" />
                      )}
                    </div>
                  </div>
                  <p className="mb-2">{question.question}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your answer: {userAnswer !== undefined ? question.options[userAnswer] : 'Not answered'}
                  </p>
                  <p className="text-sm text-education-success mb-2">
                    Correct answer: {question.options[question.correctAnswer]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {question.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-gradient-accent p-4 rounded-2xl w-fit mx-auto mb-4 shadow-button-education">
          <PenTool className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Quiz: {fileName}</h2>
        <p className="text-muted-foreground text-lg">
          Answer all questions to test your understanding
        </p>
        
        {/* Test Regenerate Button - For Debugging */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">Debug: Test Regenerate Functionality</p>
          <Button
            onClick={handleRegenerateQuestions}
            disabled={isGenerating}
            variant="default"
            size="sm"
            className="flex items-center space-x-2 mx-auto bg-blue-600 hover:bg-blue-700"
          >
            <RotateCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Test Regenerate ({questionCount} questions)</span>
          </Button>
          <p className="text-xs text-blue-600 mt-2 text-center">
            Current: {questions.length} questions | Selected: {questionCount}
          </p>
        </div>
      </div>

      {/* Quiz Header */}
      <Card className="p-4 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-education-primary" />
              <span className="font-medium">{formatTime(timeLeft)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              Total: {questions.length} questions
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(currentQuestion?.difficulty || 'easy')}`}>
              {currentQuestion?.difficulty}
            </span>
            <Button
              variant={questions.length !== questionCount ? "default" : "outline"}
              size="sm"
              onClick={handleRegenerateQuestions}
              disabled={isGenerating}
              className={`flex items-center space-x-2 ${
                questions.length !== questionCount 
                  ? 'bg-education-primary hover:bg-education-primary/90 text-white' 
                  : ''
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating 
                  ? 'Generating...' 
                  : questions.length !== questionCount 
                    ? `Get ${questionCount} Questions` 
                    : 'Regenerate'
                }
              </span>
            </Button>
          </div>
        </div>
        
        {/* Question Count Selector - Always Visible */}
        <div className={`mb-4 p-3 rounded-lg border ${
          questions.length > 0 && questions.length !== questionCount
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-card/50 border-border/30'
        }`}>
          <div className="flex items-center justify-between">
            <label htmlFor="questionCount" className="text-sm font-medium">
              Number of questions:
            </label>
            <select
              id="questionCount"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="px-3 py-1 bg-background border border-border rounded-md focus:ring-2 focus:ring-education-primary focus:border-transparent text-sm"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={8}>8 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>
          {questions.length > 0 && questions.length !== questionCount && (
            <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded-md">
              <p className="text-xs text-amber-800 text-center font-medium">
                ⚠️ You have {questions.length} questions but selected {questionCount}. 
                Click "Get {questionCount} Questions" to regenerate.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            💡 Change the question count and click "Regenerate" to get new questions
          </p>
        </div>
        
        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</p>
      </Card>

      {/* Regenerate Button - Prominent Placement */}
      <Card className="p-4 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">Current Questions: {questions.length}</span>
            <span className="text-sm text-muted-foreground">Selected Count: {questionCount}</span>
          </div>
          <Button
            variant={questions.length !== questionCount ? "default" : "outline"}
            size="lg"
            onClick={handleRegenerateQuestions}
            disabled={isGenerating}
            className={`flex items-center space-x-3 ${
              questions.length !== questionCount 
                ? 'bg-education-primary hover:bg-education-primary/90 text-white shadow-button-education' 
                : 'shadow-button-education'
            }`}
          >
            <RotateCcw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="font-medium">
              {isGenerating 
                ? 'Generating Questions...' 
                : questions.length !== questionCount 
                  ? `Get ${questionCount} Questions` 
                  : 'Regenerate Questions'
              }
            </span>
          </Button>
        </div>
        {questions.length > 0 && questions.length !== questionCount && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ You have {questions.length} questions but selected {questionCount}. 
              Click the button above to get {questionCount} questions.
            </p>
          </div>
        )}
      </Card>

      {/* Question Card */}
      <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
        <h3 className="text-xl font-bold mb-6">{currentQuestion?.question}</h3>
        
        <div className="space-y-3 mb-8">
          {currentQuestion?.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQuestion.id, index)}
              className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                selectedAnswers[currentQuestion.id] === index
                  ? 'border-education-primary bg-education-primary/10 text-education-primary'
                  : 'border-border hover:border-education-primary/50 hover:bg-education-primary/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswers[currentQuestion.id] === index
                    ? 'border-education-primary bg-education-primary text-white'
                    : 'border-border'
                }`}>
                  {selectedAnswers[currentQuestion.id] === index && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-button-education"
              disabled={Object.keys(selectedAnswers).length !== questions.length}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              className="bg-gradient-primary hover:opacity-90 text-white shadow-button-education"
            >
              Next
            </Button>
          )}
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