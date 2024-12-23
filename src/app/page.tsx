'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Camera, 
  Mic, 
  RefreshCw, 
  Settings, 
  Save,
  Download,
  Video,
  FileText,
  ChevronDown,
  AlertCircle,
  Clock,
  Database
} from 'lucide-react'

interface TranscriptionSegment {
  text: string;
  timestamp: number;
}

interface RecordingOptions {
  videoQuality: 'high' | 'medium' | 'low';
  format: 'webm' | 'mp4';
  withAudio: boolean;
  audioFormat: 'wav' | 'mp3';
  autoSave?: boolean;
}

type RecordingMode = 'audio' | 'video' | null;

// Constants
const CHUNK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const AUTO_SAVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MEMORY_WARNING_THRESHOLD = 0.8;
const MAX_RECORDING_TIME = 4 * 60 * 60 * 1000; // 4 hours

const formatTime = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor(ms / 1000 / 60 / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const AudioWaveform = () => {
  return (
    <div className="flex items-center justify-center space-x-1">
      {[1,2,3,4,5].map((i) => (
        <div 
          key={i}
          className="w-3 bg-blue-500 rounded-full animate-pulse"
          style={{
            height: Math.random() * 40 + 10,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default function TranscriberPage() {
  // States
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [mode, setMode] = useState<RecordingMode>(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSpeakTime, setLastSpeakTime] = useState<number>(Date.now());
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<RecordingMode>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [showMemoryWarning, setShowMemoryWarning] = useState(false);
  const [currentChunkNumber, setCurrentChunkNumber] = useState(1);
  const [savedChunks, setSavedChunks] = useState<Array<{
    number: number;
    blob: Blob;
    timestamp: number;
  }>>([]);
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    videoQuality: 'high',
    format: 'webm',
    withAudio: true,
    audioFormat: 'wav',
    autoSave: false
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const saveOptionsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const memoryCheckerRef = useRef<ReturnType<typeof setInterval>>();
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Memory usage monitoring
  const checkMemoryUsage = async () => {
    if ('performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      setMemoryUsage(usageRatio);
      
      if (usageRatio > MEMORY_WARNING_THRESHOLD) {
        setShowMemoryWarning(true);
        await saveCurrentChunk();
      }
    }
  };

  // Save current recording chunk
  const saveCurrentChunk = async () => {
    if (recordedChunksRef.current.length > 0) {
      const mimeType = mode === 'video'
        ? (recordingOptions.format === 'mp4' ? 'video/mp4' : 'video/webm')
        : (recordingOptions.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');

      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      
      setSavedChunks(prev => [...prev, {
        number: currentChunkNumber,
        blob,
        timestamp: Date.now()
      }]);

      recordedChunksRef.current = [];
      setCurrentChunkNumber(prev => prev + 1);

      if (recordingOptions.autoSave) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-chunk-${currentChunkNumber}-${Date.now()}.${
          mode === 'video' ? recordingOptions.format : recordingOptions.audioFormat
        }`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleRefresh = () => {
    if (hasUnsavedContent) {
      const confirmReset = window.confirm('You have unsaved content. Are you sure you want to refresh?');
      if (!confirmReset) return;
    }
    
    setTranscription([]);
    setIsRecording(false);
    setShowSaveOptions(false);
    setShowSettings(false);
    setHasUnsavedContent(false);
    setRecordingTime(0);
    setMemoryUsage(0);
    setShowMemoryWarning(false);
    setCurrentChunkNumber(1);
    setSavedChunks([]);
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    recordedChunksRef.current = [];
  };

  const handleModeSelect = (newMode: RecordingMode) => {
    if (hasUnsavedContent) {
      setPendingMode(newMode);
      setShowWarning(true);
    } else {
      setMode(newMode);
    }
  };

  const confirmModeSwitch = () => {
    setMode(pendingMode);
    setPendingMode(null);
    setShowWarning(false);
    setHasUnsavedContent(false);
  };

  const cancelModeSwitch = () => {
    setPendingMode(null);
    setShowWarning(false);
  };

  const downloadAll = async () => {
    downloadTranscription();
    await downloadRecording();
    setHasUnsavedContent(false);
  };

  const downloadTranscription = () => {
    if (transcription.length === 0) return;
    
    const text = transcription
      .map(segment => `[${new Date(segment.timestamp).toISOString()}] ${segment.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRecording = async () => {
    if (recordedChunksRef.current.length === 0 && savedChunks.length === 0) return;

    const allChunks = [
      ...savedChunks.map(chunk => chunk.blob),
      ...recordedChunksRef.current
    ];

    if (allChunks.length === 0) return;

    const mimeType = mode === 'video'
      ? (recordingOptions.format === 'mp4' ? 'video/mp4' : 'video/webm')
      : (recordingOptions.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');

    const finalBlob = new Blob(allChunks, { type: mimeType });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${Date.now()}.${
      mode === 'video' ? recordingOptions.format : recordingOptions.audioFormat
    }`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMediaConstraints = () => {
    const constraints: MediaStreamConstraints = {
      audio: recordingOptions.withAudio
    };

    if (mode === 'video') {
      constraints.video = {
        width: recordingOptions.videoQuality === 'high' ? 1920 : 
               recordingOptions.videoQuality === 'medium' ? 1280 : 640,
        height: recordingOptions.videoQuality === 'high' ? 1080 : 
                recordingOptions.videoQuality === 'medium' ? 720 : 480
      };
    }

    return constraints;
  };

  // Recording control functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      
      if (mode === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mimeType = mode === 'video'
        ? (recordingOptions.format === 'mp4' ? 'video/mp4' : 'video/webm')
        : (recordingOptions.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : ''
      });
      
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
      recognitionRef.current?.start();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1000;
        });
      }, 1000);

      memoryCheckerRef.current = setInterval(checkMemoryUsage, 10000);
      
      chunkIntervalRef.current = setInterval(async () => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          await saveCurrentChunk();
          
          const newStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
          mediaRecorderRef.current = new MediaRecorder(newStream);
          mediaRecorderRef.current.start();
        }
      }, CHUNK_INTERVAL);

      autoSaveRef.current = setInterval(async () => {
        await saveCurrentChunk();
      }, AUTO_SAVE_INTERVAL);

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording. Please check your media permissions.');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (memoryCheckerRef.current) clearInterval(memoryCheckerRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    await saveCurrentChunk();

    mediaRecorderRef.current?.stop();
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    recognitionRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const now = Date.now();
        const timeSinceLastSpeak = now - lastSpeakTime;
        
        if (result.isFinal) {
          setTranscription(prev => {
            const shouldStartNewSegment = 
              prev.length === 0 || 
              timeSinceLastSpeak > 2000 ||
              /[.!?]$/.test(prev[prev.length - 1].text);

            if (shouldStartNewSegment) {
              return [...prev, {
                text: result[0].transcript,
                timestamp: now
              }];
            }

            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              ...updated[lastIndex],
              text: updated[lastIndex].text + ' ' + result[0].transcript
            };
            return updated;
          });
          setLastSpeakTime(now);
        }
      };
    }
  }, [lastSpeakTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveOptionsRef.current && !saveOptionsRef.current.contains(event.target as Node)) {
        setShowSaveOptions(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const hasContent = 
      transcription.length > 0 || 
      recordedChunksRef.current.length > 0 || 
      savedChunks.length > 0;
    
    setHasUnsavedContent(hasContent);
  }, [transcription, savedChunks]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (memoryCheckerRef.current) clearInterval(memoryCheckerRef.current);
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <div className="p-4">
        {/* Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="text-yellow-400" />
                <h3 className="text-xl font-semibold">Unsaved Content</h3>
              </div>
              <p className="mb-6">
                You have unsaved recording or transcription. Would you like to save before switching modes?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={async () => {
                    await downloadAll();
                    confirmModeSwitch();
                  }}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Save and Switch
                </button>
                <button
                  onClick={confirmModeSwitch}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                >
                  Discard and Switch
                </button>
                <button
                  onClick={cancelModeSwitch}
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex justify-between items-center mb-4">
          {/* Mode Selection with Labels */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
              <button
                onClick={() => handleModeSelect('video')}
                className={`p-3 rounded-lg transition-colors ${
                  mode === 'video' ? 'bg-blue-600' : 'hover:bg-gray-700'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRecording}
              >
                <Camera size={24} className="text-white" />
              </button>
              <button
                onClick={() => handleModeSelect('audio')}
                className={`p-3 rounded-lg transition-colors ${
                  mode === 'audio' ? 'bg-blue-600' : 'hover:bg-gray-700'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRecording}
              >
                <Mic size={24} className="text-white" />
              </button>
            </div>

            <div className="flex items-center text-white">
              <span className="text-xl">
                {!mode 
                  ? 'Choose Recording Mode'
                  : `${mode === 'video' ? 'Video' : 'Audio'} Mode`}
              </span>
            </div>
          </div>

          {/* Status Bar */}
          {mode && (
            <div className="flex items-center space-x-4 bg-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock size={20} />
                <span>{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database size={20} />
                <div className="w-32 h-2 bg-gray-700 rounded-full">
                  <div 
                    className={`h-full rounded-full ${
                      memoryUsage > MEMORY_WARNING_THRESHOLD ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${memoryUsage * 100}%` }}
                  />
                </div>
              </div>
              {currentChunkNumber > 1 && (
                <span className="text-gray-400">
                  Chunk {currentChunkNumber} | {savedChunks.length} saved
                </span>
              )}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex space-x-2">
            {/* Settings Button */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <Settings size={24} className="text-white" />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-50">
                  <h3 className="font-semibold mb-3 text-gray-200">Recording Settings</h3>
                  <div className="space-y-3">
                    {mode === 'video' ? (
                      <>
                        <div>
                          <label className="block text-sm mb-1">Video Quality</label>
                          <select
                            value={recordingOptions.videoQuality}
                            onChange={(e) => setRecordingOptions(prev => ({
                              ...prev,
                              videoQuality: e.target.value as 'high' | 'medium' | 'low'
                            }))}
                            className="w-full bg-gray-700 rounded p-2"
                          >
                            <option value="high">High (1080p)</option>
                            <option value="medium">Medium (720p)</option>
                            <option value="low">Low (480p)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Video Format</label>
                          <select
                            value={recordingOptions.format}
                            onChange={(e) => setRecordingOptions(prev => ({
                              ...prev,
                              format: e.target.value as 'webm' | 'mp4'
                            }))}
                            className="w-full bg-gray-700 rounded p-2"
                          >
                            <option value="webm">WebM</option>
                            <option value="mp4">MP4</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm mb-1">Audio Format</label>
                        <select
                          value={recordingOptions.audioFormat}
                          onChange={(e) => setRecordingOptions(prev => ({
                            ...prev,
                            audioFormat: e.target.value as 'wav' | 'mp3'
                          }))}
                          className="w-full bg-gray-700 rounded p-2"
                        >
                          <option value="wav">WAV</option>
                          <option value="mp3">MP3</option>
                        </select>
                      </div>
                    )}
                    
                    {/* Auto-save option */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoSave"
                        checked={recordingOptions.autoSave}
                        onChange={(e) => setRecordingOptions(prev => ({
                          ...prev,
                          autoSave: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <label htmlFor="autoSave" className="text-sm">
                        Auto-save chunks
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="relative" ref={saveOptionsRef}>
              <button 
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                title="Save Options"
              >
                <Save size={24} className="text-white" />
              </button>
              
              {showSaveOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={async () => {
                      await downloadAll();
                      setShowSaveOptions(false);
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download size={20} />
                    <span>Save All</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      downloadTranscription();
                      setShowSaveOptions(false);
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <FileText size={20} />
                    <span>Save Text</span>
                  </button>
                  
                  {recordedChunksRef.current.length > 0 && (
                    <button
                      onClick={() => {
                        downloadRecording();
                        setShowSaveOptions(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-700 flex items-center space-x-2"
                    >
                      {mode === 'video' ? <Video size={20} /> : <Mic size={20} />}
                      <span>Save {mode === 'video' ? 'Video' : 'Audio'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button 
              onClick={handleRefresh}
              className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* Memory Warning Toast */}
        {showMemoryWarning && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>High memory usage detected. Consider stopping the recording.</span>
            <button 
              onClick={() => setShowMemoryWarning(false)}
              className="ml-2 p-1 hover:bg-red-700 rounded"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Recording Area */}
        <div className="h-96 bg-gray-800 relative rounded-lg mb-4">
          {mode === 'video' && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg"
            />
          )}
          
          {mode === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="text-2xl text-gray-400">Audio Recording Mode</div>
              {isRecording && <AudioWaveform />}
            </div>
          )}

          {mode && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center"
            >
              <div 
                className={`${
                  isRecording 
                    ? 'w-8 h-8 bg-red-600 rounded-sm' 
                    : 'w-12 h-12 bg-red-600 rounded-full'
                } transition-all duration-200`}
              />
            </button>
          )}
        </div>

        {/* Transcription Area */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Transcription</h2>
          <div className="space-y-4 overflow-y-auto max-h-[45vh] bg-gray-800 rounded-lg p-4">
            {transcription.length === 0 ? (
              <p className="text-gray-400 text-center">Your transcription will appear here...</p>
            ) : (
              transcription.map((segment, index) => (
                <p
                  key={index}
                  className="text-white"
                >
                  {segment.text}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}