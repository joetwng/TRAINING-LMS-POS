import React, { useState, useRef, useEffect } from 'react';
import { Page, DetectedObject } from '../types';

interface PreviewModeProps {
  initialPage: Page;
  pages: Page[];
  onBack: () => void;
}

export const PreviewMode: React.FC<PreviewModeProps> = ({
  initialPage,
  pages,
  onBack,
}) => {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updateImageSize();
    }
  }, [currentPage]);

  const updateImageSize = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  };

  const handleObjectClick = (obj: DetectedObject) => {
    if (obj.targetPage) {
      const targetPage = pages.find(p => p.name === obj.targetPage);
      if (targetPage) {
        setCurrentPage(targetPage);
        setFormData({});
      } else {
        alert(`Target page "${obj.targetPage}" not found!`);
      }
    }
  };

  const handleInputChange = (objectId: string, value: string) => {
    setFormData(prev => ({ ...prev, [objectId]: value }));
  };

  const scaleX = imageSize.width / (imageRef.current?.naturalWidth || 1);
  const scaleY = imageSize.height / (imageRef.current?.naturalHeight || 1);

  const renderObject = (obj: DetectedObject) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: obj.x * scaleX,
      top: obj.y * scaleY,
      width: obj.width * scaleX,
      height: obj.height * scaleY,
      boxSizing: 'border-box',
      fontSize: '14px',
    };

    const hasTarget = !!obj.targetPage;

    switch (obj.type) {
      case 'text':
      case 'password':
      case 'number':
        return (
          <input
            key={obj.id}
            type={obj.type === 'number' ? 'number' : obj.type}
            placeholder={obj.label}
            value={formData[obj.id] || ''}
            onChange={(e) => handleInputChange(obj.id, e.target.value)}
            required={obj.required}
            maxLength={obj.maxLength}
            style={{
              ...style,
              padding: '5px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          />
        );

      case 'checkbox':
        return (
          <div key={obj.id} style={style}>
            <label style={{ display: 'flex', alignItems: 'center', height: '100%', cursor: hasTarget ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={formData[obj.id] === 'true'}
                onChange={(e) => {
                  handleInputChange(obj.id, e.target.checked.toString());
                  if (hasTarget) handleObjectClick(obj);
                }}
                style={{ marginRight: '5px' }}
              />
              <span style={{ fontSize: '12px' }}>{obj.label}</span>
            </label>
          </div>
        );

      case 'radio':
        return (
          <div key={obj.id} style={style}>
            <label style={{ display: 'flex', alignItems: 'center', height: '100%', cursor: hasTarget ? 'pointer' : 'default' }}>
              <input
                type="radio"
                name={`radio-${currentPage.id}`}
                checked={formData[obj.id] === 'true'}
                onChange={(e) => {
                  handleInputChange(obj.id, e.target.checked.toString());
                  if (hasTarget) handleObjectClick(obj);
                }}
                style={{ marginRight: '5px' }}
              />
              <span style={{ fontSize: '12px' }}>{obj.label}</span>
            </label>
          </div>
        );

      case 'button':
        return (
          <button
            key={obj.id}
            onClick={() => handleObjectClick(obj)}
            style={{
              ...style,
              backgroundColor: hasTarget ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hasTarget ? 'pointer' : 'default',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            {obj.label}
          </button>
        );

      case 'select':
        return (
          <select
            key={obj.id}
            value={formData[obj.id] || ''}
            onChange={(e) => {
              handleInputChange(obj.id, e.target.value);
              if (hasTarget && e.target.value) handleObjectClick(obj);
            }}
            style={{
              ...style,
              padding: '5px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          >
            <option value="">{obj.label}</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
          ← Exit Preview
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Preview: {currentPage.name}
          </h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
            Click buttons with target pages to navigate
          </p>
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div
        style={{
          position: 'relative',
          display: 'block',
          border: '2px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <img
          ref={imageRef}
          src={currentPage.imageData}
          alt={currentPage.name}
          onLoad={updateImageSize}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '700px' }}
        />
        {currentPage.objects.map(renderObject)}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          Navigation Map
        </h3>
        <div style={{ fontSize: '14px' }}>
          {currentPage.objects.filter(obj => obj.targetPage).length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No navigation links on this page</p>
          ) : (
            <ul style={{ marginLeft: '20px' }}>
              {currentPage.objects.filter(obj => obj.targetPage).map(obj => (
                <li key={obj.id}>
                  <strong>{obj.label}</strong> → {obj.targetPage}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
