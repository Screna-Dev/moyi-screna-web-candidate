import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Container, CircularProgress, Alert, Snackbar, Box, Typography,
  Chip, Avatar
} from '@mui/material';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { InterviewSessionService } from '../../services';

// Import step components
import MediaSetupStep from './MediaSetupStep';
import InterviewStep from './InterviewStep';

function AIInterview() {
  const params = useParams();
  const interviewId = params.interviewId;

  // Step state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Media Setup', 'Interview'];

  // Validation state
  const [isValidating, setIsValidating] = useState(true);
  const [interviewStatus, setInterviewStatus] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Core interview state
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [volume] = useState(50);
  const [aiSpeaking, setAISpeaking] = useState(false);

  // Initial mediaState (for reset)
  const initialMediaState = {
    audioReady: false,
    videoReady: false,
    audioEnabled: false,
    cameraEnabled: false,
    audioTestStream: null,
    videoTestStream: null,
    mediaReady: false
  };

  // Media state - shared between steps
  const [mediaState, setMediaState] = useState(initialMediaState);

  // Interview state
  const [interviewState, setInterviewState] = useState({
    isRecording: false,
    isWaitingForAI: false,
    transcripts: []
  });

  // Refs
  const heartbeatIntervalRef = useRef(null);
  const keepaliveIntervalRef = useRef(null);
  const audioDataBufferRef = useRef([]);
  const isRecordingRef = useRef(false);
  const audioPlaybackRef = useRef({
    context: null,
    queue: [],
    isPlaying: false,
    nextStartTime: 0
  });

  // Auto-reconnect control
  const aiReconnectAttemptsRef = useRef(0);
  const aiReconnectTimerRef = useRef(null);
  const MAX_AI_RECONNECT_ATTEMPTS = 5;

  const startAutoReconnectAI = () => {
    if (aiReconnectTimerRef.current) return;
    setIsReconnecting(true);
    aiReconnectTimerRef.current = setInterval(async () => {
      if (!isConnected && !interviewEnded && aiReconnectAttemptsRef.current < MAX_AI_RECONNECT_ATTEMPTS) {
        console.log(`🔄 Auto-reconnect AI attempt ${aiReconnectAttemptsRef.current + 1}`);
        aiReconnectAttemptsRef.current++;
        try {
          await connectToInterview();
          console.log('✅ Auto-reconnect AI success');
          stopAutoReconnectAI();
          setSuccess("AI connection restored!");
          setOpenSnackbar(true);
        } catch (err) {
          console.warn("❌ Auto-reconnect AI failed:", err);
        }
      }
    }, 5000);
  };

  const stopAutoReconnectAI = () => {
    if (aiReconnectTimerRef.current) {
      clearInterval(aiReconnectTimerRef.current);
      aiReconnectTimerRef.current = null;
    }
    aiReconnectAttemptsRef.current = 0;
    setIsReconnecting(false);
  };

  // Sync recording state to ref
  useEffect(() => {
    isRecordingRef.current = interviewState.isRecording;
  }, [interviewState.isRecording]);

  // Validate interview status on mount
  useEffect(() => {
    validateInterviewStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize audio playback (only once)
  useEffect(() => {
    initAudioPlayback();
    
    return () => {
      cleanupAudioPlayback();
    };
  }, []);

  // Validate interview and create session directly
  const validateInterviewStatus = async () => {
    if (!interviewId) {
      setInterviewStatus('invalid');
      setValidationError('Missing interview parameters. Please check the URL.');
      setIsValidating(false);
      return;
    }

    try {
      setIsValidating(true);
      
      console.log('✅ Interview ID valid:', interviewId);
      console.log('🔄 Creating interview session...');
      
      // Create interview session using the new API
      const sessionResponse = await InterviewSessionService.createInterviewSession(interviewId);
      
      console.log('Session response:', sessionResponse);
      
      if (!sessionResponse.data || !sessionResponse.data.data) {
        setInterviewStatus('error');
        setValidationError('Failed to create interview session.');
        setIsValidating(false);
        return;
      }
      
      const sessionData = sessionResponse.data.data;
      
      console.log('✅ Interview session created successfully:', sessionData.session_id);
      setInterviewStatus('valid');
      setCurrentSession({
        sessionId: sessionData.session_id,
        websocketUrl: sessionData.websocket_url,
        status: sessionData.status,
        createdAt: sessionData.created_at
      });
      setSuccess('Interview session created successfully!');
      setOpenSnackbar(true);
      
    } catch (error) {
      console.error("Interview validation error:", error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unable to access interview';
      const errorCode = error.response?.data?.errorCode;
      
      console.log('Error code:', errorCode);
      
      // Handle different error scenarios
      if (errorMessage.toLowerCase().includes('used') || 
          errorMessage.toLowerCase().includes('already')) {
        setInterviewStatus('used');
        setValidationError('This interview session has already been used.');
      } else if (errorMessage.toLowerCase().includes('expired')) {
        setInterviewStatus('expired');
        setValidationError('This interview session has expired.');
      } else if (errorCode === 'BAD_REQUEST') {
        setInterviewStatus('invalid');
        setValidationError(errorMessage);
      } else {
        setInterviewStatus('error');
        setValidationError(`Unable to access interview: ${errorMessage}`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Connect to AI WebSocket with Deepgram keepalive
  const connectWebSocket = async (websocketUrl, sessionId) => {
    try {
      if (websocket) {
        try {
          websocket.close();
        } catch (e) {
          console.log('Closing existing websocket:', e);
        }
      }
      
      let finalWebsocketUrl = websocketUrl;
      if (websocketUrl.startsWith('https://')) {
        finalWebsocketUrl = 'wss://' + websocketUrl.substring('https://'.length);
      } else if (websocketUrl.startsWith('http://')) {
        finalWebsocketUrl = 'ws://' + websocketUrl.substring('http://'.length);
      }
      
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(finalWebsocketUrl);
        ws.binaryType = 'arraybuffer';
        
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          setIsConnected(true);

          stopAutoReconnectAI();
          
          try {
            const config = {
              type: 'configuration',
              data: {
                encoding: 'linear16',
                sample_rate: 16000,
                channels: 1,
                interim_results: true,
                endpointing: 500,
                utterance_end_ms: 1500,
                vad_events: true,
                smart_format: true
              }
            };
            
            ws.send(JSON.stringify(config));
            
            const keepalive = {
              type: 'keepalive',
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(keepalive));
            
          } catch (configError) {
            console.warn('⚠️ Configuration send failed:', configError);
          }
          
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString()
                }));
              } catch (e) {
                console.error('Heartbeat error:', e);
              }
            }
          }, 5000);
          
          keepaliveIntervalRef.current = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                const silenceBuffer = new Int16Array(1600).fill(0);
                ws.send(silenceBuffer.buffer);
              } catch (e) {
                console.error('Keepalive audio error:', e);
              }
            }
          }, 10000);
          
          setWebsocket(ws);
          resolve(ws);
        };
        
        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          setIsConnected(false);
          
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
            keepaliveIntervalRef.current = null;
          }
          
          console.error('❌ WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          if (event.code === 1011) {
            console.error('🚨 DEEPGRAM TIMEOUT ERROR - Despite keepalives');
            setError('Connection timeout: Please try starting the interview again. If this persists, refresh the page.');
            setOpenSnackbar(true);
          } else if (event.code !== 1000 && isJoined && !interviewEnded) {
            setError(`Connection closed: ${event.reason || 'Unknown reason'}`);
            setOpenSnackbar(true);
            startAutoReconnectAI();
          }
          
          reject(new Error(`Connection closed: ${event.reason || 'Unknown'}`));
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          if (!interviewEnded) {
            setError('WebSocket connection error. Retrying...');
            setOpenSnackbar(true);
            startAutoReconnectAI();
          }
        };
        
        ws.onmessage = handleWebSocketMessage;
      });
    } catch (error) {
      console.error('❌ WebSocket setup error:', error);
      throw error;
    }
  };

  // Handle WebSocket messages from AI system
  const handleWebSocketMessage = (event) => {
    try {
      if (event.data instanceof ArrayBuffer) {
        console.log('🤖 Received binary audio data from AI:', event.data.byteLength, 'bytes');
        return;
      }
      
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'transcript':
          setInterviewState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, message],
            isWaitingForAI: message.speaker === 'ai' ? false : prev.isWaitingForAI
          }));
          break;

        case 'audio': {
          if (window.__handleAIAudioMessage) {
            window.__handleAIAudioMessage(message);
          } else {
            if (message?.format === 'raw' && message?.encoding === 'pcm_f32le' && typeof message.data === 'string') {
              const f32 = window.__decodePCM_F32LE_Base64ToFloat32?.(message.data);
              if (f32 && window.__injectAIPCM) {
                window.__injectAIPCM(f32, message.sample_rate || 24000);
                break;
              }
            }
            
            const b64 = atob(message.data);
            const buf = new ArrayBuffer(b64.length);
            const u8 = new Uint8Array(buf);
            for (let i = 0; i < b64.length; i++) u8[i] = b64.charCodeAt(i);
            playReceivedAudio(buf, message.sample_rate, message.encoding);
          }
          break;
        }

        case 'event':
          handleEventMessage(message);
          break;
          
        case 'heartbeat':
          break;
          
        default:
          console.log('❓ Unknown AI message type:', message.type, message);
      }
    } catch (error) {
      console.error('❌ AI Message handling error:', error);
    }
  };

  const initAudioPlayback = () => {
    if (!audioPlaybackRef.current.context) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      audioPlaybackRef.current.context = context;
      audioPlaybackRef.current.nextStartTime = context.currentTime;
      console.log('✅ Audio playback context initialized');
    }
    return audioPlaybackRef.current.context;
  };

  const playReceivedAudio = (audioData, sampleRate = 16000, encoding = 'pcm_s16le') => {
    if (!audioData) return;

    try {
      const context = audioPlaybackRef.current.context;
      if (!context) {
        console.error('❌ Audio context not initialized');
        return;
      }

      let audioBuffer;
      if (encoding === 'pcm_f32le') {
        const floatArray = new Float32Array(audioData.byteLength / 4);
        const dataView = new DataView(audioData);

        for (let i = 0; i < floatArray.length; i++) {
          floatArray[i] = dataView.getFloat32(i * 4, true);
        }

        audioBuffer = context.createBuffer(1, floatArray.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        const fadeLength = Math.min(100, floatArray.length / 10);
        for (let i = 0; i < floatArray.length; i++) {
          let sample = floatArray[i];
          if (i < fadeLength) sample *= i / fadeLength;
          else if (i >= floatArray.length - fadeLength) sample *= (floatArray.length - i) / fadeLength;
          channelData[i] = Math.max(-0.99, Math.min(0.99, sample));
        }

      } else {
        const int16Array = new Int16Array(audioData);
        const floatArray = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
          floatArray[i] = int16Array[i] / 32768.0;
        }

        audioBuffer = context.createBuffer(1, floatArray.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatArray);
      }

      audioPlaybackRef.current.queue.push({
        buffer: audioBuffer,
        timestamp: Date.now()
      });

      scheduleAudioPlayback();

    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const scheduleAudioPlayback = async () => {
    if (audioPlaybackRef.current.isPlaying || audioPlaybackRef.current.queue.length === 0) return;

    audioPlaybackRef.current.isPlaying = true;
    setAISpeaking(true);

    while (audioPlaybackRef.current.queue.length > 0) {
      const audioData = audioPlaybackRef.current.queue.shift();

      try {
        const context = audioPlaybackRef.current.context;
        const source = context.createBufferSource();
        source.buffer = audioData.buffer;

        const gainNode = context.createGain();
        gainNode.gain.value = volume / 100;

        source.connect(gainNode);
        gainNode.connect(context.destination);

        const currentTime = context.currentTime;
        const startTime = Math.max(currentTime, audioPlaybackRef.current.nextStartTime);

        source.start(startTime);

        audioPlaybackRef.current.nextStartTime = startTime + audioData.buffer.duration;

        await new Promise(resolve => source.onended = resolve);
      } catch (error) {
        console.error('Audio playback chunk error:', error);
      }
    }

    audioPlaybackRef.current.isPlaying = false;
    setAISpeaking(false);
  };

  const handleEventMessage = (message) => {
    if (message.event === 'error') {
      setError(message.data?.message || "Unknown error occurred");
      setOpenSnackbar(true);
    } else if (message.event === 'session_end' || message.event === 'interview_complete') {
      setSuccess('Interview completed: ' + (message.data?.reason || 'successfully'));
      endMeeting()
      setOpenSnackbar(true);
      setInterviewEnded(true);
    } else if (message.event === 'processing_start') {
      setInterviewState(prev => ({ ...prev, isWaitingForAI: true }));
    } else if (message.event === 'ai_response_start') {
      setInterviewState(prev => ({ ...prev, isWaitingForAI: false }));
    }
  };

  const cleanupAudioPlayback = () => {
    audioPlaybackRef.current.queue = [];
    audioPlaybackRef.current.isPlaying = false;

    if (audioPlaybackRef.current.context && audioPlaybackRef.current.context.state !== 'closed') {
      audioPlaybackRef.current.context.close().then(() => {
        console.log('✅ Audio playback context closed');
        audioPlaybackRef.current.context = null;
        audioPlaybackRef.current.nextStartTime = 0;
      }).catch(err => {
        console.error('❌ AudioContext cleanup error:', err);
      });
    }
  };

  const connectToInterview = async () => {
    if (isConnected || !currentSession) {
      return websocket;
    }

    setIsConnecting(true);
    
    try {
      const wsConnection = await connectWebSocket(currentSession.websocketUrl, currentSession.sessionId);
      setIsJoined(true);
      return wsConnection;
    } catch (error) {
      console.error("AI connection failed:", error);
      setError("Failed to connect to AI interview system. Please try again.");
      setOpenSnackbar(true);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNextStep = async () => {
    if (activeStep === 0 && mediaState.mediaReady && interviewStatus === 'valid') {
      try {
        setActiveStep(1);
        setSuccess("Ready for interview! Click 'Start Interview' when you're ready to begin.");
        setOpenSnackbar(true);
      } catch (error) {
        console.error("Setup failed:", error);
        setError("Failed to initialize interview system. Please try again.");
        setOpenSnackbar(true);
      }
    }
  };

  const handlePreviousStep = () => {
    if (activeStep === 1) {
      cleanupConnectionResources();
      setActiveStep(0);
    }
  };

  const cleanupConnectionResources = () => {
    console.log('🧹 Cleaning up connection resources...');
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
    
    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
      try {
        websocket.close(1000, 'Normal closure');
        console.log('✅ AI WebSocket closed');
      } catch (err) {
        console.warn('⚠️ Error closing AI WebSocket:', err);
      }
      setWebsocket(null);
    }
    
    setIsConnected(false);
    setIsJoined(false);
  };

  const cleanupMediaStreams = () => {
    console.log('🧹 Cleaning up media streams...');
    
    if (mediaState.audioTestStream) {
      console.log('🔇 Stopping audio stream tracks');
      mediaState.audioTestStream.getTracks().forEach(track => {
        track.stop();
        console.log('✅ Stopped audio track:', track.label);
      });
    }
    
    if (mediaState.videoTestStream) {
      console.log('📹 Stopping video stream tracks');
      mediaState.videoTestStream.getTracks().forEach(track => {
        track.stop();
        console.log('✅ Stopped video track:', track.label);
      });
    }
    
    setMediaState(initialMediaState);
    console.log('✅ Media state reset to initial values');
  };

  const cleanupAllResources = () => {
    console.log('🧹 Cleaning up all resources...');
    
    stopAutoReconnectAI();
    cleanupConnectionResources();
    cleanupAudioPlayback();
    cleanupMediaStreams();
    
    setCurrentSession(null);
    
    console.log('✅ All resources cleaned up');
  };

  const endMeeting = async () => {
    if (!currentSession?.sessionId) {
      setError('No active session');
      setOpenSnackbar(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔴 Ending meeting...');
      
      // Cleanup all resources
      cleanupAllResources();

      setSuccess("Interview ended. Thank you for your participation!");
      setOpenSnackbar(true);
      setInterviewEnded(true);
      
      console.log('✅ Meeting ended successfully');
    } catch (error) {
      setError(`Error ending interview: ${error.message}`);
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setError("");
    setSuccess("");
  };

  const getStatusMessage = () => {
    switch (interviewStatus) {
      case 'expired':
        return {
          title: 'Interview Session Expired',
          message: 'This interview session has expired and is no longer available.',
          severity: 'error'
        };
      case 'used':
        return {
          title: 'Interview Already Completed',
          message: 'This interview session has already been used and cannot be accessed again.',
          severity: 'warning'
        };
      case 'invalid':
        return {
          title: 'Invalid Interview Session',
          message: validationError || 'This interview session is invalid or does not exist.',
          severity: 'error'
        };
      case 'error':
        return {
          title: 'Unable to Access Interview',
          message: validationError || 'There was an error accessing this interview session.',
          severity: 'error'
        };
      default:
        return null;
    }
  };

  const getConnectionStatus = () => {
    return {
      aiService: isConnected ? 'connected' : 'disconnected',
      audioStream: mediaState.audioReady ? 'connected' : 'disconnected',
      videoStream: mediaState.videoReady ? 'connected' : 'disconnected',
      recordingServer: isJoined ? 'connected' : 'disconnected'
    };
  };

  const sharedProps = {
    mediaState,
    setMediaState,
    interviewState,
    setInterviewState,
    websocket,
    isConnected,
    currentSession,
    currentMeeting: currentSession, // For backward compatibility with child components
    interviewEnded,
    audioDataBufferRef,
    isRecordingRef,
    error,
    setError,
    success,
    setSuccess,
    openSnackbar,
    setOpenSnackbar,
    endMeeting,
    connectToInterview,
    isLoading: isLoading || isConnecting
  };

  // ========== RENDER ==========

  // Show loading during validation
  if (isValidating) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Card sx={{ p: 6, maxWidth: 500, textAlign: 'center', border: '1px solid #e2e8f0'}}>
          <CircularProgress size={48} sx={{ mb: 3, color: '#3b82f6' }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
            Preparing Interview Session
          </Typography>
          <Typography variant="body1" color="#64748b">
            Please wait while we set up your interview...
          </Typography>
        </Card>
      </Box>
    );
  }

  // Show error state if interview is not valid
  if (interviewStatus !== 'valid') {
    const statusInfo = getStatusMessage();
    
    if (statusInfo) {
      return (
        <Box 
          sx={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Card sx={{ p: 6, maxWidth: 600, border: '1px solid #e2e8f0' }}>
            <Alert 
              severity={statusInfo.severity} 
              sx={{ 
                mb: 3,
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {statusInfo.title}
              </Typography>
              <Typography variant="body1">
                {statusInfo.message}
              </Typography>
            </Alert>
            <Typography variant="body2" color="#64748b" textAlign="center">
              Please contact the administrator if you believe this is an error.
            </Typography>
          </Card>
        </Box>
      );
    }
  }

  const connectionStatus = getConnectionStatus();

  // Main render - Interview Interface
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>

        {/* Reconnecting banner */}
        {isReconnecting && !interviewEnded && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5
            }}
          >
            <HourglassTopIcon sx={{ color: '#78350f' }} fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#78350f' }}>
              Reconnecting to AI service... Please wait
            </Typography>
          </Box>
        )}

        {/* Modern Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', width: 48, height: 48 }}>
              <Typography variant="h6" fontWeight={700} color="#F0F0F0">AI</Typography>
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                AI Interview
              </Typography>
              <Typography variant="body2" color="#64748b">
                Session ID: {currentSession?.sessionId?.substring(0, 12) || "Unknown"} • Secure
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 8, height: 8, bgcolor: '#1de9b6', borderRadius: '50%' }} />
              <Typography variant="body2" sx={{ color: '#1de9b6', fontWeight: 500 }}>
                All systems go
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 8, height: 8, bgcolor: '#1de9b6', borderRadius: '50%' }} />
              <Typography variant="body2" color="#64748b">
                Services connected
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 8, height: 8, bgcolor: '#1de9b6', borderRadius: '50%' }} />
              <Typography variant="body2" color="#64748b">
                Network: Good
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Connection Status Bar */}
        <Box sx={{ mb: 3}}>
          <Box sx={{ p: 2 }}>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} alignItems="center">
              {Object.entries({
                'AI Service': connectionStatus.aiService,
                'Audio Stream': connectionStatus.audioStream,
                'Video Stream': connectionStatus.videoStream,
                'Recording Server': connectionStatus.recordingServer
              }).map(([label, status]) => (
                <Box key={label} display="flex" alignItems="center" gap={1.5}>
                  <Box 
                    sx={{ 
                      width: 10, 
                      height: 10, 
                      bgcolor: status === 'connected' ? '#1de9b6' : '#e2e8f0', 
                      borderRadius: '50%' 
                    }} 
                  />
                  <Typography variant="body2" color="#64748b" sx={{ mr: 1 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {status === 'connected' ? 'Connected' : 'Disconnected'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {interviewEnded ? (
          <Card sx={{ border: '1px solid #e2e8f0' }}>
            <Box 
              sx={{
                p: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Typography variant="h3" sx={{ color: '#3b82f6', fontWeight: 700, mb: 2 }}>
                Interview Completed
              </Typography>
              <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
                Thank you for participating in this AI interview session.
              </Typography>
              <Typography variant="body1" color="#64748b">
                Your responses have been recorded successfully. You may now close this window.
              </Typography>
            </Box>
          </Card>
        ) : (
          <Box>
            {/* Modern Progress Line with Gradient */}
            <Box sx={{ p: 3 }}>
              
              {/* Custom Progress Line */}
              <Box sx={{ position: 'relative', width: '100%', height: 6, bgcolor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${((activeStep + 1) / steps.length) * 100}%`,
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                    borderRadius: 3,
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </Box>
              
              {/* Step indicators */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                {steps.map((label, index) => (
                  <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        mt: 1, 
                        color: index === activeStep ? '#3b82f6' : '#64748b',
                        fontWeight: index === activeStep ? 600 : 400,
                        fontSize: '0.75rem'
                      }}
                    >
                      {index + 1}. {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            
            {/* Step Content */}
            <Box sx={{ p: 3 }}>
              {activeStep === 0 ? (
                <MediaSetupStep 
                    {...sharedProps}
                    onNextStep={handleNextStep}
                    isConnecting={isConnecting}
                />
              ) : (
                <InterviewStep 
                    {...sharedProps}
                    aiSpeaking={aiSpeaking}
                    onPreviousStep={handlePreviousStep}
                />
              )}
            </Box>
          </Box>
        )}
        
        {/* Modern Notifications */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={error ? "error" : "success"} 
            sx={{ 
              width: '100%',
              '& .MuiAlert-message': {
                fontWeight: 500
              }
            }}
          >
            {error || success}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default AIInterview;