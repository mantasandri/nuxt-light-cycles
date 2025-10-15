// app/composables/usePlayerSettings.ts
import { ref, watch } from 'vue';
import { nanoid } from 'nanoid';

export interface PlayerSettings {
  name: string;
  color: string;
  colorHex: string;
  avatar: string;
  userId?: string; // Persistent user ID
}

// Tron-themed avatar options with SVG icons
export const AVATAR_OPTIONS = [
  { 
    id: 'recognizer', 
    label: 'Recognizer',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4L8 10v6l8 6 8-6v-6z"/><path d="M8 16v6l8 6 8-6v-6"/><line x1="16" y1="4" x2="16" y2="10"/><line x1="16" y1="16" x2="16" y2="22"/></svg>'
  },
  { 
    id: 'user', 
    label: 'Program User',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="10" r="5"/><path d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M12 10h8M16 6v8"/></svg>'
  },
  { 
    id: 'disc', 
    label: 'Identity Disc',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/><line x1="16" y1="4" x2="16" y2="10"/><line x1="16" y1="22" x2="16" y2="28"/><line x1="4" y1="16" x2="10" y2="16"/><line x1="22" y1="16" x2="28" y2="16"/></svg>'
  },
  { 
    id: 'cycle', 
    label: 'Light Cycle',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16h8l4-8 4 8h8"/><circle cx="10" cy="22" r="3"/><circle cx="22" cy="22" r="3"/><path d="M13 22h6"/><path d="M16 8v8"/></svg>'
  },
  { 
    id: 'tank', 
    label: 'Light Tank',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="14" width="20" height="8"/><circle cx="11" cy="24" r="2"/><circle cx="21" cy="24" r="2"/><path d="M16 14V8M13 8h6M16 8l-3 6M16 8l3 6"/></svg>'
  },
  { 
    id: 'bit', 
    label: 'Bit',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 6L6 16l10 10 10-10z"/><path d="M16 12L12 16l4 4 4-4z"/><circle cx="16" cy="16" r="2"/></svg>'
  },
  { 
    id: 'siren', 
    label: 'Siren',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4L8 12v8l8 8 8-8v-8z"/><circle cx="16" cy="16" r="4"/><path d="M16 4v8M8 12l8 4M8 20l8-4M24 12l-8 4M24 20l-8-4M16 24v4"/></svg>'
  },
  { 
    id: 'core', 
    label: 'MCP Core',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="10"/><path d="M16 2v4M16 26v4M2 16h4M26 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3"/></svg>'
  },
  { 
    id: 'portal', 
    label: 'Portal',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="4" width="16" height="24" rx="2"/><line x1="12" y1="4" x2="12" y2="28"/><line x1="16" y1="4" x2="16" y2="28"/><line x1="20" y1="4" x2="20" y2="28"/><circle cx="16" cy="16" r="3"/></svg>'
  },
  { 
    id: 'grid', 
    label: 'Grid Warrior',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h20v20H6z"/><path d="M6 12h20M6 18h20M12 6v20M18 6v20"/><circle cx="16" cy="16" r="3"/></svg>'
  },
  { 
    id: 'circuit', 
    label: 'Circuit',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="4"/><path d="M16 6v6M16 20v6M6 16h6M20 16h6"/><circle cx="16" cy="6" r="2"/><circle cx="16" cy="26" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="26" cy="16" r="2"/><path d="M8 8l5 5M24 8l-5 5M8 24l5-5M24 24l-5-5"/></svg>'
  },
  { 
    id: 'data', 
    label: 'Data Stream',
    svg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 8v16M14 6v20M20 8v16M26 10v12"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="24" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="14" cy="26" r="1.5"/><circle cx="20" cy="8" r="1.5"/><circle cx="20" cy="24" r="1.5"/><circle cx="26" cy="10" r="1.5"/><circle cx="26" cy="22" r="1.5"/></svg>'
  },
];

const STORAGE_KEY = 'lightcycles_player_settings';
const USER_ID_KEY = 'lightcycles_userId';

/**
 * Get or create a persistent user ID
 * This ID stays the same across sessions and page refreshes
 */
const getPersistentUserId = (): string => {
  if (typeof window === 'undefined') return '';
  
  try {
    // Check if user ID already exists
    let userId = localStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generate new user ID (12 characters, URL-safe)
      userId = `user-${nanoid(12)}`;
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('[UserID] Generated new persistent user ID:', userId);
    } else {
      console.log('[UserID] Loaded existing user ID:', userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Failed to get persistent user ID:', error);
    // Fallback to session-based ID if localStorage fails
    return `user-${nanoid(12)}`;
  }
};

export function usePlayerSettings() {
  const settings = ref<PlayerSettings>({
    name: '',
    color: 'hsl(180, 90%, 60%)',
    colorHex: '#00ffff',
    avatar: 'recognizer', // Default avatar
    userId: '', // Will be set on load
  });

  const isConfigured = ref(false);

  // Load from localStorage on initialization
  const loadSettings = () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Always get/create persistent user ID
      const userId = getPersistentUserId();
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        settings.value = { ...parsed, userId }; // Ensure userId is always set
        isConfigured.value = true;
      } else {
        // First time user - set userId but settings not configured yet
        settings.value.userId = userId;
      }
    } catch (error) {
      console.error('Failed to load player settings:', error);
    }
  };

  // Save to localStorage
  const saveSettings = (newSettings: PlayerSettings) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Ensure userId is preserved
      const userId = settings.value.userId || getPersistentUserId();
      settings.value = { ...newSettings, userId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
      isConfigured.value = true;
    } catch (error) {
      console.error('Failed to save player settings:', error);
    }
  };

  // Clear settings (logout)
  const clearSettings = () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Keep the userId but clear other settings
      const userId = settings.value.userId || getPersistentUserId();
      settings.value = {
        name: '',
        color: 'hsl(180, 90%, 60%)',
        colorHex: '#00ffff',
        avatar: 'recognizer',
        userId,
      };
      isConfigured.value = false;
    } catch (error) {
      console.error('Failed to clear player settings:', error);
    }
  };

  // Get the current persistent user ID
  const getUserId = (): string => {
    return settings.value.userId || getPersistentUserId();
  };

  return {
    settings,
    isConfigured,
    loadSettings,
    saveSettings,
    clearSettings,
    getUserId,
  };
}

// Export the function to get persistent user ID for use in other parts of the app
export { getPersistentUserId };

