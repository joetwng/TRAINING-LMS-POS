import { useState, useEffect, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const pagesRef = useRef<Page[]>([]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadPages();
        setPages(loaded);
      } catch (error) {
        console.error('Failed to load pages:', error);
        setSaveError('Failed to load saved pages. Starting fresh.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const flushSave = async () => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    try {
      await savePages(pagesRef.current);
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save pages:', error);
      setSaveError('Failed to save changes. Your work may not be persisted.');
    }
  };

  useEffect(() => {
    const handlePageHide = () => {
      if (pagesRef.current.length > 0) {
        flushSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pagesRef.current.length > 0) {
        flushSave();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await savePages(pages);
        setSaveError(null);
      } catch (error) {
        console.error('Failed to save pages:', error);
        setSaveError('Failed to save changes. Your work may not be persisted.');
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pages, isLoading]);

  const currentPage = pages.find(p => p.id === currentPageId);

  const handleCreatePage = (name: string) => {
    const newPage: Page = {
      id: generateId(),
      name,
      objects: [],
      createdAt: Date.now(),
    };
    setPages(prev => {
      const updated = [...prev, newPage];
      setTimeout(() => flushSave(), 0);
      return updated;
    });
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
    setPages(prev => {
      const updated = prev.map(p => 
        p.id === currentPageId ? { ...p, imageData } : p
      );
      setTimeout(() => flushSave(), 0);
      return updated;
    });
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

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const errorBanner = saveError ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
        textAlign: 'center',
        fontSize: '14px',
        zIndex: 9999,
      }}
    >
      {saveError}
      <button
        onClick={() => setSaveError(null)}
        style={{
          marginLeft: '20px',
          padding: '4px 12px',
          backgroundColor: '#721c24',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Dismiss
      </button>
    </div>
  ) : null;

  if (viewMode === 'list') {
    return (
      <>
        {errorBanner}
        <PageList
          pages={pages}
          onSelectPage={handleSelectPage}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
        />
      </>
    );
  }

  if (!currentPage) {
    return (
      <>
        {errorBanner}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Page not found</p>
          <button onClick={() => setViewMode('list')}>Back to list</button>
        </div>
      </>
    );
  }

  if (viewMode === 'detail') {
    return (
      <>
        {errorBanner}
        <PageDetail
          page={currentPage}
          onBack={goBack}
          onUploadImage={handleUploadImage}
          onSetup={() => setViewMode('setup')}
          onPreview={() => setViewMode('preview')}
        />
      </>
    );
  }

  if (viewMode === 'setup') {
    return (
      <>
        {errorBanner}
        <SetupEditor
          page={currentPage}
          pages={pages}
          onBack={goBack}
          onUpdateObjects={handleUpdateObjects}
        />
      </>
    );
  }

  if (viewMode === 'preview') {
    return (
      <>
        {errorBanner}
        <PreviewMode
          initialPage={currentPage}
          pages={pages}
          onBack={goBack}
        />
      </>
    );
  }

  return null;
}

export default App;
