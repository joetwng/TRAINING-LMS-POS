import React, { useState, useEffect, useRef } from 'react';
import { Page, DetectedObject } from '../types';
import { detectComponents } from '../detector';
import { generateId } from '../storage';

interface SetupEditorProps {
  page: Page;
  pages: Page[];
  onBack: () => void;
  onUpdateObjects: (objects: DetectedObject[]) => void;
}

export const SetupEditor: React.FC<SetupEditorProps> = ({
  page,
  pages,
  onBack,
  onUpdateObjects,
}) => {
  const [objects, setObjects] = useState<DetectedObject[]>(page.objects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setObjects(page.objects);
  }, [page.objects]);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updateImageSize();
    }
  }, []);

  const updateImageSize = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  };

  const handleAutoDetect = async () => {
    if (!page.imageData) return;
    setDetecting(true);
    try {
      const detected = await detectComponents(page.imageData);
      setObjects(detected);
      onUpdateObjects(detected);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = () => {
    onUpdateObjects(objects);
    alert('Components saved!');
  };

  const selectedObject = objects.find(obj => obj.id === selectedId);

  const updateObject = (id: string, updates: Partial<DetectedObject>) => {
    setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  };

  const deleteObject = (id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addNewObject = () => {
    const newObj: DetectedObject = {
      id: generateId(),
      x: 50,
      y: 50,
      width: 150,
      height: 40,
      type: 'button',
      label: `new_object_${objects.length + 1}`,
      required: false,
      targetPage: undefined,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedId(newObj.id);
  };

  const scaleX = imageSize.width / (imageRef.current?.naturalWidth || 1);
  const scaleY = imageSize.height / (imageRef.current?.naturalHeight || 1);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
          Setup: {page.name}
        </h1>
        <div style={{ width: '100px' }} />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleAutoDetect}
          disabled={detecting || !page.imageData}
          style={{
            padding: '10px 20px',
            backgroundColor: detecting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: detecting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {detecting ? 'Detecting...' : '🔍 Auto-Detect Components'}
        </button>
        <button
          onClick={addNewObject}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Add Manual Object
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          💾 Save All
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: '1' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              display: 'inline-block',
              border: '2px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <img
              ref={imageRef}
              src={page.imageData}
              alt="Page screenshot"
              onLoad={updateImageSize}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '600px' }}
            />
            {objects.map(obj => (
              <div
                key={obj.id}
                onClick={() => setSelectedId(obj.id)}
                style={{
                  position: 'absolute',
                  left: obj.x * scaleX,
                  top: obj.y * scaleY,
                  width: obj.width * scaleX,
                  height: obj.height * scaleY,
                  border: selectedId === obj.id ? '3px solid #007bff' : '2px solid rgba(255, 0, 0, 0.6)',
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    left: 0,
                    backgroundColor: selectedId === obj.id ? '#007bff' : 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {obj.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '350px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
            Object Properties
          </h2>
          
          {!selectedObject ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Click on an object to edit its properties
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                  Label:
                </label>
                <input
                  type="text"
                  value={selectedObject.label}
                  onChange={(e) => updateObject(selectedObject.id, { label: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                  Type:
                </label>
                <select
                  value={selectedObject.type}
                  onChange={(e) => updateObject(selectedObject.id, { type: e.target.value as DetectedObject['type'] })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="text">Text Input</option>
                  <option value="number">Number Input</option>
                  <option value="password">Password Input</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio Button</option>
                  <option value="button">Button</option>
                  <option value="select">Select/Dropdown</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedObject.required}
                    onChange={(e) => updateObject(selectedObject.id, { required: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Required field
                </label>
              </div>

              {(selectedObject.type === 'text' || selectedObject.type === 'password' || selectedObject.type === 'number') && (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                    Max Length:
                  </label>
                  <input
                    type="number"
                    value={selectedObject.maxLength || ''}
                    onChange={(e) => updateObject(selectedObject.id, { maxLength: parseInt(e.target.value) || undefined })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                  Target Page (on click):
                </label>
                <select
                  value={selectedObject.targetPage || ''}
                  onChange={(e) => updateObject(selectedObject.id, { targetPage: e.target.value || undefined })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">-- No navigation --</option>
                  {pages.filter(p => p.id !== page.id).map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '4px', fontSize: '12px' }}>
                <div><strong>Position:</strong> ({Math.round(selectedObject.x)}, {Math.round(selectedObject.y)})</div>
                <div><strong>Size:</strong> {Math.round(selectedObject.width)} × {Math.round(selectedObject.height)}</div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Delete this object?')) {
                    deleteObject(selectedObject.id);
                  }
                }}
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🗑 Delete Object
              </button>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: '12px', color: '#666' }}>
              <strong>Total objects:</strong> {objects.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
