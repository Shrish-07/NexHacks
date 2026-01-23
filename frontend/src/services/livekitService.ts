/**
 * LiveKit Service
 * Handles video streaming between patient and nurse
 */

import * as LivekitClient from 'livekit-client';
import type backendService from './backendService';

export interface VideoStreamConfig {
  onTrackSubscribed?: (track: LivekitClient.RemoteTrack, publication: LivekitClient.RemoteTrackPublication, participant: LivekitClient.RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: LivekitClient.RemoteTrack) => void;
  onTranscription?: (transcription: any) => void;
  onError?: (error: Error) => void;
}

class LiveKitService {
  private room: LivekitClient.Room | null = null;
  private audioTrack: LivekitClient.LocalAudioTrack | null = null;
  private videoTrack: LivekitClient.LocalVideoTrack | null = null;
  private config: VideoStreamConfig = {};

  /**
   * Initialize and connect to LiveKit room
   */
  async connect(
    token: string,
    url: string,
    config: VideoStreamConfig = {}
  ): Promise<LivekitClient.Room> {
    try {
      this.config = config;

      this.room = new LivekitClient.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event handlers
      this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
        console.log(`✅ Track subscribed:`, track.kind, participant.identity);
        config.onTrackSubscribed?.(track, publication, participant);
      });

      this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
        console.log(`❌ Track unsubscribed:`, track.kind);
        config.onTrackUnsubscribed?.(track);
      });

      // Handle transcription
      if (config.onTranscription) {
        (this.room as any).on('transcriptionReceived', (transcription: any) => {
          console.log('[Transcription]', transcription);
          config.onTranscription?.(transcription);
        });
      }

      await this.room.connect(url, token);
      console.log('✅ Connected to LiveKit room');

      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Publish camera video track (nurse -> patient)
   */
  async publishVideo(): Promise<LivekitClient.LocalVideoTrack> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      this.videoTrack = await LivekitClient.createLocalVideoTrack({
        resolution: {
          width: 1280,
          height: 720,
        },
      });

      await this.room.localParticipant.publishTrack(this.videoTrack);
      console.log('✅ Video track published');

      return this.videoTrack;
    } catch (error) {
      console.error('Failed to publish video:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Publish audio track (both patient & nurse)
   */
  async publishAudio(): Promise<LivekitClient.LocalAudioTrack> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      this.audioTrack = await LivekitClient.createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      await this.room.localParticipant.publishTrack(this.audioTrack);
      console.log('✅ Audio track published');

      return this.audioTrack;
    } catch (error) {
      console.error('Failed to publish audio:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get local video preview
   */
  getLocalVideoPreview(): HTMLVideoElement | null {
    if (!this.videoTrack) {
      return null;
    }

    const videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;

    this.videoTrack.attach(videoElement);
    return videoElement;
  }

  /**
   * Get camera stream for preview
   */
  async getCameraPreview(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    return stream;
  }

  /**
   * Mute/unmute audio
   */
  setAudioEnabled(enabled: boolean): void {
    if (this.audioTrack) {
      if (enabled) {
        this.audioTrack.unmute();
      } else {
        this.audioTrack.mute();
      }
    }
  }

  /**
   * Mute/unmute video
   */
  setVideoEnabled(enabled: boolean): void {
    if (this.videoTrack) {
      if (enabled) {
        this.videoTrack.unmute();
      } else {
        this.videoTrack.mute();
      }
    }
  }

  /**
   * Get all participants in room
   */
  getParticipants(): LivekitClient.RemoteParticipant[] {
    if (!this.room) {
      return [];
    }

    return Array.from(this.room.remoteParticipants.values());
  }

  /**
   * Get participant by identity
   */
  getParticipant(identity: string): LivekitClient.RemoteParticipant | undefined {
    if (!this.room) {
      return undefined;
    }

    return this.room.remoteParticipants.get(identity);
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }

    if (this.videoTrack) {
      this.videoTrack.stop();
      this.videoTrack = null;
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    console.log('✅ Disconnected from LiveKit');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    if (!this.room) {
      return false;
    }
    return (this.room as any).isConnected === true;
  }
}

export default new LiveKitService();
