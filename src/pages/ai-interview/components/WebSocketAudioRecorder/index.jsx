// src/layouts/pages/ai-interview/components/WebSocketAudioRecorder.js
class WebSocketAudioRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.destination = null;
    this.isRecording = false;
    this.audioBufferQueue = [];
  }

  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100 // Higher quality for recording
      });

      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create a destination node that can be used as MediaStream source
      this.destination = this.audioContext.createMediaStreamDestination();
      
      // Create MediaRecorder from the destination stream
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

      if (!selectedMimeType) {
        throw new Error('No supported audio MIME types found');
      }

      this.mediaRecorder = new MediaRecorder(this.destination.stream, {
        mimeType: selectedMimeType
      });

      // Handle recorded data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('📼 Recording stopped, total chunks:', this.recordedChunks.length);
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
      };

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio recorder:', error);
      return false;
    }
  }

  startRecording() {
    if (!this.mediaRecorder || this.isRecording) {
      console.warn('⚠️ Cannot start recording - not initialized or already recording');
      return false;
    }

    if (this.mediaRecorder.state !== 'inactive') {
      console.warn('⚠️ MediaRecorder not in inactive state:', this.mediaRecorder.state);
      return false;
    }

    try {
      this.recordedChunks = [];
      this.mediaRecorder.start(1000); // Record in 1-second chunks
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('⚠️ Cannot stop recording - not currently recording');
      return null;
    }

    if (this.mediaRecorder.state === 'inactive') {
      console.warn('⚠️ MediaRecorder already inactive');
      return null;
    }

    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Return a promise that resolves when the recording is ready
      return new Promise((resolve) => {
        const checkStopped = () => {
          if (this.mediaRecorder.state === 'inactive') {
            const result = this.createFinalRecording();
            resolve(result);
          } else {
            setTimeout(checkStopped, 100);
          }
        };
        checkStopped();
      });
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      return null;
    }
  }

  // Process audio data received from WebSocket
  processWebSocketAudio(audioData, sampleRate = 16000, encoding = 'pcm_s16le') {
    if (!this.audioContext || !this.destination) {
      console.warn('⚠️ Audio recorder not initialized');
      return;
    }

    if (!this.isRecording) {
      return; // Don't process if not recording
    }

    try {
      let audioBuffer;

      if (encoding === 'pcm_f32le') {
        // Handle float32 PCM data
        const floatArray = new Float32Array(audioData.byteLength / 4);
        const dataView = new DataView(audioData);
        
        for (let i = 0; i < floatArray.length; i++) {
          floatArray[i] = dataView.getFloat32(i * 4, true);
        }
        
        audioBuffer = this.audioContext.createBuffer(1, floatArray.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatArray);

      } else if (encoding === 'pcm_s16le') {
        // Handle int16 PCM data
        const int16Array = new Int16Array(audioData);
        const floatArray = new Float32Array(int16Array.length);
        
        // Convert int16 to float32
        for (let i = 0; i < int16Array.length; i++) {
          floatArray[i] = int16Array[i] / 32768.0;
        }
        
        audioBuffer = this.audioContext.createBuffer(1, floatArray.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatArray);
      } else {
        console.error('❌ Unsupported audio encoding:', encoding);
        return;
      }

      // Create buffer source and connect to destination for recording
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect to the recording destination
      source.connect(this.destination);
      
      // Start the audio (this feeds it to the MediaRecorder)
      source.start();
      
      // Optional: Add fade-in/fade-out to avoid clicks
      const gainNode = this.audioContext.createGain();
      source.disconnect();
      source.connect(gainNode);
      gainNode.connect(this.destination);
      
      const now = this.audioContext.currentTime;
      const duration = audioBuffer.duration;
      
      // Quick fade-in/out to prevent audio artifacts
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.001);
      gainNode.gain.setValueAtTime(1, now + duration - 0.001);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

    } catch (error) {
      console.error('❌ Error processing WebSocket audio:', error);
    }
  }

  createFinalRecording() {
    if (this.recordedChunks.length === 0) {
      console.warn('⚠️ No audio chunks to create recording');
      return null;
    }

    // Determine MIME type from MediaRecorder
    const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
    
    // Create blob from recorded chunks
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    
    // Create download URL
    const url = URL.createObjectURL(blob);
    
    return { blob, url, mimeType, size: blob.size };
  }

  downloadRecording(filename) {
    const result = this.createFinalRecording();
    if (!result) {
      console.warn('⚠️ No recording to download');
      return;
    }

    const extension = result.mimeType.includes('webm') ? 'webm' : 
                     result.mimeType.includes('mp4') ? 'mp4' : 
                     result.mimeType.includes('ogg') ? 'ogg' : 'audio';
    
    const finalFilename = filename || `ai-audio-${Date.now()}.${extension}`;
    
    const a = document.createElement('a');
    a.href = result.url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL after download
    setTimeout(() => {
      URL.revokeObjectURL(result.url);
    }, 1000);
    
    console.log('💾 Downloaded recording:', finalFilename);
    return result;
  }

  getRecordingInfo() {
    return {
      isRecording: this.isRecording,
      chunksCount: this.recordedChunks.length,
      totalSize: this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0),
      mimeType: this.mediaRecorder ? this.mediaRecorder.mimeType : null,
      state: this.mediaRecorder ? this.mediaRecorder.state : 'not initialized'
    };
  }

  cleanup() {
    // Stop recording if active
    if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('❌ Error stopping MediaRecorder during cleanup:', error);
      }
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.error('❌ Error closing AudioContext:', err);
      });
    }

    // Clear recorded chunks
    this.recordedChunks = [];
    this.audioBufferQueue = [];
    this.isRecording = false;
    
    console.log('🧹 Cleaned up WebSocket audio recorder');
  }
}

// Also export as named export for flexibility
export { WebSocketAudioRecorder };

// Default export
export default WebSocketAudioRecorder;