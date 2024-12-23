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
  ChevronDown
} from 'lucide-react'
import { TranscriptionSegment, RecordingOptions } from '@/types'

const AudioWaveform = () => {
  return (
    <div className="flex items-center justify-center space-x-1">
      {[1,2,3,4,5].map((i) => (
        <div 
          key={i}
          className={`w-3 bg-blue-500 rounded-full animate-pulse`}
          style={{
            height: `${Math.random() * 40 + 10}px`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}

export default function TranscriberPage() {
  // States
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([])
  const [mode, setMode] = useState<'audio' | 'video' | null>(null)
  const [showSaveOptions, setShowSaveOptions] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastSpeakTime, setLastSpeakTime] = useState<number>(Date.now())
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    videoQuality: 'high',
    format: 'webm',
    withAudio: true,
    audioFormat: 'mp3'
  })

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const saveOptionsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1]
        const now = Date.now()
        const timeSinceLastSpeak = now - lastSpeakTime
        
        if (result.isFinal) {
          setTranscription(prev => {
            const shouldStartNewSegment = 
              prev.length === 0 || 
              timeSinceLastSpeak > 2000 ||
              /[.!?]$/.test(prev[prev.length - 1].text)

            if (shouldStartNewSegment) {
              return [...prev, {
                text: result[0].transcript,
                timestamp: now
              }]
            }

            const updated = [...prev]
            const lastIndex = updated.length - 1
            updated[lastIndex] = {
              ...updated[lastIndex],
              text: updated[lastIndex].text + ' ' + result[0].transcript
            }
            return updated
          })
          setLastSpeakTime(now)
        }
      }
    }
  }, [lastSpeakTime])

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
      if (showSaveOptions && saveOptionsRef.current && !saveOptionsRef.current.contains(event.target as Node)) {
        setShowSaveOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings, showSaveOptions])

  const getMediaConstraints = () => {
    const constraints: MediaStreamConstraints = {
      audio: recordingOptions.withAudio
    }

    if (mode === 'video') {
      constraints.video = {
        width: recordingOptions.videoQuality === 'high' ? 1920 : 
               recordingOptions.videoQuality === 'medium' ? 1280 : 640,
        height: recordingOptions.videoQuality === 'high' ? 1080 : 
                recordingOptions.videoQuality === 'medium' ? 720 : 480
      }
    }

    return constraints
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints())
      
      if (mode === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      const mimeType = `${mode === 'video' ? 'video' : 'audio'}/${
        mode === 'video' ? recordingOptions.format : recordingOptions.audioFormat
      }`
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : ''
      })
      
      recordedChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.start()
      recognitionRef.current?.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        // Recording is already saved in recordedChunksRef
      }
    }
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const handleRefresh = () => {
    stopRecording()
    setMode(null)
    setTranscription([])
  }

  const handleModeSelect = (selectedMode: 'audio' | 'video') => {
    setMode(selectedMode)
    if (isRecording) {
      stopRecording()
    }
  }

  const downloadRecording = () => {
    const blob = new Blob(recordedChunksRef.current, {
      type: `${mode === 'video' ? 'video' : 'audio'}/${
        mode === 'video' ? recordingOptions.format : recordingOptions.audioFormat
      }`
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recording-${Date.now()}.${
      mode === 'video' ? recordingOptions.format : recordingOptions.audioFormat
    }`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTranscription = () => {
    const text = transcription.map(t => t.text).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAll = () => {
    if (recordedChunksRef.current.length > 0) {
      downloadRecording()
    }
    if (transcription.length > 0) {
      downloadTranscription()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <div className="p-4">
        {/* Controls Row */}
        <div className="flex justify-between items-center mb-4">
          {/* Mode Selection with Labels */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
              <button
                onClick={() => handleModeSelect('video')}
                className={`p-3 rounded-lg transition-colors ${
                  mode === 'video' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <Camera size={24} className="text-white" />
              </button>
              <button
                onClick={() => handleModeSelect('audio')}
                className={`p-3 rounded-lg transition-colors ${
                  mode === 'audio' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
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
                            audioFormat: e.target.value as 'mp3' | 'wav'
                          }))}
                          className="w-full bg-gray-700 rounded p-2"
                        >
                          <option value="mp3">MP3</option>
                          <option value="wav">WAV</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Save Options Button */}
            <div className="relative" ref={saveOptionsRef}>
              <button
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                title="Save"
              >
                <Save size={24} className="text-white" />
              </button>

              {showSaveOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={() => {
                      downloadAll()
                      setShowSaveOptions(false)
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download size={20} />
                    <span>Save All</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      downloadTranscription()
                      setShowSaveOptions(false)
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <FileText size={20} />
                    <span>Save Text</span>
                  </button>
                  
                  {recordedChunksRef.current.length > 0 && (
                    <button
                      onClick={() => {
                        downloadRecording()
                        setShowSaveOptions(false)
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

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="h-[40vh] bg-gray-800 relative rounded-lg mb-4">
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
  )
}