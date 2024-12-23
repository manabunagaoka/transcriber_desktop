// src/types/index.ts
export interface TranscriptionSegment {
  text: string;
  timestamp: number;
}

export interface RecordingOptions {
  videoQuality: 'high' | 'medium' | 'low';
  format: 'webm' | 'mp4';
  withAudio: boolean;
  audioFormat: 'wav' | 'mp3';
  autoSave?: boolean;
}

export type RecordingMode = 'audio' | 'video' | null;

// src/types/index.ts

export interface TranscriptionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoSave?: boolean;
  maxDuration?: number;  // in milliseconds
  chunkInterval?: number;  // in milliseconds
  autoPause?: {
    enabled: boolean;
    silenceThreshold: number;  // in milliseconds
  };
  // Add the keywords property
  keywords?: {
    [category: string]: string[];  // Category name as key, array of keywords as value
  };
}