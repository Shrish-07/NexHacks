import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.WEBSOCKET_PORT || process.env.PORT || 3000);
const OVERSHOOT_API_URL = process.env.OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';
const MAX_ALERT_HISTORY = 200;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/$/, '');
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';
const ELEVENLABS_LATENCY_HINT = parseNumber(process.env.ELEVENLABS_LATENCY_HINT, 2);
const ALERT_AUDIO_MAX_CHARS = parseNumber(process.env.ALERT_AUDIO_MAX_CHARS, 500);

// LiveKit Configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

app.use(cors());
app.use(express.json());

// Debug environment variables on startup
console.log('=== Environment Variables Check ===');
console.log('LIVEKIT_URL:', LIVEKIT_URL ? '✅ Set' : '❌ Missing');
console.log('LIVEKIT_API_KEY:', LIVEKIT_API_KEY ? '✅ Set' : '❌ Missing');
console.log('LIVEKIT_API_SECRET:', LIVEKIT_API_SECRET ? '✅ Set' : '❌ Missing');
console.log('OVERSHOOT_API_KEY:', process.env.OVERSHOOT_API_KEY ? '✅ Set' : '❌ Missing');
console.log('ELEVENLABS_API_KEY:', ELEVENLABS_API_KEY ? '✅ Set' : '❌ Missing');
console.log('===================================');

// ---------------- STATE ----------------
const patients = new Map(); // patientId -> ws
const nurses = new Map();   // nurseId -> ws
const alerts = []; // Store alert history

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToNurses(payload) {
  nurses.forEach((ws) => send(ws, payload));
}

// ---------------- WS ----------------
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      console.warn('[WS] Invalid JSON');
      return;
    }

    switch (data.type) {

      // ---------- REGISTER ----------
      case 'register_patient': {
        ws.role = 'patient';
        ws.patientId = data.patientId;
        ws.patientName = data.patientName;
        ws.roomNumber = data.roomNumber;
        patients.set(data.patientId, ws);
        console.log('[WS] Patient registered:', data.patientId, data.patientName, 'Room', data.roomNumber);

        // Broadcast to all nurses
        broadcastToNurses({
          type: 'patient_connected',
          patientId: data.patientId,
          patientName: data.patientName,
          roomNumber: data.roomNumber,
        });
        break;
      }

      case 'register_nurse': {
        ws.role = 'nurse';
        ws.nurseId = data.nurseId;
        nurses.set(data.nurseId, ws);

        send(ws, {
          type: 'init',
          patients: [...patients.keys()],
        });

        console.log('[WS] Nurse registered:', data.nurseId);
        break;
      }

      // ---------- ALERTS ----------
      case 'alert':
      case 'voice_alert': {
        const alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          patientId: data.patientId,
          patientName: data.patientName,
          roomNumber: data.roomNumber,
          condition: data.condition,
          confidence: data.confidence,
          description: data.description,
          urgency: data.urgency,
          source: data.source || (data.type === 'voice_alert' ? 'voice' : 'vision'),
          transcript: data.transcript || null,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        };

        alerts.push(alert);

        // Keep only last MAX_ALERT_HISTORY alerts
        if (alerts.length > MAX_ALERT_HISTORY) {
          alerts.shift();
        }

        // Broadcast to all nurses
        broadcastToNurses({
          type: 'new_alert',
          alert,
        });

        console.log(`[ALERT] ${alert.source.toUpperCase()}: ${alert.condition} - ${alert.patientId}`);
        break;
      }

      // ---------- HEARTBEAT ----------
      case 'heartbeat': {
        // Patient heartbeat - could track last seen time
        break;
      }

      // ---------- STREAM REQUEST (NURSE → PATIENT) ----------
      case 'request_stream': {
        if (ws.role !== 'nurse') return;

        const patientWs = patients.get(data.patientId);
        if (!patientWs) {
          send(ws, { type: 'error', message: 'Patient not connected' });
          return;
        }

        send(patientWs, {
          type: 'start_stream',
          nurseId: ws.nurseId,
        });

        console.log('[WS] Stream request → patient', data.patientId);
        break;
      }

      // ---------- OFFER (PATIENT ONLY) ----------
      case 'webrtc_offer': {
        if (ws.role !== 'patient') return;

        const nurseWs = nurses.get(data.nurseId);
        if (!nurseWs) return;

        send(nurseWs, {
          type: 'webrtc_offer',
          offer: data.offer,
          patientId: ws.patientId,
          patientName: ws.patientName,
          roomNumber: ws.roomNumber,
        });

        console.log('[WS] Offer → nurse', data.nurseId);
        break;
      }

      // ---------- ANSWER (NURSE ONLY) ----------
      case 'webrtc_answer': {
        if (ws.role !== 'nurse') return;

        const patientWs = patients.get(data.patientId);
        if (!patientWs) return;

        send(patientWs, {
          type: 'webrtc_answer',
          answer: data.answer,
          nurseId: ws.nurseId,
        });

        console.log('[WS] Answer → patient', data.patientId);
        break;
      }

      // ---------- ICE ----------
      case 'webrtc_ice_candidate': {
        if (data.target === 'patient') {
          const patientWs = patients.get(data.patientId);
          if (patientWs) send(patientWs, data);
        }
        if (data.target === 'nurse') {
          const nurseWs = nurses.get(data.nurseId);
          if (nurseWs) send(nurseWs, data);
        }
        break;
      }

      default:
        console.warn('[WS] Unknown type:', data.type);
    }
  });

  ws.on('close', () => {
    if (ws.role === 'patient') {
      patients.delete(ws.patientId);
      console.log('[WS] Patient disconnected:', ws.patientId);
    }
    if (ws.role === 'nurse') {
      nurses.delete(ws.nurseId);
      console.log('[WS] Nurse disconnected:', ws.nurseId);
    }
  });
});

