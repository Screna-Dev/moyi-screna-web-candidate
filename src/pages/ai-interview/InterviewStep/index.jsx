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
  VideocamOff,
  Person,
  SmartToy,
  RadioButtonChecked,
  Circle,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { generateRandomAI } from '../../../utils/randomAI';
import { MeetingService } from '../../../services';

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
  // Local state
  const [openEndDialog, setOpenEndDialog] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiProfile] = useState(generateRandomAI());
  const [isSubmittingEvents, setIsSubmittingEvents] = useState(false);
  
  // Audio level detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioLevelRef = useRef(0);
  const audioAnalyserRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  
  //倒计时
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

  // Browser events tracking
  const [browserEvents, setBrowserEvents] = useState([]);
  const browserEventsRef = useRef([]);
  const interviewStartTimeRef = useRef(null);

  // AI communication audio context (separate from MediaRecorder mixing)
  const [audioContext, setAudioContext] = useState(null);

  // ====== 🔧 新增：AI 音频播放管理器（参考 HTML 测试页）======
  const audioPlaybackContextRef = useRef(null);  // 全局复用的 AudioContext
  const audioQueueRef = useRef([]);              // 音频队列
  const isPlayingRef = useRef(false);            // 是否正在播放
  const nextStartTimeRef = useRef(0);            // 下一个音频块的开始时间

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

  // ====== 🔧 初始化 AI 音频播放上下文（全局复用）======
  const initAudioPlaybackContext = () => {
    if (!audioPlaybackContextRef.current) {
      // 🔧 关键修复：复用 Jeff 的混音上下文，而不是创建新的
      if (mixedCtxRef.current) {
        audioPlaybackContextRef.current = mixedCtxRef.current;
        console.log('✅ AI 音频播放复用 Jeff 的混音上下文');
      } else {
        // 如果混音上下文还不存在，创建新的（但这不应该发生）
        audioPlaybackContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.warn('⚠️ AI 音频播放创建了独立上下文（可能不会被录制）');
      }
      nextStartTimeRef.current = audioPlaybackContextRef.current.currentTime;
      console.log('✅ AI 音频播放上下文已初始化');
    }
  };

  // ====== 🔧 音频播放调度器 - 确保无缝播放（参考 HTML 测试页）======
  const scheduleAudioPlayback = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const ctx = audioPlaybackContextRef.current;
    
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      
      try {
        // 创建音频源
        const source = ctx.createBufferSource();
        source.buffer = audioData.buffer;
        
        // 创建增益节点用于淡入淡出
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        
        // 🔧 关键修复：连接到两个目标
        source.connect(gainNode);
        
        // 1️⃣ 连接到扬声器（用户听到）
        gainNode.connect(ctx.destination);
        
        // 2️⃣ 连接到 Jeff 的混音流（录制使用）
        if (mixedDestRef.current) {
          gainNode.connect(mixedDestRef.current);
          console.log('✅ AI 音频已连接到录制流');
        } else {
          console.warn('⚠️ 混音目标不可用，AI 音频不会被录制');
        }
        
        // 计算播放时间
        const currentTime = ctx.currentTime;
        const startTime = Math.max(currentTime, nextStartTimeRef.current);
        
        // 如果有间隙，应用短暂的淡入
        if (startTime > nextStartTimeRef.current + 0.01) {
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
        }
        
        // 在结束前应用淡出
        const duration = audioData.buffer.duration;
        const fadeOutTime = startTime + duration - 0.01;
        if (fadeOutTime > startTime) {
          gainNode.gain.setValueAtTime(1, fadeOutTime);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        }
        
        // 播放音频
        source.start(startTime);
        
        // 更新下一个播放时间
        nextStartTimeRef.current = startTime + duration;
        
        // 等待播放完成
        await new Promise(resolve => {
          source.onended = resolve;
        });
        
        console.log('✅ AI 音频块播放完成，duration:', duration.toFixed(3), 's');
        
      } catch (error) {
        console.error('❌ 播放音频块失败:', error);
      }
    }
    
    isPlayingRef.current = false;
  };

  // ====== 🔧 处理 AI 音频消息（替换原有的 playReceivedAudio）======
  const handleAIAudioMessage = async (audioMessage) => {
    try {
      // 初始化播放上下文（仅一次）
      initAudioPlaybackContext();
      const ctx = audioPlaybackContextRef.current;
      
      console.log('📨 收到 AI 音频消息:', {
        format: audioMessage.format,
        encoding: audioMessage.encoding,
        sampleRate: audioMessage.sample_rate,
        dataLength: audioMessage.data?.length
      });
      
      // 解码 Base64 数据
      const audioData = atob(audioMessage.data);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      let audioBuffer;
      
      // 根据格式处理音频
      if (audioMessage.format === 'wav') {
        // WAV 格式直接解码
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
      } else if (audioMessage.sample_rate && audioMessage.encoding) {
        // 处理 PCM 格式
        const sampleRate = audioMessage.sample_rate;
        const channels = audioMessage.channels || 1;
        
        if (audioMessage.encoding.includes('f32le')) {
          // 32 位浮点 PCM
          const floatData = new Float32Array(arrayBuffer.byteLength / 4);
          const dataView = new DataView(arrayBuffer);
          
          for (let i = 0; i < floatData.length; i++) {
            floatData[i] = dataView.getFloat32(i * 4, true);
          }
          
          // 创建 AudioBuffer
          audioBuffer = ctx.createBuffer(channels, floatData.length, sampleRate);
          const channelData = audioBuffer.getChannelData(0);
          
          // 应用高通滤波器去除 DC 偏移
          let previousSample = 0;
          const alpha = 0.98;
          
          for (let i = 0; i < floatData.length; i++) {
            channelData[i] = alpha * (previousSample + floatData[i] - (floatData[i-1] || 0));
            previousSample = channelData[i];
            channelData[i] = Math.max(-0.99, Math.min(0.99, channelData[i]));
          }
          
          // 应用淡入淡出
          const fadeLength = Math.min(100, floatData.length / 10);
          for (let i = 0; i < fadeLength; i++) {
            const fadeFactor = i / fadeLength;
            channelData[i] *= fadeFactor;
            channelData[floatData.length - 1 - i] *= fadeFactor;
          }
          
        } else {
          // 16 位 PCM（默认）
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
        console.error('❌ 不支持的音频格式:', audioMessage);
        return;
      }
      
      // 将音频缓冲添加到队列
      audioQueueRef.current.push({
        buffer: audioBuffer,
        timestamp: Date.now()
      });
      
      console.log('✅ 音频块已加入队列，当前队列长度:', audioQueueRef.current.length);
      
      // 开始播放调度
      scheduleAudioPlayback();
      
    } catch (error) {
      console.error('❌ 处理 AI 音频消息失败:', error);
      setError('AI 音频播放失败: ' + error.message);
      setOpenSnackbar(true);
    }
  };

  // ====== 🔧 清理音频播放资源 ======
  const cleanupAudioPlayback = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    if (audioPlaybackContextRef.current && audioPlaybackContextRef.current.state !== 'closed') {
      audioPlaybackContextRef.current.close().then(() => {
        console.log('✅ AI 音频播放上下文已关闭');
        audioPlaybackContextRef.current = null;
        nextStartTimeRef.current = 0;
      }).catch(err => {
        console.error('❌ 关闭音频上下文失败:', err);
      });
    }
  };

  // ====== 组件卸载时清理 ======
  useEffect(() => {
    return () => {
      cleanupAudioPlayback();
      stopAudioLevelDetection();
      stopConnectionMonitoring();
    };
  }, []);

  // ====== 🔧 监听 WebSocket 音频消息（需要在父组件中调用）======
  // 注意：这个函数需要在父组件接收到 WebSocket 消息时调用
  // 示例：if (message.type === 'audio') handleAIAudioMessage(message);
  useEffect(() => {
    // 将处理函数暴露给父组件
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
        
        addBrowserEvent('connection_status_change', {
          component,
          oldStatus: prev[component],
          newStatus: status,
          timestamp: Date.now()
        });

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

  const retryJeffConnection = async () => {
    if (!currentMeeting?.meetingId) return;

    try {
      updateConnectionStatus('jeffWebSocket', 'connecting');
      
      if (recordingStateRef.current.jeffWebSocket) {
        recordingStateRef.current.jeffWebSocket.close();
      }

      const jeffSocket = await setupJeffWebSocket();
      if (jeffSocket) {
        setRecordingState(prev => ({
          ...prev,
          jeffWebSocket: jeffSocket
        }));
        
        if (combinedStreamRef.current) {
          const jeffMediaRecorder = setupJeffMediaRecorder(combinedStreamRef.current, jeffSocket);
          setRecordingState(prev => ({
            ...prev,
            jeffMediaRecorder: jeffMediaRecorder
          }));

          if (jeffMediaRecorder && interviewStarted) {
            jeffMediaRecorder.start(1000);
          }
        }

        setSuccess('Recording connection restored!');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Failed to retry Jeff connection:', error);
      updateConnectionStatus('jeffWebSocket', 'error');
    }
  };

  const retryAIConnection = async () => {
    try {
      updateConnectionStatus('aiWebSocket', 'connecting');
      await connectToInterview();
      setSuccess('AI connection restored!');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Failed to retry AI connection:', error);
      updateConnectionStatus('aiWebSocket', 'error');
    }
  };

  const addBrowserEvent = (eventType, eventData = {}) => {
    if (!interviewStarted || !interviewStartTimeRef.current) return;
    
    const timestamp = Date.now();
    const relativeTime = timestamp - interviewStartTimeRef.current;
    
    const event = {
      type: eventType,
      timestamp: new Date(timestamp).toISOString(),
      relativeTimeMs: relativeTime,
      data: eventData
    };
    
    browserEventsRef.current.push(event);
    setBrowserEvents(prev => [...prev, event]);
    
    console.log('Browser Event Captured:', event);
  };

  useEffect(() => {
    if (!interviewStarted) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      addBrowserEvent(isHidden ? 'tab_hidden' : 'tab_visible', {
        hidden: isHidden,
        visibilityState: document.visibilityState
      });
    };

    const handleFocus = () => {
      addBrowserEvent('focus_gained', { 
        focused: true,
        timestamp: Date.now()
      });
    };

    const handleBlur = () => {
      addBrowserEvent('focus_lost', { 
        focused: false,
        timestamp: Date.now()
      });
    };

    const handleWindowFocus = () => {
      addBrowserEvent('window_focus_gained', { 
        windowFocused: true,
        timestamp: Date.now()
      });
    };

    const handleWindowBlur = () => {
      addBrowserEvent('window_focus_lost', { 
        windowFocused: false,
        timestamp: Date.now()
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('focus', handleWindowFocus, { passive: true });
    window.addEventListener('blur', handleWindowBlur, { passive: true });
    document.addEventListener('focus', handleFocus, { passive: true, capture: true });
    document.addEventListener('blur', handleBlur, { passive: true, capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, [interviewStarted]);

  const submitBrowserEvents = async () => {
    if (!currentMeeting?.meetingId || browserEventsRef.current.length === 0) {
      console.log('No browser events to submit or missing meeting ID');
      return;
    }

    setIsSubmittingEvents(true);
    
    try {
      const eventData = {
        events: browserEventsRef.current,
        summary: {
          totalEvents: browserEventsRef.current.length,
          interviewDurationMs: interviewStartTimeRef.current ? 
            Date.now() - interviewStartTimeRef.current : 0,
          eventTypes: [...new Set(browserEventsRef.current.map(e => e.type))],
          connectionIssues: browserEventsRef.current.filter(e => e.type === 'connection_status_change').length
        }
      };

      await MeetingService.submitBrowserEvents(
        currentMeeting.screeningId, 
        currentMeeting.meetingId, 
        eventData
      );

      console.log('Browser events submitted successfully:', eventData.summary);
      setSuccess(`Submitted ${browserEventsRef.current.length} browser events`);
      setOpenSnackbar(true);
      
      browserEventsRef.current = [];
      setBrowserEvents([]);
      
    } catch (error) {
      console.error('Failed to submit browser events:', error);
      setError('Failed to submit browser events: ' + (error.response?.data?.message || error.message));
      setOpenSnackbar(true);
    } finally {
      setIsSubmittingEvents(false);
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
      if (!currentMeeting?.meetingId) {
        console.warn('⚠️ Meeting ID not available for Jeff WebSocket setup');
        return null;
      }

      const baseUrl = 'wss://api.screencheckr.com/api/v1/ws';
      const mediaRecordingUrl = `${baseUrl}/media?meetingId=${currentMeeting.meetingId}`;
      
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
    // 根据后端转换参数优化的格式配置
    // maxBitrate是4Mb/s，实际设置应该更低以避免不必要的质量损失
    
    const safariFormats = [
      {
        mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        videoBitsPerSecond: 2500000,  // 2.5Mb/s - 低于maxBitrate(4Mb/s)
        audioBitsPerSecond: 28000     // 28kb/s - 匹配转换参数
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
        videoBitsPerSecond: 2000000,  // 2Mb/s - VP9压缩效率更高
        audioBitsPerSecond: 28000     // 28kb/s - 匹配转换参数
      },
      {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,  // 2.5Mb/s - VP8需要稍高比特率
        audioBitsPerSecond: 28000     // 28kb/s
      },
      {
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 28000
      }
    ];

    // 检测浏览器并返回合适的格式
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const formats = isSafari ? safariFormats : chromeFormats;
    
    // 找到第一个支持的格式
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        console.log('选择的录制格式:', format);
        console.log('预期输出: 640x480@30fps, 视频:', format.videoBitsPerSecond/1000000, 'Mb/s, 音频:', format.audioBitsPerSecond/1000, 'kb/s');
        return format;
      }
    }
    
    // 如果没有找到支持的格式，返回默认配置
    console.warn('未找到优化的录制格式，使用默认配置');
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

  const flushAudioBuffer = () => {
    if (!interviewStarted || audioDataBufferRef.current.length === 0) {
      return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ Cannot flush: AI WebSocket not connected");
      audioDataBufferRef.current = [];
      updateConnectionStatus('aiWebSocket', 'error');
      return;
    }
    
    try {
      const totalLength = audioDataBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
      const combined = new Int16Array(totalLength);
      
      let offset = 0;
      for (const buffer of audioDataBufferRef.current) {
        combined.set(buffer, offset);
        offset += buffer.length;
      }
      
      const bufferCount = audioDataBufferRef.current.length;
      audioDataBufferRef.current = [];
      
      websocket.send(combined.buffer);
      lastAudioDataRef.current = Date.now();

    } catch (sendError) {
      console.error("❌ AI buffer send error:", sendError);
      audioDataBufferRef.current = [];
      updateConnectionStatus('aiWebSocket', 'error');
    }
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

      interviewStartTimeRef.current = Date.now();
      addBrowserEvent('interview_started', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

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
      //倒计时逻辑
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

      setSuccess('Interview started! Recording media and tracking browser events.');
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
    addBrowserEvent('interview_ended', {
      timestamp: new Date().toISOString(),
      duration: interviewStartTimeRef.current ? 
        Date.now() - interviewStartTimeRef.current : 0
    });

    stopConnectionMonitoring();
    stopAudioLevelDetection();
    cleanupAudioPlayback();  // 🔧 清理 AI 音频播放资源
    
    setInterviewState(prev => ({ ...prev, isRecording: false }));
    setInterviewStarted(false);

    await submitBrowserEvents();
    
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
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
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
                    disabled={isLoading || isConnecting || !interviewStarted || isSubmittingEvents}
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
            disabled={isSubmittingEvents}
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
            disabled={isSubmittingEvents}
            startIcon={isSubmittingEvents ? <CircularProgress size={16} /> : <ExitToApp />}
            sx={{
              color:"#F0F0F0",
              bgcolor: '#ef4444',
              '&:hover': {
                bgcolor: '#dc2626'
              }
            }}
          >
            {isSubmittingEvents ? 'Ending...' : 'End Interview'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InterviewStep;