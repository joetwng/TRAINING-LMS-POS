import { useState, useEffect } from 'react';
import { Page, DetectedObject } from './types';
import { loadPages, savePages, generateId } from './storage';
import { PageList } from './components/PageList';
import { PageDetail } from './components/PageDetail';
import { SetupEditor } from './components/SetupEditor';
import { PreviewMode } from './components/PreviewMode';

type ViewMode = 'list' | 'detail' | 'setup' | 'preview';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    const loaded = loadPages();
    setPages(loaded);
  }, []);

  useEffect(() => {
    savePages(pages);
  }, [pages]);

  const currentPage = pages.find(p => p.id === currentPageId);

  const handleCreatePage = (name: string) => {
    const newPage: Page = {
      id: generateId(),
      name,
      objects: [],
      createdAt: Date.now(),
    };
    setPages(prev => [...prev, newPage]);
  };

  const handleDeletePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      setCurrentPageId(null);
      setViewMode('list');
    }
  };

  const handleRenamePage = (pageId: string, newName: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name: newName } : p));
  };

  const handleSelectPage = (pageId: string) => {
    setCurrentPageId(pageId);
    setViewMode('detail');
  };

  const handleUploadImage = (imageData: string) => {
    if (!currentPageId) return;
    setPages(prev => prev.map(p => 
      p.id === currentPageId ? { ...p, imageData } : p
    ));
  };

  const handleUpdateObjects = (objects: DetectedObject[]) => {
    if (!currentPageId) return;
    setPages(prev => prev.map(p => 
      p.id === currentPageId ? { ...p, objects } : p
    ));
  };

  const goBack = () => {
    if (viewMode === 'setup' || viewMode === 'preview') {
      setViewMode('detail');
    } else {
      setViewMode('list');
      setCurrentPageId(null);
    }
  };

  if (viewMode === 'list') {
    return (
      <PageList
        pages={pages}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
      />
    );
  }

  if (!currentPage) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Page not found</p>
        <button onClick={() => setViewMode('list')}>Back to list</button>
      </div>
    );
  }

  if (viewMode === 'detail') {
    return (
      <PageDetail
        page={currentPage}
        onBack={goBack}
        onUploadImage={handleUploadImage}
        onSetup={() => setViewMode('setup')}
        onPreview={() => setViewMode('preview')}
      />
    );
  }

  if (viewMode === 'setup') {
    return (
      <SetupEditor
        page={currentPage}
        pages={pages}
        onBack={goBack}
        onUpdateObjects={handleUpdateObjects}
      />
    );
  }

  if (viewMode === 'preview') {
    return (
      <PreviewMode
        initialPage={currentPage}
        pages={pages}
        onBack={goBack}
      />
    );
  }

  return null;
}

export default App;
