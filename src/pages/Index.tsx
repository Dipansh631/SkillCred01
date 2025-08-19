import { useState } from "react";
import { FileText, Brain, Sparkles } from "lucide-react";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFPreview } from "@/components/PDFPreview";
import { ModeSelector } from "@/components/ModeSelector";
import { QuestionInterface } from "@/components/QuestionInterface";
import { QuizInterface } from "@/components/QuizInterface";
import { useToast } from "@/hooks/use-toast";

export type AppMode = 'upload' | 'preview' | 'select-mode' | 'ask-question' | 'generate-quiz';

const Index = () => {
  const [mode, setMode] = useState<AppMode>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [performance, setPerformance] = useState<{
    totalTests: number;
    averageScore: number;
    bestScore: number;
  }>({
    totalTests: 0,
    averageScore: 0,
    bestScore: 0
  });
  const { toast } = useToast();

  const handleFileUpload = async (file: File, content: string) => {
    setPdfFile(file);
    setPdfContent(content);
    setMode('preview');
    toast({
      title: "PDF Uploaded Successfully!",
      description: `"${file.name}" is ready for processing.`,
    });
  };

  const handlePreviewContinue = () => {
    setMode('select-mode');
  };

  const handleModeSelect = (selectedMode: 'ask-question' | 'generate-quiz') => {
    setMode(selectedMode);
  };

  const handleBackToModeSelect = () => {
    setMode('select-mode');
  };

  const handleTestAgain = () => {
    setMode('select-mode');
  };

  const updatePerformance = (score: number, total: number) => {
    const percentage = Math.round((score / total) * 100);
    setPerformance(prev => ({
      totalTests: prev.totalTests + 1,
      averageScore: Math.round((prev.averageScore * prev.totalTests + percentage) / (prev.totalTests + 1)),
      bestScore: Math.max(prev.bestScore, percentage)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-education-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-education-accent/20 rounded-full blur-3xl animate-bounce-gentle" />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-gradient-primary p-3 rounded-xl shadow-button-education">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PDF Mind Bender
            </h1>
            <Sparkles className="w-6 h-6 text-education-secondary animate-pulse" />
          </div>
          <p className="text-center text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform any PDF into an interactive learning experience with AI-powered questions and assessments.
          </p>
        </div>
      </header>

      {/* Performance Stats */}
      {performance.totalTests > 0 && (
        <div className="relative z-10 mb-8">
          <div className="container mx-auto px-6">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-card-education border border-border/50 max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-education-primary">{performance.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Tests Taken</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-education-accent">{performance.averageScore}%</div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-education-success">{performance.bestScore}%</div>
                  <div className="text-sm text-muted-foreground">Best Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {mode === 'upload' && (
            <PDFUploader onFileUpload={handleFileUpload} />
          )}

          {mode === 'preview' && pdfFile && (
            <PDFPreview
              fileName={pdfFile.name}
              content={pdfContent}
              onContinue={handlePreviewContinue}
              onBack={() => setMode('upload')}
            />
          )}

          {mode === 'select-mode' && (
            <ModeSelector
              onModeSelect={handleModeSelect}
              onBack={() => setMode('preview')}
            />
          )}

          {mode === 'ask-question' && (
            <QuestionInterface
              pdfContent={pdfContent}
              fileName={pdfFile?.name || ''}
              onBack={handleBackToModeSelect}
            />
          )}

          {mode === 'generate-quiz' && (
            <QuizInterface
              pdfContent={pdfContent}
              fileName={pdfFile?.name || ''}
              onBack={handleBackToModeSelect}
              onTestAgain={handleTestAgain}
              onScoreUpdate={updatePerformance}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;