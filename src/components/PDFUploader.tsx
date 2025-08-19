import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { callSupabaseFunction } from '@/lib/supabase';

interface PDFUploaderProps {
  onFileUpload: (file: File, content: string) => void;
}

export const PDFUploader = ({ onFileUpload }: PDFUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const processPDF = async (file: File): Promise<string> => {
    try {
      setProgress(25);
      
      // Convert file to base64
      const fileData = await fileToBase64(file);
      setProgress(50);

      // Call Supabase Edge Function to extract PDF text using PDF.co
      const result = await callSupabaseFunction('extract-pdf-text', {
        fileData,
        fileName: file.name
      });

      setProgress(75);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process PDF');
      }

      setProgress(100);
      
      return result.text || `Unable to extract text from ${file.name}. Please ensure the PDF contains selectable text.`;
    } catch (error) {
      console.error('PDF processing error:', error);
      
      // Provide more helpful error messages in development
      if (import.meta.env.DEV) {
        if (error.message.includes('Failed to send a request to the Edge Function')) {
          throw new Error('Development mode: Supabase functions not deployed. Using local processing instead.');
        }
        
        // Show specific PDF.co API errors
        if (error.message.includes('PDF.co')) {
          throw new Error(error.message);
        }
      }
      
      throw new Error('Failed to process PDF. Please try again.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a PDF file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const content = await processPDF(file);
      onFileUpload(file, content);
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to process the PDF file. Please try again.';
      
      if (error.message.includes('PDF.co')) {
        errorMessage = error.message;
      } else if (error.message.includes('Failed to process PDF')) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <Card className="p-8 bg-card/70 backdrop-blur-sm border-border/50 shadow-card-education">
      <div className="text-center mb-8">
        <div className="bg-gradient-primary p-4 rounded-2xl w-fit mx-auto mb-4 shadow-button-education">
          <FileText className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Upload Your PDF</h2>
        <p className="text-muted-foreground">
          Drop your PDF file here or click to browse. We'll extract the content and create interactive questions.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer ${
          isDragActive
            ? 'border-education-primary bg-education-primary/10 shadow-glow'
            : 'border-border hover:border-education-primary hover:bg-education-primary/5'
        } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="text-center">
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-education-primary border-t-transparent rounded-full mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-education-primary">Processing PDF...</p>
                <Progress value={progress} className="max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {progress < 25 && "Reading file..."}
                  {progress >= 25 && progress < 50 && "Extracting text..."}
                  {progress >= 50 && progress < 75 && "Analyzing content..."}
                  {progress >= 75 && "Finalizing..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-16 h-16 text-education-primary mx-auto" />
              <div>
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop your PDF here!' : 'Drag & drop your PDF file here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select from your computer
                </p>
                <Button variant="outline" size="lg" className="pointer-events-none">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>Max 10MB</span>
        </div>
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>PDF files only</span>
        </div>
      </div>
    </Card>
  );
};