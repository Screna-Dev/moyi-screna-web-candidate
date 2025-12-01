// BrowserEventsMonitor.js - 独立的浏览器事件监控组件
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, Chip, Button } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import API from '../../../../services/api';

// ============================================================================
// 浏览器事件收集器类
// ============================================================================
class BrowserEventsCollector {
  constructor(screeningId, meetingId, apiSubmitter, options = {}) {
    this.screeningId = screeningId;
    this.meetingId = meetingId;
    this.apiSubmitter = apiSubmitter;
    this.events = [];
    this.isCollecting = false;
    this.sessionStartTime = Date.now();
    this.switchCount = 0;
    this.lastFocusTime = Date.now();
    this.keyCount = 0;
    this.lastKeyTime = Date.now();
    
    // 配置选项
    this.options = {
      autoSubmitInterval: options.autoSubmitInterval || 30000, // 30秒自动提交
      maxEventsBuffer: options.maxEventsBuffer || 50, // 最大事件缓冲区
      keyActivityThreshold: options.keyActivityThreshold || 30, // 键盘活动统计阈值
      pauseDetectionThreshold: options.pauseDetectionThreshold || 5000, // 5秒暂停检测
      format: options.format || 'json', // 数据格式
      ...options
    };
    
    this.autoSubmitTimer = null;
    this.keyActivityTimer = null;
    this.pauseDetectionTimer = null;
    
    this.bindEvents();
  }

  startCollecting() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.sessionStartTime = Date.now();
    this.lastFocusTime = Date.now();
    
    this.addEvent('session_start', 'coding_editor', 'Browser events collection started', 0, {
      session_start: true,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    });
    
