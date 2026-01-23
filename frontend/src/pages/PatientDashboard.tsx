import { useEffect, useState, useRef } from 'react';
import { Heart, Activity, Thermometer, Wind, LogOut, AlertCircle, Shield, Wifi } from 'lucide-react';
import * as LivekitClient from 'livekit-client';
import backendService from '../services/backendService';
import authService from '../services/authService';
import FaultyTerminal from '../components/FaultyTerminal';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
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

interface VitalSigns {
  heartRate: number;
  temperature: number;
  respiration: number;
  oxygenSaturation: number;
}

export default function PatientDashboard() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    heartRate: 72,
    temperature: 98.6,
    respiration: 16,
    oxygenSaturation: 98,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const livekitRoomRef = useRef<any>(null);

  // Initialize patient connection
  useEffect(() => {
    const init = async () => {
      try {
        const user = authService.getCurrentUser();
        console.log('👤 [PATIENT] Current user:', user);
        if (!user || user.role !== 'patient') {
          console.log('❌ [PATIENT] Not authenticated or not a patient');
          window.location.href = '/login';
          return;
        }

        console.log('🔗 [PATIENT] Connecting to backend...');
        setConnectionState('connecting');
        await backendService.connect(user);
        console.log('✅ [PATIENT] Connected to backend');
        setConnectionState('connected');

        // Subscribe to nurse requests
        backendService.on('start_stream', handleStreamRequest);
        backendService.on('webrtc_answer', handleWebRtcAnswer);
        backendService.on('webrtc_ice_candidate', handleRemoteIceCandidate);
        backendService.on('disconnected', () => {
          console.log('⚠️  [PATIENT] Disconnected from backend');
          setConnectionState('disconnected');
        });
        backendService.on('error', () => {
          console.log('❌ [PATIENT] Backend error');
          setConnectionState('error');
        });

        console.log('👁️  [PATIENT] Room:', user.roomNumber, 'Patient:', user.name);

        // ========== LIVEKIT CONNECTION FOR AGENT MONITORING ==========
        try {
          console.log('🎤 [PATIENT] Getting LiveKit token...');
          const tokenResponse = await fetch('http://localhost:3000/api/livekit-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomName: `patient-${user.roomNumber}`,
              participantName: user.name,
            }),
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            console.log('✅ [PATIENT] LiveKit token received');
            console.log('🔌 [PATIENT] Connecting to LiveKit room:', `patient-${user.roomNumber}`);
            
            const room = new LivekitClient.Room({
              adaptiveStream: true,
              dynacast: true,
            });
            
            await room.connect(tokenData.url, tokenData.token);
            
            livekitRoomRef.current = room;
            console.log('✅ [PATIENT] Connected to LiveKit room');
            
            // Publish audio for agent monitoring
            try {
              const audioTrack = await room.localParticipant.setMicrophoneEnabled(true);
              console.log('🎤 [PATIENT] Microphone enabled for agent monitoring');
            } catch (audioError) {
              console.log('⚠️  [PATIENT] Could not enable microphone:', audioError);
            }
          } else {
            console.log('⚠️  [PATIENT] Failed to get LiveKit token:', tokenResponse.status);
          }
        } catch (livekitError) {
          console.log('⚠️  [PATIENT] LiveKit connection error (non-critical):', livekitError);
        }

        // ========== END LIVEKIT CONNECTION ==========

        // Simulate vital signs updates
        const vitalInterval = setInterval(() => {
          setVitalSigns((prev) => ({
            heartRate: 70 + Math.random() * 20,
            temperature: 98.4 + (Math.random() - 0.5) * 0.4,
            respiration: 14 + Math.random() * 6,
            oxygenSaturation: 97 + Math.random() * 2,
          }));
        }, 2000);

        return () => clearInterval(vitalInterval);
      } catch (error) {
        console.error('❌ [PATIENT] Failed to initialize:', error);
        setConnectionState('error');
      }
    };

    init();

    return () => {
      backendService.disconnect();
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect().catch(() => {});
        console.log('🔌 [PATIENT] Disconnected from LiveKit');
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle nurse requesting video stream
  const handleStreamRequest = async (data: any) => {
    try {
      console.log('Nurse requesting stream, getting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });
      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      peerConnectionRef.current = pc;
      console.log('🔌 RTCPeerConnection created');

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log('📌 Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });
      console.log('📡 All tracks added to peer connection');

      // Monitor connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', pc.connectionState);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const user = authService.getCurrentUser();
          backendService.send({
            type: 'webrtc_ice_candidate',
            target: 'nurse',
            patientId: user?.id,
            nurseId: data.nurseId,
            candidate: event.candidate,
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      console.log('📝 Offer created');
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set (offer)');

      const user = authService.getCurrentUser();
      backendService.send({
        type: 'webrtc_offer',
        patientId: user?.id,
        patientName: user?.name,
        roomNumber: user?.roomNumber,
        nurseId: data.nurseId,
        offer,
      });

      setIsStreaming(true);
      console.log('WebRTC offer sent to nurse');
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  // Handle WebRTC answer from nurse
  const handleWebRtcAnswer = async (data: any) => {
    try {
      console.log('📥 Received WebRTC answer from nurse');
      if (peerConnectionRef.current) {
        console.log('🔄 Setting remote description (answer)...');
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        console.log('✅ Remote description set (answer)');
        console.log('🔌 Peer connection state:', {
          connectionState: peerConnectionRef.current.connectionState,
          iceConnectionState: peerConnectionRef.current.iceConnectionState,
          iceGatheringState: peerConnectionRef.current.iceGatheringState,
          signalingState: peerConnectionRef.current.signalingState,
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle WebRTC answer:', error);
    }
  };

  // Handle remote ICE candidate
  const handleRemoteIceCandidate = (data: any) => {
    if (data.target !== 'patient') return;
    if (peerConnectionRef.current && data.candidate) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
    }
  };

  const handleLogout = () => {
    authService.logout();
    backendService.disconnect();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    window.location.href = '/login';
  };

  const user = authService.getCurrentUser();

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
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold">ATTUNE Patient Monitor</h1>
              <p className="text-xs text-gray-400">Room {user?.roomNumber}</p>
            </div>
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

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {connectionState !== 'connected' && (
          <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="font-bold text-yellow-400">Connection Status</p>
              <p className="text-sm text-yellow-200">{connectionState === 'connecting' ? 'Connecting to nurse station...' : 'Connection lost. Please wait...'}</p>
            </div>
          </div>
        )}

        {/* Video Stream Section */}
        <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-white/10">
          <div className="bg-slate-900 p-4 border-b border-white/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Wifi className="w-5 h-5 text-cyan-400" />
              Video Stream
            </h2>
          </div>
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isStreaming && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Activity className="w-12 h-12 text-gray-500 mx-auto animate-pulse" />
                  <p className="text-gray-400">Waiting for nurse request...</p>
                </div>
              </div>
            )}
            {isStreaming && (
              <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full" />
                LIVE
              </div>
            )}
          </div>
        </div>

        {/* Vital Signs Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-white/10 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold">Vital Signs</h2>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-6 text-center border border-cyan-500/30 backdrop-blur">
            <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <p className="text-gray-300 font-semibold mb-2">Overshoot Integration</p>
            <p className="text-sm text-gray-500">Real-time vital signs will be displayed here once connected to Overshoot biosensor network.</p>
            <div className="mt-4 space-y-2 text-xs text-gray-600">
              <p>• Heart Rate</p>
              <p>• Body Temperature</p>
              <p>• Respiration Rate</p>
              <p>• Oxygen Saturation</p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10 space-y-3">
          <p className="text-sm text-gray-400">
            <span className="font-bold">Patient ID:</span> {user?.id}
            <br />
            <span className="font-bold">Name:</span> {user?.name}
            <br />
            <span className="font-bold">Status:</span> {isStreaming ? 'Streaming to nurse station' : 'Awaiting nurse request'}
          </p>
          
          {/* Debug: Manual Alert Test */}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:3000/alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      room: user?.roomNumber,
                      event: 'PATIENT_DISTRESS',
                      transcript: 'Test alert - Help me!',
                      source: 'voice',
                      severity: 'high',
                    }),
                  });
                  console.log('🧪 Test alert sent:', response.status);
                } catch (error) {
                  console.error('❌ Test alert failed:', error);
                }
              }}
              className="text-xs px-3 py-1 bg-red-500/30 hover:bg-red-500/50 border border-red-500/50 rounded text-red-300 transition"
            >
              🧪 Test Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
