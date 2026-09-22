export interface DetectedObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'text' | 'number' | 'password' | 'checkbox' | 'radio' | 'button' | 'select';
  label: string;
  required: boolean;
  maxLength?: number;
  targetPage?: string;
}

export interface Page {
  id: string;
  name: string;
  imageData?: string;
  objects: DetectedObject[];
  createdAt: number;
}

export interface AppState {
  pages: Page[];
  currentPageId: string | null;
  mode: 'list' | 'detail' | 'setup' | 'preview';
}
