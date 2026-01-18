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

const patients = new Map(); // patientId -> ws
const nurses = new Map();   // nurseId -> ws

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    switch (data.type) {

      // ---------------- REGISTER ----------------
      case 'register_patient': {
        ws.role = 'patient';
        ws.patientId = data.patientId;
        patients.set(data.patientId, ws);
        console.log('[WS] Patient registered', data.patientId);
        break;
      }

      case 'register_nurse': {
        ws.role = 'nurse';
        ws.nurseId = data.nurseId;
        nurses.set(data.nurseId, ws);

        send(ws, {
          type: 'init',
          patients: [...patients.keys()]
        });

        console.log('[WS] Nurse registered', data.nurseId);
        break;
      }

      // ---------------- STREAM REQUEST ----------------
      case 'request_stream': {
        const patientWs = patients.get(data.patientId);
        if (!patientWs) {
          send(ws, { type: 'error', message: 'Patient not online' });
          return;
        }

        send(patientWs, {
          type: 'start_stream',
          nurseId: data.nurseId
        });

        console.log('[WS] Nurse requested stream', data.patientId);
        break;
      }

      // ---------------- OFFER (NURSE ONLY) ----------------
      case 'webrtc_offer': {
        if (ws.role !== 'nurse') return;

        const patientWs = patients.get(data.patientId);
        if (!patientWs) return;

        send(patientWs, {
          type: 'webrtc_offer',
          offer: data.offer,
          nurseId: data.nurseId
        });

        break;
      }

      // ---------------- ANSWER (PATIENT ONLY) ----------------
      case 'webrtc_answer': {
        if (ws.role !== 'patient') return;

        const nurseWs = nurses.get(data.nurseId);
        if (!nurseWs) return;

        send(nurseWs, {
          type: 'webrtc_answer',
          answer: data.answer,
          patientId: ws.patientId
        });

        break;
      }

      // ---------------- ICE ----------------
      case 'webrtc_ice_candidate': {
        if (data.target === 'patient') {
          const p = patients.get(data.patientId);
          send(p, data);
        }
        if (data.target === 'nurse') {
          const n = nurses.get(data.nurseId);
          send(n, data);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ws.role === 'patient') {
      patients.delete(ws.patientId);
    }
    if (ws.role === 'nurse') {
      nurses.delete(ws.nurseId);
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Signaling server running on ${PORT}`)
);
