/**
 * PipecatService.js
 *
 * Wrapper service for Pipecat SDK to handle AI interview communication.
 * Uses official @pipecat-ai/client-js with WebSocketTransport.
 *
 * Key improvements:
 * - Distinguish intentional (user-end) disconnects vs. unexpected disconnects
 * - Capture WebSocket close code (e.g., 1000 normal close) from error messages
 * - Pass { intentional, code } to onDisconnected so AIInterview can decide whether to reconnect
 * - Suppress onError/onMessageError during intentional shutdown
 */

import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js';
import {
  WebSocketTransport,
  ProtobufFrameSerializer,
  WavMediaManager
} from '@pipecat-ai/websocket-transport';

class PipecatService {
  constructor() {
    this.client = null;
    this.botAudioElement = null;
    this.mediaManager = null;
    this.isConnected = false;
    this.callbacks = {};

    // If true, disconnect events/errors are expected and should not trigger reconnect.
    this._intentionalDisconnect = false;

    // Last observed WebSocket close code (e.g., 1000). Best-effort extraction.
    this._lastCloseCode = null;

    // Keep a pointer to the transport if you want additional introspection later.
    this._transport = null;
  }

  /**
   * Initialize and connect to Pipecat backend
   * @param {string} wsUrl - WebSocket URL from session creation
   * @param {object} callbacks - Callback functions for various events
   */
  async connect(wsUrl, callbacks = {}) {
    this.callbacks = callbacks;

    // Reset flags for a new connection
    this._intentionalDisconnect = false;
    this._lastCloseCode = null;

    try {
      // Create media manager with correct sample rates
      // recorderChunkSize=512, recorderSampleRate=16000 (for Deepgram STT)
      this.mediaManager = new WavMediaManager(512, 16000);

      // Create serializer for Protobuf communication
      const serializer = new ProtobufFrameSerializer();

      // Create transport with proper sample rates
      const transport = new WebSocketTransport({
        serializer,
        mediaManager: this.mediaManager,
        playerSampleRate: 24000,    // Cartesia TTS output
        recorderSampleRate: 16000,  // Deepgram STT input
      });

      this._transport = transport;

      // Create client configuration
      const config = {
        transport,
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => {
            console.log('✅ Pipecat connected');
            this.isConnected = true;
            this.callbacks.onConnected?.();
          },

          /**
           * Pipecat "onDisconnected" does not always provide a close code.
           * We pass the best-known code extracted from prior error messages.
           */
          onDisconnected: () => {
            console.log('🔴 Pipecat disconnected');
            this.isConnected = false;

            const info = {
              intentional: this._intentionalDisconnect,
              code: this._lastCloseCode, // may be null if not observed
            };

            this.callbacks.onDisconnected?.(info);

            // Reset per-connection values after notifying
            this._lastCloseCode = null;
            this._intentionalDisconnect = false;
          },

          onBotReady: () => {
            console.log('🤖 Bot ready - greeting will start');
            this._setupBotAudio();
            this.callbacks.onBotReady?.();
          },

          onUserTranscript: (data) => {
            // data.text = transcribed text, data.final = is final result
            console.log(`👤 User: ${data.final ? '[FINAL]' : '[interim]'} ${data.text}`);
            this.callbacks.onUserTranscript?.(data);
          },

          onBotTranscript: (data) => {
            // data.text = AI response text
            console.log(`🤖 Bot: ${data.text}`);
            this.callbacks.onBotTranscript?.(data);
          },

          /**
           * SDK sometimes reports "connectionError" even when close code is 1000.
           * We:
           *  - best-effort parse close code
           *  - ignore errors during intentional shutdown
           */
          onMessageError: (error) => {
            this._captureCloseCodeFromError(error);

            if (this._intentionalDisconnect) return;
            console.error('❌ Pipecat message error:', error);
            this.callbacks.onError?.(error);
          },

          onError: (error) => {
            this._captureCloseCodeFromError(error);

            if (this._intentionalDisconnect) return;
            console.error('❌ Pipecat error:', error);
            this.callbacks.onError?.(error);
          },
        },
      };

      this.client = new PipecatClient(config);

      // Setup additional event listeners
      this._setupEventListeners();

      // Request microphone permission
      console.log('🎤 Requesting microphone permission...');
      await this.client.initDevices();
      console.log('✅ Microphone permission granted');

      // Connect to WebSocket
      console.log('🔗 Connecting to Pipecat WebSocket...');
      await this.client.connect({ wsUrl });

      return true;
    } catch (error) {
      console.error('❌ Pipecat connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup additional RTVI event listeners
   */
  _setupEventListeners() {
    if (!this.client) return;

    // Speaking events
    this.client.on(RTVIEvent.BotStartedSpeaking, () => {
      console.log('🔊 Bot started speaking');
      this.callbacks.onBotStartedSpeaking?.();
    });

    this.client.on(RTVIEvent.BotStoppedSpeaking, () => {
      console.log('🔇 Bot stopped speaking');
      this.callbacks.onBotStoppedSpeaking?.();
    });

    this.client.on(RTVIEvent.UserStartedSpeaking, () => {
      console.log('🎤 User started speaking');
      this.callbacks.onUserStartedSpeaking?.();
    });

    this.client.on(RTVIEvent.UserStoppedSpeaking, () => {
      console.log('🔇 User stopped speaking');
      this.callbacks.onUserStoppedSpeaking?.();
    });

    // Track events
    this.client.on(RTVIEvent.TrackStarted, (track, participant) => {
      console.log(`📹 Track started: kind=${track.kind}, local=${participant?.local}`);
      if (!participant?.local && track.kind === 'audio') {
        this._setupAudioTrack(track);
      }
    });

    this.client.on(RTVIEvent.TrackStopped, (track, participant) => {
      console.log(`📹 Track stopped: kind=${track.kind}, local=${participant?.local}`);
    });

    // TTS events (for debugging)
    this.client.on(RTVIEvent.BotTtsStarted, () => {
      console.log('🔊 Bot TTS started');
    });

    this.client.on(RTVIEvent.BotTtsStopped, () => {
      console.log('🔇 Bot TTS stopped');
    });

    // Transport state changes
    this.client.on(RTVIEvent.TransportStateChanged, (state) => {
      console.log(`🔄 Transport state: ${state}`);
      // If you want, you can treat `state === 'error'` as expected when code === 1000,
      // but it's safer to base reconnect decisions on onDisconnected(info).
    });
  }

  /**
   * Setup bot audio playback
   */
  _setupBotAudio() {
    const tracks = this.client?.tracks?.();
    if (tracks?.bot?.audio) {
      this._setupAudioTrack(tracks.bot.audio);
    }
  }

  /**
   * Connect audio track to audio element
   * @param {MediaStreamTrack} track - Audio track from bot
   */
  _setupAudioTrack(track) {
    if (!this.botAudioElement) {
      this.botAudioElement = document.createElement('audio');
      this.botAudioElement.autoplay = true;
      this.botAudioElement.id = 'pipecat-bot-audio';
      document.body.appendChild(this.botAudioElement);
      console.log('✅ Created bot audio element');
    }

    // Check if already using this track
    if (this.botAudioElement.srcObject) {
      const existingTrack = this.botAudioElement.srcObject.getAudioTracks?.()[0];
      if (existingTrack?.id === track.id) {
        console.log('⏭️ Audio track already connected');
        return;
      }
    }

    this.botAudioElement.srcObject = new MediaStream([track]);
    console.log('✅ Bot audio track connected');
  }

  /**
   * Best-effort extraction of close code from error messages/log objects.
   * Your console shows: "websocket connection closed. Code: 1000"
   * so we parse patterns like:
   *  - "Code: 1000"
   *  - "closed unexpectedly: 1000"
   */
  _captureCloseCodeFromError(error) {
    try {
      const msg = error?.message || String(error || '');

      const m1 = msg.match(/Code:\s*(\d+)/i);
      const m2 = msg.match(/closed.*?:\s*(\d+)/i);

      const codeStr = m1?.[1] || m2?.[1];
      if (codeStr) {
        const code = Number(codeStr);
        if (!Number.isNaN(code)) {
          this._lastCloseCode = code;
        }
      }
    } catch {
      // ignore parsing failures
    }
  }

  /**
   * Disconnect from Pipecat
   * @param {object} opts
   * @param {boolean} opts.intentional - set true when user ends interview
   */
  async disconnect(opts = { intentional: true }) {
    // Mark as intentional so any error/disconnect callbacks won't trigger reconnect logic
    this._intentionalDisconnect = !!opts.intentional;

    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('✅ Pipecat disconnected');
      } catch (error) {
        // If intentional, keep logs calm
        if (!this._intentionalDisconnect) {
          console.warn('⚠️ Error disconnecting Pipecat:', error);
        }
      }
      this.client = null;
    }

    if (this.botAudioElement) {
      if (this.botAudioElement.srcObject) {
        this.botAudioElement.srcObject.getTracks().forEach(track => track.stop());
        this.botAudioElement.srcObject = null;
      }
      this.botAudioElement.remove();
      this.botAudioElement = null;
    }

    this.isConnected = false;
    this.mediaManager = null;
    this._transport = null;
    this.callbacks = {};

    // IMPORTANT:
    // Do NOT force-reset _intentionalDisconnect here, because late-arriving
    // error/disconnected events can happen after disconnect() returns.
    // It will be reset at the start of connect() or after onDisconnected runs.
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  getIsConnected() {
    return this.isConnected && this.client?.state === 'ready';
  }

  /**
   * Get the bot audio element for mixing into recording
   * @returns {HTMLAudioElement|null}
   */
  getBotAudioElement() {
    return this.botAudioElement;
  }

  /**
   * Get current client state
   * @returns {string|null}
   */
  getState() {
    return this.client?.state || null;
  }
}

// Export singleton instance
const pipecatService = new PipecatService();
export default pipecatService;