import React, { useState, useEffect } from 'react';
import { TargetRole, TailoredResume, HistoryItem, ResumeData, TECHNICAL_ROLES, GRC_ROLES, FINANCIAL_CRIME_ROLES } from './types';
import { generateTailoredResume } from './services/geminiService';
import { 
  loadHistoryFromStorage, 
  saveHistoryToStorage, 
  loadProfileFromStorage, 
  saveProfileToStorage 
} from './services/storageService';
import { TailoredView } from './components/TailoredView';
import { HistoryPanel } from './components/HistoryPanel';
import { Button } from './components/Button';
import { ProfileEditor } from './components/ProfileEditor';
import { ApplicationQAModal } from './components/ApplicationQAModal';
import { CoverLetterModal } from './components/CoverLetterModal';
import { GuideModal } from './components/GuideModal';
import { LoginPage } from './components/LoginPage';
import { CVOptimizationModal } from './components/CVOptimizationModal';
import { BASE_RESUME } from './constants';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('role_architect_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [targetRole, setTargetRole] = useState<TargetRole>(TargetRole.CLOUD_SECURITY);
  const [jobDescription, setJobDescription] = useState('');
  const [jobLink, setJobLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TailoredResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Base Profile State (Load safely from local storage or default)
  const [baseProfile, setBaseProfile] = useState<ResumeData>(() => loadProfileFromStorage());

  // History State (Load safely capped to 20 items)
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistoryFromStorage());

  // Save history whenever it changes (with automatic capping & quota protection)
  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  // Save profile whenever it changes
  useEffect(() => {
    saveProfileToStorage(baseProfile);
  }, [baseProfile]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('role_architect_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('role_architect_auth');
    // Clear sensitive state on logout
    setResult(null);
    setJobDescription('');
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Pass the current baseProfile to the generator
      const tailoredData = await generateTailoredResume(jobDescription, targetRole, baseProfile, jobLink);
      setResult(tailoredData);
      
      // Save to History (capped to 20)
      const newItem: HistoryItem = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        timestamp: Date.now(),
        targetRole,
        jobDescription,
        jobLink,
        tailoredResume: tailoredData
      };
      
      setHistory(prev => [newItem, ...prev].slice(0, 20));
      
    } catch (err: any) {
      setError(err?.message || "Failed to generate resume. Please check your API Key and try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    setResult(null);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (!item) return;
    if (item.targetRole) setTargetRole(item.targetRole);
    setJobDescription(item.jobDescription || '');
    setJobLink(item.jobLink || '');
    if (item.tailoredResume) {
      setResult({
        summary: item.tailoredResume.summary || '',
        skills: Array.isArray(item.tailoredResume.skills) ? item.tailoredResume.skills : [],
        certifications: Array.isArray(item.tailoredResume.certifications) ? item.tailoredResume.certifications : [],
        experience: Array.isArray(item.tailoredResume.experience)
          ? item.tailoredResume.experience.map(exp => ({
              company: exp?.company || '',
              role: exp?.role || '',
              duration: exp?.duration || '',
              bullets: Array.isArray(exp?.bullets) ? exp.bullets : []
            }))
          : [],
        analysis: {
          matchScore: typeof item.tailoredResume.analysis?.matchScore === 'number' ? item.tailoredResume.analysis.matchScore : 0,
          keywordsUsed: Array.isArray(item.tailoredResume.analysis?.keywordsUsed) ? item.tailoredResume.analysis.keywordsUsed : [],
          toneNotes: item.tailoredResume.analysis?.toneNotes || ''
        }
      });
    }
  };

  const handleDeleteItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history logs? This action cannot be undone.")) {
      setHistory([]);
    }
  };

  // Render Login Page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-white selection:bg-white selection:text-black font-sans">
      
      {/* Left Panel: Controls & History */}
      <div className={`flex flex-col border-r border-neutral-800 transition-all duration-500 ease-in-out ${result ? 'w-1/3' : 'w-full max-w-4xl mx-auto border-r-0'} print:hidden`}>
        
        {/* Logo / Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter mb-2">RoleArchitect</h1>
            <p className="text-neutral-400 text-sm">
              Sophisticated resume engineering for Cloud & Security professionals.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowGuide(true)}
              className="text-neutral-500 hover:text-white transition-colors p-2"
              title="How it Works"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-400 transition-colors p-2"
              title="Logout"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-8 flex gap-6 border-b border-neutral-800 mb-6">
          <button 
            onClick={() => setActiveTab('create')}
            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'create' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            New Application
            {activeTab === 'create' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            History & Logs
            {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></span>}
          </button>
        </div>

        {/* Tab Content: CREATE */}
        {activeTab === 'create' && (
          <>
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 scrollbar-hide">
              
              {/* Tools Section */}
              <div className="grid grid-cols-2 gap-4">
                  {/* Tool: Application Q&A */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Application Q&A
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Generate answers for HR portals.</p>
                    </div>
                    <Button variant="secondary" className="w-full !py-1.5 !px-3 !text-xs" onClick={() => setShowQAModal(true)}>
                      Open Assistant
                    </Button>
                  </div>

                  {/* Tool: Cover Letter */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Cover Letter
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Create tailored executive letters.</p>
                    </div>
                    <Button variant="secondary" className="w-full !py-1.5 !px-3 !text-xs" onClick={() => setShowCoverLetterModal(true)}>
                      Open Writer
                    </Button>
                  </div>
              </div>

              {/* Base Profile Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Base Profile</label>
                    <button 
                        onClick={() => setShowProfileEditor(true)} 
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                        Edit / Upload Source
                    </button>
                </div>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-300">
                        {baseProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-white">{baseProfile.name}</div>
                      <div className="text-xs text-neutral-500">{baseProfile.experience.length} Roles Identified</div>
                    </div>
                  </div>
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    ● Active
                  </span>
                </div>
              </div>

              {/* Role Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Target Role</label>
                <div className="relative">
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as TargetRole)}
                    className="w-full appearance-none bg-neutral-900 border border-neutral-800 text-neutral-200 p-4 pr-10 text-sm focus:outline-none focus:border-white focus:ring-0 transition-colors cursor-pointer hover:border-neutral-600"
                  >
                    <optgroup label="Technical Roles (Engineering / Cloud)">
                      {TECHNICAL_ROLES.map((role) => (
                        <option key={role} value={role} className="bg-neutral-900 text-white">
                          {role}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Governance Roles (GRC / Risk / Compliance)">
                      {GRC_ROLES.map((role) => (
                        <option key={role} value={role} className="bg-neutral-900 text-white">
                          {role}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Financial Crime & Investigation Operations Roles">
                      {FINANCIAL_CRIME_ROLES.map((role) => (
                        <option key={role} value={role} className="bg-neutral-900 text-white">
                          {role}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

               {/* Job Link Input */}
               <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Job Link (Optional)</label>
                <input 
                  type="url"
                  className="w-full bg-neutral-900 border border-neutral-800 p-4 text-sm text-neutral-200 focus:outline-none focus:border-white focus:ring-0 transition-colors placeholder-neutral-600"
                  placeholder="https://linkedin.com/jobs/..."
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                />
              </div>

              {/* Job Description Input */}
              <div className="space-y-3 flex-1">
                <label className="text-xs font-bold text-neutral-500 tracking-widest uppercase">Job Description</label>
                <div className="relative group">
                  <textarea 
                    className="w-full h-48 bg-neutral-900 border border-neutral-800 p-4 text-sm text-neutral-200 focus:outline-none focus:border-white focus:ring-0 transition-colors resize-none placeholder-neutral-600"
                    placeholder="Paste the full job advertisement here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-neutral-600">
                    Semantic Parsing Active
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-900 text-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-8 pt-4 border-t border-neutral-800 bg-black">
              <Button 
                className="w-full" 
                onClick={handleGenerate} 
                disabled={isGenerating || !jobDescription}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Architecture...
                  </span>
                ) : "Generate Tailored Resume"}
              </Button>
            </div>
          </>
        )}

        {/* Tab Content: HISTORY */}
        {activeTab === 'history' && (
          <HistoryPanel 
            history={history}
            onLoad={loadHistoryItem}
            onDelete={handleDeleteItem}
            onClear={handleClearHistory}
          />
        )}
      </div>

      {/* Right Panel: Result (Only visible when result exists) */}
      {result && (
        <div className="flex-1 h-full relative">
          <TailoredView 
            data={result} 
            role={targetRole}
            candidateName={baseProfile.name}
            contactInfo={baseProfile.contact}
            onBack={handleBack} 
            onOpenQA={() => setShowQAModal(true)}
            onOpenOptimize={() => setShowOptimizeModal(true)}
          />
        </div>
      )}
      
      {/* Right Panel: Placeholder (Only visible when NO result) */}
      {!result && (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-neutral-950 opacity-50 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="text-center p-12">
            <div className="w-24 h-24 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-700">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-medium text-neutral-400 mb-2">Ready to Engineer</h3>
            <p className="text-neutral-600 max-w-sm mx-auto">
              Select a target role and provide a job description to initiate the experience recomposition engine.
            </p>
          </div>
        </div>
      )}
    
      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor 
            currentData={baseProfile} 
            onSave={(newData) => setBaseProfile(newData)} 
            onClose={() => setShowProfileEditor(false)} 
        />
      )}

      {/* Application Q&A Modal */}
      {showQAModal && (
        <ApplicationQAModal 
          baseProfile={baseProfile}
          initialRole={targetRole}
          jobDescriptionContext={jobDescription}
          jobLinkContext={jobLink}
          onClose={() => setShowQAModal(false)}
        />
      )}

      {/* Cover Letter Modal */}
      {showCoverLetterModal && (
        <CoverLetterModal
          baseProfile={baseProfile}
          initialRole={targetRole}
          jobDescriptionContext={jobDescription}
          onClose={() => setShowCoverLetterModal(false)}
        />
      )}

      {/* Optimization Modal */}
      {showOptimizeModal && result && (
        <CVOptimizationModal
          currentResume={result}
          targetRole={targetRole}
          jobDescriptionContext={jobDescription}
          onSave={(newResume) => {
            setResult(newResume);
            // Also update the history item
            setHistory(prev => {
              const newHistory = [...prev];
              if (newHistory.length > 0) {
                newHistory[0].tailoredResume = newResume;
              }
              return newHistory;
            });
          }}
          onClose={() => setShowOptimizeModal(false)}
        />
      )}
      
      {/* Guide Modal (Read Me) */}
      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}

    </div>
  );
};

export default App;