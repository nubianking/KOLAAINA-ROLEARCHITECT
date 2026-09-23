import React from 'react';
import { Button } from './Button';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 rounded-t-lg">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-neutral-800 rounded">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Operational Manual</h2>
                <p className="text-xs text-neutral-400">Standard Operating Procedures for RoleArchitect</p>
             </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-neutral-900 text-neutral-300 space-y-8 scrollbar-hide">
            
            {/* Step 1 */}
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 border border-blue-900/50 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                    <h3 className="text-white font-bold mb-1">Base Profile Ingestion</h3>
                    <p className="text-sm leading-relaxed text-neutral-400">
                        The engine requires a "Source of Truth". Click <strong>Edit / Upload Source</strong> to manually input your experience or upload an existing PDF/JSON resume. This data serves as the foundation for all generated content.
                    </p>
                </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 border border-blue-900/50 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                    <h3 className="text-white font-bold mb-1">Target Vector Selection</h3>
                    <p className="text-sm leading-relaxed text-neutral-400">
                        Select your <strong>Target Role</strong> (e.g., <em>Cloud Security Engineer</em>). The system alters its tone, vocabulary, and keyword prioritization based on this selection to ensure semantic alignment with industry expectations.
                    </p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 border border-blue-900/50 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                    <h3 className="text-white font-bold mb-1">Context Injection (Job Description)</h3>
                    <p className="text-sm leading-relaxed text-neutral-400">
                        Paste the full text of the Job Description (JD) into the main input field. The AI analyzes this to identify:
                    </p>
                    <ul className="list-disc list-inside text-sm text-neutral-500 mt-2 space-y-1 ml-1">
                        <li>Required Hard Skills (Tools, Platforms).</li>
                        <li>Required Soft Skills (Leadership, Collaboration).</li>
                        <li>Implicit Requirements (Governance, Scale, Velocity).</li>
                    </ul>
                </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/30 text-purple-400 border border-purple-900/50 flex items-center justify-center font-bold text-sm">4</div>
                <div>
                    <h3 className="text-white font-bold mb-1">Generative Tailoring</h3>
                    <p className="text-sm leading-relaxed text-neutral-400">
                        Click <strong>Generate Tailored Resume</strong>. The engine will rewrite your experience bullets to specifically address the JD's requirements, maintaining factual integrity while maximizing relevance score.
                    </p>
                </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 text-green-400 border border-green-900/50 flex items-center justify-center font-bold text-sm">5</div>
                <div>
                    <h3 className="text-white font-bold mb-1">Export & Integration</h3>
                    <p className="text-sm leading-relaxed text-neutral-400">
                        Review the tailored output. You can:
                    </p>
                    <ul className="list-disc list-inside text-sm text-neutral-500 mt-2 space-y-1 ml-1">
                        <li><strong>Export to Google Docs</strong>: Creates a formatted doc ready for final polish.</li>
                        <li><strong>Download PDF</strong>: For quick sharing.</li>
                        <li><strong>ATS / Raw Text</strong>: For copying into rigid application forms.</li>
                    </ul>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950 flex justify-end rounded-b-lg">
          <Button onClick={onClose} className="min-w-[120px]">Close Manual</Button>
        </div>
      </div>
    </div>
  );
};