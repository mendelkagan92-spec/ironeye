import React, { useRef, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onManualEntry: () => void;
}

export default function Camera({ onCapture, onManualEntry }: CameraProps) {
  const { videoRef, isActive, usingFallback, error, startCamera, capturePhoto, handleFileInput } =
    useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) onCapture(photo);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await handleFileInput(file);
      onCapture(data);
    } catch {
      console.error('Failed to read file');
    }
    e.target.value = '';
  };

  return (
    <div className="relative w-full flex flex-col items-center gap-4">
      {/* Viewfinder */}
      <div className="relative w-full aspect-[4/3] overflow-hidden"
        style={{ background: '#1e1e1e', borderRadius: 12, border: '1px solid #2a2a2a' }}>
        {isActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="crosshair-corner tl" />
                <div className="crosshair-corner tr" />
                <div className="crosshair-corner bl" />
                <div className="crosshair-corner br" />
                <div className="scan-line" />
              </div>
            </div>
          </>
        ) : usingFallback ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: '#242424' }}>
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-secondary text-sm font-inter">{error || 'Camera unavailable'}</p>
              <p className="text-text-muted text-xs font-inter mt-1">Upload a photo to identify equipment</p>
            </div>
            <button className="btn-primary w-full" onClick={() => fileInputRef.current?.click()}>
              Upload Photo
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#fc4c02', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="w-full flex gap-3">
        {isActive && (
          <button className="btn-primary flex-1" onClick={handleCapture}>
            Scan Machine
          </button>
        )}
        {isActive && (
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} title="Upload photo">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}
        <button className="btn-ghost" onClick={onManualEntry}>
          Manual
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
