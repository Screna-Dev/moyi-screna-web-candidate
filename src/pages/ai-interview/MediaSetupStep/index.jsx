// MediaSetupStep.js - With Permission Help Guide at Top (English Only, Using Screenshots)
import React, { useRef, useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Button, Card, Grid,
  Collapse, IconButton
} from '@mui/material';
import {
  Mic,
  Videocam,
  VideocamOff,
  CheckCircle,
  Error as ErrorIcon,
  ArrowForward,
  Person,
  Help,
  Close,
  ExpandMore,
  FiberManualRecord,
  Stop,
  PlayArrow,
  Replay
} from '@mui/icons-material';

import permissionStep2 from '@/assets/images/aiInterviewSetup/permission-step2.png';
import permissionStep3 from '@/assets/images/aiInterviewSetup/permission-step3.png';

// Add pulse animation keyframes
const pulseKeyframes = `
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
`;

// Inject the keyframes into the document
if (typeof document !== 'undefined') {
  const styleId = 'media-setup-pulse-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = pulseKeyframes;
    document.head.appendChild(style);
  }
}


function MediaSetupStep({ 
  mediaState, 
  setMediaState, 
  setError,
  setSuccess,
  setOpenSnackbar,
  onNextStep,
  isConnecting,
  isLoading
}) {
  // Refs
  const localVideoRef = useRef(null);
  const audioLevelIndicatorRef = useRef(null);
  
  // AudioContext refs
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioSourceRef = useRef(null);
  const monitoringAnimationRef = useRef(null);
  const audioEnabledRef = useRef(false);
  
  // Local state
  const [videoDebugInfo, setVideoDebugInfo] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);

  // Permission help state
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  // Voice test recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceTestComplete, setVoiceTestComplete] = useState(false);

  // Audio level for dynamic mic indicator
  const [audioLevel, setAudioLevel] = useState(0);

  // Voice test refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const playbackAudioRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const MAX_RECORDING_DURATION = 10; // Maximum recording duration in seconds

  // Sync audioEnabled to ref
  useEffect(() => {
    audioEnabledRef.current = mediaState.audioEnabled;
  }, [mediaState.audioEnabled]);

  // Update video element when stream changes
  useEffect(() => {
    if (mediaState.videoTestStream && localVideoRef.current) {
      const videoEl = localVideoRef.current;
      videoEl.srcObject = mediaState.videoTestStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(err => {
        console.warn("Safari autoplay prevented:", err);
      });
    }
  }, [mediaState.videoTestStream]);

  // Compute if all tests are complete (voice test required, video optional)
  const isSetupComplete = mediaState.audioEnabled && voiceTestComplete;

  const updateMediaReadyState = () => {
    setMediaState(prev => ({
      ...prev,
      mediaReady: prev.audioReady || prev.audioEnabled
    }));
  };

  // Cleanup audio resources
  const cleanupAudioResources = () => {
    if (monitoringAnimationRef.current) {
      cancelAnimationFrame(monitoringAnimationRef.current);
      monitoringAnimationRef.current = null;
    }

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect audio source:', e);
      }
      audioSourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        console.log('✅ AudioContext closed successfully');
      }).catch(err => {
        console.warn('⚠️ Failed to close AudioContext:', err);
      });
      audioContextRef.current = null;
    }

    audioAnalyserRef.current = null;

    if (audioLevelIndicatorRef.current) {
      audioLevelIndicatorRef.current.style.width = '0%';
    }
  };

  useEffect(() => {
    return () => {
      if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      cleanupAudioResources();
    };
  }, []);

  // Debug video setup
  const debugVideoSetup = async () => {
    let debugInfo = `Protocol: ${window.location.protocol}\n`;
    debugInfo += `MediaDevices: ${!!navigator.mediaDevices}\n`;
    debugInfo += `getUserMedia: ${!!navigator.mediaDevices?.getUserMedia}\n`;
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      debugInfo += `Video devices: ${videoDevices.length}\n`;
      if (videoDevices.length > 0) {
        debugInfo += `Primary camera: ${videoDevices[0].label || 'Unknown Camera'}\n`;
      }
    } catch (e) {
      debugInfo += `Device enum error: ${e.message}\n`;
    }
    
    setVideoDebugInfo(debugInfo);
    return debugInfo;
  };

  // Get video device
  const getVideoDevice = async () => {
    try {
      await debugVideoSetup();
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found on this system');
      }

      const constraintLevels = [         
        {            
          name: 'Basic',           
          constraints: { 
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30, max: 30 }
            }, 
            audio: false 
          }         
        },         
        {           
          name: 'Specific Device',           
          constraints: {             
            video: {               
              deviceId: videoDevices[0].deviceId,               
              width: { ideal: 640 },               
              height: { ideal: 480 },
              frameRate: { ideal: 30, max: 30 }             
            },             
            audio: false           
          }         
        },         
        {           
          name: 'HD Quality',           
          constraints: {             
            video: {               
              deviceId: videoDevices[0].deviceId,               
              width: { ideal: 1280 },               
              height: { ideal: 720 },               
              frameRate: { ideal: 30, max: 30 }             
            },             
            audio: false           
          }         
        }       
      ];

      let lastError = null;
      
      for (let i = 0; i < constraintLevels.length; i++) {
        const level = constraintLevels[i];
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia(level.constraints);
          
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length === 0) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error('No video tracks in returned stream');
          }
          
          const track = videoTracks[0];
          
          if (track.readyState !== 'live') {
            stream.getTracks().forEach(track => track.stop());
            throw new Error(`Video track is not active (state: ${track.readyState})`);
          }
          
          return stream;
          
        } catch (constraintError) {
          lastError = constraintError;
          
          if (constraintError.name === 'NotAllowedError' || 
              constraintError.name === 'PermissionDeniedError') {
            throw new Error('Camera access denied by user. Please allow camera access and try again.');
          }
        }
      }
      
      throw lastError || new Error('Failed to access camera with any constraint level');
      
    } catch (error) {
      console.error("🚨 Video device error:", error);
      
      if (error.name === 'NotFoundError' || error.message.includes('No camera devices')) {
        throw new Error('No camera found. Interview will continue in audio-only mode.');
      } else if (error.name === 'NotAllowedError' || error.message.includes('denied')) {
        throw new Error('Camera access denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is in use by another application. Please close other applications using the camera.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera does not meet the required specifications.');
      } else if (error.name === 'AbortError') {
        throw new Error('Camera access was aborted. Please try again.');
      } else if (error.name === 'TypeError') {
        throw new Error('Camera access not supported in this browser or requires HTTPS.');
      } else {
        throw new Error(`Camera error: ${error.message || 'Unknown camera error'}.`);
      }
    }
  };

  // Handle audio toggle
  const handleAudioToggle = async () => {
    if (mediaState.audioEnabled) {
      if (mediaState.audioTestStream) {
        mediaState.audioTestStream.getTracks().forEach(track => track.stop());
      }
      
      cleanupAudioResources();
      
      setMediaState(prev => ({
        ...prev,
        audioEnabled: false,
        audioReady: false,
        audioTestStream: null
      }));
      
      setPermissionError(null);
      
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        cleanupAudioResources();

        // Use default sample rate (browser's native rate) for better compatibility
        const context = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = context;

        // Resume AudioContext if it's in suspended state (required for some browsers)
        if (context.state === 'suspended') {
          await context.resume();
        }

        const source = context.createMediaStreamSource(stream);
        audioSourceRef.current = source;

        const analyser = context.createAnalyser();
        analyser.fftSize = 256; // Smaller FFT for faster response
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;

        const monitorLevels = () => {
          if (audioAnalyserRef.current && audioEnabledRef.current) {
            // Use byte frequency data for more visible response
            const bufferLength = audioAnalyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            audioAnalyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average of frequency data
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;

            // Scale to 0-100 range with amplification
            const level = Math.min(100, (average / 255) * 400);

            if (audioLevelIndicatorRef.current) {
              audioLevelIndicatorRef.current.style.width = `${level}%`;
            }
            // Update audio level state for the mic bars indicator
            setAudioLevel(level);

            if (audioEnabledRef.current) {
              monitoringAnimationRef.current = requestAnimationFrame(monitorLevels);
            }
          }
        };

        audioEnabledRef.current = true;

        setMediaState(prev => ({
          ...prev,
          audioEnabled: true,
          audioReady: true,
          audioTestStream: stream
        }));
        
        monitorLevels();
        setPermissionError(null);
        setShowPermissionHelp(false);
        
        setSuccess("Audio test successful! Microphone is working properly.");
        setOpenSnackbar(true);
        
      } catch (error) {
        console.error("❌ Audio setup failed:", error);
        
        cleanupAudioResources();
        
        let errorMessage = "Audio setup failed";
        if (error.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone access and try again.";
          setPermissionError('audio');
          setShowPermissionHelp(true);
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone.";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Microphone is in use by another application.";
        } else {
          errorMessage = `Audio setup failed: ${error.message}`;
        }
        
        setError(errorMessage);
        setOpenSnackbar(true);
      }
    }
    
    updateMediaReadyState();
  };

  // Handle video toggle
  const handleVideoToggle = async () => {
    if (mediaState.cameraEnabled) {
      if (mediaState.videoTestStream) {
        mediaState.videoTestStream.getTracks().forEach(track => track.stop());
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setMediaState(prev => ({
        ...prev,
        cameraEnabled: false,
        videoReady: false,
        videoTestStream: null
      }));
      setVideoDebugInfo('');
      setPermissionError(null);
    } else {
      setVideoLoading(true);
      try {
        const stream = await getVideoDevice();

        setMediaState(prev => ({
          ...prev,
          cameraEnabled: true,
          videoReady: true,
          videoTestStream: stream
        }));

        setPermissionError(null);
        setShowPermissionHelp(false);
        setSuccess("Camera test successful! Video is working properly.");
        setOpenSnackbar(true);
        setVideoLoading(false);
        
      } catch (error) {
        console.error("❌ Video setup failed:", error);

        let errorMessage = "Camera setup failed. Audio-only mode available.";

        if (error.name === 'NotAllowedError' || error.message.includes('denied')) {
          errorMessage = "Camera access denied. Please allow camera access in your browser settings.";
          setPermissionError('video');
          setShowPermissionHelp(true);
        } else if (error.name === 'NotReadableError' || error.message.includes('in use')) {
          errorMessage = "Camera is in use by another application.";
        } else if (error.name === 'NotFoundError' || error.message.includes('No camera')) {
          errorMessage = "No camera found. Interview will continue in audio-only mode.";
        }

        setError(errorMessage);
        setOpenSnackbar(true);

        setMediaState(prev => ({
          ...prev,
          videoReady: false,
          cameraEnabled: false
        }));

        setVideoLoading(false);
      }
    }

    updateMediaReadyState();
  };

  // Voice Test Recording Functions
  const startRecording = () => {
    if (!mediaState.audioTestStream) {
      setError("Please enable audio first before recording a voice test.");
      setOpenSnackbar(true);
      return;
    }

    // Clear previous recording
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
      setRecordedAudioBlob(null);
    }

    recordedChunksRef.current = [];
    setRecordingDuration(0);
    setVoiceTestComplete(false);

    // Get supported MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(mediaState.audioTestStream, {
        mimeType: selectedMimeType || undefined
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType || 'audio/webm'
        });
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        setIsRecording(false);

        // Clear the timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        setSuccess("Recording complete! Click play to listen to your voice.");
        setOpenSnackbar(true);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start recording duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording. Please try again.");
      setOpenSnackbar(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const playRecording = () => {
    if (!recordedAudioUrl) return;

    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }

    const audio = new Audio(recordedAudioUrl);
    playbackAudioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      setVoiceTestComplete(true);
    };
    audio.onpause = () => setIsPlaying(false);
    audio.onerror = (e) => {
      console.error("Playback error:", e);
      setIsPlaying(false);
      setError("Failed to play recording. Please try recording again.");
      setOpenSnackbar(true);
    };

    audio.play().catch(err => {
      console.error("Failed to play audio:", err);
      setError("Failed to play recording. Please try again.");
      setOpenSnackbar(true);
    });
  };

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const resetVoiceTest = () => {
    stopPlayback();
    stopRecording();

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordingDuration(0);
    setVoiceTestComplete(false);
  };

  // Cleanup voice test resources on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  // Permission Help Component with Screenshots
  const PermissionHelpGuide = () => (
    <Card 
      sx={{ 
        mb: 4,
        border: '2px solid #f59e0b',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: '#fffbeb'
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: '#f59e0b', 
          color: 'white', 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Help />
          <Typography variant="h6" fontWeight={600}>
            How to Enable Camera & Microphone Permissions
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          onClick={() => setShowPermissionHelp(false)}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Error Alert */}
        {permissionError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{permissionError === 'audio' ? 'Microphone' : 'Camera'} permission was denied.</strong> 
              {' '}Follow the steps below to enable access.
            </Typography>
          </Alert>
        )}

        {/* Step 1 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%', 
              bgcolor: '#f59e0b', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700
            }}>
              1
            </Box>
            Click the lock/info icon in the address bar
          </Typography>
          
          <Box 
            sx={{ 
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'white',
              // maxWidth: 550
            }}
          >
            <img 
              src={permissionStep2}
              alt="Click the lock icon in address bar to open site settings"
              style={{ 
                width: '100%', 
                height: 'auto',
                display: 'block'
              }}
              onError={(e) => {
                // Fallback if image not found
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          </Box>
          <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
            Look for the lock (🔒) or info (ⓘ) icon on the left side of your browser's address bar and click it.
          </Typography>
        </Box>

        {/* Step 2 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%', 
              bgcolor: '#f59e0b', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700
            }}>
              2
            </Box>
            Toggle Camera and Microphone to ON
          </Typography>
          
          <Box 
            sx={{ 
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#1f2937',
              // maxWidth: 350
            }}
          >
            <img 
              src={permissionStep3}
              alt="Toggle camera and microphone permissions to ON"
              style={{ 
                width: '100%', 
                height: 'auto',
                display: 'block'
              }}
              onError={(e) => {
                // Fallback if image not found
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          </Box>
          <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
            Make sure both Camera and Microphone toggles are switched ON (shown in purple/blue).
          </Typography>
        </Box>

        {/* Step 3 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%', 
              bgcolor: '#f59e0b', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700
            }}>
              3
            </Box>
            Refresh the page and try again
          </Typography>
          
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{
              bgcolor: '#f59e0b',
              color: 'white',
              '&:hover': { bgcolor: '#d97706' }
            }}
          >
            Refresh Page
          </Button>
        </Box>

        {/* Alternative */}
        <Alert severity="info" icon={false}>
          <Typography variant="body2">
            <strong>Still not working?</strong> Try opening your browser settings directly:
            <br />
            Chrome: Settings → Privacy and Security → Site Settings → Camera/Microphone
          </Typography>
        </Alert>
      </Box>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
        Step 1: Media Setup & Testing
      </Typography>

      {/* Permission Help Guide - At the TOP */}
      <Collapse in={showPermissionHelp}>
        <PermissionHelpGuide />
      </Collapse>

      {/* Permission Help Toggle Button - Always visible at top when not expanded */}
      {!showPermissionHelp && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            cursor: 'pointer',
            '&:hover': { bgcolor: '#dbeafe' }
          }}
          onClick={() => setShowPermissionHelp(true)}
          action={
            <IconButton size="small" color="inherit">
              <ExpandMore />
            </IconButton>
          }
        >
          <Typography variant="body2">
            <strong>Having trouble with camera or microphone?</strong> Click here for help with browser permissions.
          </Typography>
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* Left Column - Controls */}
        <Grid item size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Test Your Devices
            </Typography>
            
            {/* Audio Control */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Button
                  variant={mediaState.audioEnabled ? "contained" : "outlined"}
                  size="large"
                  onClick={handleAudioToggle}
                  disabled={isLoading || isConnecting}
                  startIcon={<Mic />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    bgcolor: mediaState.audioEnabled ? '#5341f4' : 'transparent',
                    borderColor: '#d1d5db',
                    color: mediaState.audioEnabled ? '#F0F0F0' : '#6b7280',
                    '&:hover': {
                      bgcolor: mediaState.audioEnabled ? '#5341f4' : '#f9fafb',
                      borderColor: mediaState.audioEnabled ? '#16a34a' : '#9ca3af'
                    }
                  }}
                >
                  {mediaState.audioEnabled ? "Audio: ON" : "Enable Audio"}
                </Button>
                
                {mediaState.audioReady && (
                  <CheckCircle sx={{ color: '#1de9b6', fontSize: 24 }} />
                )}
              </Box>

              {/* Audio Level Indicator */}
              {mediaState.audioEnabled && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', mb: 0.5, display: 'block' }}>
                    Microphone Level
                  </Typography>
                  <Box sx={{
                    width: '100%',
                    height: 8,
                    bgcolor: '#e2e8f0',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}>
                    <Box
                      ref={audioLevelIndicatorRef}
                      sx={{
                        height: '100%',
                        width: '0%',
                        bgcolor: '#1de9b6',
                        transition: 'width 0.1s ease'
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Voice Test Section */}
              {mediaState.audioEnabled && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px dashed #e2e8f0'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Speaker Test
                    </Typography>
                    {voiceTestComplete && (
                      <CheckCircle sx={{ color: '#1de9b6', fontSize: 16, ml: 'auto' }} />
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2, fontSize: '0.8rem' }}>
                    Record a short message, then play it back to check your speakers.
                  </Typography>

                  {/* Recording Controls - Compact style */}
                  <Box display="flex" alignItems="center" gap={1.5}>
                    {!isRecording && !recordedAudioUrl && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={startRecording}
                        startIcon={<FiberManualRecord sx={{ fontSize: 14, color: '#ef4444' }} />}
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: '#64748b',
                          bgcolor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: 1.5,
                          '&:hover': {
                            bgcolor: '#fef2f2',
                            borderColor: '#fecaca'
                          }
                        }}
                      >
                        Record
                      </Button>
                    )}

                    {isRecording && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={stopRecording}
                        startIcon={<Stop sx={{ fontSize: 14 }} />}
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: 'white',
                          bgcolor: '#ef4444',
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: '#dc2626' }
                        }}
                      >
                        Stop ({recordingDuration}s)
                      </Button>
                    )}

                    {recordedAudioUrl && !isRecording && (
                      <>
                        <Button
                          variant="text"
                          size="small"
                          onClick={isPlaying ? stopPlayback : playRecording}
                          startIcon={isPlaying ? <Stop sx={{ fontSize: 14 }} /> : <PlayArrow sx={{ fontSize: 14 }} />}
                          sx={{
                            py: 0.75,
                            px: 1.5,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: isPlaying ? 'white' : '#64748b',
                            bgcolor: isPlaying ? '#64748b' : 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 1.5,
                            '&:hover': {
                              bgcolor: isPlaying ? '#475569' : '#f1f5f9',
                              borderColor: '#cbd5e1'
                            }
                          }}
                        >
                          {isPlaying ? 'Stop' : 'Play'}
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={resetVoiceTest}
                          sx={{
                            py: 0.75,
                            px: 1.5,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#94a3b8',
                            minWidth: 'auto',
                            '&:hover': {
                              bgcolor: '#f1f5f9',
                              color: '#64748b'
                            }
                          }}
                        >
                          Redo
                        </Button>
                      </>
                    )}
                  </Box>

                  {/* Recording Progress Bar */}
                  {isRecording && (
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{
                        width: '100%',
                        height: 3,
                        bgcolor: '#fee2e2',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${(recordingDuration / MAX_RECORDING_DURATION) * 100}%`,
                            bgcolor: '#ef4444',
                            transition: 'width 1s linear'
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Status Messages */}
                  {recordedAudioUrl && !isRecording && (
                    <Box display="flex" alignItems="center" gap={1} mt={1.5}>
                      {voiceTestComplete ? (
                        <Typography variant="caption" sx={{ color: '#1de9b6', fontWeight: 500 }}>
                          Speaker test passed
                        </Typography>
                      ) : isPlaying ? (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Playing...
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Click Play to test speakers
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Video Control */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Button
                  variant={mediaState.cameraEnabled ? "contained" : "outlined"}
                  size="large"
                  onClick={handleVideoToggle}
                  disabled={isLoading || isConnecting || videoLoading}
                  startIcon={
                    videoLoading ? <CircularProgress size={20} /> :
                    mediaState.cameraEnabled ? <Videocam /> : <VideocamOff />
                  }
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    bgcolor: mediaState.cameraEnabled ? '#5341f4' : 'transparent',
                    borderColor: '#d1d5db',
                    color: mediaState.cameraEnabled ? '#F0F0F0' : '#6b7280',
                    '&:hover': {
                      bgcolor: mediaState.cameraEnabled ? '#5341f4' : '#f9fafb',
                      borderColor: mediaState.cameraEnabled ? '#16a34a' : '#9ca3af'
                    }
                  }}
                >
                  {videoLoading ? "Setting up camera..." :
                   mediaState.cameraEnabled ? "Camera: ON" : "Enable Camera"}
                </Button>
                
                {mediaState.videoReady && (
                  <CheckCircle sx={{ color: '#1de9b6', fontSize: 24 }} />
                )}
              </Box>
            </Box>

            {/* Video Debug Info */}
            {videoDebugInfo && !mediaState.videoReady && (
              <Card sx={{ mb: 3, p: 2, bgcolor: '#fffbeb', border: '1px solid #fed7aa' }}>
                <Typography variant="subtitle2" mb={1} display="flex" alignItems="center">
                  <ErrorIcon sx={{ color: '#f59e0b', mr: 1, fontSize: 16 }} />
                  Video Setup Debug Info:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  color: '#92400e'
                }}>
                  {videoDebugInfo}
                </Typography>
              </Card>
            )}

            {/* Setup Checklist */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
                Setup Checklist
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Audio Status */}
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: mediaState.audioEnabled ? '#ecfdf5' : '#f1f5f9',
                      border: `2px solid ${mediaState.audioEnabled ? '#1de9b6' : '#e2e8f0'}`
                    }}
                  >
                    {mediaState.audioEnabled && <CheckCircle sx={{ color: '#1de9b6', fontSize: 16 }} />}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: mediaState.audioEnabled ? '#1e293b' : '#64748b',
                      fontWeight: mediaState.audioEnabled ? 600 : 400
                    }}
                  >
                    Microphone enabled
                  </Typography>
                </Box>

                {/* Voice Test Status */}
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: voiceTestComplete ? '#ecfdf5' : '#f1f5f9',
                      border: `2px solid ${voiceTestComplete ? '#1de9b6' : '#e2e8f0'}`
                    }}
                  >
                    {voiceTestComplete && <CheckCircle sx={{ color: '#1de9b6', fontSize: 16 }} />}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: voiceTestComplete ? '#1e293b' : '#64748b',
                      fontWeight: voiceTestComplete ? 600 : 400
                    }}
                  >
                    Voice test completed
                  </Typography>
                </Box>

                {/* Video Status (Optional) */}
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: mediaState.cameraEnabled ? '#ecfdf5' : '#f1f5f9',
                      border: `2px solid ${mediaState.cameraEnabled ? '#1de9b6' : '#e2e8f0'}`
                    }}
                  >
                    {mediaState.cameraEnabled && <CheckCircle sx={{ color: '#1de9b6', fontSize: 16 }} />}
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: mediaState.cameraEnabled ? '#1e293b' : '#64748b',
                        fontWeight: mediaState.cameraEnabled ? 600 : 400
                      }}
                    >
                      Camera enabled
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      (optional)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

          </Box>
        </Grid>

        {/* Right Column - Video Preview */}
        <Grid item size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 3, border: 'none', boxShadow:'3px 1px 1px #f0f0f0', height: 'fit-content' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Candidate
              </Typography>
              {mediaState.audioEnabled && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Mic sx={{ fontSize: 18, color: '#64748b' }} />
                  <Box display="flex" gap={0.5} alignItems="flex-end" sx={{ height: 20 }}>
                    {[...Array(5)].map((_, i) => {
                      // Each bar represents a threshold: 5%, 20%, 40%, 60%, 80%
                      const thresholds = [5, 20, 40, 60, 80];
                      const isActive = audioLevel >= thresholds[i];
                      return (
                        <Box
                          key={i}
                          sx={{
                            width: 4,
                            height: 6 + i * 3, // Progressive heights: 6, 9, 12, 15, 18
                            bgcolor: isActive ? '#1de9b6' : '#e2e8f0',
                            borderRadius: 0.5,
                            transition: 'background-color 0.1s ease'
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
            
            <Typography variant="body2" color="#64748b" mb={3}>
              Preview • Camera & Microphone
            </Typography>

            {/* Video Preview Container */}
            <Box 
              sx={{
                aspectRatio: '4/3',
                bgcolor: '#f1f5f9',
                border: '2px solid #e2e8f0',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                mb: 3,
                overflow: 'hidden'
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  backgroundColor: '#000',
                  display: (videoLoading || !mediaState.cameraEnabled) ? 'none' : 'block'
                }}
              />
              
              {videoLoading && (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  textAlign="center"
                  p={3}
                  sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <CircularProgress sx={{ mb: 2, color: '#3b82f6' }} />
                  <Typography variant="body1" color="#64748b" sx={{ mb: 1, fontWeight: 500 }}>
                    Setting up camera...
                  </Typography>
                  <Typography variant="body2" color="#64748b">
                    Please allow camera access when prompted
                  </Typography>
                </Box>
              )}
              
              {!videoLoading && !mediaState.cameraEnabled && (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  textAlign="center"
                  p={3}
                  sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <Person sx={{ fontSize: 80, color: '#94a3b8', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500, mb: 1 }}>
                    Live preview
                  </Typography>
                  {mediaState.audioReady && (
                    <Typography variant="body2" color="#64748b">
                      Audio-only mode - Your interview will work perfectly with just audio
                    </Typography>
                  )}
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
          </Card>
        </Grid>
      </Grid>

      {/* Continue Button */}
      <Box mt={4} display="flex" justifyContent="center">
        <Button
          variant="contained"
          size="large"
          onClick={onNextStep}
          disabled={!isSetupComplete || isLoading || isConnecting || videoLoading}
          endIcon={isConnecting ? <CircularProgress size={20} /> : <ArrowForward />}
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1rem',
            fontWeight: 600,
            bgcolor: '#5341f4',
            color:"#f0f0f0",
            '&:hover': {
              bgcolor: '#2563eb',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              bgcolor: '#e2e8f0',
              color: '#9ca3af'
            },
            minWidth: 200,
            transition: 'all 0.2s ease'
          }}
        >
          {isConnecting ? "Connecting..." : "Continue to Interview"}
        </Button>
      </Box>

      {!isSetupComplete && !isConnecting && !videoLoading && (
        <Typography variant="body2" color="#64748b" textAlign="center" mt={2}>
          {!mediaState.audioEnabled
            ? "Please enable audio to continue"
            : !voiceTestComplete
            ? "Please complete the voice test (record and playback) to continue"
            : ""}
        </Typography>
      )}
      
      {videoLoading && (
        <Typography variant="body2" sx={{ color: '#3b82f6', textAlign: 'center', mt: 2 }}>
          Setting up camera... You can continue with audio-only if needed.
        </Typography>
      )}
      
      {isConnecting && (
        <Typography variant="body2" sx={{ color: '#3b82f6', textAlign: 'center', mt: 2 }}>
          Connecting to AI interview system...
        </Typography>
      )}
    </Box>
  );
}

export default MediaSetupStep;