    this.startAutoSubmit();
    console.log('🔍 Browser events collection started');
  }

  stopCollecting() {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    
    this.addEvent('session_end', 'coding_editor', 'Browser events collection stopped', 0, {
      session_end: true,
      total_duration: Date.now() - this.sessionStartTime,
      total_switch_count: this.switchCount,
      total_events: this.events.length
    });
    
    this.stopAutoSubmit();
    this.stopKeyActivityTimer();
    this.stopPauseDetectionTimer();
    
    console.log('🔍 Browser events collection stopped');
  }

  bindEvents() {
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    document.addEventListener('copy', this.handleCopy.bind(this));
    document.addEventListener('paste', this.handlePaste.bind(this));
    document.addEventListener('keydown', this.handleKeyActivity.bind(this));
  }

  addEvent(type, target, details, duration = 0, data = {}) {
    if (!this.isCollecting) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type,
      target,
      details,
      duration,
      data: {
        ...data,
        session_time: Date.now() - this.sessionStartTime,
        switch_count: this.switchCount
      }
    };
    
    this.events.push(event);
    
    if (this.events.length >= this.options.maxEventsBuffer) {
      this.submitEvents();
    }
    
    console.log('📊 Event collected:', type, data);
  }

  handleWindowFocus() {
    const now = Date.now();
    const blurDuration = now - this.lastFocusTime;
    
    this.addEvent('window_focus', 'coding_editor', 'Browser window regained focus', blurDuration, {
      window_blur_duration: blurDuration,
      quick_return: blurDuration < 10000,
      suspicious_timing: blurDuration > 1000 && blurDuration < 5000
    });
    
    this.lastFocusTime = now;
  }

  handleWindowBlur() {
    const now = Date.now();
    const focusDuration = now - this.lastFocusTime;
    
    this.addEvent('window_blur', 'external', 'Browser window lost focus', 0, {
      window_focus_duration: focusDuration
    });
    
    this.switchCount++;
  }

  handleVisibilityChange() {
    const now = Date.now();
    
    if (document.hidden) {
      const focusDuration = now - this.lastFocusTime;
      this.addEvent('focus_lost', 'external', 'User left coding environment', 0, {
        focus_duration: focusDuration,
        switch_count: this.switchCount + 1,
        recent_activity: this.getRecentActivity(),
        switch_frequency: this.switchCount / ((now - this.sessionStartTime) / 60000)
      });
      this.switchCount++;
    } else {
      const blurDuration = now - this.lastFocusTime;
      this.addEvent('focus_gained', 'coding_editor', 'User returned to coding', blurDuration, {
        focus_lost_duration: blurDuration,
        switch_count: this.switchCount,
        quick_return: blurDuration < 10000,
        suspicious_timing: blurDuration > 1000 && blurDuration < 5000
      });
      this.lastFocusTime = now;
    }
  }

  handleCopy(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    this.addEvent('copy', 'coding_editor', 'Copy operation performed', 0, {
      text_length: selectedText.length,
      has_selection: selectedText.length > 0,
      large_copy: selectedText.length > 100
    });
  }

  handlePaste(event) {
    const now = Date.now();
    const timeSinceReturn = now - this.lastFocusTime;
    
    let textLength = 0;
    if (event.clipboardData) {
      const pastedText = event.clipboardData.getData('text');
      textLength = pastedText.length;
    }
    
    this.addEvent('paste', 'coding_editor', 'Content pasted', 0, {
      text_length: textLength,
      time_since_return: timeSinceReturn,
      suspicious_timing: timeSinceReturn < 5000 && textLength > 50,
      large_paste: textLength > 200,
      recent_switch: timeSinceReturn < 10000
    });
  }

  handleKeyActivity(event) {
    this.keyCount++;
    const now = Date.now();
    
    this.resetPauseDetectionTimer();
    
    if (!this.keyActivityTimer) {
      this.keyActivityTimer = setTimeout(() => {
        this.recordKeyActivity();
      }, 5000);
    }
  }

  recordKeyActivity() {
    const now = Date.now();
    const timeInterval = now - this.lastKeyTime;
    const typingSpeed = this.keyCount / (timeInterval / 1000);
    
    let speedCategory = 'normal';
    if (typingSpeed < 1) speedCategory = 'slow';
    else if (typingSpeed > 5) speedCategory = 'fast';
    
    this.addEvent('key_activity', 'coding_editor', 'Keyboard activity recorded', 0, {
      key_count: this.keyCount,
      typing_speed: speedCategory,
      keys_per_second: typingSpeed.toFixed(2),
      time_interval: timeInterval
    });
    
    this.keyCount = 0;
    this.lastKeyTime = now;
    this.keyActivityTimer = null;
  }

  resetPauseDetectionTimer() {
    if (this.pauseDetectionTimer) {
      clearTimeout(this.pauseDetectionTimer);
    }
    
    this.pauseDetectionTimer = setTimeout(() => {
      this.recordInputPause();
    }, this.options.pauseDetectionThreshold);
  }

  recordInputPause() {
    const now = Date.now();
    const pauseDuration = now - this.lastKeyTime;
    
    this.addEvent('input_pause', 'coding_editor', 'Extended input pause detected', pauseDuration, {
      pause_duration: pauseDuration,
      before_activity: this.getRecentActivity(),
      long_pause: pauseDuration > 30000
    });
  }

  getRecentActivity() {
    const recentEvents = this.events.slice(-5);
    const activityTypes = recentEvents.map(e => e.type);
    
    if (activityTypes.includes('key_activity')) return 'typing';
    if (activityTypes.includes('copy') || activityTypes.includes('paste')) return 'clipboard';
    if (activityTypes.includes('focus_lost')) return 'switching';
    return 'idle';
  }

  startAutoSubmit() {
    if (this.autoSubmitTimer) return;
    
    this.autoSubmitTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.submitEvents();
      }
    }, this.options.autoSubmitInterval);
  }

  stopAutoSubmit() {
    if (this.autoSubmitTimer) {
      clearInterval(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
  }

  stopKeyActivityTimer() {
    if (this.keyActivityTimer) {
      clearTimeout(this.keyActivityTimer);
      this.keyActivityTimer = null;
    }
  }

  stopPauseDetectionTimer() {
    if (this.pauseDetectionTimer) {
      clearTimeout(this.pauseDetectionTimer);
      this.pauseDetectionTimer = null;
    }
  }

  async submitEvents() {
    if (this.events.length === 0 || !this.apiSubmitter) return;
    
    const eventsToSubmit = [...this.events];
    
    try {
      this.events = [];
      
      await this.apiSubmitter(eventsToSubmit);
      console.log(`📤 Submitted ${eventsToSubmit.length} browser events`);
      
    } catch (error) {
      console.error('❌ Failed to submit browser events:', error);
      this.events = [...eventsToSubmit, ...this.events];
    }
  }

  async forceSubmit() {
    await this.submitEvents();
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.sessionStartTime,
      switchCount: this.switchCount,
      isCollecting: this.isCollecting,
      eventsBuffer: this.events.length
    };
  }
}

