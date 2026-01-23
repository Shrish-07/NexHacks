import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Eye, Shield, Activity, ArrowRight, Sparkles, Heart, Zap, Wifi, ChevronRight } from 'lucide-react';
// @ts-ignore
import FaultyTerminal from './components/FaultyTerminal';
import LoginPage from './pages/LoginPage';
import NurseDashboard from './pages/NurseDashboard';
import PatientDashboard from './pages/PatientDashboard';
import authService from './services/authService';

type ActiveButton = 'login' | 'start' | 'demo' | 'trial' | null;

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'patient' | 'nurse' }) {
  const user = authService.getCurrentUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AttuneHomepage />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="nurse"><NurseDashboard /></ProtectedRoute>} />
      <Route path="/patient" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function LoginScreen() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  
  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (user) {
      navigate(user.role === 'nurse' ? '/dashboard' : '/patient', { replace: true });
    }
  }, [user, navigate]);
  
  return <LoginPage />;
}

function AttuneHomepage() {
  const [activeBtn, setActiveBtn] = useState<ActiveButton>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    { 
      icon: Shield, 
      title: "Always Watching", 
      desc: "All camera feeds stay visible for peace of mind while our AI quietly monitors each one in the background.", 
      gradient: "from-emerald-500 to-teal-500"
    },
    { 
      icon: Zap, 
      title: "Smart Alerts", 
      desc: "When something important happens—a fall, unexpected bed exit, or prolonged inactivity—Attune automatically brings that camera to focus.", 
      gradient: "from-blue-500 to-cyan-500"
    },
    { 
      icon: Activity, 
      title: "Clear Explanations", 
      desc: "No guessing games. Attune explains what's happening in clear, simple language so you can respond quickly and confidently.", 
      gradient: "from-teal-500 to-cyan-500"
    },
    { 
      icon: Heart, 
      title: "Calm & Unobtrusive", 
      desc: "No alert fatigue. No constant interruptions. Attune stays quiet unless something truly needs your attention.", 
      gradient: "from-cyan-500 to-blue-500"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none opacity-100" aria-hidden="true">
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

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-black/85">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">Attune</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:border-cyan-300/60 hover:bg-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/30 backdrop-blur"
              onClick={() => navigate('/dashboard')}
            >
              Nurse dashboard
            </button>
            <button 
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:border-cyan-300/60 hover:bg-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/30 backdrop-blur"
              onClick={() => navigate('/login')}
              onMouseDown={() => setActiveBtn('login')}
              onMouseUp={() => setActiveBtn(null)}
              onMouseLeave={() => setActiveBtn(null)}
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className={`text-center mb-24 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 bg-slate-900/95 border border-teal-400/30 backdrop-blur-sm shadow-lg shadow-teal-500/20">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-bold text-teal-300 tracking-wide">AI-POWERED PATIENT MONITORING</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          
          {/* Hero Text with stagger animation */}
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-none">
            <span className={`block text-teal-200 mb-4 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              See What
            </span>
            <span className={`block transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent" style={{
                  textShadow: '0 0 40px rgba(20, 184, 166, 0.3)'
                }}>
                  Matters
                </span>
                <div className="absolute -inset-8 bg-gradient-to-r from-teal-400/30 to-cyan-400/30 blur-3xl -z-10 rounded-full" />
              </span>
            </span>
          </h1>
          
          <p
            className={`text-xl text-black max-w-3xl mx-auto leading-relaxed mb-12 transition-all duration-700 delay-300 rounded-3xl px-6 py-4 bg-white/90 border border-white/70 shadow-[0_25px_60px_rgba(15,23,42,0.25)] backdrop-blur-sm ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            Intelligent monitoring that helps nursing staff focus their attention where it's needed most, 
            <span className="font-black text-teal-500"> without the overwhelm</span>.
          </p>

        </div>

        {/* Feature Cards with glass morphism */}
        <div className="grid md:grid-cols-2 gap-6 mb-24">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isHovered = hoveredCard === idx;
            
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group p-8 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-teal-400/20 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-teal-400/30 hover:-translate-y-2 hover:border-teal-400/50 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${600 + idx * 100}ms` }}
              >
                <div className="relative mb-6 inline-block">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500`} />
                </div>
                
                <h3 className="text-2xl font-bold text-teal-300 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-slate-300 leading-relaxed">
                  {feature.desc}
                </p>

                <div className="mt-4 flex items-center gap-2 text-teal-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      {/* CTA Section with gradient border */}
        <div className="relative p-16 rounded-3xl text-center overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900" />
          
          {/* Animated stars */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10">
            <Heart className="w-16 h-16 text-teal-300 mx-auto mb-6 group-hover:scale-125 transition-transform duration-500" />
            
            <h2 className="text-5xl font-black text-white mb-6 leading-tight">
              Ready to transform<br />patient care?
            </h2>
            
            <p className="text-teal-100 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Join nursing teams who are spending less time watching screens and more time making a difference.
            </p>
            
            <button 
              className="group/cta relative px-10 py-5 rounded-2xl font-bold text-slate-900 overflow-hidden transition-all duration-300 hover:scale-105 inline-flex items-center gap-3 bg-white hover:shadow-2xl hover:shadow-teal-400/50"
              onMouseDown={() => setActiveBtn('trial')}
              onMouseUp={() => setActiveBtn(null)}
              onMouseLeave={() => setActiveBtn(null)}
            >
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="w-6 h-6 group-hover/cta:translate-x-2 transition-transform relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-teal-400/30 to-teal-400/0 translate-x-[-200%] group-hover/cta:translate-x-[200%] transition-transform duration-1000" />
            </button>
          </div>
        </div>
      </div>
  
      {/* Footer */}
      <footer className="relative z-10 mt-16 border-t border-slate-200/50 bg-white/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center text-slate-600">
          <p className="font-semibold">&copy; 2026 Attune. Intelligent patient monitoring for better care.</p>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
