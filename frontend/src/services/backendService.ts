/**
 * WebSocket & Backend Communication Service
 * Handles all patient-nurse communication, alerts, and video streaming
 */

import type { User } from './authService';

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  condition: string;
  confidence: number;
  description: string;
  urgency: 'immediate' | 'urgent' | 'concerning';
  source: 'vision' | 'voice';
  transcript?: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface Patient {
  patientId: string;
  patientName: string;
  roomNumber: string;
  connected: boolean;
  status?: string;
  lastAlert?: Alert;
}

type MessageHandler = (data: any) => void;

class BackendService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private httpBase: string;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private currentUser: User | null = null;
  private readonly CONNECT_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.httpBase = this.getHttpBase();
    this.wsUrl = this.getWsUrl();
  }

  /**
   * Get HTTP base URL
   */
  private getHttpBase(): string {
    // Check environment variable first (set in Vercel dashboard for prod)
    const envBackend = import.meta.env.VITE_BACKEND_URL;
    if (envBackend) {
      console.log('📍 Using backend from env:', envBackend);
      return envBackend;
    }

    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    }
    
    // For production: Default to same domain (but can be overridden by env var above)
    // If backend is on different domain (Render), MUST set VITE_BACKEND_URL in Vercel
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const backendUrl = `${protocol}://${window.location.host}`;
    console.log('📍 Backend URL not in env, trying same domain:', backendUrl);
    return backendUrl;
  }

  /**
   * Get WebSocket URL
   */
  private getWsUrl(): string {
    const httpBase = this.getHttpBase();
    // Convert http(s) to ws(s)
    return httpBase.replace(/^http/, 'ws');
  }

  /**
   * Connect to WebSocket with health check and timeout
   */
  async connect(user: User): Promise<void> {
    // First check if backend is alive
    try {
      console.log('🔍 Checking backend health at:', this.httpBase);
      const healthResponse = await Promise.race([
        fetch(`${this.httpBase}/health`),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      const health = await healthResponse.json();
      console.log('✅ Backend is alive:', health);
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error instanceof Error ? error.message : error);
      // Continue anyway - WebSocket might still work
    }

    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.currentUser = user;

      try {
        console.log('🔌 Attempting WebSocket connection to:', this.wsUrl);
        this.ws = new WebSocket(this.wsUrl);
        let connectTimeout: ReturnType<typeof setTimeout>;

        // Set timeout for connection
        connectTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket connection timeout after', this.CONNECT_TIMEOUT / 1000, 'seconds');
            this.ws?.close();
            reject(new Error('Connection timeout - backend not responding'));
          }
        }, this.CONNECT_TIMEOUT);

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          console.log('✅ Connected to backend via WebSocket');
          this.reconnectAttempts = 0;

          if (user.role === 'patient') {
            this.registerPatient(user.id, user.name || 'Patient', user.roomNumber || '000');
          } else {
            this.registerNurse(user.id);
          }

          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WS Message]', data.type);
            this.emit(data.type, data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          clearTimeout(connectTimeout);
          const errorMsg = event instanceof Event ? 'WebSocket error' : String(event);
          console.error('❌ WebSocket error:', errorMsg);
          console.error('   Backend URL:', this.wsUrl);
          console.error('   Attempt:', this.reconnectAttempts + 1, '/', this.maxReconnectAttempts);
          this.emit('error', new Error(errorMsg));
          reject(new Error(errorMsg));
        };

        this.ws.onclose = () => {
          clearTimeout(connectTimeout);
          console.log('❌ Disconnected from backend');
          this.emit('disconnected');
          this.reconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Reconnect to WebSocket with exponential backoff
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Backend may be down.');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff: 3s, 6s, 12s, 24s, 48s (capped at ~1 min)
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 60000);

    console.log(
      `⏳ Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      if (this.currentUser) {
        this.connect(this.currentUser).catch(err => {
          console.error('Reconnect attempt failed:', err instanceof Error ? err.message : err);
        });
      }
    }, delay);
  }

  /**
   * Register as patient
   */
  private registerPatient(patientId: string, patientName: string, roomNumber: string): void {
    this.send({
      type: 'register_patient',
      patientId,
      patientName,
      roomNumber,
    });
  }

  /**
   * Register as nurse
   */
  private registerNurse(nurseId: string): void {
    this.send({
      type: 'register_nurse',
      nurseId,
    });
  }

  /**
   * Send message to backend
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queueing message:', data);
      return;
    }

    this.ws.send(JSON.stringify(data));
  }

  /**
   * Subscribe to WebSocket message type
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Emit event to subscribers
   */
  private emit(type: string, data?: any): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${type} handler:`, error);
        }
      });
    }
  }

  /**
   * Request camera stream from patient
   */
  requestStream(patientId: string): void {
    this.send({
      type: 'request_stream',
      patientId,
    });
  }

  /**
   * Send WebRTC offer
   */
  sendWebRtcOffer(patientId: string, nurseId: string, offer: RTCSessionDescriptionInit): void {
    this.send({
      type: 'webrtc_offer',
      patientId,
      nurseId,
      offer,
    });
  }

  /**
   * Send WebRTC answer
   */
  sendWebRtcAnswer(patientId: string, nurseId: string, answer: RTCSessionDescriptionInit): void {
    this.send({
      type: 'webrtc_answer',
      patientId,
      nurseId,
      answer,
    });
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(
    target: 'patient' | 'nurse',
    targetId: string,
    candidate: RTCIceCandidate
  ): void {
    this.send({
      type: 'webrtc_ice_candidate',
      target,
      [target === 'patient' ? 'patientId' : 'nurseId']: targetId,
      candidate: {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
      },
    });
  }

  /**
   * Send alert from patient
   */
  sendAlert(patientData: any, alert: any): void {
    this.send({
      type: 'alert',
      ...patientData,
      ...alert,
    });
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): Promise<any> {
    const nurseId = this.currentUser?.id || 'unknown';
    return fetch(`${this.httpBase}/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nurseId }),
    }).then((r) => r.json());
  }

  /**
   * Get LiveKit token
   */
  async getLiveKitToken(roomName: string, participantName: string): Promise<{ token: string; url: string }> {
    const response = await fetch(`${this.httpBase}/api/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    });

    if (!response.ok) {
      throw new Error('Failed to get LiveKit token');
    }

    return response.json();
  }

  /**
   * Get Overshoot config
   */
  async getOvershotConfig(): Promise<any> {
    const response = await fetch(`${this.httpBase}/api/overshoot-config`);
    if (!response.ok) {
      throw new Error('Failed to get Overshoot config');
    }
    return response.json();
  }

  /**
   * Disconnect from backend
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentUser = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new BackendService();
