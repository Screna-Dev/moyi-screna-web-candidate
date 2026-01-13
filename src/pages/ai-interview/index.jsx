import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Container, CircularProgress, Alert, Snackbar, Box, Typography,
  Avatar
} from '@mui/material';
import { Button } from "@/components/ui/button";
import { InterviewSessionService, InterviewService } from '../../services';
import PipecatService from '../../services/PipecatService';

// Import step components
import MediaSetupStep from './MediaSetupStep';
import InterviewStep from './InterviewStep';

function AIInterview() {
  const navigate = useNavigate();
  
  const params = useParams();
  const interviewId = params.interviewId;

  // Step state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Media Setup', 'Interview'];

  // Validation state - simplified, just check if interviewId exists
  const [isValidating, setIsValidating] = useState(true);
  const [interviewStatus, setInterviewStatus] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Core interview state
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [aiSpeaking, setAISpeaking] = useState(false);

  const isConnectedRef = useRef(false);
  const currentSessionRef = useRef(null);

  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);

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

  // Simple check on mount - just verify interviewId exists (NO API CALL)
  useEffect(() => {
    checkInterviewId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SIMPLIFIED: Just check if interviewId is present (no API call)
  const checkInterviewId = () => {
    if (!interviewId) {
      setInterviewStatus('invalid');
      setValidationError('Missing interview parameters. Please check the URL.');
      setIsValidating(false);
      return;
    }

    // Basic format validation (optional - adjust as needed)
    const isValidFormat = interviewId.length > 0;
    
    if (!isValidFormat) {
      setInterviewStatus('invalid');
      setValidationError('Invalid interview ID format.');
      setIsValidating(false);
      return;
    }

    console.log('✅ Interview ID present:', interviewId);
    console.log('📝 Session will be created when user clicks "Start Interview"');
    
    // Mark as valid - actual validation happens when creating session
    setInterviewStatus('valid');
    setIsValidating(false);
  };

  // Create interview session (called when starting interview)
  const createInterviewSession = async () => {
    if (currentSession) {
      console.log('✅ Session already exists:', currentSession.sessionId);
      return currentSession;
    }

    console.log('🔄 Creating interview session...');
    
    try {
      const sessionResponse = await InterviewSessionService.createInterviewSession(interviewId);
      
      console.log('Session response:', sessionResponse);
      
      if (!sessionResponse.data || !sessionResponse.data.data) {
        throw new Error('Failed to create interview session.');
      }
      
      const sessionData = sessionResponse.data.data;
      
      console.log('✅ Interview session created successfully:', sessionData.session_id);
      
      const session = {
        sessionId: sessionData.session_id,
        websocketUrl: sessionData.websocket_url,
        status: sessionData.status,
        createdAt: sessionData.created_at
      };
      
      // Set both state and ref (ref is needed for callbacks due to stale closure)
      setCurrentSession(session);
      currentSessionRef.current = session;
      return session;
      
    } catch (error) {
      console.error("Session creation error:", error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create session';
      const errorCode = error.response?.data?.errorCode;
      
      // Wrap in setTimeout to avoid setState during render cycle
      // These state updates will cause the parent to show error page
      setTimeout(() => {
        if (errorMessage.toLowerCase().includes('used') || 
            errorMessage.toLowerCase().includes('already')) {
          setInterviewStatus('used');
          setValidationError('This interview session has already been used.');
        } else if (errorMessage.toLowerCase().includes('expired')) {
          setInterviewStatus('expired');
          setValidationError('This interview session has expired.');
        } else if (errorMessage.toLowerCase().includes('not found') ||
                   errorCode === 'NOT_FOUND' ||
                   error.response?.status === 404) {
          setInterviewStatus('invalid');
          setValidationError('Interview not found. Please check the URL.');
        }
      }, 0);
      
      throw error;
    }
  };

  // Ref to track interview ended state for callbacks
  const interviewEndedRef = useRef(false);
  
  // Sync interviewEnded to ref
  useEffect(() => {
    interviewEndedRef.current = interviewEnded;
  }, [interviewEnded]);

  // Connect to Pipecat using the SDK
  // Per Pipecat design: any disconnect = session ends (no reconnection)
  const connectToInterview = async (session = null) => {
    if (interviewEndedRef.current) return;
    
    const sessionToUse = session || currentSession;
    
    if (PipecatService.getIsConnected() || !sessionToUse) {
      console.log('Cannot connect: already connected or no session', {
        isConnected: PipecatService.getIsConnected(),
        hasSession: !!sessionToUse
      });
      return;
    }

    setIsConnecting(true);
    try {
      await PipecatService.connect(sessionToUse.websocketUrl, {
        onDisconnected: (info) => {
          // Wrap in setTimeout to avoid setState during render cycle
          setTimeout(() => {
            console.log("Disconnected info:", info);
            setIsConnected(false);
            
            // Per Pipecat design: any disconnect = session ends
            // No reconnection attempts - just end the meeting
            if (!interviewEndedRef.current) {
              console.log("🔴 WebSocket disconnected - ending session (Pipecat design: disconnect = session end)");
              // 清理 video element
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
              }
              endMeeting();
            }
          }, 0);
        },
        onError: (err) => {
          // Wrap in setTimeout to avoid setState during render cycle
          setTimeout(() => {
            // Ignore errors during intentional ending
            if (interviewEndedRef.current) return;
            console.error("WebSocket error:", err);
            setError(`AI connection error: ${err.message || 'Unknown'}`);
            setOpenSnackbar(true);
          }, 0);
        },
      });
      setIsConnected(true);
      return true;
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

  const cleanupConnectionResources = async () => {
    console.log('🧹 Cleaning up connection resources...');
    
    // Disconnect Pipecat
    await PipecatService.disconnect();
    
    setIsConnected(false);
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

  const cleanupAllResources = async () => {
    console.log('🧹 Cleaning up all resources...');
    
    await cleanupConnectionResources();
    cleanupMediaStreams();
    
    setCurrentSession(null);
    currentSessionRef.current = null;
    
    console.log('✅ All resources cleaned up');
  };

  const endMeeting = async () => {
    // Prevent duplicate calls
    if (interviewEndedRef.current) {
      console.log('⚠️ endMeeting already called, skipping...');
      return;
    }

    console.log('🔴 Ending meeting...');

    // Mark ended first to prevent any further actions
    setInterviewEnded(true);
    interviewEndedRef.current = true;

    // Use ref to get current session (avoids stale closure issue)
    const session = currentSessionRef.current;
    
    // If no session was ever created, just show completion
    if (!session?.sessionId) {
      console.log('No active session - showing completion');
      setSuccess("Interview session ended.");
      setOpenSnackbar(true);
      cleanupMediaStreams();
      return;
    }

    console.log('📝 Ending session:', session.sessionId);
    setIsLoading(true);

    try {
      // Disconnect Pipecat (intentional)
      await PipecatService.disconnect({ intentional: true });

      // End module - let the backend change the module status
      await InterviewService.endTrainingModule(interviewId);
      
      // Stop media
      cleanupMediaStreams();

      setSuccess("Interview ended. Thank you for your participation!");
      setOpenSnackbar(true);
    } catch (e) {
      console.error("Error ending interview:", e);
      // Still show completion even if there's an error
      setSuccess("Interview ended. Thank you for your participation!");
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
      videoStream: mediaState.videoReady ? 'connected' : 'disconnected'
    };
  };

  const sharedProps = {
    mediaState,
    setMediaState,
    isConnected,
    currentSession,
    interviewEnded,
    error,
    setError,
    success,
    setSuccess,
    openSnackbar,
    setOpenSnackbar,
    endMeeting,
    connectToInterview,
    createInterviewSession,
    setInterviewStatus,      // Pass so InterviewStep can update status on error
    setValidationError,      // Pass so InterviewStep can set error message
    isLoading: isLoading || isConnecting
  };

  // ========== RENDER ==========

  // Show loading during initial check (very brief, no API call)
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
            Loading Interview
          </Typography>
          <Typography variant="body1" color="#64748b">
            Please wait...
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
                {currentSession ? 
                  `Session ID: ${currentSession.sessionId?.substring(0, 12) || "Unknown"} • Secure` :
                  `Interview ID: ${interviewId?.substring(0, 12) || "Unknown"} • Ready`
                }
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
                'Video Stream': connectionStatus.videoStream
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
                Your responses have been recorded successfully. Your report is currently being processed. Estimated completion time: 5-10 minutes. You may close this window; your report will be available upon completion.
              </Typography>
              <Box className = "mt-6">
                <Button size="xl" className="gradient-primary " onClick={() => navigate("/interview-prep")}>
                  Back to Interview Preparation 
                </Button>
              </Box>
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