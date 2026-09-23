import React, { useState, useRef } from 'react';
import { ResumeData } from '../types';
import { Button } from './Button';
import { BASE_RESUME } from '../constants';
import { parseResumeFromText } from '../services/geminiService';

interface ProfileEditorProps {
  currentData: ResumeData;
  onSave: (data: ResumeData) => void;
  onClose: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ currentData, onSave, onClose }) => {
  const [jsonContent, setJsonContent] = useState(JSON.stringify(currentData, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(e.target.value);
    setError(null);
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  // Saves and closes
  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      // Basic validation to check if it looks like a resume
      if (!parsed.experience || !Array.isArray(parsed.experience)) {
        throw new Error("Invalid format: Missing 'experience' array.");
      }
      onSave(parsed);
      onClose();
    } catch (err: any) {
      setError("Invalid JSON format: " + err.message);
    }
  };

  // Saves without closing
  const handleQuickSave = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.experience || !Array.isArray(parsed.experience)) {
        throw new Error("Invalid format: Missing 'experience' array.");
      }
      onSave(parsed);
      setSaveStatus('saved');
      setError(null);
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError("Cannot save invalid JSON: " + err.message);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset to the original demo profile?")) {
      setJsonContent(JSON.stringify(BASE_RESUME, null, 2));
      setError(null);
      setSaveStatus('idle');
    }
  };

  const handleDownloadJson = () => {
    try {
      // Validate before downloading
      JSON.parse(jsonContent);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `role_architect_profile_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Cannot download invalid JSON. Please fix syntax errors first.");
    }
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractPdfText(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await extractDocxText(file);
      } else if (file.type === 'application/json') {
         // Existing JSON logic
         const text = await file.text();
         const parsed = JSON.parse(text);
         setJsonContent(JSON.stringify(parsed, null, 2));
         setIsProcessing(false);
         if (fileInputRef.current) fileInputRef.current.value = '';
         return;
      } else {
         // Fallback for text files
         extractedText = await file.text();
      }

      // If we extracted text (PDF/DOCX/TXT), use AI to structure it
      if (extractedText) {
        const structuredData = await parseResumeFromText(extractedText);
        setJsonContent(JSON.stringify(structuredData, null, 2));
      }

    } catch (err: any) {
      console.error(err);
      setError("Failed to process file. Ensure it is a valid PDF, DOCX, or JSON file. " + err.message);
    } finally {
      setIsProcessing(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Base Profile</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Modify the source data used for tailoring. Import your existing resume or edit manually.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-neutral-950 border-b border-neutral-800 flex gap-3 items-center flex-wrap">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".json,.pdf,.docx,.txt" 
                onChange={handleFileUpload}
            />
            <Button 
                variant="secondary" 
                className={`!py-2 !px-3 !text-xs ${saveStatus === 'saved' ? '!text-green-400 !border-green-900/50 !bg-green-900/10' : ''}`}
                onClick={handleQuickSave}
                disabled={isProcessing}
                icon={saveStatus === 'saved' ? 
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : 
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                }
            >
                {saveStatus === 'saved' ? 'Saved' : 'Save'}
            </Button>
            <div className="w-px h-6 bg-neutral-800 mx-1"></div>
            <Button 
                variant="secondary" 
                className="!py-2 !px-3 !text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            >
                {isProcessing ? 'Parsing...' : 'Import'}
            </Button>
            <Button
                variant="secondary"
                className="!py-2 !px-3 !text-xs"
                onClick={handleDownloadJson}
                disabled={isProcessing}
                icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            >
                Download JSON
            </Button>
            <Button 
                variant="outline" 
                className="!py-2 !px-3 !text-xs !border-neutral-700 hover:!bg-red-900/20 hover:!border-red-800 hover:!text-red-400"
                onClick={handleReset}
                disabled={isProcessing}
            >
                Reset
            </Button>
            <div className="ml-auto text-xs text-neutral-500 font-mono">
                {isProcessing ? <span className="text-blue-400 animate-pulse">AI Parsing in progress...</span> : 'JSON Mode'}
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-0 relative">
          <textarea
            value={jsonContent}
            onChange={handleJsonChange}
            spellCheck={false}
            readOnly={isProcessing}
            className={`w-full h-full bg-[#1e1e1e] text-neutral-300 font-mono text-xs p-6 resize-none focus:outline-none focus:ring-0 leading-relaxed custom-scrollbar ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center">
          <div className="text-red-400 text-sm font-medium">
            {error && <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>Close</Button>
            <Button onClick={handleSave} disabled={isProcessing}>Save & Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};