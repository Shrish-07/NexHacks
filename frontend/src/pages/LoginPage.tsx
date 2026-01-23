import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Smartphone } from 'lucide-react';
import authService from '../services/authService';
import FaultyTerminal from '../components/FaultyTerminal';

type LoginMode = 'patient' | 'nurse' | 'choose';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('choose');
  const [patientId, setPatientId] = useState('PATIENT_001');
  const [roomNumber, setRoomNumber] = useState('305');
  const [nurseId, setNurseId] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoPatients = authService.getDemoPatients();

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = authService.loginPatient(patientId, roomNumber);
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
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-cyan-400" />
              </div>
              <h1 className="text-4xl font-bold mb-2">ATTUNE</h1>
              <p className="text-gray-400">AI Patient Monitoring System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('patient')}
                className="bg-blue-600 hover:bg-blue-700 transition p-6 rounded-lg text-center space-y-3"
              >
                <Smartphone className="w-8 h-8 mx-auto" />
                <div>
                  <p className="font-bold text-lg">Patient</p>
                  <p className="text-sm text-blue-200">Login as patient</p>
                </div>
              </button>

              <button
                onClick={() => setMode('nurse')}
                className="bg-cyan-600 hover:bg-cyan-700 transition p-6 rounded-lg text-center space-y-3"
              >
                <User className="w-8 h-8 mx-auto" />
                <div>
                  <p className="font-bold text-lg">Nurse</p>
                  <p className="text-sm text-cyan-200">Login as nurse</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === 'patient' && (
          <form onSubmit={handlePatientLogin} className="space-y-4 bg-slate-900/50 backdrop-blur p-6 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="text-gray-400 hover:text-white"
              >
                 Back
              </button>
              <h2 className="text-2xl font-bold">Patient Login</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Select Patient</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full bg-slate-800 border border-white/20 rounded p-2 text-white"
              >
                {demoPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Room {p.room})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full bg-slate-800 border border-white/20 rounded p-2 text-white"
                placeholder="Room #"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 transition p-2 rounded font-bold"
            >
              {loading ? 'Logging in...' : 'Login as Patient'}
            </button>
          </form>
        )}

        {mode === 'nurse' && (
          <form onSubmit={handleNurseLogin} className="space-y-4 bg-slate-900/50 backdrop-blur p-6 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="text-gray-400 hover:text-white"
              >
                 Back
              </button>
              <h2 className="text-2xl font-bold">Nurse Login</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Nurse ID</label>
              <input
                type="text"
                value={nurseId}
                onChange={(e) => setNurseId(e.target.value)}
                className="w-full bg-slate-800 border border-white/20 rounded p-2 text-white"
                placeholder="NURSE_001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Full Name (optional)</label>
              <input
                type="text"
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                className="w-full bg-slate-800 border border-white/20 rounded p-2 text-white"
                placeholder="Your name"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !nurseId}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 transition p-2 rounded font-bold"
            >
              {loading ? 'Logging in...' : 'Login as Nurse'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