// ---------------- HTTP ENDPOINTS ----------------

// Alert endpoint for voice/video/Overshoot detection
app.post('/alert', (req, res) => {
  const { room, event, transcript, severity, source } = req.body;
  
  console.log('📨 [ALERT] Received alert request:', { room, event, transcript, source, severity });
  
  if (!room) {
    console.log('❌ [ALERT] No room provided');
    return res.status(400).json({ error: 'Room is required' });
  }

  // Find patient in this room
  let patientId = null;
  let patientName = null;
  let roomNumber = null;

  console.log('🔍 [ALERT] Searching for patient in room:', room);
  console.log('📋 [ALERT] Available patients:', Array.from(patients.entries()).map(([id, ws]) => ({ id, room: ws.roomNumber })));

  for (const [pId, ws] of patients) {
    if (ws.roomNumber === room || ws.roomNumber === room.toString()) {
      patientId = pId;
      patientName = ws.patientName;
      roomNumber = ws.roomNumber;
      console.log('✅ [ALERT] Found patient:', { patientId, patientName, roomNumber });
      break;
    }
  }

  if (!patientId) {
    console.log('❌ [ALERT] No patient found in room:', room);
    return res.status(404).json({ error: 'Patient not found in room' });
  }

  // Create alert object
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientId,
    patientName,
    roomNumber,
    condition: event || 'DISTRESS_DETECTED',
    confidence: 0.95,
    description: transcript || 'Patient distress detected by voice analysis',
    urgency: severity || 'high',
    source: source || 'voice',
    transcript: transcript || null,
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };

  alerts.push(alert);
  if (alerts.length > MAX_ALERT_HISTORY) {
    alerts.shift();
  }

  // Broadcast to all nurses
  console.log('📢 [ALERT] Broadcasting to', nurses.size, 'nurses');
  broadcastToNurses({
    type: 'new_alert',
    alert,
  });

  console.log(`🚨 [ALERT] ${source || 'VOICE'}: ${event} - Room ${room} - ${patientName}`);
  res.json({ success: true, alert });
});

app.get('/api/patients', (_req, res) => {
  const patientList = Array.from(patients.keys()).map(patientId => ({
    patientId,
    connected: true,
  }));
  res.json({ patients: patientList });
});

app.get('/api/alerts', (_req, res) => {
  res.json({ alerts: alerts.slice(-50) });
});

