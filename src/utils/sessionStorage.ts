import type { ActiveTab, User } from '../types';
import { ACTIVE_TAB_STORAGE_KEY, isActiveTab } from '../constants/navigation';

export const readStoredToken = () => {
  const saved = localStorage.getItem('credencia_token');
  return saved && saved !== 'undefined' && saved !== 'null' ? saved : null;
};

export const readStoredActiveTab = (): ActiveTab | null => {
  const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  if (!isActiveTab(savedTab)) return null;
  return savedTab === 'checkin-mobile' ? null : savedTab;
};

export const readStoredUser = (): User | null => {
  const saved = localStorage.getItem('credencia_user');
  if (!saved || saved === 'undefined' || saved === 'null') return null;

  try {
    return JSON.parse(saved) || null;
  } catch (error) {
    localStorage.removeItem('credencia_user');
    return null;
  }
};
