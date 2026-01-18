import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.WEBSOCKET_PORT || process.env.PORT || 3000);
const OVERSHOOT_API_URL = process.env.OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';
const MAX_ALERT_HISTORY = 200;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || '*',
}));
app.use(express.json());

const patientConnections = new Map();
const nurseConnections = new Map();
const alerts = [];

const buildPatientPayload = (patient) => ({
  patientId: patient.patientId,
  patientName: patient.patientName,
  roomNumber: patient.roomNumber,
  status: patient.status,
  connectedAt: patient.connectedAt,
  lastHeartbeat: patient.lastHeartbeat,
});

function broadcastToNurses(message) {
  const payload = JSON.stringify(message);

  nurseConnections.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

function pruneAlerts() {
  if (alerts.length > MAX_ALERT_HISTORY) {
    alerts.splice(0, alerts.length - MAX_ALERT_HISTORY);
  }
}

function sendToPatient(patientId, message) {
  const patient = patientConnections.get(patientId);
  if (!patient || patient.ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  patient.ws.send(JSON.stringify(message));
  return true;
}

function sendToNurse(nurseId, message) {
  const socket = nurseConnections.get(nurseId);
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(message));
  return true;
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      console.error('[WebSocket] Invalid JSON payload', error);
      return;
    }

    switch (data.type) {
      case 'register_patient': {
        const patient = {
          ws,
          patientId: data.patientId,
          patientName: data.patientName,
          roomNumber: data.roomNumber,
          status: 'active',
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        };

        patientConnections.set(patient.patientId, patient);

        broadcastToNurses({
          type: 'patient_connected',
          patient: buildPatientPayload(patient),
        });
        break;
      }

      case 'register_nurse': {
        if (!data.nurseId) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'nurseId is required to register nurse connection',
            })
          );
          return;
        }

        nurseConnections.set(data.nurseId, ws);
        ws.nurseId = data.nurseId;

        const patients = Array.from(patientConnections.values()).map(buildPatientPayload);
        ws.send(
          JSON.stringify({
            type: 'init',
            patients,
            recentAlerts: alerts.slice(-10),
          })
        );
        break;
      }

      case 'alert': {
        const alert = {
          id: `alert_${Date.now()}`,
          ...data,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        };

        alerts.push(alert);
        pruneAlerts();

        broadcastToNurses({
          type: 'alert',
          alert,
        });
        break;
      }

      case 'heartbeat': {
        const patient = patientConnections.get(data.patientId);
        if (patient) {
          patient.lastHeartbeat = new Date().toISOString();
        }
        break;
      }
      case 'webrtc_offer': {
        if (!data.patientId || !data.offer || !data.nurseId) {
          return;
        }

        const forwarded = sendToPatient(data.patientId, {
          type: 'webrtc_offer',
          patientId: data.patientId,
          nurseId: data.nurseId,
          offer: data.offer,
        });

        if (!forwarded) {
          sendToNurse(data.nurseId, {
            type: 'webrtc_error',
            patientId: data.patientId,
            message: 'Patient not connected',
          });
        }
        break;
      }
      case 'webrtc_answer': {
        if (!data.patientId || !data.answer || !data.nurseId) {
          return;
        }

        sendToNurse(data.nurseId, {
          type: 'webrtc_answer',
          patientId: data.patientId,
          nurseId: data.nurseId,
          answer: data.answer,
        });
        break;
      }
      case 'webrtc_ice_candidate': {
        if (!data.candidate || !data.patientId || !data.nurseId || !data.target) {
          return;
        }

        const payload = {
          type: 'webrtc_ice_candidate',
          patientId: data.patientId,
          nurseId: data.nurseId,
          candidate: data.candidate,
        };

        if (data.target === 'patient') {
          sendToPatient(data.patientId, payload);
        } else if (data.target === 'nurse') {
          sendToNurse(data.nurseId, payload);
        }
        break;
      }

      default:
        console.warn('[WebSocket] Unhandled message type:', data.type);
    }
  });

  ws.on('close', () => {
    // Remove from nurse set if present
    if (ws.nurseId) {
      nurseConnections.delete(ws.nurseId);
    } else {
      for (const [nurseId, socket] of nurseConnections.entries()) {
        if (socket === ws) {
          nurseConnections.delete(nurseId);
          break;
        }
      }
    }

    // Remove patient connection if matches closing socket
    for (const [patientId, patient] of patientConnections.entries()) {
      if (patient.ws === ws) {
        patientConnections.delete(patientId);
        broadcastToNurses({
          type: 'patient_disconnected',
          patientId,
        });
        break;
      }
    }
  });
});

app.get('/api/patients', (_req, res) => {
  const patients = Array.from(patientConnections.values()).map(buildPatientPayload);
  res.json({ patients });
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

app.get('/api/overshoot-config', (_req, res) => {
  if (!process.env.OVERSHOOT_API_KEY) {
    return res.status(500).json({ error: 'Overshoot API key not configured' });
  }

  res.json({
    apiKey: process.env.OVERSHOOT_API_KEY,
    apiUrl: OVERSHOOT_API_URL,
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', patients: patientConnections.size });
});

server.listen(PORT, () => {
  console.log(`Patient monitoring server listening on port ${PORT}`);
});