app.post('/api/alerts/:alertId/acknowledge', (req, res) => {
  const alert = alerts.find((item) => item.id === req.params.alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.acknowledged = true;
  alert.acknowledgedBy = req.body?.nurseId || 'unknown';
  alert.acknowledgedAt = new Date().toISOString();

  broadcastToNurses({
    type: 'alert_acknowledged',
    alertId: alert.id,
    acknowledgedBy: alert.acknowledgedBy,
  });

  return res.json({ success: true });
});

// Overshoot/Video alert endpoint for falling, choking, seizures
app.post('/api/overshoot-alert', (req, res) => {
  const { patientId, roomNumber, condition, confidence, description } = req.body;
  
  console.log('📨 [OVERSHOOT] Alert received:', { patientId, roomNumber, condition, confidence });
  
  if (!patientId || !roomNumber) {
    console.log('❌ [OVERSHOOT] Missing required fields');
    return res.status(400).json({ error: 'patientId and roomNumber are required' });
  }

  // Find patient
  const patientWs = patients.get(patientId);
  if (!patientWs) {
    console.log('❌ [OVERSHOOT] Patient not found:', patientId);
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Create alert object
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientId,
    patientName: patientWs.patientName,
    roomNumber,
    condition: condition || 'OVERSHOOT_DETECTION',
    confidence: confidence || 0.9,
    description: description || 'Patient activity detected by Overshoot biosensor network',
    urgency: confidence > 0.85 ? 'critical' : 'high',
    source: 'overshoot',
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };

  alerts.push(alert);
  if (alerts.length > MAX_ALERT_HISTORY) {
    alerts.shift();
  }

  // Broadcast to all nurses
  console.log('📢 [OVERSHOOT] Broadcasting to', nurses.size, 'nurses');
  broadcastToNurses({
    type: 'new_alert',
    alert,
  });

  console.log(`✅ [OVERSHOOT] ${condition} - ${patientWs.patientName} (Room ${roomNumber}) - Confidence: ${confidence}`);
  res.json({ success: true, alert });
});

// ============ LIVEKIT TOKEN ENDPOINT ============
app.post('/api/livekit-token', (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'roomName and participantName are required' 
      });
    }

    // Check if LiveKit is configured
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error('[LiveKit] Missing configuration in environment variables');
      return res.status(500).json({ 
        error: 'LiveKit not configured',
        message: 'Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env'
      });
    }

    // Create access token
    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: participantName,
        ttl: '24h', // Token expires in 24 hours
      }
    );

    // Grant permissions for patient audio monitoring
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = at.toJwt();

    console.log(`✅ [LiveKit] Generated token for ${participantName} in room ${roomName}`);

    res.json({
      token: token,
      url: LIVEKIT_URL
    });

  } catch (error) {
    console.error('[LiveKit] Error generating token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

app.post('/api/alert-audio', async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!rawText) {
    return res.status(400).json({ error: 'text is required' });
  }

  const normalizedText = rawText.slice(0, ALERT_AUDIO_MAX_CHARS);
  const voiceCandidate =
    typeof req.body?.voiceId === 'string' && req.body.voiceId.trim()
      ? req.body.voiceId
      : ELEVENLABS_VOICE_ID;
  const modelCandidate =
    typeof req.body?.modelId === 'string' && req.body.modelId.trim()
      ? req.body.modelId
      : ELEVENLABS_MODEL_ID;
  const formatCandidate =
    typeof req.body?.outputFormat === 'string' && req.body.outputFormat.trim()
      ? req.body.outputFormat
      : ELEVENLABS_OUTPUT_FORMAT;

  const voiceId = voiceCandidate.trim();
  const modelId = modelCandidate.trim();
  const outputFormat = formatCandidate.trim();
  const optimizeStreamingLatency = parseNumber(
    req.body?.optimizeStreamingLatency,
    ELEVENLABS_LATENCY_HINT
  );

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: normalizedText,
        modelId,
        outputFormat,
        optimizeStreamingLatency,
      }),
    });

    if (!response.ok) {
      const errorDetails = await readFailedResponse(response);
      console.error('[ElevenLabs] Failed to synthesize audio', response.status, errorDetails);
      return res.status(502).json({
        error: 'Failed to synthesize audio alert',
        status: response.status,
        details: errorDetails,
      });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return res.json({
      audioBase64: audioBuffer.toString('base64'),
      contentType: response.headers.get('content-type') || 'audio/mpeg',
      voiceId,
      modelId,
    });
  } catch (error) {
    console.error('[ElevenLabs] Request error', error);
    return res.status(500).json({ error: 'ElevenLabs request failed' });
  }
});

app.get('/api/overshoot-config', (_req, res) => {
  if (!process.env.OVERSHOOT_API_KEY) {
    return res.status(500).json({ error: 'Overshoot API key not configured' });
  }

  res.json({
    apiKey: process.env.OVERSHOOT_API_KEY,
    apiUrl: OVERSHOOT_API_URL,
  });
});

// Check Overshoot for active alerts on a patient
app.post('/api/check-overshoot', async (req, res) => {
  const { patientId, roomNumber } = req.body;
  
  console.log('🔍 [OVERSHOOT] Checking for active alerts:', { patientId, roomNumber });
  
  if (!patientId || !roomNumber) {
    return res.status(400).json({ error: 'patientId and roomNumber required' });
  }

  try {
    // In production, this would call Overshoot API:
    // const response = await fetch(`${OVERSHOOT_API_URL}/alerts/${patientId}`, {
    //   headers: { 'Authorization': `Bearer ${process.env.OVERSHOOT_API_KEY}` }
    // });
    // For now, return mock data that can be tested
    
    console.log('📡 [OVERSHOOT] Would fetch from: ' + OVERSHOOT_API_URL);
    console.log('🔑 [OVERSHOOT] Using API Key (first 10 chars): ' + (process.env.OVERSHOOT_API_KEY || 'NOT SET').substring(0, 10));
    
    res.json({
      status: 'configured',
      apiUrl: OVERSHOOT_API_URL,
      apiKeySet: !!process.env.OVERSHOOT_API_KEY,
      message: 'Ready to receive Overshoot alerts'
    });
  } catch (error) {
    console.error('❌ [OVERSHOOT] Error checking alerts:', error.message);
    res.status(500).json({ error: 'Failed to check Overshoot alerts' });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    patients: patients.size,
    nurses: nurses.size,
    alerts: alerts.length,
    livekit: {
      configured: !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`✅ HTTP endpoint: http://localhost:${PORT}`);
  
  if (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
    console.log(`✅ LiveKit voice monitoring: ENABLED`);
  } else {
    console.log(`⚠️  LiveKit voice monitoring: DISABLED (missing config)`);
  }
});

// ---------------- UTILITIES ----------------
function parseNumber(value, fallback) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function readFailedResponse(response) {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}