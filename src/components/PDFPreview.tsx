import { FileText, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PDFPreviewProps {
  fileName: string;
  content: string;
  onContinue: () => void;
  onBack: () => void;
}

export const PDFPreview = ({ fileName, content, onContinue, onBack }: PDFPreviewProps) => {
  // Get first 10 lines for preview
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const previewLines = lines.slice(0, 10);

  return (
    <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
      <div className="text-center mb-8">
        <div className="bg-gradient-primary p-4 rounded-2xl w-fit mx-auto mb-4 shadow-button-education">
          <Eye className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">PDF Preview</h2>
        <p className="text-muted-foreground">
          Here's a preview of your PDF content. Review the first 10 lines to ensure proper extraction.
        </p>
      </div>

      {/* File Info */}
      <div className="flex items-center justify-center space-x-3 mb-6 p-4 bg-education-primary/10 rounded-xl border border-education-primary/20">
        <FileText className="w-5 h-5 text-education-primary" />
        <span className="font-medium text-education-primary">{fileName}</span>
        <span className="text-sm text-muted-foreground">
          ({lines.length} lines extracted)
        </span>
      </div>

      {/* Preview Content */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-education-primary rounded-full"></div>
          <span>First 10 Lines Preview</span>
        </h3>
        
        <Card className="bg-secondary/50 border border-border/50">
          <ScrollArea className="h-64 p-6">
            <div className="space-y-2 font-mono text-sm">
              {previewLines.map((line, index) => (
                <div key={index} className="flex space-x-4">
                  <span className="text-education-primary font-bold w-8 text-right">
                    {index + 1}.
                  </span>
                  <span className="text-foreground flex-1">
                    {line || '(empty line)'}
                  </span>
                </div>
              ))}
              {lines.length > 10 && (
                <div className="flex space-x-4 mt-4 pt-4 border-t border-border/50">
                  <span className="text-muted-foreground font-bold w-8 text-right">
                    ...
                  </span>
                  <span className="text-muted-foreground italic">
                    + {lines.length - 10} more lines available
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Different File</span>
        </Button>

        <Button
          onClick={onContinue}
          className="bg-gradient-primary hover:opacity-90 text-white shadow-button-education flex items-center space-x-2"
        >
          <span>Continue to Questions</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-education-primary">
            {content.split(' ').length}
          </div>
          <div className="text-sm text-muted-foreground">Words</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-education-accent">
            {lines.length}
          </div>
          <div className="text-sm text-muted-foreground">Lines</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-education-success">
            {content.length}
          </div>
          <div className="text-sm text-muted-foreground">Characters</div>
        </div>
      </div>
    </Card>
  );
};