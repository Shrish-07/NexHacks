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
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private currentUser: User | null = null;

  constructor() {
    this.httpBase = this.getHttpBase();
    this.wsUrl = this.getWsUrl();
  }

  /**
   * Get HTTP base URL
   */
  private getHttpBase(): string {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    }
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    return `${protocol}://${window.location.host}`;
  }

  /**
   * Get WebSocket URL
   */
  private getWsUrl(): string {
    if (window.location.hostname === 'localhost') {
      return 'ws://localhost:3000';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
  }

  /**
   * Connect to WebSocket
   */
  connect(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.currentUser = user;

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('✅ Connected to backend');
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
            console.log('[WS Message]', data.type, data);
            this.emit(data.type, data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
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
   * Reconnect to WebSocket
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(
      `⏳ Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${(delay / 1000).toFixed(1)}s`
    );

    setTimeout(() => {
      if (this.currentUser) {
        this.connect(this.currentUser);
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
