import React, { useEffect, useRef, useState } from 'react';

// src/components/EmotionDetector.tsx
interface EmotionDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onEmotionDetected: (emotion: string) => void;
}

const EmotionDetector: React.FC<EmotionDetectorProps> = ({ videoRef, onEmotionDetected }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const emotionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const updateEmotion = () => {
      // Simulate emotion detection for testing
      const mockEmotions = ['neutral', 'happy', 'sad', 'surprised', 'angry'];
      const randomEmotion = mockEmotions[Math.floor(Math.random() * mockEmotions.length)];
      
      // Only update if emotion has changed
      if (randomEmotion !== currentEmotion) {
        setCurrentEmotion(randomEmotion);
        if (onEmotionDetected) {
          onEmotionDetected(randomEmotion);
        }
      }
    };

    const startEmotionDetection = () => {
      // Update emotion every 2 seconds instead of every frame
      emotionUpdateTimeoutRef.current = setInterval(updateEmotion, 2000);
    };

    const handlePlay = () => {
      startEmotionDetection();
    };

    videoRef.current.addEventListener('play', handlePlay);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', handlePlay);
      }
      if (emotionUpdateTimeoutRef.current) {
        clearInterval(emotionUpdateTimeoutRef.current);
      }
    };
  }, [videoRef, onEmotionDetected, currentEmotion]);

  if (!currentEmotion) return null;

  return (
    <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-75 text-white px-4 py-2 rounded shadow-lg">
      <div className="flex items-center space-x-2">
        <span className="text-gray-300">Emotion:</span>
        <span className="font-semibold capitalize">{currentEmotion}</span>
      </div>
    </div>
  );
};

export default EmotionDetector;