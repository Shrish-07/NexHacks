import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Video, HeartPulse, Shield, Wifi } from 'lucide-react';
import FaultyTerminal from '../components/FaultyTerminal';
import northWingFeed from '../../loop_vids/feed_north.png';
import southWingFeed from '../../loop_vids/feed_south.png';
import johnDoeFeed from '../../loop_vids/feed_john.mp4';

type Patient = {
  patientId: string;
  patientName: string;
  roomNumber: string;
  status?: string;
  lastHeartbeat?: string;
};

type Alert = {
  id: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  condition: string;
  confidence: number;
  description: string;
  urgency: string;
  timestamp: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

type LoopFeed = {
  id: string;
  patientName: string;
  roomNumber: string;
  status: string;
  src: string;
  isImage?: boolean;
  patientCamera?: boolean;
  metrics: { label: string; value: string }[];
};

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

// Local looping videos stand in for real feeds when backend streaming is unavailable.
const LOOP_FEEDS: LoopFeed[] = [
  {
    id: 'john-doe',
    patientName: 'John Doe',
    roomNumber: '305',
    status: 'Neuro cam · calibrated',
    src: johnDoeFeed,
    isImage: false,
    patientCamera: false,
    metrics: [
      { label: 'Vitals Mirror', value: 'Synced' },
      { label: 'Last Alert', value: 'Cleared' },
    ],
  },
  {
    id: 'north-wing',
    patientName: 'Rayhan',
    roomNumber: '42B',
    status: 'Neuro obs · calm',
    src: northWingFeed,
    isImage: true,
    patientCamera: true,
    metrics: [
      { label: 'O₂ Sat', value: '98%' },
      { label: 'Resp Rate', value: '14/min' },
    ],
  },
  {
    id: 'south-wing',
    patientName: 'Sourish',
    roomNumber: '17C',
    status: 'Resp support · steady',
    src: southWingFeed,
    isImage: true,
    patientCamera: true,
    metrics: [
      { label: 'Breath Assist', value: '40% FiO₂' },
      { label: 'SpO₂ Trend', value: 'Holding' },
    ],
  },
];

export default function NurseDashboard() {
  const [patients, setPatients] = useState<Map<string, Patient>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [focusedPatientId, setFocusedPatientId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [, setStreamVersion] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const videoRefs = useRef(new Map<string, Set<HTMLVideoElement>>());
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const remoteStreams = useRef(new Map<string, MediaStream>());
  const pendingRemoteCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const pendingOfferPatients = useRef(new Set<string>());

  const httpBase = useMemo(() => getHttpBase(), []);
  const wsUrl = useMemo(() => getWsUrl(httpBase), [httpBase]);
  const rtcConfig = useMemo(() => buildNurseRtcConfig(), []);

  useEffect(() => {
    connectToBackend();

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      cleanupAllPeerConnections();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeAlertPatients = useMemo(() => {
    return new Set(alerts.filter((alert) => !alert.acknowledged).map((alert) => alert.patientId));
  }, [alerts]);

  const pendingAlerts = useMemo(() => alerts.filter((alert) => !alert.acknowledged), [alerts]);
  const latestAlert = alerts[0] ?? null;

  function connectToBackend() {
    setConnectionState('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      ws.send(
        JSON.stringify({
          type: 'register_nurse',
          nurseId: NURSE_ID,
        })
      );
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      reconnectTimer.current = window.setTimeout(connectToBackend, 3000);
    };

    ws.onerror = (error) => {
      console.error('[NurseDashboard] WebSocket error', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
      } catch (error) {
        console.error('[NurseDashboard] Invalid WebSocket payload', error);
      }
    };
  }

  const startWebRtcSession = useCallback(
    async (patientId: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const pc = createPeerConnection(patientId);
      pendingOfferPatients.current.add(patientId);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(
          JSON.stringify({
            type: 'webrtc_offer',
            nurseId: NURSE_ID,
            patientId,
            offer,
          })
        );
      } catch (error) {
        console.error('[NurseDashboard] Failed to create WebRTC offer', error);
        pendingOfferPatients.current.delete(patientId);
        disposePeerConnection(patientId);
      }
    },
    []
  );

  const maybeStartWebRtc = useCallback(
    (patientId: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (peerConnections.current.has(patientId) || pendingOfferPatients.current.has(patientId)) {
        return;
      }
      startWebRtcSession(patientId);
    },
    [startWebRtcSession]
  );

  function handleSocketMessage(data: any) {
    switch (data.type) {
      case 'init': {
        const patientMap = new Map<string, Patient>();
        data.patients.forEach((patient: Patient) => {
          patientMap.set(patient.patientId, patient);
        });
        setPatients(patientMap);
        setAlerts(data.recentAlerts ?? []);
        data.patients.forEach((patient: Patient) => maybeStartWebRtc(patient.patientId));
        break;
      }
      case 'patient_connected': {
        setPatients((prev) => {
          const next = new Map(prev);
          next.set(data.patient.patientId, data.patient);
          return next;
        });
        maybeStartWebRtc(data.patient.patientId);
        break;
      }
      case 'patient_disconnected': {
        setPatients((prev) => {
          const next = new Map(prev);
          next.delete(data.patientId);
          return next;
        });
        disposePeerConnection(data.patientId);
        break;
      }
      case 'alert': {
        setAlerts((prev) => [data.alert, ...prev].slice(0, 50));
        setFocusedPatientId(data.alert.patientId);
        break;
      }
      case 'alert_acknowledged': {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === data.alertId
              ? { ...alert, acknowledged: true, acknowledgedBy: data.acknowledgedBy }
              : alert
          )
        );
        break;
      }
      case 'webrtc_answer': {
        handleWebRtcAnswer(data);
        break;
      }
      case 'webrtc_ice_candidate': {
        handleRemoteIceCandidate(data);
        break;
      }
      case 'webrtc_error': {
        console.warn('[NurseDashboard] WebRTC error from backend:', data.message);
        disposePeerConnection(data.patientId);
        setTimeout(() => maybeStartWebRtc(data.patientId), 2000);
        break;
      }
      default:
        console.warn('[NurseDashboard] Unknown message type', data.type);
    }
  }

  function createPeerConnection(patientId: string) {
    const existing = peerConnections.current.get(patientId);
    if (existing) {
      existing.close();
      peerConnections.current.delete(patientId);
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(patientId, pc);

    pc.ontrack = (event) => {
      remoteStreams.current.set(patientId, event.streams[0]);
      attachStreamToVideos(patientId);
      setStreamVersion((value) => value + 1);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'webrtc_ice_candidate',
            target: 'patient',
            nurseId: NURSE_ID,
            patientId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed'
      ) {
        console.warn('[NurseDashboard] Peer connection state', pc.connectionState);
        disposePeerConnection(patientId);
        setTimeout(() => maybeStartWebRtc(patientId), 2000);
      }
    };

    pc.addTransceiver('video', { direction: 'recvonly' });

    return pc;
  }

  function handleWebRtcAnswer(data: { patientId: string; answer: RTCSessionDescriptionInit }) {
    const pc = peerConnections.current.get(data.patientId);
    if (!pc) {
      return;
    }

    pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      .then(() => {
        pendingOfferPatients.current.delete(data.patientId);
        flushPendingCandidates(data.patientId);
      })
      .catch((error) => {
        console.error('[NurseDashboard] Failed to set remote description', error);
        disposePeerConnection(data.patientId);
      });
  }

  function handleRemoteIceCandidate(data: {
    patientId: string;
    candidate: RTCIceCandidateInit;
  }) {
    const candidateInit = data.candidate;
    const pc = peerConnections.current.get(data.patientId);
    if (pc && pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch((error) => {
        console.error('[NurseDashboard] Failed to add ICE candidate', error);
      });
    } else {
      const queue = pendingRemoteCandidates.current.get(data.patientId) ?? [];
      queue.push(candidateInit);
      pendingRemoteCandidates.current.set(data.patientId, queue);
    }
  }

  function flushPendingCandidates(patientId: string) {
    const pc = peerConnections.current.get(patientId);
    if (!pc || !pc.remoteDescription) {
      return;
    }

    const queue = pendingRemoteCandidates.current.get(patientId);
    if (!queue) {
      return;
    }

    while (queue.length) {
      const candidate = queue.shift();
      if (!candidate) continue;
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
        console.error('[NurseDashboard] Failed to apply queued candidate', error);
      });
    }
    pendingRemoteCandidates.current.delete(patientId);
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const response = await fetch(`${httpBase}/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurseId: NURSE_ID }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('[NurseDashboard] Failed to acknowledge alert', error);
    }
  }

  function attachStreamToVideos(patientId: string) {
    const stream = remoteStreams.current.get(patientId) ?? null;
    const elements = videoRefs.current.get(patientId);
    if (!elements) {
      return;
    }

    elements.forEach((video) => {
      if (!video.isConnected) {
        elements.delete(video);
        return;
      }

      if (video.srcObject !== stream) {
        video.srcObject = stream;
        if (stream) {
          video
            .play()
            .then(() => {})
            .catch(() => {});
        } else {
          video.load();
        }
      }
    });
  }

  function detachVideos(patientId: string) {
    const elements = videoRefs.current.get(patientId);
    if (!elements) {
      return;
    }
    elements.forEach((video) => {
      video.srcObject = null;
      video.load();
    });
    videoRefs.current.delete(patientId);
  }

  function disposePeerConnection(patientId: string) {
    const pc = peerConnections.current.get(patientId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnections.current.delete(patientId);
    }
    pendingOfferPatients.current.delete(patientId);
    pendingRemoteCandidates.current.delete(patientId);
    remoteStreams.current.delete(patientId);
    detachVideos(patientId);
    setStreamVersion((value) => value + 1);
  }

  function cleanupAllPeerConnections() {
    peerConnections.current.forEach((_pc, patientId) => disposePeerConnection(patientId));
  }

  const setVideoRef = useCallback((patientId: string) => (element: HTMLVideoElement | null) => {
    if (!element) {
      return;
    }

    element.muted = true;
    element.playsInline = true;
    element.autoplay = true;

    let set = videoRefs.current.get(patientId);
    if (!set) {
      set = new Set<HTMLVideoElement>();
      videoRefs.current.set(patientId, set);
    }
    set.add(element);
    attachStreamToVideos(patientId);
  }, []);

  function renderConnectionBadge() {
    const badgeStyles: Record<ConnectionState, string> = {
      connecting: 'text-amber-200 border-amber-400/30 bg-amber-500/10 shadow-amber-500/20',
      connected: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/10 shadow-emerald-500/30',
      disconnected: 'text-rose-200 border-rose-400/30 bg-rose-500/10 shadow-rose-500/30',
    };

    const label: Record<ConnectionState, string> = {
      connecting: 'Syncing network…',
      connected: 'Live uplink',
      disconnected: 'Link lost',
    };

    const iconMap = {
      connecting: <Activity className="w-4 h-4" />,
      connected: <Wifi className="w-4 h-4" />,
      disconnected: <AlertTriangle className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border backdrop-blur shadow-lg ${badgeStyles[connectionState]}`}
      >
        {iconMap[connectionState]}
        {label[connectionState]}
      </span>
    );
  }

  const focusedPatient = focusedPatientId ? patients.get(focusedPatientId) : null;
  const connectedStreams = remoteStreams.current.size;
  const awaitingFeeds = Math.max(patients.size - connectedStreams, 0);
  const patientEntries = Array.from(patients.values());
  const totalMonitoredFeeds = patientEntries.length + LOOP_FEEDS.length;
  const showPatientPlaceholder = totalMonitoredFeeds === 0;

  const overviewStats = [
    {
      label: 'Connected Patients',
      value: patients.size,
      detail: `${patients.size || 0} rooms online`,
      gradient: 'from-teal-500 to-cyan-400',
      Icon: Activity,
    },
    {
      label: 'Live Streams',
      value: connectedStreams,
      detail: awaitingFeeds === 0 ? 'All feeds stable' : `${awaitingFeeds} waiting for feed`,
      gradient: 'from-cyan-500 to-blue-500',
      Icon: Video,
    },
    {
      label: 'Open Alerts',
      value: pendingAlerts.length,
      detail: pendingAlerts.length ? 'Needs acknowledgement' : 'All clear',
      gradient: 'from-rose-500 to-orange-400',
      Icon: AlertTriangle,
    },
    {
      label: 'Last Alert',
      value: latestAlert ? latestAlert.condition : 'Calm',
      detail: latestAlert ? `${latestAlert.patientName} · Room ${latestAlert.roomNumber}` : 'Monitoring quietly',
      gradient: 'from-indigo-500 to-purple-500',
      Icon: HeartPulse,
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div
        className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none opacity-100"
        aria-hidden="true"
      >
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
          <FaultyTerminal
            scale={1.3}
            digitSize={2.7}
            scanlineIntensity={0.15}
            glitchAmount={0}
            flickerAmount={1}
            noiseAmp={0.15}
            chromaticAberration={0}
            dither={0}
            curvature={0.2}
            tint="#ffffff"
            mouseReact
            mouseStrength={0.6}
            brightness={1}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="absolute inset-0 rounded-3xl blur-3xl bg-gradient-to-br from-teal-500 to-cyan-500 opacity-60" />
            </div>
            <div>
              <p className="text-sm text-cyan-200 uppercase tracking-[0.4em]">Attune Nurse Station</p>
              <h1 className="text-4xl md:text-5xl font-black">Monitoring Command Deck</h1>
            </div>
          </div>
          {renderConnectionBadge()}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat, idx) => {
            const Icon = stat.Icon;
            return (
              <article
                key={`${stat.label}-${idx}`}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-5 shadow-[0_25px_60px_rgba(15,23,42,0.4)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-30 blur-3xl`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">{stat.label}</p>
                    <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-2">{stat.detail}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur shadow-inner shadow-slate-950/50">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="relative rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-[0_30px_80px_rgba(15,23,42,0.55)] overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-cyan-500/10 opacity-70"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs text-cyan-200 uppercase tracking-[0.4em]">Live Rooms</p>
                  <h2 className="text-3xl font-bold">Active Patients</h2>
                </div>
                <span className="text-sm text-slate-300">{totalMonitoredFeeds} feeds online</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {showPatientPlaceholder && (
                  <div className="col-span-full rounded-2xl border border-dashed border-white/20 py-16 text-center text-slate-400">
                    Awaiting patient connections…
                  </div>
                )}

                {patientEntries.map((patient) => {
                  const hasAlert = activeAlertPatients.has(patient.patientId);
                  const hasStream = remoteStreams.current.has(patient.patientId);
                  return (
                    <article
                      key={patient.patientId}
                      className={`relative overflow-hidden rounded-3xl border p-5 transition-all duration-500 backdrop-blur-xl ${
                        hasAlert
                          ? 'border-rose-500/60 shadow-rose-500/30'
                          : 'border-white/10 hover:border-teal-400/40 hover:-translate-y-1 hover:shadow-teal-400/20'
                      } bg-slate-950/70`}
                    >
                      <div
                        className={`absolute inset-0 opacity-60 blur-3xl pointer-events-none ${
                          hasAlert
                            ? 'bg-gradient-to-br from-rose-500/30 to-orange-400/10'
                            : 'bg-gradient-to-br from-teal-500/20 to-cyan-400/10'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-300">Room {patient.roomNumber}</p>
                            <p className="text-xl font-semibold">{patient.patientName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${
                                hasAlert
                                  ? 'bg-rose-500/20 text-rose-100 border-rose-500/50'
                                  : 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40'
                              }`}
                            >
                              {hasAlert ? 'Requires action' : 'Stable'}
                            </span>
                            <span className="text-xs text-slate-300">
                              {hasStream ? 'Stream active' : 'Waiting for feed'}
                            </span>
                          </div>
                        </div>

                        <div className="relative h-44 rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                          <video className="w-full h-full object-cover" ref={setVideoRef(patient.patientId)} />
                          {!hasStream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 text-xs text-slate-300">
                              <div className="w-10 h-10 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                              <span>Connecting video…</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm text-slate-300">
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Status</p>
                            <p className="font-semibold text-white">{patient.status ?? 'Active'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">Feeds auto-focus on priority</span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-teal-200 hover:text-white font-semibold transition"
                            onClick={() => setFocusedPatientId(patient.patientId)}
                          >
                            Focus feed
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {LOOP_FEEDS.map((feed) => (
                  <article
                    key={`loop-${feed.id}`}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl p-5 shadow-[0_25px_60px_rgba(15,23,42,0.4)]"
                  >
                    <div className="absolute inset-0 opacity-50 blur-3xl pointer-events-none bg-gradient-to-br from-cyan-500/20 via-transparent to-blue-500/10" />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-300">Room {feed.roomNumber}</p>
                          <p className="text-xl font-semibold">{feed.patientName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border bg-cyan-500/20 text-cyan-100 border-cyan-500/40">
                            {feed.patientCamera ? 'Stable' : 'Facility camera'}
                          </span>
                          <span className="text-xs text-slate-300">{feed.status}</span>
                        </div>
                      </div>

                      <div className="relative h-44 rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                        {feed.isImage ? (
                          <img
                            className="w-full h-full object-cover"
                            src={feed.src}
                            alt={`${feed.patientName} feed`}
                          />
                        ) : (
                          <video
                            className="w-full h-full object-cover"
                            src={feed.src}
                            muted
                            playsInline
                            loop
                            autoPlay
                            preload="auto"
                          />
                        )}
                        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-semibold border border-white/10 bg-black/40 backdrop-blur text-white/80">
                          Live uplink
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                        {feed.metrics.map((metric) => (
                          <div
                            key={`${feed.id}-${metric.label}`}
                            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">{metric.label}</p>
                            <p className="text-lg font-semibold text-white">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="relative rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-[0_30px_80px_rgba(15,23,42,0.55)] overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-orange-400/10 opacity-80"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-rose-200 uppercase tracking-[0.4em]">Signal Center</p>
                  <h2 className="text-3xl font-bold">Alerts</h2>
                </div>
                <span className="text-sm text-slate-300">{pendingAlerts.length} awaiting action</span>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
                {alerts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-slate-400">
                    No active alerts
                  </div>
                )}

                {alerts.map((alert) => (
                  <article
                    key={alert.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl ${
                      alert.acknowledged ? 'border-white/10 bg-slate-900/60' : 'border-rose-500/50 bg-rose-500/5'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 pointer-events-none blur-2xl ${
                        alert.acknowledged
                          ? 'bg-gradient-to-br from-slate-500/10 to-transparent'
                          : 'bg-gradient-to-r from-rose-500/20 to-orange-400/10'
                      }`}
                    />
                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Room {alert.roomNumber}</p>
                          <p className="text-2xl font-semibold text-rose-100">{alert.condition}</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400">{alert.patientName}</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{alert.description}</p>

                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Confidence</p>
                          <p className="text-sm font-semibold text-white">
                            {(alert.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Urgency</p>
                          <p className="text-sm font-semibold text-white">{alert.urgency.toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {alert.acknowledged ? (
                          <span className="text-sm text-emerald-200">
                            Acknowledged by {alert.acknowledgedBy ?? 'nurse'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-rose-500 to-orange-400 shadow-lg shadow-rose-500/30 hover:opacity-90 transition"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-200 hover:text-white transition"
                          onClick={() => setFocusedPatientId(alert.patientId)}
                        >
                          View feed
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {focusedPatient && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-950/95 border-l border-cyan-400/40 shadow-[0_35px_80px_rgba(15,118,168,0.45)] backdrop-blur-xl p-6 z-50 flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-cyan-200 uppercase tracking-[0.4em]">Enlarged Feed</p>
              <p className="text-2xl font-semibold mt-1">{focusedPatient.patientName}</p>
              <p className="text-sm text-slate-400">Room {focusedPatient.roomNumber}</p>
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded-full border border-white/20 text-sm text-slate-300 hover:text-white transition"
              onClick={() => setFocusedPatientId(null)}
            >
              Close
            </button>
          </div>

          <div className="flex-1 rounded-3xl border border-white/10 bg-black/40 overflow-hidden relative flex items-center justify-center">
            <video className="w-full h-full object-cover" ref={setVideoRef(focusedPatient.patientId)} />
            {!remoteStreams.current.has(focusedPatient.patientId) && (
              <span className="text-slate-400">Connecting live feed…</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Status</p>
              <p className="text-lg font-semibold text-white">{focusedPatient.status ?? 'Monitoring'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeBaseUrl(url?: string | null) {
  if (!url) {
    return null;
  }
  return url.trim().replace(/\/$/, '');
}

function getHttpBase() {
  const envUrl = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const backendParam = normalizeBaseUrl(params.get('backend'));
    if (backendParam) {
      return backendParam;
    }

    if (window.location.origin.startsWith('http')) {
      if (window.location.port === '3000') {
        return normalizeBaseUrl(window.location.origin) ?? 'http://localhost:3000';
      }
    }
  }

  return 'http://localhost:3000';
}

function getWsUrl(httpBaseUrl: string) {
  const envWsUrl = normalizeBaseUrl(import.meta.env.VITE_BACKEND_WS_URL);
  if (envWsUrl) {
    return envWsUrl;
  }

  try {
    const url = new URL(httpBaseUrl);
    const scheme = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${url.host}`;
  } catch {
    return 'ws://localhost:3000';
  }
}

type IceServerSource = string | string[] | RTCIceServer | RTCIceServer[] | null | undefined;

function buildNurseRtcConfig(): RTCConfiguration {
  const resolved = resolveNurseIceServers();
  const deduped = dedupeIceServers(resolved);
  const limited = deduped.slice(0, 4);
  return { iceServers: limited.length ? limited : DEFAULT_ICE_SERVERS };
}

function resolveNurseIceServers(): RTCIceServer[] {
  const envConfig = getEnvTurnConfig();
  const windowObj = typeof window !== 'undefined' ? window : null;
  const documentObj = typeof document !== 'undefined' ? document : null;
  const params = windowObj ? new URLSearchParams(windowObj.location.search) : null;

  const sources: IceServerSource[] = [
    envConfig,
    windowObj && (windowObj as any).NURSE_DASHBOARD_CONFIG?.iceServers,
    windowObj && (windowObj as any).NURSE_DASHBOARD_CONFIG?.turnServers,
    documentObj?.body?.getAttribute('data-turn-servers'),
    params?.get('turn'),
  ];

  for (const source of sources) {
    const parsed = parseIceServers(source);
    if (parsed.length) {
      return parsed;
    }
  }

  return [];
}

function getEnvTurnConfig(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_NURSE_TURN_SERVERS ?? env.VITE_TURN_SERVERS;
}

function parseIceServers(value: IceServerSource): RTCIceServer[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeIceServer(entry))
      .filter((entry): entry is RTCIceServer => entry !== null);
  }

  if (typeof value === 'object') {
    const normalized = normalizeIceServer(value);
    return normalized ? [normalized] : [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseIceServers(parsed);
      } catch (error) {
        console.warn('[NurseDashboard] Failed to parse TURN config JSON', error);
        return [];
      }
    }

    const urls = normalizeUrlsArray(trimmed);
    return urls.length ? [{ urls }] : [];
  }

  return [];
}

function normalizeIceServer(entry: any): RTCIceServer | null {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return { urls: entry };
  }

  if (Array.isArray(entry)) {
    const urls = entry.map((url) => url?.trim()).filter(Boolean);
    return urls.length ? { urls } : null;
  }

  if (typeof entry === 'object') {
    const urls = entry.urls || entry.url;
    const normalizedUrls = normalizeUrlsArray(urls);
    if (!normalizedUrls.length) {
      return null;
    }

    const server: RTCIceServer = { urls: normalizedUrls.length === 1 ? normalizedUrls[0] : normalizedUrls };
    if (entry.username) {
      server.username = entry.username;
    }
    if (entry.credential) {
      server.credential = entry.credential;
    }
    return server;
  }

  return null;
}

function normalizeUrlsArray(candidate: unknown): string[] {
  if (!candidate) {
    return [];
  }

  if (Array.isArray(candidate)) {
    return candidate.map((url) => (typeof url === 'string' ? url.trim() : '')).filter(Boolean);
  }

  if (typeof candidate === 'string') {
    return candidate
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  return [];
}

function dedupeIceServers(servers: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const result: RTCIceServer[] = [];

  servers.forEach((server) => {
    const urls = normalizeUrlsArray(server.urls);
    if (!urls.length) {
      return;
    }

    const key = `${urls.sort().join('|')}|${server.username || ''}|${server.credential || ''}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push({
      urls: urls.length === 1 ? urls[0] : urls,
      username: server.username,
      credential: server.credential,
    });
  });

  return result;
}
