import React from 'react';
import { HistoryItem } from '../types';
import { Button } from './Button';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history = [], onLoad, onDelete, onClear }) => {
  const formatDate = (ts?: number) => {
    try {
      if (!ts) return 'Unknown date';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
      }).format(new Date(ts));
    } catch {
      return 'Unknown date';
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8 text-center h-full">
        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 text-neutral-700">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-sm font-medium text-neutral-400 mb-1">No history yet</p>
        <p className="text-xs text-neutral-600 max-w-[200px]">Generated resumes will automatically appear here for quick access.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 scrollbar-hide">
        {history.map((item) => {
          const matchScore = item?.tailoredResume?.analysis?.matchScore ?? 0;
          return (
            <div 
              key={item?.id || String(Math.random())} 
              className="group border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-all duration-200 p-5 cursor-pointer relative rounded-sm shadow-sm"
              onClick={() => onLoad(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-white text-sm tracking-wide">{item?.targetRole || 'Tailored Resume'}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item?.id); }}
                  className="text-neutral-600 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2 opacity-0 group-hover:opacity-100"
                  title="Delete this item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <span className="text-xs text-neutral-500 font-mono block mb-3 border-b border-neutral-800 pb-2">{formatDate(item?.timestamp)}</span>
              
              {item?.jobLink && (
                <a 
                  href={item.jobLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline mb-2 flex items-center gap-1.5 w-fit"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  View Job Post
                </a>
              )}

              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                {item?.jobDescription || 'No description provided.'}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Match Score</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${matchScore > 80 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {matchScore}%
                    </span>
                  </div>
                  <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                    Load <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer with Clear Action */}
      <div className="p-8 pt-4 border-t border-neutral-800 bg-black">
        <Button 
          variant="outline" 
          className="w-full !text-red-400 !border-red-900/30 hover:!bg-red-900/10 hover:!border-red-900/50 !text-xs !py-3" 
          onClick={onClear}
        >
          Clear History Logs
        </Button>
      </div>
    </div>
  );
};