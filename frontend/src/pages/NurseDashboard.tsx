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
        backendService.on('new_alert', (data: any) => {
          const alert = data.alert;
          setAlerts((prev) => [alert, ...prev].slice(0, 50));
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        });

        backendService.on('webrtc_offer', handleWebRtcOffer);
        backendService.on('webrtc_ice_candidate', handleRemoteIceCandidate);
        backendService.on('disconnected', () => setConnectionState('disconnected'));
        backendService.on('error', () => setConnectionState('error'));

        // Fetch initial patients
        const patientsResponse = await fetch('http://localhost:3000/api/patients');
        const patientsData = await patientsResponse.json();

        const initialPatients: PatientFeed[] = patientsData.patients.map((p: any) => ({
          patientId: p.patientId,
          patientName: 'Patient',
          roomNumber: '---',
          connected: p.connected,
          hasVideo: false,
          status: 'Connecting...',
        }));

        setPatients(initialPatients.length ? initialPatients : [
          { patientId: 'PATIENT_001', patientName: 'John Doe', roomNumber: '305', connected: true, hasVideo: false, status: 'Waiting for video...' },
          { patientId: 'PATIENT_002', patientName: 'Rayhan Patel', roomNumber: '42B', connected: true, hasVideo: false, status: 'Waiting for video...' },
          { patientId: 'PATIENT_003', patientName: 'Sourish Kumar', roomNumber: '17C', connected: true, hasVideo: false, status: 'Waiting for video...' },
        ]);

        // Fetch initial alerts
        const alertsResponse = await fetch('http://localhost:3000/api/alerts');
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts);
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
        const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
        peerConnectionsRef.current.set(patientId, pc);

        pc.ontrack = (event) => {
          const videoEl = videoElementsRef.current.get(patientId);
          if (videoEl && event.track.kind === 'video') {
            videoEl.srcObject = event.streams[0];
            setPatients((prev) =>
              prev.map((p) =>
                p.patientId === patientId ? { ...p, hasVideo: true, status: 'Live' } : p
              )
            );
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            backendService.sendIceCandidate('patient', patientId, event.candidate);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        backendService.sendWebRtcAnswer(patientId, NURSE_ID, answer);
      } catch (error) {
        console.error('Failed to handle WebRTC offer:', error);
      }
    };

    handleOffer();
  }, []);

  // Handle remote ICE candidate
  const handleRemoteIceCandidate = useCallback((data: any) => {
    if (data.target !== 'nurse') return;
    const { patientId, candidate } = data;
    const pc = peerConnectionsRef.current.get(patientId);
    if (pc && candidate) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
        console.error('Failed to add ICE candidate:', error);
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
          <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4">
            <h2 className="text-lg font-bold text-red-400 mb-3">
               {unacknowledgedAlerts.length} Alert(s)
            </h2>
            {unacknowledgedAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="bg-slate-900/50 rounded p-3 mb-2 border-l-4 border-red-500">
                <p className="font-bold text-red-400">{alert.patientName} - Room {alert.roomNumber}</p>
                <p className="text-sm text-gray-300">{alert.condition}</p>
                <p className="text-xs text-gray-400 mt-1">{alert.description}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div key={patient.patientId} className="bg-slate-800/50 rounded-lg overflow-hidden border border-white/10">
              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                <video
                  ref={(el) => {
                    if (el) videoElementsRef.current.set(patient.patientId, el);
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!patient.hasVideo && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <Video className="w-12 h-12 text-gray-500 mb-2" />
                    <p className="text-gray-400 text-sm">No video stream</p>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-bold">{patient.patientName}</p>
                  <p className="text-xs text-gray-400">Room {patient.roomNumber}</p>
                </div>
                <div className="text-xs text-gray-300 bg-slate-900 p-2 rounded">
                  {patient.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <audio ref={audioRef} src={alertSfx} />
    </div>
  );
}
