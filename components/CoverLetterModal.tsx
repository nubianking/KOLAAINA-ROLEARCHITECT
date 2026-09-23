import React, { useState } from 'react';
import { TargetRole, ResumeData, TECHNICAL_ROLES, GRC_ROLES, FINANCIAL_CRIME_ROLES } from '../types';
import { Button } from './Button';
import { generateCoverLetter } from '../services/geminiService';

interface CoverLetterModalProps {
  baseProfile: ResumeData;
  initialRole: TargetRole;
  jobDescriptionContext?: string;
  onClose: () => void;
}

export const CoverLetterModal: React.FC<CoverLetterModalProps> = ({ 
  baseProfile, 
  initialRole, 
  jobDescriptionContext, 
  onClose 
}) => {
  const [step, setStep] = useState<'input' | 'output'>('input');
  const [companyName, setCompanyName] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>(initialRole);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!companyName.trim()) {
        setError("Please enter a company name.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateCoverLetter(
        companyName,
        hiringManager,
        targetRole, 
        baseProfile, 
        jobDescriptionContext
      );
      
      setContent(result.content);
      setStep('output');
    } catch (e: any) {
      setError(e?.message || "Failed to generate cover letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${companyName.replace(/\s+/g, '_')}_CoverLetter.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Cover Letter Architect
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Generate an executive-level cover letter tailored to the job description and role.
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

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Company Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google Cloud"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Hiring Manager (Optional)</label>
                    <input
                      type="text"
                      value={hiringManager}
                      onChange={(e) => setHiringManager(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
                    />
                  </div>
              </div>

              {jobDescriptionContext && (
                  <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded text-xs text-neutral-400">
                      <span className="font-bold text-green-500">✓ Context Active:</span> Creating letter based on the Job Description from the main dashboard.
                  </div>
              )}
            </div>
          )}

          {step === 'output' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1 relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-[#1e1e1e] border border-neutral-800 rounded p-6 text-sm text-neutral-300 font-sans leading-relaxed focus:outline-none focus:border-neutral-600 resize-none whitespace-pre-wrap"
                  spellCheck={false}
                />
              </div>
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
                disabled={!companyName.trim() || isGenerating}
                className="min-w-[140px]"
               >
                 {isGenerating ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Writing...
                    </span>
                 ) : "Generate Letter"}
               </Button>
             </>
          ) : (
             <>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setStep('input')}>Edit Details</Button>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleDownloadTxt}>Download .TXT</Button>
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