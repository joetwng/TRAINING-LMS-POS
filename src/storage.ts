import { Page } from './types';

const STORAGE_KEY = 'pageFlowBuilder_pages';

export const loadPages = (): Page[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load pages:', error);
    return [];
  }
};

export const savePages = (pages: Page[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch (error) {
    console.error('Failed to save pages:', error);
  }
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
