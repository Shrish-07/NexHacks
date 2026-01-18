import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// ---------------- STATE ----------------
const patients = new Map(); // patientId -> ws
const nurses = new Map();   // nurseId -> ws

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
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
        patients.set(data.patientId, ws);
        console.log('[WS] Patient registered:', data.patientId);
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

      // ---------- STREAM REQUEST ----------
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

        console.log('[WS] Nurse requested stream:', data.patientId);
        break;
      }

      // ---------- OFFER (NURSE ONLY) ----------
      case 'webrtc_offer': {
        if (ws.role !== 'nurse') return;

        const patientWs = patients.get(data.patientId);
        if (!patientWs) return;

        send(patientWs, {
          type: 'webrtc_offer',
          offer: data.offer,
          nurseId: ws.nurseId,
        });

        console.log('[WS] Offer → patient', data.patientId);
        break;
      }

      // ---------- ANSWER (PATIENT ONLY) ----------
      case 'webrtc_answer': {
        if (ws.role !== 'patient') return;

        const nurseWs = nurses.get(data.nurseId);
        if (!nurseWs) return;

        send(nurseWs, {
          type: 'webrtc_answer',
          answer: data.answer,
          patientId: ws.patientId,
        });

        console.log('[WS] Answer → nurse', data.nurseId);
        break;
      }

      // ---------- ICE ----------
      case 'webrtc_ice_candidate': {
        if (data.target === 'patient') {
          send(patients.get(data.patientId), data);
        }
        if (data.target === 'nurse') {
          send(nurses.get(data.nurseId), data);
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

// ---------------- HTTP ----------------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    patients: patients.size,
    nurses: nurses.size,
  });
});

server.listen(PORT, () => {
  console.log(`✅ WebRTC signaling server running on port ${PORT}`);
});
