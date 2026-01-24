import { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, AlertTriangle, Video, HeartPulse, Shield, Wifi, LogOut, Phone } from 'lucide-react';
import backendService from '../services/backendService';
import authService from '../services/authService';
import FaultyTerminal from '../components/FaultyTerminal';
import alertSfx from '../assets/alert.mp3';

interface PatientFeed {
  patientId: string;
  patientName: string;
  roomNumber: string;
  connected: boolean;
  hasVideo: boolean;
  status: string;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

const NURSE_ID = 'NURSE_001';
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
  { urls: ['stun:stun1.l.google.com:19302'] },
  {
    urls: [
      'turn:openrelay.metered.ca:80?transport=udp',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export default function NurseDashboard() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patients, setPatients] = useState<PatientFeed[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  // Initialize connection
  useEffect(() => {
    const init = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user || user.role !== 'nurse') {
          window.location.href = '/login';
          return;
        }

        setConnectionState('connecting');
        await backendService.connect(user);
        setConnectionState('connected');

        // Subscribe to events
        backendService.on('new_alert', async (data: any) => {
          const alert = data.alert;
          console.log('🚨 [NURSE] New alert received:', alert);
          setAlerts((prev) => [alert, ...prev].slice(0, 50));
          
          // Play visual alert sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => console.log('Alert SFX play error'));
            console.log('🔊 [NURSE] Alert SFX playing');
          }

          // Generate and play spoken alert
          try {
            const alertMessage = `ALERT: ${alert.patientName} in room ${alert.roomNumber}. ${alert.condition}. ${alert.description}`;
            console.log('🎤 [NURSE] Generating TTS for:', alertMessage);
            const response = await fetch(`${backendService.getHttpBase()}/api/alert-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: alertMessage }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log('✅ [NURSE] TTS audio generated');
              // Convert base64 to blob
              const binaryString = atob(result.audioBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: result.contentType });
              const audioUrl = URL.createObjectURL(blob);
              const audio = new Audio(audioUrl);
              audio.play().catch((error) => console.log('❌ Alert audio play error:', error));
              console.log('🎵 [NURSE] TTS audio playing');
            } else {
              console.log('❌ [NURSE] TTS generation failed:', response.status);
            }
          } catch (error) {
            console.log('❌ [NURSE] Failed to generate spoken alert:', error);
          }
        });

        backendService.on('patient_connected', (data: any) => {
          const newPatient: PatientFeed = {
            patientId: data.patientId,
            patientName: data.patientName,
            roomNumber: data.roomNumber,
            connected: true,
            hasVideo: false,
            status: 'Connected',
          };
          setPatients((prev) => {
            const exists = prev.find((p) => p.patientId === data.patientId);
            return exists ? prev : [newPatient, ...prev];
          });
          console.log('Patient connected:', data.patientName, 'Room', data.roomNumber);
        });

        backendService.on('webrtc_offer', handleWebRtcOffer);
        backendService.on('webrtc_ice_candidate', handleRemoteIceCandidate);
        backendService.on('disconnected', () => setConnectionState('disconnected'));
        backendService.on('error', () => setConnectionState('error'));

        // Initialize with empty patients list - will populate from WebSocket registrations
        setPatients([]);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setConnectionState('error');
      }
    };

    init();

    return () => {
      backendService.disconnect();
    };
  }, []);

  // Handle WebRTC offer from patient
  const handleWebRtcOffer = useCallback((data: any) => {
    const handleOffer = async () => {
      try {
        const { patientId, offer } = data;
        console.log('📥 Received WebRTC offer from patient:', patientId);
        
        const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
        console.log('🔌 RTCPeerConnection created for:', patientId);
        peerConnectionsRef.current.set(patientId, pc);
        console.log('💾 PC stored in ref map. Total connections:', peerConnectionsRef.current.size);

        // Monitor connection state changes
        pc.onconnectionstatechange = () => {
          console.log('🔗 Connection state changed for', patientId, '→', pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
          console.log('🧊 ICE connection state changed for', patientId, '→', pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
          console.log('📡 Signaling state changed for', patientId, '→', pc.signalingState);
        };

        pc.ontrack = (event) => {
          console.log('🎬 ontrack fired!', {
            trackKind: event.track.kind,
            streamsLength: event.streams.length,
            streamId: event.streams[0]?.id,
            trackId: event.track.id,
            trackEnabled: event.track.enabled,
            patientId,
          });
          
          if (event.track.kind === 'video') {
            // Store the stream for later use
            if (event.streams[0]) {
              remoteStreamsRef.current.set(patientId, event.streams[0]);
              console.log('💾 Remote stream stored for', patientId);
            }
            
            // Try to apply to video element if it exists
            const videoEl = videoElementsRef.current.get(patientId);
            console.log('📺 Video element found?', !!videoEl, {
              tagName: videoEl?.tagName,
              width: videoEl?.width,
              height: videoEl?.height,
            });
            
            if (videoEl) {
              console.log('✅ Setting srcObject immediately...');
              videoEl.srcObject = event.streams[0];
              console.log('✅ srcObject set:', {
                objectSet: !!videoEl.srcObject,
                hasVideo: videoEl.srcObject?.getVideoTracks().length,
              });
              setPatients((prev) =>
                prev.map((p) =>
                  p.patientId === patientId ? { ...p, hasVideo: true, status: 'Live' } : p
                )
              );
            } else {
              console.warn('⚠️ Video element not yet available, will apply when it mounts');
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const user = authService.getCurrentUser();
            backendService.send({
              type: 'webrtc_ice_candidate',
              target: 'patient',
              patientId,
              nurseId: user?.id,
              candidate: event.candidate,
            });
          }
        };

        console.log('🔄 Setting remote description (offer)...');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('✅ Remote description set');
        
        const answer = await pc.createAnswer();
        console.log('📝 Answer created');
        
        await pc.setLocalDescription(answer);
        console.log('✅ Local description set (answer)');

        const user = authService.getCurrentUser();
        backendService.send({
          type: 'webrtc_answer',
          patientId,
          nurseId: user?.id,
          answer,
        });
        
        console.log('📤 WebRTC answer sent to patient');
      } catch (error) {
        console.error('❌ Failed to handle WebRTC offer:', error);
      }
    };

    handleOffer();
  }, []);

  // Request video from patient
  const requestVideoFromPatient = (patientId: string) => {
    console.log('Requesting video from patient:', patientId);
    backendService.send({
      type: 'request_stream',
      patientId,
    });
  };

  // Handle remote ICE candidate
  const handleRemoteIceCandidate = useCallback((data: any) => {
    if (data.target !== 'nurse') return;
    const { patientId, candidate } = data;
    const pc = peerConnectionsRef.current.get(patientId);
    console.log('🧊 ICE candidate received:', {
      patientId,
      pcExists: !!pc,
      candidateExists: !!candidate,
      connectionState: pc?.connectionState,
    });
    if (pc && candidate) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
        console.error('❌ Failed to add ICE candidate:', error);
      });
    }
  }, []);

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  const handleLogout = () => {
    authService.logout();
    backendService.disconnect();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-50">
        <FaultyTerminal
          scale={1.3}
          digitSize={2.7}
          scanlineIntensity={0.1}
          glitchAmount={0}
          flickerAmount={0.5}
          noiseAmp={0.1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#ffffff"
          mouseReact={false}
          brightness={0.3}
        />
      </div>

      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold">ATTUNE Nurse Station</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm capitalize">{connectionState}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {unacknowledgedAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/20 to-red-500/10 border-2 border-red-500/50 rounded-xl p-6 backdrop-blur-sm shadow-lg shadow-red-500/20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
              <h2 className="text-xl font-bold text-red-300">
                {unacknowledgedAlerts.length} Alert{unacknowledgedAlerts.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900/60 backdrop-blur rounded-lg p-4 border-l-4 border-red-500 hover:bg-slate-900/80 transition-colors"
                >
                  <p className="font-bold text-red-300">{alert.patientName} - Room {alert.roomNumber}</p>
                  <p className="text-sm text-gray-300 mt-1">{alert.condition}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
                </div>
              ))}
              {unacknowledgedAlerts.length > 3 && (
                <p className="text-xs text-gray-500 text-center mt-2">+{unacknowledgedAlerts.length - 3} more alerts</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients
            .sort((a, b) => {
              // Sort patients with active alerts to the top
              const aHasAlert = alerts.some(alert => alert.patientId === a.patientId && !alert.acknowledged);
              const bHasAlert = alerts.some(alert => alert.patientId === b.patientId && !alert.acknowledged);
              return bHasAlert ? 1 : aHasAlert ? -1 : 0;
            })
            .map((patient) => {
              const hasActiveAlert = alerts.some(alert => alert.patientId === patient.patientId && !alert.acknowledged);
              const isHighPriority = hasActiveAlert;
              
              return (
            <div
              key={patient.patientId}
              className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border transition-all duration-300 transform ${
                isHighPriority 
                  ? 'md:col-span-2 lg:col-span-2 border-red-500/50 hover:border-red-500 scale-105 shadow-2xl shadow-red-500/30 hover:scale-110'
                  : 'border-white/10 hover:border-white/20 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20'
              }`}
            >
              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden group">
                <video
                  ref={(el) => {
                    if (el) {
                      videoElementsRef.current.set(patient.patientId, el);
                      console.log('📹 Video element mounted for:', patient.patientId, {
                        refSet: videoElementsRef.current.has(patient.patientId),
                        totalRefs: videoElementsRef.current.size,
                      });
                      
                      // Check if we have a stored remote stream waiting to be applied
                      const storedStream = remoteStreamsRef.current.get(patient.patientId);
                      if (storedStream) {
                        console.log('🔄 Applying stored remote stream to', patient.patientId);
                        el.srcObject = storedStream;
                        console.log('✅ Stored stream applied');
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
                {!patient.hasVideo && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center group-hover:bg-black/50 transition-colors">
                    <Video className="w-16 h-16 text-gray-600 mb-2" />
                    <p className="text-gray-400 text-sm">No video stream</p>
                  </div>
                )}
                
                {/* Status Badge */}
                <div
                  className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm ${
                    patient.status === 'Live'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${patient.status === 'Live' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  {patient.status}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="font-bold text-lg text-white">{patient.patientName}</p>
                  <p className="text-xs text-gray-400">Room {patient.roomNumber}</p>
                </div>

                {!patient.hasVideo && (
                  <button
                    onClick={() => requestVideoFromPatient(patient.patientId)}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 transition-all duration-200 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Video className="w-4 h-4" />
                    Request Video
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <audio ref={audioRef} src={alertSfx} />
    </div>
  );
}
