import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }     = useAuth();
  const { logoUrl }   = useSettings();
  const navigate      = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Credenciales incorrectas. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <span className="text-white font-semibold tracking-wide text-sm uppercase">PAD · Escuela de Dirección</span>
        </div>
        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Sistema de<br />Gestión<br />Presupuestaria
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Planificación, seguimiento y control del presupuesto de marketing por producto académico.
          </p>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} PAD · Todos los derechos reservados</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10 text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="PAD"
                className="inline-block w-32 h-32 object-contain mb-4"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="inline-flex w-32 h-32 items-center justify-center bg-brand rounded-3xl shadow-lg shadow-brand/30 mb-4">
                <span className="text-white font-bold text-5xl">P</span>
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div className="alert-red mb-6">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="field-label">Correo institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="field pl-9"
                  placeholder="usuario@pad.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="field pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 shadow-md shadow-brand/20"
            >
              {loading ? 'Iniciando sesión…' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
