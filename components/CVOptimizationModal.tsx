import React, { useState } from 'react';
import { TailoredResume, TargetRole } from '../types';
import { Button } from './Button';
import { optimizeTailoredResume } from '../services/geminiService';

interface CVOptimizationModalProps {
  currentResume: TailoredResume;
  targetRole: TargetRole;
  jobDescriptionContext: string;
  onSave: (newResume: TailoredResume) => void;
  onClose: () => void;
}

export const CVOptimizationModal: React.FC<CVOptimizationModalProps> = ({
  currentResume,
  targetRole,
  jobDescriptionContext,
  onSave,
  onClose
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!prompt.trim()) {
      setError("Please enter an optimization request.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const updatedResume = await optimizeTailoredResume(
        currentResume,
        prompt,
        jobDescriptionContext,
        targetRole
      );
      onSave(updatedResume);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to optimize CV. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Optimization
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Ask Gemini to refine, shorten, or enhance specific sections of your tailored CV.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Your Request</label>
            <textarea 
              className="w-full h-32 bg-neutral-950 border border-neutral-800 p-4 text-sm text-neutral-200 focus:outline-none focus:border-purple-500/50 focus:ring-0 transition-colors resize-none placeholder-neutral-600"
              placeholder="e.g., 'Make the summary shorter and punchier', 'Add a bullet point about Kubernetes to my Maxex role', 'Focus more on AWS security in the skills section'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900 text-red-200 text-sm rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3 rounded-b-lg">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleOptimize} 
            disabled={isProcessing || !prompt.trim()}
            className="!bg-purple-600 hover:!bg-purple-700 !text-white !border-none"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Optimizing...
              </span>
            ) : "Optimize CV"}
          </Button>
        </div>

      </div>
    </div>
  );
};
