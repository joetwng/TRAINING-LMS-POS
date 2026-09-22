import React, { useRef } from 'react';
import { Page } from '../types';

interface PageDetailProps {
  page: Page;
  onBack: () => void;
  onUploadImage: (imageData: string) => void;
  onSetup: () => void;
  onPreview: () => void;
}

export const PageDetail: React.FC<PageDetailProps> = ({
  page,
  onBack,
  onUploadImage,
  onSetup,
  onPreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        onUploadImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
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
          ← Back to Pages
        </button>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
        Page: {page.name}
      </h1>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Screenshot</h2>
        
        {!page.imageData ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Upload Screenshot
            </button>
            <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
              Upload a screenshot of the page you want to analyze
            </p>
          </div>
        ) : (
          <div>
            <img
              src={page.imageData}
              alt="Page screenshot"
              style={{
                maxWidth: '100%',
                maxHeight: '500px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'block',
                marginBottom: '15px',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Replace Screenshot
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}
      </div>

      {page.imageData && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button
            onClick={onSetup}
            style={{
              padding: '12px 30px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Setup Components
          </button>
          <button
            onClick={onPreview}
            disabled={page.objects.length === 0}
            style={{
              padding: '12px 30px',
              backgroundColor: page.objects.length > 0 ? '#17a2b8' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: page.objects.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Preview
          </button>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          Status
        </h3>
        <ul style={{ marginLeft: '20px', fontSize: '14px', color: '#333' }}>
          <li>{page.imageData ? '✓' : '○'} Screenshot uploaded</li>
          <li>{page.objects.length > 0 ? '✓' : '○'} Components detected ({page.objects.length})</li>
        </ul>
      </div>
    </div>
  );
};
