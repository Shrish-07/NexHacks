import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Lock } from 'lucide-react';
import FaultyTerminal from '@/components/FaultyTerminal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    console.log('Demo login accepted:', { email, password });
    setStatus('success');

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 3500);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center relative overflow-hidden">
      {/* Shared Attune background */}
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
      <div className="absolute inset-0 -z-10 bg-slate-950/80 backdrop-blur" aria-hidden="true" />
      
      {/* Lanyard */}
      <div 
        className="absolute bg-cyan-400"
        style={{
          width: '50px',
          height: '150px',
          top: '100px',
          left: 'calc(50% - 25px)',
          boxShadow: '0 0 50px rgba(0, 212, 255, 0.8)'
        }}
      />
      
      {/* Clip */}
      <div 
        className="absolute"
        style={{
          width: '70px',
          height: '40px',
          top: '235px',
          left: 'calc(50% - 35px)',
          background: '#00d4ff',
          borderRadius: '15px 15px 0 0',
          boxShadow: '0 0 40px rgba(0, 212, 255, 0.7)'
        }}
      >
        <div 
          className="absolute bg-cyan-400 rounded-full"
          style={{
            width: '25px',
            height: '25px',
            top: '-8px',
            left: '22.5px',
            border: '3px solid #006680'
          }}
        />
      </div>

      {/* Badge Holder */}
      <div 
        className="absolute"
        style={{
          width: '280px',
          height: '540px',
          top: '280px',
          left: 'calc(50% - 140px)',
          background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
          borderRadius: '20px',
          boxShadow: '0 0 100px rgba(0, 212, 255, 1), 0 0 150px rgba(0, 200, 255, 0.6)',
          border: '3px solid #00e5ff'
        }}
      >
        {/* White Inner Card */}
        <div 
          className="absolute bg-slate-800"
          style={{
            width: '240px',
            height: '500px',
            top: '20px',
            left: '20px',
            borderRadius: '15px',
            border: '2px solid rgba(100, 116, 139, 0.3)'
          }}
        >
          {/* Login Form Content */}
          <div className="p-6 text-white">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-cyan-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-bold text-cyan-400">Secure Access</h1>
              <p className="text-xs text-slate-400">Employee Portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2 rounded font-semibold text-sm text-white transition ${
                  status === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'bg-cyan-500 hover:bg-cyan-600'
                }`}
              >
                {status === 'success' ? 'Access Granted' : 'Sign In'}
              </button>

              <p
                className={`text-center text-xs font-semibold tracking-wide transition ${
                  status === 'success' ? 'text-emerald-300 opacity-100' : 'text-slate-500 opacity-0'
                }`}
                aria-live="polite"
              >
                Demo mode active — any credentials unlock the badge.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
