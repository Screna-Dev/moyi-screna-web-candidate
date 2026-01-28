// InterviewStep.js - Creates session only when user clicks "Start Interview"
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
  Circle,
  AccessTime,
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { generateRandomAI } from '../../../utils/randomAI';
import LiveKitService from '../../../services/LiveKitService';

function InterviewStep({
  mediaState,
  interviewEnded,
  setError,
  setSuccess,
  setOpenSnackbar,
  endMeeting,
  onPreviousStep,
  connectToInterview,
  createInterviewSession,
  setInterviewStatus,
  setValidationError,
  currentSession,
  isLoading,
  aiSpeaking
}) {
  // Local state
  const [openEndDialog, setOpenEndDialog] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [aiProfile] = useState(generateRandomAI());
  
  // Audio level detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const audioAnalyserRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  
  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Interview timer state
  const [remainingTime, setRemainingTime] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const timerIntervalRef = useRef(null);

  // Connection monitoring state
  const [connectionStatus, setConnectionStatus] = useState({
    aiWebSocket: 'disconnected',
    mediaStream: 'disconnected'
  });

  // Connection monitoring refs
  const connectionMonitorRef = useRef(null);

  // Video ref for local preview
  const localVideoRef = useRef(null);

  // Set up video preview when component mounts or video stream changes
  useEffect(() => {
    if (localVideoRef.current && mediaState.videoTestStream && mediaState.cameraEnabled) {
      const videoEl = localVideoRef.current;
      videoEl.srcObject = mediaState.videoTestStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(err => {
        console.warn("Video preview autoplay prevented:", err);
      });
      console.log('✅ Video preview updated from mediaState');
    }
  }, [mediaState.videoTestStream, mediaState.cameraEnabled]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      stopAudioLevelDetection();
      stopConnectionMonitoring();
      stopInterviewTimer();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (interviewEnded) {
      console.log('🧹 InterviewStep: interviewEnded detected, cleaning up...');

      stopAudioLevelDetection();
      stopConnectionMonitoring();
      stopInterviewTimer();

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      setInterviewStarted(false);
      setConnectionStatus({
        aiWebSocket: 'disconnected',
        mediaStream: 'disconnected'
      });
    }
  }, [interviewEnded]);

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
  };

  // Connection monitoring functions
  // Note: Per Pipecat design, any disconnect = session ends
  // So we don't show "connection lost" errors - the session just ends gracefully
  const updateConnectionStatus = (component, status) => {
    setTimeout(() => {
      setConnectionStatus(prev => {
        const newStatus = { ...prev, [component]: status };
        
        if (prev[component] !== status) {
          console.log(`🔄 Connection Status Changed: ${component} -> ${status}`);

          // Only show error for media stream issues (user can fix these)
          // Don't show error for AI WebSocket disconnect - session will end gracefully
          if (component === 'mediaStream' && (status === 'error' || status === 'disconnected')) {
            setError(`Media stream lost! Please check your microphone/camera.`);
            setOpenSnackbar(true);
          }
        }
        
        return newStatus;
      });
    }, 0);
  };

  const startConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      if (!interviewStarted) return;

      // Check LiveKit connection status
      if (LiveKitService.getIsConnected()) {
        updateConnectionStatus('aiWebSocket', 'connected');
      } else {
        updateConnectionStatus('aiWebSocket', 'disconnected');
      }

      // Check media stream
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

    }, 2000);
  };

  const stopConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  };

  // Interview timer functions
  const startInterviewTimer = (durationInSeconds) => {
    if (!durationInSeconds || timerIntervalRef.current) return;

    console.log(`⏱️ Starting interview timer: ${durationInSeconds} seconds`);
    setRemainingTime(durationInSeconds);
    setTotalDuration(durationInSeconds);

    timerIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          stopInterviewTimer();
          // Auto-end interview when time runs out
          if (prev === 0) {
            console.log('⏱️ Interview time expired, auto-ending...');
            setTimeout(() => {
              setError('Interview time has expired');
              setOpenSnackbar(true);
              endInterview();
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopInterviewTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRemainingTime(null);
    setTotalDuration(null);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for circular timer
  const getProgressPercentage = () => {
    if (!totalDuration || remainingTime === null) return 100;
    return (remainingTime / totalDuration) * 100;
  };

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

  // Creates session ONLY when user clicks "Start Interview"
  const startInterview = async () => {
    try {
      if (!mediaState.mediaReady) {
        setTimeout(() => {
          setError("Media not ready. Please go back and set up your audio.");
          setOpenSnackbar(true);
        }, 0);
        return;
      }

      if (!mediaState.audioTestStream) {
        setTimeout(() => {
          setError("Audio stream not available");
          setOpenSnackbar(true);
        }, 0);
        return;
      }

      setIsConnecting(true);

      // Ensure video preview is set up
      if (localVideoRef.current && mediaState.videoTestStream && !localVideoRef.current.srcObject) {
        const videoEl = localVideoRef.current;
        videoEl.srcObject = mediaState.videoTestStream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play().catch(err => {
          console.warn("Video autoplay prevented:", err);
        });
      }

      // STEP 1: CREATE SESSION (gets LiveKit credentials)
      setIsCreatingSession(true);
      updateConnectionStatus('aiWebSocket', 'connecting');
      
      let session;
      try {
        console.log('📝 Creating interview session...');
        session = await createInterviewSession();
        console.log('✅ Session created with LiveKit credentials');
        setIsCreatingSession(false);
      } catch (sessionError) {
        console.error("❌ Session creation failed:", sessionError);
        setIsCreatingSession(false);
        updateConnectionStatus('aiWebSocket', 'error');
        setIsConnecting(false);
        return;
      }

      // STEP 2: Connect to LiveKit
      if (!LiveKitService.getIsConnected()) {
        try {
          console.log('🔌 Connecting to LiveKit...');
          await connectToInterview(session);
          updateConnectionStatus('aiWebSocket', 'connected');
        } catch (connectError) {
          console.error("❌ LiveKit connection failed:", connectError);
          setTimeout(() => {
            updateConnectionStatus('aiWebSocket', 'error');
            setError("Failed to connect to AI interview system. Please try again.");
            setOpenSnackbar(true);
            setIsConnecting(false);
          }, 0);
          return;
        }
      } else {
        updateConnectionStatus('aiWebSocket', 'connected');
      }
      // STEP 4: Countdown
      setShowCountdown(true);
      setCountdown(3);
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setShowCountdown(false);
      // STEP 3: Publish local media tracks to LiveKit
      try {
        console.log('📤 Publishing media tracks to LiveKit...');
        
        // Publish audio (required)
        await LiveKitService.setMicrophoneEnabled(true);
        
        // Publish video (optional)
        if (mediaState.cameraEnabled && mediaState.videoTestStream) {
          await LiveKitService.setCameraEnabled(true);
        }
        
        console.log('✅ Media tracks published');
      } catch (mediaError) {
        console.warn('⚠️ Failed to publish some media tracks:', mediaError);
        // Continue anyway - audio might still work
      }
      
      // STEP 5: Start the interview
      setInterviewStarted(true);

      // Start audio level detection for UI feedback
      startAudioLevelDetection(mediaState.audioTestStream);

      // Start interview timer if duration is available
      if (session?.maxInterviewDuration) {
        startInterviewTimer(session.maxInterviewDuration * 60);
      }

      setSuccess('Interview started!');
      setOpenSnackbar(true);
      setIsConnecting(false);

    } catch (error) {
      console.error('Interview startup error:', error);
      setTimeout(() => {
        setError('Cannot start interview: ' + error.message);
        setOpenSnackbar(true);
        setInterviewStarted(false);
        setIsConnecting(false);
        setIsCreatingSession(false);
        updateConnectionStatus('aiWebSocket', 'error');
      }, 0);
    }
  };

  const endInterview = async () => {
    console.log('🔴 Ending interview...');

    stopConnectionMonitoring();
    stopAudioLevelDetection();
    stopInterviewTimer();

    setInterviewStarted(false);

    setConnectionStatus({
      aiWebSocket: 'disconnected',
      mediaStream: 'disconnected'
    });

    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    console.log('✅ Interview ended');

    endMeeting();
  };

  const handleEndDialogOpen = () => setOpenEndDialog(true);
  const handleEndDialogClose = () => setOpenEndDialog(false);

  const getAIStatus = () => {
    if (interviewEnded) return 'ended';
    if (aiSpeaking) return 'speaking';
    return 'listening';
  };

  // Get button text based on current state
  const getStartButtonText = () => {
    if (isCreatingSession) return 'Creating Session...';
    if (isConnecting) return 'Connecting...';
    if (interviewStarted) return 'Interview Active';
    return 'Start Interview';
  };

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (remainingTime === null) return '#5341f4';
    if (remainingTime < 60) return '#ef4444';
    if (remainingTime < 300) return '#f59e0b';
    return '#5341f4';
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
                width: `${((4 - countdown) / 3) * 100}%`,
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
                  label={connectionStatus.aiWebSocket === 'connected' ? "Online" : "Offline"} 
                  size="small"
                  sx={{ 
                    bgcolor: connectionStatus.aiWebSocket === 'connected' ? '#dcfce7' : '#fee2e2',
                    color: connectionStatus.aiWebSocket === 'connected' ? '#16a34a' : '#dc2626',
                    fontWeight: 600,
                    border: `1px solid ${connectionStatus.aiWebSocket === 'connected' ? '#bbf7d0' : '#fecaca'}`,
                    '& .MuiChip-icon': { 
                      color: connectionStatus.aiWebSocket === 'connected' ? '#16a34a' : '#dc2626' 
                    }
                  }}
                />
              </Box>
              
              <Typography variant="body2" color="#64748b" mb={3}>
                {aiProfile.name} • {connectionStatus.aiWebSocket === 'connected' ? 'Online' : 'Offline'}
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
                   isCreatingSession ? 'Creating Session...' :
                   isConnecting ? 'Connecting...' : 'Online'}
                </Typography>

                {/* AI Status Indicator */}
                {interviewStarted && (
                  <Box sx={{ mt: 2 }}>
                    {getAIStatus() === 'speaking' && (
                      <Typography variant="body2" sx={{ color: '#16a34a' }}>
                        AI is speaking...
                      </Typography>
                    )}
                    {getAIStatus() === 'listening' && (
                      <Typography variant="body2" sx={{ color: '#3b82f6' }}>
                        Listening to you...
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
                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant="contained"
                    size="large"
                    onClick={startInterview}
                    disabled={!mediaState.mediaReady || interviewEnded || isLoading || isConnecting || isCreatingSession || interviewStarted}
                    startIcon={(isConnecting || isCreatingSession) ? <CircularProgress size={20} color="inherit" /> : <Mic />}
                    sx={{
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      fontWeight: 600,
                      bgcolor: interviewStarted ? '#16a34a' : '#5341f4',
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
                    {getStartButtonText()}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleEndDialogOpen}
                    disabled={isLoading || isConnecting || isCreatingSession || !interviewStarted}
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

                  {/* Compact Circular Timer - Inline with buttons */}
                  {remainingTime !== null && interviewStarted && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        ml: 2,
                        pl: 2,
                        borderLeft: '1px solid #e2e8f0'
                      }}
                    >
                      {/* Circular Progress Ring */}
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        {/* Background circle */}
                        <CircularProgress
                          variant="determinate"
                          value={100}
                          size={44}
                          thickness={3}
                          sx={{
                            color: '#f1f5f9',
                            position: 'absolute'
                          }}
                        />
                        {/* Progress circle */}
                        <CircularProgress
                          variant="determinate"
                          value={getProgressPercentage()}
                          size={44}
                          thickness={3}
                          sx={{
                            color: getTimerColor(),
                            transition: 'all 0.3s ease',
                            transform: 'rotate(-90deg) !important',
                            '& .MuiCircularProgress-circle': {
                              strokeLinecap: 'round',
                              transition: 'stroke-dashoffset 1s linear'
                            }
                          }}
                        />
                        {/* Center icon */}
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <AccessTime 
                            sx={{ 
                              fontSize: 18, 
                              color: getTimerColor(),
                              transition: 'color 0.3s ease'
                            }} 
                          />
                        </Box>
                      </Box>

                      {/* Time Display */}
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            color: getTimerColor(),
                            fontFamily: 'monospace',
                            fontSize: '1.1rem',
                            lineHeight: 1.2,
                            transition: 'color 0.3s ease'
                          }}
                        >
                          {formatTime(remainingTime)}
                        </Typography>
                        {remainingTime < 60 && remainingTime > 0 ? (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#ef4444', 
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              animation: 'blink 1s infinite',
                              '@keyframes blink': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.5 }
                              }
                            }}
                          >
                            Ending soon
                          </Typography>
                        ) : (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#94a3b8', 
                              fontSize: '0.65rem' 
                            }}
                          >
                            remaining
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
                
                <Button
                  variant="text"
                  onClick={onPreviousStep}
                  disabled={isLoading || isConnecting || isCreatingSession || interviewStarted}
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
                    label="Interview In Progress"
                    sx={{
                      bgcolor: '#1f2937',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                )}

                {/* Session info - only show when session exists */}
                {currentSession && (
                  <Typography variant="caption" color="#64748b">
                    Session: {currentSession.sessionId?.substring(0, 8)}...
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Info Alert - Show when no session yet */}
      {!currentSession && !interviewStarted && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2, 
            mx: 3,
            bgcolor: '#eff6ff',
            border: '1px solid #bfdbfe'
          }}
        >
          <Typography variant="body2">
            <strong>Ready to start:</strong> Your interview session will be created when you click "Start Interview". 
            You can safely go back to media setup without using your interview token.
          </Typography>
        </Alert>
      )}

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
            Are you sure you want to end the interview?
          </DialogContentText>
          
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