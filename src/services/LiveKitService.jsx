import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

class LiveKitService {
  constructor() {
    this.room = null;
    this.isConnected = false;
    this.callbacks = {};
  }

  getIsConnected() {
    return this.isConnected;
  }

  getRoom() {
    return this.room;
  }

  async connect(credentials, callbacks = {}) {
    const { url, token } = credentials;
    
    if (!url || !token) {
      throw new Error('LiveKit credentials (url, token) are required');
    }

    this.callbacks = callbacks;

    // Create Room instance
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
    });

    this._setupEventListeners();

    try {
      // Connect to LiveKit room
      await this.room.connect(url, token);
      console.log('✅ Connected to LiveKit room:', this.room.name);
      
      this.isConnected = true;
      
      if (this.callbacks.onConnected) {
        this.callbacks.onConnected();
      }

      return true;
    } catch (error) {
      console.error('❌ LiveKit connection failed:', error);
      this.isConnected = false;
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      
      throw error;
    }
  }

  _setupEventListeners() {
    if (!this.room) return;

    // Remote audio track subscribed - AI interviewer's voice
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`📥 Track subscribed: ${track.kind} from ${participant.identity}`);
      
      if (track.kind === Track.Kind.Audio) {
        // Create and attach audio element to play AI voice
        const audioElement = track.attach();
        audioElement.id = `audio-${participant.identity}`;
        document.body.appendChild(audioElement);
        console.log('🔊 AI audio element attached');
      }
      
      if (track.kind === Track.Kind.Video) {
        // If AI sends video (avatar), handle it here
        if (this.callbacks.onRemoteVideoTrack) {
          this.callbacks.onRemoteVideoTrack(track, participant);
        }
      }
    });

    // Remote track unsubscribed
    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log(`📤 Track unsubscribed: ${track.kind} from ${participant.identity}`);
      
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove());
      }
    });

    // Participant connected
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`👤 Participant joined: ${participant.identity}`);
      
      if (this.callbacks.onParticipantConnected) {
        this.callbacks.onParticipantConnected(participant);
      }
    });

    // Participant disconnected - KEY: detect interview end
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log(`👤 Participant left: ${participant.identity}`);
      
      // If AI interviewer leaves, interview has ended
      const identity = participant.identity.toLowerCase();
      if (identity.includes('interviewer') || identity.includes('agent') || identity.includes('bot')) {
        console.log('🔴 AI Interviewer disconnected - interview ended');
        
        if (this.callbacks.onInterviewEnded) {
          this.callbacks.onInterviewEnded();
        }
      }
      
      if (this.callbacks.onParticipantDisconnected) {
        this.callbacks.onParticipantDisconnected(participant);
      }
    });

    // Connection state changed
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log(`🔄 Connection state: ${state}`);
      
      if (state === ConnectionState.Connected) {
        this.isConnected = true;
      } else if (state === ConnectionState.Disconnected) {
        this.isConnected = false;
      }
      
      if (this.callbacks.onConnectionStateChanged) {
        this.callbacks.onConnectionStateChanged(state);
      }
    });

    // Room disconnected
    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log(`🔴 Room disconnected, reason: ${reason}`);
      this.isConnected = false;
      
      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected({ reason });
      }
    });

    // Active speakers changed - detect who is speaking
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (!this.room) return;
      
      const localIdentity = this.room.localParticipant?.identity;
      const isUserSpeaking = speakers.some(s => s.identity === localIdentity);
      const isAISpeaking = speakers.some(s => s.identity !== localIdentity);
      
      if (this.callbacks.onActiveSpeakersChanged) {
        this.callbacks.onActiveSpeakersChanged({ isUserSpeaking, isAISpeaking, speakers });
      }
    });

    // Data received (for transcripts if backend sends them)
    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        
        if (this.callbacks.onDataReceived) {
          this.callbacks.onDataReceived(message, participant);
        }
      } catch (e) {
        console.warn('Failed to parse data message:', e);
      }
    });
  }

  // Enable/disable microphone
  async setMicrophoneEnabled(enabled) {
    if (!this.room) {
      console.warn('Room not connected');
      return false;
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      console.log(`🎤 Microphone ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      return false;
    }
  }

  // Enable/disable camera
  async setCameraEnabled(enabled) {
    if (!this.room) {
      console.warn('Room not connected');
      return false;
    }

    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
      console.log(`📹 Camera ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      return false;
    }
  }

  // Publish existing media stream (from MediaSetupStep)
  async publishExistingTracks(audioStream, videoStream) {
    if (!this.room) {
      console.warn('Room not connected');
      return false;
    }

    try {
      // Publish audio track if available
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioTrack = await createLocalAudioTrack({
            track: audioTracks[0],
          });
          await this.room.localParticipant.publishTrack(audioTrack);
          console.log('✅ Audio track published');
        }
      }

      // Publish video track if available
      if (videoStream) {
        const videoTracks = videoStream.getVideoTracks();
        if (videoTracks.length > 0) {
          const videoTrack = await createLocalVideoTrack({
            track: videoTracks[0],
          });
          await this.room.localParticipant.publishTrack(videoTrack);
          console.log('✅ Video track published');
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to publish tracks:', error);
      return false;
    }
  }

  // Get local video track for preview
  getLocalVideoTrack() {
    if (!this.room) return null;
    
    const videoPublication = this.room.localParticipant.videoTrackPublications.values().next().value;
    return videoPublication?.track || null;
  }

  // Disconnect from room
  async disconnect(options = {}) {
    const { intentional = false } = options;
    
    console.log(`🔌 Disconnecting from LiveKit (intentional: ${intentional})`);

    if (this.room) {
      // Clean up audio elements
      document.querySelectorAll('audio[id^="audio-"]').forEach(el => {
        console.log('🧹 Removing audio element:', el.id);
        el.remove();
      });

      await this.room.disconnect();
      this.room = null;
    }

    this.isConnected = false;
    this.callbacks = {};
    
    console.log('✅ LiveKit disconnected');
  }
}

// Export singleton instance
const liveKitService = new LiveKitService();
export default liveKitService;