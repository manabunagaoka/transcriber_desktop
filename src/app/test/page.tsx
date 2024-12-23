// src/app/test/page.tsx
'use client'

import { useRef, useState } from 'react';
import EmotionDetector from '@/components/EmotionDetector';

export default function TestPage() {
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);  // Add this line

  const handleEmotionDetected = (emotion: string) => {
    setDetectedEmotion(emotion);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Emotion Detection Test</h1>
      
      <EmotionDetector 
        videoRef={videoRef}  // Add this prop
        onEmotionDetected={handleEmotionDetected} 
      />
      
      {detectedEmotion && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="text-lg">Detected Emotion: {detectedEmotion}</p>
        </div>
      )}
    </div>
  );
}