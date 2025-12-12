// InterviewStep.js - 修复 AI 语音播放中断 + 完整音频队列管理
import React, { useRef, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Grid, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Alert, Chip, Card
} from '@mui/material';
import {
  Mic,
  ExitToApp,
  ArrowBack,
  Person,
  SmartToy,
  RadioButtonChecked,
  Circle,
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { generateRandomAI } from '../../../utils/randomAI';
import { useParams } from 'react-router-dom';

function InterviewStep({
  mediaState,
  setMediaState,
  interviewState,
  setInterviewState,
  websocket, // AI websocket
  isConnected,
  currentMeeting,
  interviewEnded,
  audioDataBufferRef,
  isRecordingRef,
  setError,
  setSuccess,
  setOpenSnackbar,
  endMeeting,
  onPreviousStep,
  connectToInterview,
  isLoading,
  aiSpeaking
}) {
  const params = useParams();
  const interviewId = params.interviewId;
  
  // Local state
  const [openEndDialog, setOpenEndDialog] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiProfile] = useState(generateRandomAI());
  
  // Audio level detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioLevelRef = useRef(0);
  const audioAnalyserRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  
  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Connection monitoring state
  const [connectionStatus, setConnectionStatus] = useState({
    aiWebSocket: 'disconnected',
    jeffWebSocket: 'disconnected',
    mediaStream: 'disconnected',
    recording: 'stopped'
  });

  // Connection monitoring refs
  const connectionMonitorRef = useRef(null);
  const lastAudioDataRef = useRef(Date.now());
  const lastJeffDataRef = useRef(Date.now());

  // AI communication audio context (separate from MediaRecorder mixing)
  const [audioContext, setAudioContext] = useState(null);

  // AI audio playback manager
  const audioPlaybackContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  // Unified MediaRecorder state (video + mixed audio) - for Jeff's WebSocket
  const mixedCtxRef = useRef(null);
  const mixedDestRef = useRef(null);
  const combinedStreamRef = useRef(null);

  // Jeff's WebSocket recording system
  const [recordingState, setRecordingState] = useState({
    jeffMediaRecorder: null,
    jeffWebSocket: null,
    isJeffRecording: false
  });

  const recordingStateRef = useRef(recordingState);
  const jeffMediaChunksRef = useRef([]);

  // Video refs for local preview
  const localVideoRef = useRef(null);

  // Initialize AI audio playback context
  const initAudioPlaybackContext = () => {
    if (!audioPlaybackContextRef.current) {
      if (mixedCtxRef.current) {
        audioPlaybackContextRef.current = mixedCtxRef.current;
        console.log('✅ AI audio playback reusing Jeff mixing context');
      } else {
        audioPlaybackContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.warn('⚠️ AI audio playback created independent context');
      }
      nextStartTimeRef.current = audioPlaybackContextRef.current.currentTime;
      console.log('✅ AI audio playback context initialized');
    }
  };

  // Audio playback scheduler
  const scheduleAudioPlayback = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const ctx = audioPlaybackContextRef.current;
    
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      
      try {
        const source = ctx.createBufferSource();
        source.buffer = audioData.buffer;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        if (mixedDestRef.current) {
          gainNode.connect(mixedDestRef.current);
          console.log('✅ AI audio connected to recording stream');
        }
        
        const currentTime = ctx.currentTime;
        const startTime = Math.max(currentTime, nextStartTimeRef.current);
        
        if (startTime > nextStartTimeRef.current + 0.01) {
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
        }
        
        const duration = audioData.buffer.duration;
        const fadeOutTime = startTime + duration - 0.01;
        if (fadeOutTime > startTime) {
          gainNode.gain.setValueAtTime(1, fadeOutTime);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        }
        
        source.start(startTime);
        nextStartTimeRef.current = startTime + duration;
        
        await new Promise(resolve => {
          source.onended = resolve;
        });
        
        console.log('✅ AI audio chunk played, duration:', duration.toFixed(3), 's');
        
      } catch (error) {
        console.error('❌ Failed to play audio chunk:', error);
      }
    }
    
    isPlayingRef.current = false;
  };

  // Handle AI audio message
  const handleAIAudioMessage = async (audioMessage) => {
    try {
      initAudioPlaybackContext();
      const ctx = audioPlaybackContextRef.current;
      
      console.log('📨 Received AI audio message:', {
        format: audioMessage.format,
        encoding: audioMessage.encoding,
        sampleRate: audioMessage.sample_rate,
        dataLength: audioMessage.data?.length
      });
      
      const audioData = atob(audioMessage.data);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      let audioBuffer;
      
      if (audioMessage.format === 'wav') {
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
      } else if (audioMessage.sample_rate && audioMessage.encoding) {
        const sampleRate = audioMessage.sample_rate;
        const channels = audioMessage.channels || 1;
        
        if (audioMessage.encoding.includes('f32le')) {
          const floatData = new Float32Array(arrayBuffer.byteLength / 4);
          const dataView = new DataView(arrayBuffer);
          
          for (let i = 0; i < floatData.length; i++) {
            floatData[i] = dataView.getFloat32(i * 4, true);
          }
          
          audioBuffer = ctx.createBuffer(channels, floatData.length, sampleRate);
          const channelData = audioBuffer.getChannelData(0);
          
          let previousSample = 0;
          const alpha = 0.98;
          
          for (let i = 0; i < floatData.length; i++) {
            channelData[i] = alpha * (previousSample + floatData[i] - (floatData[i-1] || 0));
            previousSample = channelData[i];
            channelData[i] = Math.max(-0.99, Math.min(0.99, channelData[i]));
          }
          
          const fadeLength = Math.min(100, floatData.length / 10);
          for (let i = 0; i < fadeLength; i++) {
            const fadeFactor = i / fadeLength;
            channelData[i] *= fadeFactor;
            channelData[floatData.length - 1 - i] *= fadeFactor;
          }
          
        } else {
          const int16Data = new Int16Array(arrayBuffer.byteLength / 2);
          const dataView = new DataView(arrayBuffer);
          
          for (let i = 0; i < int16Data.length; i++) {
            int16Data[i] = dataView.getInt16(i * 2, true);
          }
          
          audioBuffer = ctx.createBuffer(channels, int16Data.length, sampleRate);
          const channelData = audioBuffer.getChannelData(0);
          
          for (let i = 0; i < int16Data.length; i++) {
            channelData[i] = int16Data[i] / 32768.0;
          }
        }
      } else {
        console.error('❌ Unsupported audio format:', audioMessage);
        return;
      }
      
      audioQueueRef.current.push({
        buffer: audioBuffer,
        timestamp: Date.now()
      });
      
      console.log('✅ Audio chunk queued, queue length:', audioQueueRef.current.length);
      
      scheduleAudioPlayback();
      
    } catch (error) {
      console.error('❌ Failed to process AI audio message:', error);
      setError('AI audio playback failed: ' + error.message);
      setOpenSnackbar(true);
    }
  };

  // Cleanup audio playback resources
  const cleanupAudioPlayback = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    if (audioPlaybackContextRef.current && 
        audioPlaybackContextRef.current !== mixedCtxRef.current &&
        audioPlaybackContextRef.current.state !== 'closed') {
      audioPlaybackContextRef.current.close().then(() => {
        console.log('✅ AI audio playback context closed');
        audioPlaybackContextRef.current = null;
        nextStartTimeRef.current = 0;
      }).catch(err => {
        console.error('❌ Failed to close audio context:', err);
      });
    } else {
      audioPlaybackContextRef.current = null;
      nextStartTimeRef.current = 0;
    }
  };

  // Cleanup mixed audio context
  const cleanupMixedAudioContext = () => {
    if (mixedCtxRef.current && mixedCtxRef.current.state !== 'closed') {
      mixedCtxRef.current.close().then(() => {
        console.log('✅ Mixed audio context closed');
      }).catch(err => {
        console.error('❌ Failed to close mixed audio context:', err);
      });
    }
    mixedCtxRef.current = null;
    mixedDestRef.current = null;
  };

  // Cleanup combined stream
  const cleanupCombinedStream = () => {
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('✅ Stopped combined stream track:', track.kind);
      });
      combinedStreamRef.current = null;
    }
  };

  // Cleanup Jeff WebSocket and MediaRecorder
  const cleanupJeffResources = () => {
    // Stop MediaRecorder first
    if (recordingStateRef.current.jeffMediaRecorder) {
      try {
        if (recordingStateRef.current.jeffMediaRecorder.state !== 'inactive') {
          recordingStateRef.current.jeffMediaRecorder.stop();
          console.log('✅ Jeff MediaRecorder stopped');
        }
      } catch (err) {
        console.warn('⚠️ Error stopping Jeff MediaRecorder:', err);
      }
    }

    // Close Jeff WebSocket
    if (recordingStateRef.current.jeffWebSocket) {
      try {
        if (recordingStateRef.current.jeffWebSocket.readyState === WebSocket.OPEN ||
            recordingStateRef.current.jeffWebSocket.readyState === WebSocket.CONNECTING) {
          recordingStateRef.current.jeffWebSocket.close(1000, 'Interview ended');
          console.log('✅ Jeff WebSocket closed');
        }
      } catch (err) {
        console.warn('⚠️ Error closing Jeff WebSocket:', err);
      }
    }

    setRecordingState({
      jeffMediaRecorder: null,
      jeffWebSocket: null,
      isJeffRecording: false
    });
    
    jeffMediaChunksRef.current = [];
  };

  // Cleanup AI audio context
  const cleanupAIAudioContext = () => {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().then(() => {
        console.log('✅ AI audio context closed');
      }).catch(err => {
        console.error('❌ Failed to close AI audio context:', err);
      });
    }
    setAudioContext(null);
  };

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      cleanupAudioPlayback();
      stopAudioLevelDetection();
      stopConnectionMonitoring();
      cleanupJeffResources();
      cleanupMixedAudioContext();
      cleanupCombinedStream();
      cleanupAIAudioContext();
    };
  }, []);

  // Expose AI audio handler to parent
  useEffect(() => {
    window.__handleAIAudioMessage = handleAIAudioMessage;
    
    return () => {
      delete window.__handleAIAudioMessage;
    };
  }, []);

  // Audio level detection functions
  const startAudioLevelDetection = (audioStream) => {
    if (!audioStream || audioLevelIntervalRef.current) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      
      audioAnalyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(100, (rms / 255) * 100);
        
        audioLevelRef.current = normalizedLevel;
        setAudioLevel(normalizedLevel);
        
        const speakingThreshold = 5;
        setIsSpeaking(normalizedLevel > speakingThreshold);
      };
      
      audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50);
      
    } catch (error) {
      console.error('Audio level detection setup failed:', error);
    }
  };

  const stopAudioLevelDetection = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current = null;
    }
    
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  // Connection monitoring functions
  const updateConnectionStatus = (component, status) => {
    setConnectionStatus(prev => {
      const newStatus = { ...prev, [component]: status };
      
      if (prev[component] !== status) {
        console.log(`🔄 Connection Status Changed: ${component} -> ${status}`);

        if (status === 'error' || status === 'disconnected') {
          if (component === 'jeffWebSocket') {
            setError(`Recording connection lost! Audio/video may not be saved properly.`);
            setOpenSnackbar(true);
          } else if (component === 'aiWebSocket') {
            setError(`AI connection lost! Interview communication interrupted.`);
            setOpenSnackbar(true);
          } else if (component === 'mediaStream') {
            setError(`Media stream lost! Please check your microphone/camera.`);
            setOpenSnackbar(true);
          }
        }
      }
      
      return newStatus;
    });
  };

  const startConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      if (!interviewStarted) return;

      const now = Date.now();
      
      if (websocket) {
        if (websocket.readyState === WebSocket.OPEN) {
          updateConnectionStatus('aiWebSocket', 'connected');
        } else if (websocket.readyState === WebSocket.CONNECTING) {
          updateConnectionStatus('aiWebSocket', 'connecting');
        } else {
          updateConnectionStatus('aiWebSocket', 'error');
        }
      } else {
        updateConnectionStatus('aiWebSocket', 'disconnected');
      }

      const jeffSocket = recordingStateRef.current.jeffWebSocket;
      if (jeffSocket) {
        if (jeffSocket.readyState === WebSocket.OPEN) {
          updateConnectionStatus('jeffWebSocket', 'connected');
        } else if (jeffSocket.readyState === WebSocket.CONNECTING) {
          updateConnectionStatus('jeffWebSocket', 'connecting');
        } else {
          updateConnectionStatus('jeffWebSocket', 'error');
        }
      } else {
        updateConnectionStatus('jeffWebSocket', 'disconnected');
      }

      if (mediaState?.audioTestStream) {
        const audioTracks = mediaState.audioTestStream.getAudioTracks();
        const hasActiveAudio = audioTracks.some(track => track.readyState === 'live');
        
        if (hasActiveAudio) {
          updateConnectionStatus('mediaStream', 'connected');
        } else {
          updateConnectionStatus('mediaStream', 'error');
        }
      } else {
        updateConnectionStatus('mediaStream', 'disconnected');
      }

      if (recordingStateRef.current.isJeffRecording) {
        if (now - lastJeffDataRef.current > 10000) {
          updateConnectionStatus('recording', 'error');
        } else {
          updateConnectionStatus('recording', 'recording');
        }
      } else {
        updateConnectionStatus('recording', 'stopped');
      }

      if (now - lastAudioDataRef.current > 8000) {
        console.warn('⚠️ No audio data detected for AI communication');
      }

    }, 2000);
  };

  const stopConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  };

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    if (interviewState.transcripts?.length > 0) {
      const el = document.getElementById('transcript-container');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [interviewState.transcripts]);

  useEffect(() => {
    if (interviewStarted) {
      startConnectionMonitoring();
    } else {
      stopConnectionMonitoring();
    }

    return () => {
      stopConnectionMonitoring();
    };
  }, [interviewStarted]);

  const createWebSocketWithRetry = async (url, name, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.error(`⏰ ${name} connection timeout (attempt ${attempt})`);
            if (socket.readyState !== WebSocket.OPEN) {
              socket.close();
            }
            reject(new Error(`${name} connection timeout`));
          }, 10000);

          socket.onopen = () => {
            clearTimeout(timeout);
            resolve(socket);
          };
          
          socket.onerror = (error) => {
            clearTimeout(timeout);
            console.error(`❌ ${name} connection error (attempt ${attempt}):`, error);
            reject(new Error(`${name} connection failed`));
          };

          socket.onclose = (event) => {
            clearTimeout(timeout);
            console.error(`❌ ${name} closed during connection (attempt ${attempt}):`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            });
            
            let errorMessage = `${name} connection failed`;
            switch (event.code) {
              case 1006:
                errorMessage = `${name} service unavailable (network error)`;
                break;
              case 1011:
                errorMessage = `${name} server error`;
                break;
              case 1002:
                errorMessage = `${name} protocol error`;
                break;
              case 1003:
                errorMessage = `${name} unsupported data`;
                break;
              default:
                errorMessage = `${name} connection failed (code ${event.code})`;
            }
            
            reject(new Error(errorMessage));
          };
        });
        
        return result;
        
      } catch (error) {
        console.error(`❌ ${name} attempt ${attempt} failed:`, error.message);
        
        if (error.message.includes('protocol error') || 
            error.message.includes('unsupported data')) {
          break;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`🚫 ${name}: All ${maxRetries} attempts failed`);
          throw error;
        }
      }
    }
  };

  const setupJeffWebSocket = async () => {
    try {
      if (!interviewId) {
        console.warn('⚠️ Meeting ID not available for Jeff WebSocket setup');
        return null;
      }

      const baseUrl = 'wss://api-staging.screna.ai/api/v1/ws';
      const mediaRecordingUrl = `${baseUrl}/media?interviewId=${interviewId}`;
      const jeffSocket = await createWebSocketWithRetry(mediaRecordingUrl, 'Jeff MediaRecorder WebSocket', 3);
      
      if (jeffSocket) {
        jeffSocket.onmessage = (event) => {
          lastJeffDataRef.current = Date.now();
          console.log('📨 Jeff WebSocket runtime message:', {
            dataType: typeof event.data,
            dataSize: event.data?.byteLength || event.data?.length || 'unknown',
            timestamp: new Date().toISOString()
          });
        };
        
        jeffSocket.onerror = (error) => {
          console.error('❌ Jeff WebSocket runtime error:', error);
          updateConnectionStatus('jeffWebSocket', 'error');
        };
        
        jeffSocket.onclose = (event) => {
          console.log('🔴 Jeff WebSocket disconnected during operation:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          updateConnectionStatus('jeffWebSocket', 'disconnected');
          setRecordingState(prev => ({ ...prev, isJeffRecording: false }));
        };

        updateConnectionStatus('jeffWebSocket', 'connected');
        return jeffSocket;
      } else {
        console.error('❌ JEFF WEBSOCKET: Connection failed completely');
        updateConnectionStatus('jeffWebSocket', 'error');
        return null;
      }

    } catch (error) {
      console.error('❌ CRITICAL: Jeff WebSocket setup completely failed:', error);
      console.error('Stack trace:', error.stack);
      updateConnectionStatus('jeffWebSocket', 'error');
      return null;
    }
  };

  const sendMediaChunksToJeff = async (jeffSocket) => {
    if (!jeffSocket || jeffSocket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Jeff WebSocket not ready for chunk sending');
      updateConnectionStatus('jeffWebSocket', 'error');
      return;
    }

    if (jeffMediaChunksRef.current.length === 0) {
      return;
    }

    try {
      const combinedBlob = new Blob(jeffMediaChunksRef.current, { 
        type: jeffMediaChunksRef.current[0]?.type || 'video/webm;codecs=vp9,opus' 
      });
      
      const arrayBuffer = await combinedBlob.arrayBuffer();
      const sizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
      
      console.log('📤 Sending optimized media chunk to Jeff:', {
        sizeMB: sizeMB,
        chunks: jeffMediaChunksRef.current.length,
        type: combinedBlob.type
      });
      
      jeffSocket.send(arrayBuffer);
      lastJeffDataRef.current = Date.now();
      
      jeffMediaChunksRef.current = [];
      
    } catch (error) {
      console.error('❌ Failed to send media chunks to Jeff:', error);
      updateConnectionStatus('jeffWebSocket', 'error');
      jeffMediaChunksRef.current = [];
    }
  };

  const pickRecorderOptions = () => {
    const safariFormats = [
      {
        mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 28000
      },
      {
        mimeType: 'video/mp4',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 28000
      }
    ];
    
    const chromeFormats = [
      {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2000000,
        audioBitsPerSecond: 28000
      },
      {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 28000
      },
      {
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 28000
      }
    ];

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const formats = isSafari ? safariFormats : chromeFormats;
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        console.log('Selected recording format:', format);
        return format;
      }
    }
    
    console.warn('No optimized recording format found, using default');
    return {
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 28000
    };
  };

  const setupJeffMediaRecorder = (mediaStream, jeffSocket) => {
    if (!jeffSocket || jeffSocket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Jeff WebSocket not ready for MediaRecorder setup');
      return null;
    }

    if (!mediaStream || !mediaStream.active) {
      console.warn('⚠️ Media stream not available or not active for Jeff recording');
      return null;
    }

    try {
      const clonedStream = new MediaStream();
      
      const videoTracks = mediaStream.getVideoTracks();
      videoTracks.forEach(track => {
        const clonedTrack = track.clone();
        clonedStream.addTrack(clonedTrack);
      });
      
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach(track => {
        clonedStream.addTrack(track.clone());
      });

      const options = pickRecorderOptions();
      
      console.log('📹 Creating MediaRecorder with optimized options:', options);
      
      const jeffRecorder = new MediaRecorder(clonedStream, options);

      jeffRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          jeffMediaChunksRef.current.push(event.data);
          updateConnectionStatus('recording', 'recording');
          
          const totalSize = jeffMediaChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          if (jeffMediaChunksRef.current.length % 10 === 0) {
            console.log('📊 Recording stats:', {
              chunks: jeffMediaChunksRef.current.length,
              totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
              lastChunkSizeKB: (event.data.size / 1024).toFixed(2)
            });
          }
        }
      };

      jeffRecorder.onstart = () => {
        setRecordingState(prev => ({ ...prev, isJeffRecording: true }));
        updateConnectionStatus('recording', 'recording');
        console.log('📹 Started optimized recording with constraints:', options);
      };

      jeffRecorder.onstop = () => {
        setRecordingState(prev => ({ ...prev, isJeffRecording: false }));
        updateConnectionStatus('recording', 'stopped');
        
        if (jeffMediaChunksRef.current.length > 0) {
          const totalSize = jeffMediaChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          console.log('📹 Recording stopped. Final size:', {
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            chunks: jeffMediaChunksRef.current.length
          });
          sendMediaChunksToJeff(jeffSocket);
        }
      };

      jeffRecorder.onerror = (error) => {
        console.error('❌ Jeff MediaRecorder error:', error);
        setRecordingState(prev => ({ ...prev, isJeffRecording: false }));
        updateConnectionStatus('recording', 'error');
      };

      return jeffRecorder;
    } catch (error) {
      console.error('❌ Jeff MediaRecorder setup failed:', error);
      updateConnectionStatus('recording', 'error');
      return null;
    }
  };

  const buildCombinedStream = async () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
    try { if (ctx.state === 'suspended') await ctx.resume(); } catch {}
    mixedCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    mixedDestRef.current = dest;

    if (mediaState?.audioTestStream) {
      const micClone = new MediaStream();
      mediaState.audioTestStream.getAudioTracks().forEach(t => micClone.addTrack(t.clone()));
      const micSrc = ctx.createMediaStreamSource(micClone);
      micSrc.connect(dest);
      updateConnectionStatus('mediaStream', 'connected');
    }

    window.__registerAIAudioElement = (audioEl) => {
      try {
        if (!audioEl) return false;

        if (audioEl.captureStream) {
          const s = audioEl.captureStream();
          if (s && s.getAudioTracks().length) {
            const src = ctx.createMediaStreamSource(s);
            src.connect(dest);
            console.log('[AI MIX] Attached via captureStream');
            return true;
          }
        }

        const elemSrc = ctx.createMediaElementSource(audioEl);
        if (ctx.createChannelSplitter) {
          const splitter = ctx.createChannelSplitter(2);
          elemSrc.connect(splitter);
          splitter.connect(dest, 0);
          console.log('[AI MIX] Attached via createMediaElementSource + splitter');
        } else {
          elemSrc.connect(dest);
          console.log('[AI MIX] Attached via createMediaElementSource (mono)');
        }
        return true;
      } catch (e) {
        console.warn('[AI MIX] registerAIAudioElement failed:', e);
        return false;
      }
    };

    window.__registerAIAudioNode = (node) => {
      try {
        if (!node || !node.connect) return false;
        const splitter = ctx.createChannelSplitter(2);
        node.connect(splitter);
        splitter.connect(dest, 0);
        return true;
      } catch (e) { console.warn('[AI MIX] registerAIAudioNode failed:', e); return false; }
    };

    window.__injectAIPCM = (data, sampleRate = ctx.sampleRate) => {
      try {
        if (!data) return false;
        let f32;
        if (data instanceof Float32Array) {
          f32 = data;
        } else if (data instanceof Int16Array) {
          f32 = new Float32Array(data.length);
          for (let i = 0; i < data.length; i++) f32[i] = data[i] / 0x7FFF;
        } else if (ArrayBuffer.isView(data)) {
          const arr = data;
          f32 = new Float32Array(arr.length);
          for (let i = 0; i < arr.length; i++) f32[i] = arr[i] / 0x7FFF;
        } else {
          console.warn('[AI MIX] injectAIPCM: unsupported data type');
          return false;
        }
        const b = ctx.createBuffer(1, f32.length, sampleRate);
        b.copyToChannel(f32, 0, 0);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(dest);
        s.start(ctx.currentTime + 0.08);
        return true;
      } catch (e) { console.warn('[AI MIX] injectAIPCM failed:', e); return false; }
    };

    window.__decodePCM_F32LE_Base64ToFloat32 = (b64) => {
      try {
        const bin = atob(b64);
        const buf = new ArrayBuffer(bin.length);
        const u8  = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const dv = new DataView(buf);
        const len = buf.byteLength / 4;
        const out = new Float32Array(len);
        for (let i = 0; i < len; i++) out[i] = dv.getFloat32(i * 4, true);
        return out;
      } catch (e) { console.warn('[AI MIX] decode pcm_f32le b64 failed:', e); return null; }
    };

    const tracks = [];
    
    if (mediaState?.videoTestStream && mediaState.videoReady) {
      const originalVideoTrack = mediaState.videoTestStream.getVideoTracks()[0];
      if (originalVideoTrack) {
        const videoConstraints = {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 30, max: 30 },
          aspectRatio: { ideal: 4/3 }
        };

        try {
          await originalVideoTrack.applyConstraints(videoConstraints);
          tracks.push(originalVideoTrack);
          console.log('📹 Applied video constraints for size optimization:', videoConstraints);
        } catch (constraintError) {
          console.warn('⚠️ Could not apply video constraints, using original track:', constraintError);
          tracks.push(originalVideoTrack);
        }
      }
    }
    
    dest.stream.getAudioTracks().forEach(a => tracks.push(a));
    
    const combined = new MediaStream(tracks);
    combinedStreamRef.current = combined;
    
    console.log('📹 Combined stream created with optimizations:', {
      videoTracks: combined.getVideoTracks().length,
      audioTracks: combined.getAudioTracks().length,
      videoSettings: combined.getVideoTracks()[0]?.getSettings()
    });
    
    return combined;
  };

  const startInterview = async () => {
    try {
      if (!mediaState.mediaReady) {
        setError("Media not ready. Please go back and set up your audio.");
        setOpenSnackbar(true);
        return;
      }

      if (!mediaState.audioTestStream) {
        setError("Audio stream not available");
        setOpenSnackbar(true);
        return;
      }

      setIsConnecting(true);
      updateConnectionStatus('aiWebSocket', 'connecting');

      let ws = websocket;
      if (!isConnected || !websocket) {
        try {
          ws = await connectToInterview();
          updateConnectionStatus('aiWebSocket', 'connected');
        } catch (connectError) {
          console.error("❌ AI connection failed:", connectError);
          updateConnectionStatus('aiWebSocket', 'error');
          setError("Failed to connect to AI interview system. Please try again.");
          setOpenSnackbar(true);
          setIsConnecting(false);
          return;
        }
      } else {
        updateConnectionStatus('aiWebSocket', 'connected');
      }

      // Countdown logic
      setShowCountdown(true);
      setCountdown(5);
      for (let i = 5; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setShowCountdown(false);

      updateConnectionStatus('jeffWebSocket', 'connecting');
      let jeffSocket = null;
      try {
        jeffSocket = await setupJeffWebSocket();
        console.log('✅ Jeff\'s WebSocket setup completed:', {
          connected: !!jeffSocket
        });
      } catch (recordingError) {
        console.warn("⚠️ Jeff's WebSocket setup failed, continuing without Jeff recording:", recordingError);
        updateConnectionStatus('jeffWebSocket', 'error');
      }

      const aiAudioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      if (aiAudioContext.state === 'suspended') {
        await aiAudioContext.resume();
      }
      
      setAudioContext(aiAudioContext);

      const combinedStream = await buildCombinedStream();

      if (localVideoRef.current) {
        const videoEl = localVideoRef.current;

        try {
          if ("srcObject" in videoEl) {
            videoEl.srcObject = combinedStream;
          } else {
            videoEl.src = URL.createObjectURL(combinedStream);
          }
        } catch (err) {
          console.error("Video element srcObject assignment failed:", err);
          videoEl.src = URL.createObjectURL(combinedStream);
        }

        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play().catch(err => {
          console.warn("Safari autoplay prevented:", err);
        });
      }

      let jeffMediaRecorder = null;

      if (jeffSocket && jeffSocket.readyState === WebSocket.OPEN) {
        jeffMediaRecorder = setupJeffMediaRecorder(combinedStream, jeffSocket);
      } else {
        console.warn('⚠️ Jeff WebSocket not available - skipping Jeff recording');
        updateConnectionStatus('jeffWebSocket', 'error');
      }

      setRecordingState({
        jeffMediaRecorder: jeffMediaRecorder,
        jeffWebSocket: jeffSocket,
        isJeffRecording: false
      });

      let interviewIsStarted = false;
      try {
        const startMessage = {
          type: 'start_interview',
          timestamp: new Date().toISOString(),
          user_ready: true
        };
        ws.send(JSON.stringify(startMessage));
        
        interviewIsStarted = true;
        setInterviewStarted(true);
        setInterviewState(prev => ({ 
          ...prev, 
          isRecording: true
        }));
        
      } catch (startError) {
        console.error("❌ Failed to send start signal:", startError);
        setError("Failed to start interview. Please try again.");
        setOpenSnackbar(true);
        setIsConnecting(false);
        updateConnectionStatus('aiWebSocket', 'error');
        return;
      }

      try {
        setTimeout(() => {
          if (jeffMediaRecorder && jeffSocket?.readyState === WebSocket.OPEN) {
            try {
              jeffMediaRecorder.start(1000);
              const jeffSendInterval = setInterval(() => {
                if (recordingStateRef.current.isJeffRecording && 
                    recordingStateRef.current.jeffWebSocket?.readyState === WebSocket.OPEN) {
                  sendMediaChunksToJeff(recordingStateRef.current.jeffWebSocket);
                } else {
                  clearInterval(jeffSendInterval);
                }
              }, 3000);
              
            } catch (startError) {
              console.error('❌ Failed to start Jeff MediaRecorder:', startError);
              updateConnectionStatus('recording', 'error');
            }
          } else {
            console.warn('⚠️ Jeff MediaRecorder not available for starting:', {
              recorderExists: !!jeffMediaRecorder,
              socketReady: jeffSocket?.readyState === WebSocket.OPEN
            });
            updateConnectionStatus('recording', 'error');
          }
        }, 1500);
      } catch (recordingStartError) {
        console.warn("⚠️ Jeff recording start failed:", recordingStartError);
        updateConnectionStatus('recording', 'error');
      }
      
      const aiAudioStream = new MediaStream();
      mediaState.audioTestStream.getAudioTracks().forEach(track => {
        aiAudioStream.addTrack(track.clone());
      });
      
      startAudioLevelDetection(mediaState.audioTestStream);
      
      const source = aiAudioContext.createMediaStreamSource(aiAudioStream);
      const bufferSize = 4096;
      const processor = aiAudioContext.createScriptProcessor(bufferSize, 1, 1);

      const gainNode = aiAudioContext.createGain();
      gainNode.gain.value = 1.0;
      
      source.connect(gainNode);
      gainNode.connect(processor);
      processor.connect(aiAudioContext.destination);

      let chunkCount = 0;
      let lastLogTime = 0;
      
      processor.onaudioprocess = (e) => {
        const now = Date.now();
        
        if (now - lastLogTime > 5000) {
          lastLogTime = now;
        }
        
        if (!interviewIsStarted || !isRecordingRef.current) {
          return;
        }
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          if (now - lastLogTime > 5000) {
            console.warn("AI Audio blocked: websocket not ready", ws ? ws.readyState : 'null');
            updateConnectionStatus('aiWebSocket', 'error');
          }
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const maxAmplitude = Math.max(...inputData.map(Math.abs));
        const pcmData = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.min(1, Math.max(-1, inputData[i]));
          pcmData[i] = Math.round(sample * 32767);
        }

        chunkCount++;
        
        try {
          ws.send(pcmData.buffer);
          lastAudioDataRef.current = Date.now();
          
          if (chunkCount % 100 === 0) {
            console.log(`AI Audio: Sent ${chunkCount} chunks, amplitude: ${maxAmplitude.toFixed(4)}`);
          }
        } catch (sendError) {
          console.error("AI Audio send error:", sendError);
          updateConnectionStatus('aiWebSocket', 'error');
        }
      };

      setSuccess('Interview started! Recording media.');
      setOpenSnackbar(true);
      setIsConnecting(false);

    } catch (error) {
      console.error('Interview startup error:', error);
      setError('Cannot start interview: ' + error.message);
      setOpenSnackbar(true);
      setInterviewState(prev => ({ ...prev, isRecording: false }));
      setInterviewStarted(false);
      setIsConnecting(false);
      updateConnectionStatus('aiWebSocket', 'error');
      updateConnectionStatus('jeffWebSocket', 'error');
      updateConnectionStatus('recording', 'error');
    }
  };

  const endInterview = async () => {
    console.log('🔴 Ending interview...');
    
    // Stop connection monitoring
    stopConnectionMonitoring();
    
    // Stop audio level detection
    stopAudioLevelDetection();
    
    // Cleanup AI audio playback
    cleanupAudioPlayback();
    
    // Cleanup Jeff resources (MediaRecorder and WebSocket)
    cleanupJeffResources();
    
    // Cleanup combined stream
    cleanupCombinedStream();
    
    // Cleanup mixed audio context
    cleanupMixedAudioContext();
    
    // Cleanup AI audio context
    cleanupAIAudioContext();
    
    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Clean up global functions
    delete window.__registerAIAudioElement;
    delete window.__registerAIAudioNode;
    delete window.__injectAIPCM;
    delete window.__decodePCM_F32LE_Base64ToFloat32;
    
    // Update state
    setInterviewState(prev => ({ ...prev, isRecording: false }));
    setInterviewStarted(false);
    
    // Update connection status
    setConnectionStatus({
      aiWebSocket: 'disconnected',
      jeffWebSocket: 'disconnected',
      mediaStream: 'disconnected',
      recording: 'stopped'
    });

    console.log('✅ All interview resources cleaned up');
    
    // Call parent's endMeeting
    endMeeting();
  };

  const handleEndDialogOpen = () => setOpenEndDialog(true);
  const handleEndDialogClose = () => setOpenEndDialog(false);

  const getAIStatus = () => {
    if (interviewEnded) return 'ended';
    if (interviewState.isWaitingForAI) return 'waiting';
    if (aiSpeaking) return 'speaking';
    return 'student_turn';
  };

  const hasCriticalIssues = () => {
    if (!interviewStarted) return false;
    return connectionStatus.jeffWebSocket === 'error' || 
           connectionStatus.aiWebSocket === 'error' ||
           connectionStatus.mediaStream === 'error';
  };

  return (
    <Box>
      {showCountdown && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: '120px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 0 40px rgba(83, 65, 244, 0.8)',
              animation: 'pulse 1s ease-in-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.8)', opacity: 0 },
                '50%': { transform: 'scale(1.1)', opacity: 1 },
                '100%': { transform: 'scale(1)', opacity: 1 }
              }
            }}
          >
            {countdown}
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              mt: 4,
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            {countdown === 1 ? 'Get Ready!' : 'Starting in...'}
          </Typography>
          
          <Box
            sx={{
              mt: 4,
              width: '200px',
              height: '4px',
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${((6 - countdown) / 5) * 100}%`,
                bgcolor: '#5341f4',
                transition: 'width 1s linear',
                boxShadow: '0 0 20px rgba(83, 65, 244, 0.6)'
              }}
            />
          </Box>
        </Box>
      )}

      {/* Main Interview Interface */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Candidate Panel */}
        <Grid item size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', border: 'none', boxShadow:'3px 1px 1px #f0f0f0' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" >
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Candidate
                </Typography>
                {audioLevel > 0 && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="#64748b">
                      Mic:
                    </Typography>
                    <Box display="flex" gap={0.5}>
                      {[...Array(4)].map((_, i) => (
                        <Box 
                          key={i}
                          sx={{ 
                            width: 4, 
                            height: i < Math.floor(audioLevel / 25) ? 16 : 8,
                            bgcolor: i < Math.floor(audioLevel / 25) ? '#1de9b6' : '#e2e8f0',
                            borderRadius: 1
                          }} 
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Typography variant="body2" color="#64748b" mb={3}>
                Preview • Camera & Microphone
              </Typography>

              {/* Video Preview */}
              <Box 
                sx={{
                  aspectRatio: '4/3',
                  bgcolor: mediaState.cameraEnabled ? '#000' : '#f1f5f9',
                  border: '2px solid #e2e8f0',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: 2
                }}
              >
                {mediaState.cameraEnabled ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Box textAlign="center">
                    <Person sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Live preview
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      Audio-only mode
                    </Typography>
                  </Box>
                )}

                {/* Active Status Overlay */}
                {interviewStarted && (
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(34, 197, 94, 0.9)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 20
                  }}>
                    <Box sx={{
                      width: 6,
                      height: 6,
                      bgcolor: 'white',
                      borderRadius: '50%',
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 }
                      }
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Active
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Device Info */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase' }}>
                    Device
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    HD Webcam
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase' }}>
                    Microphone  
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    USB Mic
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase' }}>
                    Resolution
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    1280×720 @30fps
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>

        {/* AI Interviewer Panel */}
        <Grid item size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', border: 'none', boxShadow:'3px 1px 1px #f0f0f0' }}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  AI Interviewer
                </Typography>
                <Chip 
                  icon={<Circle sx={{ fontSize: 8 }} />}
                  label="Online" 
                  size="small"
                  sx={{ 
                    bgcolor: '#dcfce7',
                    color: '#16a34a',
                    fontWeight: 600,
                    border: '1px solid #bbf7d0',
                    '& .MuiChip-icon': { color: '#16a34a' }
                  }}
                />
              </Box>
              
              <Typography variant="body2" color="#64748b" mb={3}>
                {aiProfile.name} • Online
              </Typography>

              {/* AI Avatar */}
              <Box 
                sx={{
                  aspectRatio: '4/3',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  mb: 3,
                  color: 'white'
                }}
              >
                <Box sx={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <SmartToy sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#64748b' }}>
                  {aiProfile.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  {interviewEnded ? 'Interview Complete' : 
                   !interviewStarted ? 'Ready to Begin' : 
                   isConnecting ? 'Connecting...' : 'Online'}
                </Typography>

                {/* AI Status Indicator */}
                {interviewStarted && (
                  <Box sx={{ mt: 2 }}>
                    {getAIStatus() === 'speaking' && (
                      <Typography variant="body2" sx={{ color: '#dcfce7' }}>
                        AI is speaking...
                      </Typography>
                    )}
                    {getAIStatus() === 'waiting' && (
                      <Typography variant="body2" sx={{ color: '#fef3c7' }}>
                        Waiting for AI response...
                      </Typography>
                    )}
                    {getAIStatus() === 'student_turn' && (
                      <Typography variant="body2" sx={{ color: '#bfdbfe' }}>
                        Your turn to speak
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={startInterview}
                    disabled={!mediaState.mediaReady || interviewEnded || isLoading || isConnecting || interviewStarted}
                    startIcon={isConnecting ? <CircularProgress size={20} color="inherit" /> : <Mic />}
                    sx={{
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      fontWeight: 600,
                      bgcolor: interviewStarted ? '#5341f4' : '#5341f4',
                      color:"#f0f0f0",
                      '&:hover': {
                        bgcolor: interviewStarted ? '#16a34a' : '#2563eb',
                        transform: 'translateY(-1px)'
                      },
                      '&:disabled': {
                        bgcolor: '#e2e8f0',
                        color: '#9ca3af'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isConnecting ? 'Starting...' : 
                     interviewStarted ? 'Interview Active' : 'Start Interview'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleEndDialogOpen}
                    disabled={isLoading || isConnecting || !interviewStarted}
                    startIcon={<ExitToApp />}
                    sx={{
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        bgcolor: '#f9fafb'
                      }
                    }}
                  >
                    End Interview
                  </Button>
                </Box>
                
                <Button
                  variant="text"
                  onClick={onPreviousStep}
                  disabled={isLoading || isConnecting || interviewStarted}
                  startIcon={<ArrowBack />}
                  sx={{
                    mt: 2,
                    color: '#3b82f6',
                    '&:hover': {
                      bgcolor: '#eff6ff'
                    }
                  }}
                >
                  Back to Media Setup
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
                {interviewStarted && (
                  <Chip 
                    icon={<RadioButtonChecked sx={{ fontSize: 14 }} />}
                    label={connectionStatus.recording === 'recording' ? "Recording Active" : "Recording Paused"}
                    sx={{ 
                      bgcolor: '#1f2937',
                      color: 'white',
                      fontWeight: 600,
                      '& .MuiChip-icon': { 
                        color: connectionStatus.recording === 'recording' ? '#1de9b6' : '#ef4444',
                        animation: 'pulse 1s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 }
                        }
                      }
                    }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* End Interview Dialog */}
      <Dialog 
        open={openEndDialog} 
        onClose={handleEndDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ color: '#f59e0b', fontSize: 24 }}>⚠</Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            End interview?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <DialogContentText sx={{ mb: 2, fontSize: '1rem' }}>
            The recording will stop and be saved.
          </DialogContentText>
          
          {hasCriticalIssues() && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2,
                bgcolor: '#fffbeb',
                border: '1px solid #fed7aa'
              }}
            >
              <Typography variant="body2">
                <strong>Warning:</strong> Connection issues were detected during your interview. 
                The final report may have incomplete audio/video data.
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body2" color="#64748b">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={handleEndDialogClose} 
            sx={{ color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => { 
              handleEndDialogClose(); 
              endInterview(); 
            }} 
            variant="contained"
            color="error"
            startIcon={<ExitToApp />}
            sx={{
              color:"#F0F0F0",
              bgcolor: '#ef4444',
              '&:hover': {
                bgcolor: '#dc2626'
              }
            }}
          >
            End Interview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InterviewStep;