import { HistoryItem, ResumeData } from '../types';
import { BASE_RESUME } from '../constants';

const HISTORY_KEY = 'role_architect_history';
const PROFILE_KEY = 'role_architect_base_profile';
const MAX_HISTORY_ITEMS = 20;

export const loadHistoryFromStorage = (): HistoryItem[] => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    // Sanitize and cap to MAX_HISTORY_ITEMS
    return parsed.slice(0, MAX_HISTORY_ITEMS).map((item: any) => ({
      id: item?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      timestamp: typeof item?.timestamp === 'number' ? item.timestamp : Date.now(),
      targetRole: item?.targetRole || 'Cloud Security Engineer',
      jobDescription: item?.jobDescription || '',
      jobLink: item?.jobLink || '',
      tailoredResume: {
        summary: item?.tailoredResume?.summary || '',
        skills: Array.isArray(item?.tailoredResume?.skills) ? item.tailoredResume.skills : [],
        certifications: Array.isArray(item?.tailoredResume?.certifications) ? item.tailoredResume.certifications : [],
        experience: Array.isArray(item?.tailoredResume?.experience)
          ? item.tailoredResume.experience.map((exp: any) => ({
              company: exp?.company || '',
              role: exp?.role || '',
              duration: exp?.duration || '',
              bullets: Array.isArray(exp?.bullets) ? exp.bullets : []
            }))
          : [],
        analysis: {
          matchScore: typeof item?.tailoredResume?.analysis?.matchScore === 'number' ? item.tailoredResume.analysis.matchScore : 0,
          keywordsUsed: Array.isArray(item?.tailoredResume?.analysis?.keywordsUsed) ? item.tailoredResume.analysis.keywordsUsed : [],
          toneNotes: item?.tailoredResume?.analysis?.toneNotes || ''
        }
      }
    }));
  } catch (e) {
    console.warn("Failed to load history from localStorage", e);
    return [];
  }
};

export const saveHistoryToStorage = (history: HistoryItem[]): void => {
  // Always cap at MAX_HISTORY_ITEMS
  let itemsToSave = history.slice(0, MAX_HISTORY_ITEMS);

  while (itemsToSave.length > 0) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(itemsToSave));
      return; // Successfully saved
    } catch (e: any) {
      console.warn(`localStorage save failed (length ${itemsToSave.length}). Trimming older history item...`, e);
      // Remove the oldest item (last element) and retry
      itemsToSave = itemsToSave.slice(0, itemsToSave.length - 1);
    }
  }

  // If even 1 item exceeds quota, remove key safely
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
};

export const loadProfileFromStorage = (): ResumeData => {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (parsed.name !== 'Kolade Aina' || !parsed.contact?.email || parsed.contact.email.trim() !== 'kolaaina@proton.me') {
          return BASE_RESUME;
        }
        if (parsed.contact && parsed.contact.email) {
          parsed.contact.email = parsed.contact.email.trim();
        }
        return {
          ...BASE_RESUME,
          ...parsed,
          contact: { ...BASE_RESUME.contact, ...(parsed.contact || {}) },
          skills: Array.isArray(parsed.skills) ? parsed.skills : BASE_RESUME.skills,
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : BASE_RESUME.certifications,
          experience: Array.isArray(parsed.experience) ? parsed.experience : BASE_RESUME.experience
        };
      }
    }
    return BASE_RESUME;
  } catch {
    return BASE_RESUME;
  }
};

export const saveProfileToStorage = (profile: ResumeData): void => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn("Failed to save profile to localStorage", e);
  }
};
