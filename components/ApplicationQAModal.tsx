import React, { useState, useEffect } from 'react';
import { TargetRole, ResumeData, TECHNICAL_ROLES, GRC_ROLES, FINANCIAL_CRIME_ROLES } from '../types';
import { Button } from './Button';
import { generateApplicationAnswer } from '../services/geminiService';

interface ApplicationQAModalProps {
  baseProfile: ResumeData;
  initialRole: TargetRole;
  jobDescriptionContext?: string;
  jobLinkContext?: string;
  onClose: () => void;
}

export const ApplicationQAModal: React.FC<ApplicationQAModalProps> = ({ 
  baseProfile, 
  initialRole, 
  jobDescriptionContext, 
  jobLinkContext,
  onClose 
}) => {
  const [step, setStep] = useState<'input' | 'output'>('input');
  const [question, setQuestion] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>(initialRole);
  const [wordLimit, setWordLimit] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [metadata, setMetadata] = useState<{intent: string, note: string} | null>(null);
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Update word count whenever generated answer changes (including edits)
  useEffect(() => {
    const count = generatedAnswer.trim().length === 0 ? 0 : generatedAnswer.trim().split(/\s+/).length;
    setCurrentWordCount(count);
  }, [generatedAnswer]);

  const handleGenerate = async () => {
    if (!question.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const limit = wordLimit ? parseInt(wordLimit) : undefined;
      const result = await generateApplicationAnswer(
        question, 
        targetRole, 
        baseProfile, 
        limit, 
        jobDescriptionContext,
        jobLinkContext
      );
      
      setGeneratedAnswer(result.generated_answer);
      setMetadata({
        intent: result.intent_detected,
        note: result.confidence_note
      });
      setStep('output');
    } catch (e: any) {
      setError(e?.message || "Failed to generate answer. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStep('input');
    setQuestion('');
    setMetadata(null);
    setGeneratedAnswer('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Application Q&A Assistant
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Generate tailored, plain-text answers for application portals (Workday, Greenhouse).
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-neutral-950">
          
          {step === 'input' && (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-900 text-red-200 text-sm rounded">
                  {error}
                </div>
              )}
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Target Role Strategy</label>
                <select 
                  value={targetRole} 
                  onChange={(e) => setTargetRole(e.target.value as TargetRole)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-white focus:outline-none focus:border-neutral-600"
                >
                  <optgroup label="Technical Roles (Engineering / Cloud)">
                    {TECHNICAL_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Governance Roles (GRC / Risk / Compliance)">
                    {GRC_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Financial Crime & Investigation Operations Roles">
                    {FINANCIAL_CRIME_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Question Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Application Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Paste the question exactly as it appears (e.g., 'Describe your experience with cloud identity...')"
                  className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded p-4 text-sm text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-600 resize-none"
                />
              </div>

              {/* Limits */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Word Limit (Optional)</label>
                <input
                  type="number"
                  value={wordLimit}
                  onChange={(e) => setWordLimit(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
                />
              </div>
            </div>
          )}

          {step === 'output' && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Metadata Banner */}
              <div className="bg-neutral-900 border border-neutral-800 rounded p-3 flex justify-between items-center text-xs">
                <div className="flex gap-4">
                    <span className="text-neutral-400">Intent: <span className="text-purple-300 font-medium">{metadata?.intent}</span></span>
                    <span className="text-neutral-400">Limit: <span className="text-white">{wordLimit || 'None'}</span></span>
                </div>
                <div className={`${currentWordCount > (parseInt(wordLimit) || 9999) ? 'text-red-400' : 'text-green-400'} font-mono`}>
                    {currentWordCount} words
                </div>
              </div>

              {/* Answer Output */}
              <div className="flex-1 relative">
                <textarea
                  value={generatedAnswer}
                  onChange={(e) => setGeneratedAnswer(e.target.value)}
                  className="w-full h-full min-h-[300px] bg-[#1e1e1e] border border-neutral-800 rounded p-4 text-sm text-neutral-300 font-sans leading-relaxed focus:outline-none focus:border-neutral-600 resize-none"
                  spellCheck={false}
                />
                <div className="absolute bottom-4 right-4 text-[10px] text-neutral-600 bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                  Plain Text • ATS Optimized
                </div>
              </div>

              {/* Confidence Note */}
              {metadata?.note && (
                  <div className="text-xs text-neutral-500 italic px-1">
                      Note: {metadata.note}
                  </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center rounded-b-lg">
          {step === 'input' ? (
             <>
               <Button variant="outline" onClick={onClose}>Cancel</Button>
               <Button 
                onClick={handleGenerate} 
                disabled={!question.trim() || isGenerating}
                className="min-w-[140px]"
               >
                 {isGenerating ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Thinking...
                    </span>
                 ) : "Generate Answer"}
               </Button>
             </>
          ) : (
             <>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleReset}>New Question</Button>
               </div>
               <div className="flex gap-2">
                   <Button variant="secondary" onClick={onClose}>Close</Button>
                   <Button onClick={handleCopy} className={copied ? "!bg-green-600 !text-white" : ""}>
                       {copied ? "Copied" : "Copy to Clipboard"}
                   </Button>
               </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
};