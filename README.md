# Attune

[![Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-brightgreen)](https://nexhacks-xi.vercel.app)  
[![Hackathon](https://img.shields.io/badge/NexHacks-2026-blue)](https://nexhacks.com/)  
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🌟 Overview

Attune is an innovative AI-driven monitoring and analytics platform designed to revolutionize healthcare by addressing critical challenges like nurse understaffing, alarm fatigue, and patient safety. Built during the NexHacks hackathon under the theme of "TURING CITY" – constructing the building blocks of a sentient digital metropolis – Attune serves as a "second set of eyes" for healthcare professionals. 

Using computer vision and real-time AI reasoning, it analyzes hospital camera feeds to detect signs of patient discomfort, bed exits, falls, or prolonged inactivity, alerting nurses with contextual, human-readable explanations.

This project aligns perfectly with NexHacks' judging criteria by demonstrating:

- **Innovation & Technical Execution**: Integrating YOLOv8 for object detection with Overshoot.ai for advanced AI reasoning and LiveKit for low-latency video streaming.
- **Impact & Market Potential**: Tackles a projected shortfall of 200,000–450,000 registered nurses by 2025, reducing burnout (affecting 84% of nurses) and alarm fatigue (72–99% false alarms), potentially lowering medication errors, infections, falls, and mortality.
- **Scalability & Viability**: Full-stack architecture deployed on Vercel, with modular design for easy integration into hospital systems, supporting multi-camera setups and real-time alerts.
- **Relevance to Tracks**:
  - **Healthcare Track**: Enhances patient safety for nonverbal, elderly, or postoperative individuals through proactive monitoring, minimizing missed interventions.
  - **Overshoot Track**: Leverages Overshoot.ai SDK for natural language-based AI prompts on live streams, enabling ethical, explainable AI decisions in high-stakes environments.
  - **LiveKit Track**: Utilizes LiveKit for seamless real-time video streaming and multi-feed dashboards, ensuring low-latency communication for remote monitoring and alerts.

Attune transforms raw data into trusted, actionable insights – embodying NexHacks' emphasis on clarity, numeric correctness, and AGI-inspired transformative technologies for a smarter, more responsive digital ecosystem.

## ✨ Features

- **Real-Time Patient Monitoring**: Analyzes video feeds using YOLOv8 to detect movements, falls, or anomalies, with Overshoot.ai providing contextual reasoning (e.g., "Patient attempting bed exit – potential fall risk").
- **Multi-Camera Dashboard**: Interactive frontend displaying live feeds, auto-highlighting critical events, and filtering non-urgent alerts to combat alarm fatigue.
- **AI-Driven Alerts**: Low-latency notifications via LiveKit, with tunable sensitivity to minimize false positives while ensuring rapid response.
- **Privacy-Focused Design**: Local processing options and permission prompts for webcam usage, addressing ethical concerns in healthcare.
- **Analytics & Insights**: Generates reports on patient activity, helping optimize staffing and care protocols.
- **Scalable Deployment**: Cloud-ready on Vercel, with RESTful APIs for integration with hospital systems.

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vite, Tailwind CSS – For a responsive, real-time dashboard.
- **Backend**: Python, FastAPI/Uvicorn – Handles AI pipelines and API endpoints.
- **AI & Computer Vision**: YOLOv8 (pre-trained model: `yolov8n.pt`), Overshoot.ai SDK – For object detection and natural language reasoning on live streams.
- **Real-Time Communication**: LiveKit – Enables low-latency video streaming and voice interactions.
- **Additional Libraries**: OpenCV (for video processing), WebRTC (for peer-to-peer streaming).
- **Deployment**: Vercel – Ensures high availability and scalability.
- **Other Tools**: Git LFS for large models, Node.js/npm for frontend builds.

## 💡 Inspiration

In the face of escalating healthcare crises – including nurse shortages projected to reach 450,000 by 2025, burnout rates at 84%, and alarm fatigue from 72–99% false positives – traditional systems like nurse call buttons fall short, especially for nonverbal or sedated patients. Attune was inspired by the need for an intelligent, AI-augmented solution that reduces cognitive overload on nurses, prevents adverse events like falls or infections, and scales to build a "sentient" healthcare infrastructure in line with NexHacks' TURING CITY vision.

## ⚙️ How It Works

### System Architecture

![Tech Diagram](Tech%20Diagram.png)

1. **Data Ingestion**: Camera feeds (real or simulated via webcams) are streamed using LiveKit for low-latency access.
2. **AI Processing**:
   - YOLOv8 detects objects and movements (e.g., person exiting bed).
   - Overshoot.ai SDK applies natural language prompts to reason about events (e.g., "Is this a fall risk? Explain.").
3. **Alert Generation**: Backend filters and prioritizes events, sending contextual alerts to the frontend.
4. **User Interface**: The dashboard (`monitor.html`) visualizes feeds and alerts in real-time, with TypeScript handling dynamic updates.
5. **Output**: Nurses receive actionable insights, enabling faster interventions and better resource allocation.

For a deeper dive, explore the code:
- `agent.py`: Core AI agent integrating YOLOv8 and Overshoot.ai for real-time analysis.
- `backend/`: Server logic for data processing and APIs.
- `frontend/`: TypeScript-based UI components.
- `yolov8n.pt`: Lightweight YOLO model for efficient edge-compatible detection.

## 📋 Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- npm/pip

## 🔧 Installation

### Steps

1. Clone the repository:
git clone https://github.com/Shrish-07/NexHacks.git
cd NexHacks

2. Install backend dependencies:
pip install -r requirements.txt

3. Install frontend dependencies:
cd frontend
npm install
cd ..

4. Set up environment variables (e.g., API keys for Overshoot.ai and LiveKit – contact us for demo keys).

## 🎯 Usage

1. Start the backend:
cd backend
uvicorn main:app --reload

2. Start the frontend:
cd frontend
npm run dev

3. Access the dashboard at `http://localhost:5173/monitor.html` (or the live demo at [nexhacks-xi.vercel.app](https://nexhacks-xi.vercel.app)).
4. Simulate feeds using webcams or sample videos; monitor real-time alerts.

## 🏆 Challenges We Overcame

- Simulated hospital environments with webcams and videos due to hardware constraints.
- Optimized YOLOv8 + Overshoot.ai integration for low latency and accuracy, tuning prompts to reduce false alerts.
- Handled WebRTC NAT traversal issues and ensured cross-browser compatibility for real-time UI.
- Prioritized privacy with local processing and ethical AI design.

## 🏅 Accomplishments We're Proud Of

- Built a production-grade, real-time AI vision system in 24 hours using YOLOv8, Overshoot.ai, and LiveKit.
- Created a scalable full-stack app that directly impacts healthcare efficiency.
- Achieved high AI sensitivity with minimal false positives, making it viable for real-world deployment.
- Aligned with NexHacks' AGI vision by enabling "sentient" monitoring in digital healthcare ecosystems.

## 📚 What We Learned

- Mastery of real-time AI systems, including computer vision pipelines and low-latency streaming.
- The critical role of explainable AI in healthcare to build trust and reduce errors.
- Modular architecture for rapid prototyping and debugging in hackathons.
- Balancing innovation with ethical considerations like privacy and bias in AI.

## 👥 Contributors

- [Sourish-07](https://github.com/Sourish-07)
- [ICYBAWSS](https://github.com/ICYBAWSS)
- [Shrish-07](https://github.com/Shrish-07)

Join us in building a safer, smarter healthcare future! For questions, open an issue or reach out on Devpost.

---

*Built for NexHacks 2026 – Empowering AGI-Driven Solutions for Healthcare and Beyond.*
