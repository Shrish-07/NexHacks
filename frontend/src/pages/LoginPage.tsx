import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Smartphone, ChevronLeft, HeartPulse } from 'lucide-react';
import authService from '../services/authService';
import FaultyTerminal from '../components/FaultyTerminal';

type LoginMode = 'patient' | 'nurse' | 'choose';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('choose');
  const [patientName, setPatientName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [nurseId, setNurseId] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);



  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!patientName.trim() || !roomNumber.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = authService.loginPatient(patientName, roomNumber);
      if (result.success) {
        navigate('/patient');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNurseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!nurseId.trim()) {
      setError('Please enter a nurse ID');
      setLoading(false);
      return;
    }

    try {
      const result = authService.loginNurse(nurseId, nurseName);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-30">
        <FaultyTerminal
          scale={1.3}
          digitSize={2.7}
          scanlineIntensity={0.15}
          glitchAmount={0}
          flickerAmount={0.5}
          noiseAmp={0.15}
          chromaticAberration={0}
          dither={0}
          curvature={0.2}
          tint="#ffffff"
          mouseReact={false}
          brightness={0.3}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {mode === 'choose' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-6 animate-in zoom-in duration-500">
                <Shield className="w-16 h-16 text-cyan-400 drop-shadow-lg" style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
              <h1 className="text-6xl font-black mb-2 animate-in slide-in-from-top duration-700 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">ATTUNE</h1>
              <p className="text-gray-400 text-lg animate-in slide-in-from-bottom duration-700">AI Patient Monitoring System</p>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <button
                onClick={() => {
                  setMode('patient');
                  setError('');
                }}
                className="relative group bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 p-6 rounded-xl text-center space-y-3 shadow-lg hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <Smartphone className="w-10 h-10 mx-auto text-blue-200 mb-2" />
                  <p className="font-bold text-lg">Patient</p>
                  <p className="text-xs text-blue-200">Monitor yourself</p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setMode('nurse');
                  setError('');
                }}
                className="relative group bg-gradient-to-br from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 p-6 rounded-xl text-center space-y-3 shadow-lg hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <HeartPulse className="w-10 h-10 mx-auto text-teal-200 mb-2" />
                  <p className="font-bold text-lg">Nurse</p>
                  <p className="text-xs text-teal-200">Monitor patients</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === 'patient' && (
          <form onSubmit={handlePatientLogin} className="space-y-4 bg-slate-900/50 backdrop-blur p-8 rounded-xl border border-white/10 shadow-2xl animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('choose');
                  setError('');
                  setPatientName('');
                  setRoomNumber('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Add Patient</h2>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm animate-in shake duration-200">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/20 hover:border-white/40 focus:border-blue-500 rounded-lg p-3 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/20 hover:border-white/40 focus:border-blue-500 rounded-lg p-3 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., 305"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100"
            >
              {loading ? 'Adding patient...' : 'Add Patient'}
            </button>
          </form>
        )}

        {mode === 'nurse' && (
          <form onSubmit={handleNurseLogin} className="space-y-4 bg-slate-900/50 backdrop-blur p-8 rounded-xl border border-white/10 shadow-2xl animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('choose');
                  setError('');
                  setNurseId('');
                  setNurseName('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold">Nurse Login</h2>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm animate-in shake duration-200">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Nurse ID</label>
              <input
                type="text"
                value={nurseId}
                onChange={(e) => setNurseId(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/20 hover:border-white/40 focus:border-cyan-500 rounded-lg p-3 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="e.g., NURSE_001"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Full Name (optional)</label>
              <input
                type="text"
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/20 hover:border-white/40 focus:border-cyan-500 rounded-lg p-3 text-white placeholder-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="Your name"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !nurseId}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login as Nurse'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
