import { MessageCircle, PenTool, ArrowLeft, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ModeSelectorProps {
  onModeSelect: (mode: 'ask-question' | 'generate-quiz') => void;
  onBack: () => void;
}

export const ModeSelector = ({ onModeSelect, onBack }: ModeSelectorProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="bg-gradient-primary p-4 rounded-2xl w-fit mx-auto mb-4 shadow-button-education">
          <Brain className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Choose Your Learning Mode</h2>
        <p className="text-muted-foreground text-lg">
          How would you like to interact with your PDF content?
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Ask Questions Mode */}
        <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education hover:shadow-glow transition-all duration-300 cursor-pointer group"
              onClick={() => onModeSelect('ask-question')}>
          <div className="text-center space-y-6">
            <div className="bg-gradient-secondary p-6 rounded-2xl w-fit mx-auto shadow-button-education group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="w-16 h-16 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-education-primary transition-colors">
                Ask Questions
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Have specific questions about your PDF? Ask anything and get detailed answers based on the content.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-accent rounded-full"></div>
                <span>Ask specific questions about content</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-accent rounded-full"></div>
                <span>Get detailed explanations</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-accent rounded-full"></div>
                <span>Perfect for research and study</span>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-secondary hover:opacity-90 text-white shadow-button-education"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Asking Questions
            </Button>
          </div>
        </Card>

        {/* Generate Quiz Mode */}
        <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education hover:shadow-glow transition-all duration-300 cursor-pointer group"
              onClick={() => onModeSelect('generate-quiz')}>
          <div className="text-center space-y-6">
            <div className="bg-gradient-accent p-6 rounded-2xl w-fit mx-auto shadow-button-education group-hover:scale-110 transition-transform duration-300">
              <PenTool className="w-16 h-16 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-education-primary transition-colors">
                Generate Quiz
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Test your knowledge with AI-generated multiple choice questions across different difficulty levels.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-success rounded-full"></div>
                <span>4 Easy + 5 Intermediate + 5 Advanced MCQs</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-success rounded-full"></div>
                <span>6 Logical thinking questions</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-success rounded-full"></div>
                <span>Instant scoring and feedback</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-education-warning rounded-full"></div>
                <span>Mathematical questions (if detected)</span>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-accent hover:opacity-90 text-white shadow-button-education"
              size="lg"
            >
              <PenTool className="w-5 h-5 mr-2" />
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Quiz
            </Button>
          </div>
        </Card>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Preview</span>
        </Button>
      </div>
    </div>
  );
};