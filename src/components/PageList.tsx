import React, { useState } from 'react';
import { Page } from '../types';

interface PageListProps {
  pages: Page[];
  onSelectPage: (pageId: string) => void;
  onCreatePage: (name: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, newName: string) => void;
}

export const PageList: React.FC<PageListProps> = ({
  pages,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onRenamePage,
}) => {
  const [newPageName, setNewPageName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (newPageName.trim()) {
      onCreatePage(newPageName.trim());
      setNewPageName('');
    }
  };

  const startEdit = (page: Page) => {
    setEditingId(page.id);
    setEditName(page.name);
  };

  const saveEdit = (pageId: string) => {
    if (editName.trim()) {
      onRenamePage(pageId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '28px', fontWeight: 'bold' }}>
        Page Flow Builder
      </h1>

      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Create New Page</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Enter page name (e.g., loginpage, mainpage)"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Create Page
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>
          Pages ({pages.length})
        </h2>
        {pages.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No pages yet. Create your first page above!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pages.map((page) => (
              <div
                key={page.id}
                style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1 }}>
                  {editingId === page.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit(page.id)}
                      onBlur={() => saveEdit(page.id)}
                      autoFocus
                      style={{
                        padding: '5px',
                        border: '1px solid #007bff',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    />
                  ) : (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {page.name}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        {page.imageData ? '✓ Screenshot uploaded' : '○ No screenshot'} • 
                        {' '}{page.objects.length} component{page.objects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => onSelectPage(page.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => startEdit(page)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ffc107',
                      color: 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete page "${page.name}"?`)) {
                        onDeletePage(page.id);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
