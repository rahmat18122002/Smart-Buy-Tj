import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AppState {
  language: 'ru' | 'tg';
  setLanguage: (lang: 'ru' | 'tg') => void;
  currency: string;
  setCurrency: (currency: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (lang) => set({ language: lang }),
      currency: 'с.',
      setCurrency: (currency) => set({ currency }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    { name: 'retail-settings' }
  )
);
