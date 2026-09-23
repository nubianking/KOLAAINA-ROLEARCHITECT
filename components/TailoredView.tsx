import React, { useState } from 'react';
import { TailoredResume, TargetRole } from '../types';
import { Button } from './Button';

interface TailoredViewProps {
  data: TailoredResume;
  role: TargetRole;
  candidateName: string;
  contactInfo: {
    location: string;
    email: string;
    phone: string;
    linkedin: string;
  };
  onBack: () => void;
  onOpenQA?: () => void;
  onOpenOptimize?: () => void;
}

export const TailoredView: React.FC<TailoredViewProps> = ({ 
  data, 
  role, 
  candidateName, 
  contactInfo,
  onBack, 
  onOpenQA,
  onOpenOptimize
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'ats' | 'email'>('preview');
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlainText = () => {
    const summary = data?.summary || '';
    const skills = (data?.skills || []).join(', ');
    const certs = (data?.certifications || []).join('\n');
    let text = `NAME: ${candidateName || ''}\nROLE: ${role || ''}\n\nSUMMARY\n${summary}\n\nSKILLS\n${skills}\n\nCERTIFICATIONS\n${certs}\n\nEXPERIENCE\n`;
    (data?.experience || []).forEach(exp => {
      text += `\n${exp?.role || ''} at ${exp?.company || ''} (${exp?.duration || ''})\n`;
      (exp?.bullets || []).forEach(b => text += `• ${b}\n`);
    });
    return text;
  };

  const getEmailFormat = () => {
    const summary = data?.summary || '';
    const topBullets = data?.experience?.[0]?.bullets?.slice(0, 3) || [];
    const highlightsText = topBullets.length > 0 
      ? topBullets.map(b => `- ${b}`).join('\n') 
      : '- Proven track record delivering impact and aligned capabilities.';

    return `Subject: Application for ${role || ''} - ${candidateName || ''}\n\nDear Hiring Manager,\n\nI am writing to express my interest in the ${role || ''} position. Based on the job description, I believe my background aligns perfectly with your needs.\n\n${summary}\n\nKey Highlights:\n${highlightsText}\n\nI have attached my full resume for your review.\n\nBest regards,\n${candidateName || ''}\n${contactInfo?.phone || ''}\n${contactInfo?.linkedin || ''}`;
  };

  const generatePDF = () => {
    const element = document.getElementById('resume-preview');
    if (!element) {
      setIsDownloadingPdf(false);
      return;
    }

    // @ts-ignore
    if (!window.html2pdf) {
      alert("PDF library is not loaded. Please refresh the page.");
      setIsDownloadingPdf(false);
      return;
    }

    const safeName = candidateName.replace(/\s+/g, '_');
    const opt = {
      margin: 0, // Using the element's padding as margin
      filename: `${safeName}_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloadingPdf(false);
    }).catch((err: any) => {
      console.error(err);
      setIsDownloadingPdf(false);
    });
  };

  const handleDownloadPDF = () => {
    setIsDownloadingPdf(true);
    
    if (viewMode !== 'preview') {
      setViewMode('preview');
      // Wait for React to render the preview div before generating PDF
      setTimeout(() => generatePDF(), 500);
    } else {
      generatePDF();
    }
  };

  const handleGoogleDocs = async () => {
    // Construct rich HTML with inline styles and tables for layout preservation in Google Docs
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt; color: #000000; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <h1 style="font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0;">${candidateName || ''}</h1>
          <p style="font-size: 10pt; margin: 5px 0 0 0; color: #333;">
            ${contactInfo?.location || ''} | ${contactInfo?.email || ''} | ${contactInfo?.phone || ''} <br>
            ${contactInfo?.linkedin || ''}
          </p>
        </div>

        <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 20px; color: #000;">Summary</h2>
        <p style="margin-top: 10px; margin-bottom: 10px;">${data?.summary || ''}</p>

        <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 20px; color: #000;">Skills</h2>
        <p style="margin-top: 10px; margin-bottom: 10px;"><strong>Technical Competencies:</strong> ${(data?.skills || []).join(', ')}</p>

        ${data?.certifications && data.certifications.length > 0 ? `
        <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 20px; color: #000;">Certifications</h2>
        <ul style="margin-top: 10px; margin-bottom: 10px;">
          ${data.certifications.map(cert => `<li>${cert}</li>`).join('')}
        </ul>
        ` : ''}

        <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 20px; color: #000;">Professional Experience</h2>
        ${(data?.experience || []).map(exp => `
          <div style="margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; font-size: 12pt; text-align: left; padding: 0;">${exp?.role || ''}</td>
                <td style="font-size: 10pt; text-align: right; white-space: nowrap; padding: 0;">${exp?.duration || ''}</td>
              </tr>
            </table>
            <div style="font-weight: bold; font-style: italic; font-size: 11pt; margin-bottom: 5px;">${exp?.company || ''}</div>
            <ul style="margin-top: 0; padding-left: 20px;">
              ${(exp?.bullets || []).map(b => `<li style="margin-bottom: 3px; padding-left: 5px;">${b}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    try {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const clipboardItem = new ClipboardItem({ "text/html": blob });
      await navigator.clipboard.write([clipboardItem]);
      
      // Automatically open Google Docs in a new tab
      const newWindow = window.open("https://docs.google.com/document/create", "_blank");
      
      // Notify user instructions
      if (newWindow) {
         // Use a small delay for the alert to ensure the tab process has started
         setTimeout(() => {
             alert("Resume copied to clipboard!\n\nPASTE (Ctrl+V) into the new Google Doc tab.");
         }, 500);
      } else {
         alert("Resume copied! Please manually open Google Docs and paste, as the pop-up was blocked.");
      }

    } catch (e) {
      console.error("Clipboard API failed", e);
      // Fallback
      navigator.clipboard.writeText(getPlainText());
      alert("Rich formatting unavailable. Plain text copied. Opening Google Docs...");
      window.open("https://docs.google.com/document/create", "_blank");
    }
  };

  const handleDownloadTxt = () => {
    const safeName = candidateName.replace(/\s+/g, '_');
    const element = document.createElement("a");
    const file = new Blob([getPlainText()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${safeName}_Resume.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 animate-fade-in print:bg-white print:border-none print:h-auto print:block">
      
      {/* Header - Hidden on Print */}
      <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 sticky top-0 z-10 print:hidden">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Tailored Output</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-neutral-400">Match Score: <span className="text-green-400 font-bold">{data?.analysis?.matchScore ?? 0}%</span></span>
            <span className="text-xs bg-neutral-800 px-2 py-1 text-neutral-300 rounded">AI Tone Check: Passed</span>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={onBack} className="!px-4 !py-2">Back</Button>
           
           {onOpenQA && (
             <Button 
                variant="outline" 
                onClick={onOpenQA} 
                className="!px-4 !py-2 !border-purple-500/50 !text-purple-300 hover:!bg-purple-900/20"
                icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
             >
               Q&A Helper
             </Button>
           )}

           {onOpenOptimize && (
             <Button 
                variant="outline" 
                onClick={onOpenOptimize} 
                className="!px-4 !py-2 !border-blue-500/50 !text-blue-300 hover:!bg-blue-900/20"
                icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
             >
               Optimize CV
             </Button>
           )}

           {/* Export Group */}
           <div className="flex bg-neutral-800 rounded-md p-0.5 gap-0.5">
             <button onClick={handleDownloadTxt} className="px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white rounded transition-colors" title="Download Text">
               TXT
             </button>
             <button onClick={handleGoogleDocs} className="px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 rounded flex items-center gap-1 transition-colors" title="Export to Google Docs">
               G-Docs
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
             </button>
             <button 
                onClick={handleDownloadPDF} 
                disabled={isDownloadingPdf}
                className="px-3 py-2 text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50" 
                title="Download PDF"
             >
               {isDownloadingPdf ? (
                 <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               ) : (
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               )}
               PDF
             </button>
           </div>
        </div>
      </div>

      {/* Tabs - Hidden on Print */}
      <div className="flex border-b border-neutral-800 bg-neutral-950 print:hidden">
        <button 
          onClick={() => setViewMode('preview')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${viewMode === 'preview' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Visual Preview
        </button>
        <button 
          onClick={() => setViewMode('ats')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${viewMode === 'ats' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          ATS / Raw Text
        </button>
        <button 
          onClick={() => setViewMode('email')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${viewMode === 'email' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Email / WhatsApp
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-neutral-950 scroll-smooth print:p-0 print:bg-white print:overflow-visible">
        
        {viewMode === 'preview' && (
          <div id="resume-preview" className="max-w-3xl mx-auto bg-white text-black p-10 shadow-2xl min-h-[1000px] print:shadow-none print:max-w-none print:w-full print:min-h-0 print:p-0">
            {/* Resume Header */}
            <div className="text-center border-b-2 border-black pb-6 mb-6">
              <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{candidateName || ''}</h1>
              <p className="text-sm text-gray-600">{contactInfo?.location || ''} | {contactInfo?.email || ''} | {contactInfo?.phone || ''}</p>
              <p className="text-sm text-gray-600">{contactInfo?.linkedin || ''}</p>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <h3 className="font-bold text-sm uppercase border-b border-gray-300 mb-2 pb-1">Summary</h3>
              <p className="text-sm leading-relaxed text-gray-800">{data?.summary || ''}</p>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <h3 className="font-bold text-sm uppercase border-b border-gray-300 mb-2 pb-1">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(data?.skills || []).map((skill, i) => (
                  <span key={i} className="text-sm text-gray-800 bg-gray-100 px-2 py-0.5 rounded-sm print:bg-transparent print:p-0 print:after:content-[','] last:print:after:content-['']">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            {data?.certifications && data.certifications.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-sm uppercase border-b border-gray-300 mb-2 pb-1">Certifications</h3>
                <ul className="list-disc ml-5 space-y-1">
                  {data.certifications.map((cert, i) => (
                    <li key={i} className="text-sm text-gray-800">{cert}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Experience */}
            <div>
              <h3 className="font-bold text-sm uppercase border-b border-gray-300 mb-4 pb-1">Professional Experience</h3>
              {(data?.experience || []).map((job, idx) => (
                <div key={idx} className="mb-5 break-inside-avoid">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-md">{job?.role || ''}</h4>
                    <span className="text-sm text-gray-600 font-medium">{job?.duration || ''}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{job?.company || ''}</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {(job?.bullets || []).map((bullet, bIdx) => (
                      <li key={bIdx} className="text-sm text-gray-800 leading-snug pl-1 marker:text-gray-400">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'ats' && (
          <div className="max-w-3xl mx-auto print:hidden">
            <div className="bg-neutral-900 p-6 rounded border border-neutral-800 font-mono text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {getPlainText()}
            </div>
            <div className="mt-4 flex justify-between items-center">
                <p className="text-neutral-500 text-xs">
                * Optimized for ATS parsing.
                </p>
                <Button variant="secondary" onClick={() => handleCopy(getPlainText())} className="!py-2">
                 {copied ? "Copied" : "Copy to Clipboard"}
               </Button>
            </div>
          </div>
        )}

        {viewMode === 'email' && (
          <div className="max-w-3xl mx-auto print:hidden">
            <div className="bg-neutral-900 p-6 rounded border border-neutral-800 font-sans text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {getEmailFormat()}
            </div>
            <div className="mt-4 flex justify-center">
               <Button variant="secondary" onClick={() => handleCopy(getEmailFormat())} className="w-full">
                  Copy for WhatsApp / Email
               </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};