// ============================================================================
// BrowserEventsMonitor React组件
// ============================================================================
const BrowserEventsMonitor = ({
  screeningId,
  meetingId,
  isActive = false,
  onStart,
  onStop,
  onError,
  options = {},
  showUI = true,
  apiEndpoint = null // 可选的自定义API端点
}) => {
  const [collector, setCollector] = useState(null);
  const [stats, setStats] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const statsIntervalRef = useRef(null);

  // API提交函数
  const submitBrowserEvents = async (events) => {
    if (!screeningId || !meetingId) {
      throw new Error('Screening ID and Meeting ID are required');
    }

    const BASE_URL = '/screenings';
    const url = apiEndpoint || `${BASE_URL}/${screeningId}/meetings/${meetingId}/browser-events`;
    
    try {
      const response = await API.post(url, events, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(events)
      console.log(`✅ Successfully submitted ${events.length} browser events`);
      return response;
      
    } catch (error) {
      console.error('❌ Failed to submit browser events:', error);
      if (onError) onError(error);
      throw error;
    }
  };

  // 初始化收集器
  useEffect(() => {
    if (screeningId && meetingId && !collector) {
      const newCollector = new BrowserEventsCollector(
        screeningId,
        meetingId,
        submitBrowserEvents,
        {
          autoSubmitInterval: 30000,
          maxEventsBuffer: 50,
          format: 'json',
          ...options
        }
      );
      
      setCollector(newCollector);
      console.log('🔍 Browser events collector initialized');
    }
  }, [screeningId, meetingId]);

  // 监听isActive变化，自动开始/停止收集
  useEffect(() => {
    if (!collector) return;

    if (isActive && !collector.isCollecting) {
      startCollecting();
    } else if (!isActive && collector.isCollecting) {
      stopCollecting();
    }
  }, [isActive, collector]);

  // 定期更新统计信息
  useEffect(() => {
    if (!collector) return;

    statsIntervalRef.current = setInterval(() => {
      if (collector.isCollecting) {
        setStats(collector.getStats());
      }
    }, 2000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [collector]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (collector && collector.isCollecting) {
        collector.forceSubmit().then(() => {
          collector.stopCollecting();
        });
      }
    };
  }, [collector]);

  const startCollecting = () => {
    if (collector && !collector.isCollecting) {
      collector.startCollecting();
      setIsCollecting(true);
      if (onStart) onStart();
    }
  };

  const stopCollecting = async () => {
    if (collector && collector.isCollecting) {
      try {
        await collector.forceSubmit();
        collector.stopCollecting();
        setIsCollecting(false);
        if (onStop) onStop();
      } catch (error) {
        console.error('Error stopping collection:', error);
        if (onError) onError(error);
      }
    }
  };

  const forceSubmit = async () => {
    if (collector) {
      try {
        await collector.forceSubmit();
      } catch (error) {
        console.error('Error force submitting:', error);
        if (onError) onError(error);
      }
    }
  };

  // 不显示UI时返回null
  if (!showUI) {
    return null;
  }

  // 没有统计数据时不显示
  if (!stats || !isCollecting) {
    return null;
  }

  return (
    <Alert severity="success" sx={{ mb: 2 }} icon={<SecurityIcon />}>
      <Typography variant="subtitle2" fontWeight="bold" mb={1}>
        🔍 Anti-Cheating Monitoring Active
      </Typography>
      
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip 
          label={`Events: ${stats.totalEvents}`} 
          size="small" 
          color="primary" 
        />
        <Chip 
          label={`Switches: ${stats.switchCount}`} 
          size="small" 
          color={stats.switchCount > 5 ? "warning" : "success"} 
        />
        <Chip 
          label={`Session: ${Math.floor(stats.sessionDuration / 60000)}m ${Math.floor((stats.sessionDuration % 60000) / 1000)}s`} 
          size="small" 
          color="info" 
        />
        <Chip 
          label={`Buffer: ${stats.eventsBuffer}/50`} 
          size="small" 
          color={stats.eventsBuffer > 40 ? "warning" : "default"} 
        />
      </Box>

      {/* 可疑行为警告 */}
      {stats.switchCount > 10 && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
          ⚠️ High tab switching activity detected ({stats.switchCount} switches)
        </Typography>
      )}
      
      <Button 
        variant="outlined" 
        size="small" 
        onClick={forceSubmit}
        disabled={!isCollecting || stats.eventsBuffer === 0}
      >
        Submit Buffer ({stats.eventsBuffer})
      </Button>
    </Alert>
  );
};

// ============================================================================
// Hook版本 - 用于更灵活的集成
// ============================================================================
export const useBrowserEventsMonitor = (screeningId, meetingId, options = {}) => {
  const [collector, setCollector] = useState(null);
  const [stats, setStats] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState(null);

  // API提交函数
  const submitBrowserEvents = async (events) => {
    if (!screeningId || !meetingId) {
      throw new Error('Screening ID and Meeting ID are required');
    }

    const BASE_URL = '/screenings';
    const url = `${BASE_URL}/${screeningId}/meetings/${meetingId}/browser-events`;
    
    try {
      const response = await API.post(url, events, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response;
      
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  // 初始化收集器
  useEffect(() => {
    if (screeningId && meetingId && !collector) {
      const newCollector = new BrowserEventsCollector(
        screeningId,
        meetingId,
        submitBrowserEvents,
        {
          autoSubmitInterval: 30000,
          maxEventsBuffer: 50,
          format: 'json',
          ...options
        }
      );
      
      setCollector(newCollector);
    }
  }, [screeningId, meetingId]);

  // 定期更新统计信息
  useEffect(() => {
    if (!collector) return;

    const interval = setInterval(() => {
      if (collector.isCollecting) {
        setStats(collector.getStats());
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [collector]);

  const startCollecting = () => {
    if (collector && !collector.isCollecting) {
      collector.startCollecting();
      setIsCollecting(true);
      setError(null);
    }
  };

  const stopCollecting = async () => {
    if (collector && collector.isCollecting) {
      try {
        await collector.forceSubmit();
        collector.stopCollecting();
        setIsCollecting(false);
      } catch (err) {
        setError(err);
      }
    }
  };

  const forceSubmit = async () => {
    if (collector) {
      try {
        await collector.forceSubmit();
        setError(null);
      } catch (err) {
        setError(err);
      }
    }
  };

  return {
    collector,
    stats,
    isCollecting,
    error,
    startCollecting,
    stopCollecting,
    forceSubmit
  };
};

export default BrowserEventsMonitor;