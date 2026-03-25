import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import {
  LayoutDashboard, BookOpen, BarChart3, History,
  Users, Settings, LogOut, TrendingUp, Calendar,
  Wallet, Key, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiRequest } from '../services/api';

interface NavItem { to: string; icon: React.ElementType; label: string; }

const NavLink: React.FC<NavItem & { active: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
      active
        ? 'bg-brand text-white shadow-sm shadow-brand/30'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
    )}
  >
    <Icon
      size={17}
      className={clsx(
        'shrink-0 transition-colors',
        active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600',
      )}
    />
    <span className="truncate">{label}</span>
    {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout }         = useAuth();
  const { language, logoUrl }    = useSettings();
  const location                 = useLocation();
  const navigate                 = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [newPassword, setNewPassword]             = React.useState('');
  const [confirmPassword, setConfirmPassword]     = React.useState('');

  const t = {
    es: {
      dashboard: 'Dashboard',   products: 'Productos',
      expenses: 'Gastos',       calendar: 'Calendario',
      comparative: 'Comparativa', users: 'Usuarios',
      config: 'Configuración',  audit: 'Auditoría',
      logout: 'Cerrar sesión',  changePassword: 'Cambiar contraseña',
      system: 'Sistema',
    },
    en: {
      dashboard: 'Dashboard',   products: 'Products',
      expenses: 'Expenses',     calendar: 'Calendar',
      comparative: 'Comparative', users: 'Users',
      config: 'Configuration',  audit: 'Audit Log',
      logout: 'Logout',         changePassword: 'Change password',
      system: 'System',
    },
  }[language === 'es' ? 'es' : 'en'];

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert('Las contraseñas no coinciden'); return; }
    try {
      await apiRequest('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, newPassword }),
      });
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      alert('Error al actualizar la contraseña');
    }
  };

  if (!user) return <>{children}</>;

  const nav: NavItem[] = [
    { to: '/',           icon: LayoutDashboard, label: t.dashboard },
    { to: '/productos',  icon: BookOpen,         label: t.products },
    { to: '/gastos',     icon: Wallet,           label: t.expenses },
    { to: '/calendario', icon: Calendar,         label: t.calendar },
  ];

  if (user.role === 'JEFA_MARKETING') {
    nav.push(
      { to: '/comparativa', icon: TrendingUp,  label: t.comparative },
      { to: '/usuarios',    icon: Users,        label: t.users },
      { to: '/configuracion', icon: Settings,  label: t.config },
      { to: '/auditoria',   icon: History,      label: t.audit },
    );
  }

  const pageLabel = nav.find(i => i.to === location.pathname)?.label ?? t.system;

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-white border-r border-border flex flex-col fixed inset-y-0 left-0 z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
              P
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 leading-none text-sm">PAD</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5 truncate">Escuela de Dirección</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map(item => (
            <NavLink key={item.to} {...item} active={location.pathname === item.to} />
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border space-y-0.5 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 bg-brand/10 text-brand rounded-full flex items-center justify-center font-bold text-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5 truncate">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors font-medium"
          >
            <Key size={15} className="shrink-0" />
            {t.changePassword}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-brand hover:bg-brand-light transition-colors font-medium"
          >
            <LogOut size={15} className="shrink-0" />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 ml-60 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
          <div>
            <h1 className="text-base font-bold text-slate-900">{pageLabel}</h1>
          </div>
          <div className="text-xs font-medium text-slate-400 bg-slate-50 border border-border px-3 py-1.5 rounded-lg">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

        <div className="flex-1 p-8">
          {children}
        </div>
      </main>

      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="text-base font-bold text-slate-900">{t.changePassword}</h3>
              <button onClick={() => setShowPasswordModal(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Nueva contraseña</label>
                  <input type="password" required className="field" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Confirmar contraseña</label>
                  <input type="password" required className="field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Actualizar contraseña</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
