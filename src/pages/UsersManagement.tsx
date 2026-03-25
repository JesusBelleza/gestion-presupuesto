import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { UserPlus, Mail, CheckCircle, XCircle, Key, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { apiRequest } from '../services/api';

const ROLE_LABEL: Record<string, string> = {
  JEFA_MARKETING: 'Marketing',
  JEFA_PRODUCTO:  'Producto',
};

export const UsersManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = useState<User[]>([]);

  const [showModal, setShowModal]           = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showConfirm, setShowConfirm]       = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [selectedUser, setSelectedUser]     = useState<User | null>(null);
  const [newPassword, setNewPassword]       = useState('');
  const [newUser, setNewUser] = useState<Partial<User>>({ name: '', email: '', role: 'JEFA_PRODUCTO', active: true });

  const fetchUsers = async () => {
    try { setUsers(await apiRequest<User[]>('/api/users')); } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      fetchUsers(); setShowModal(false); setNewUser({ name: '', email: '', role: 'JEFA_PRODUCTO', active: true });
    } catch (err) { console.error(err); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await apiRequest('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });
      setShowResetModal(false); setNewPassword(''); setSelectedUser(null);
    } catch { alert('Error al restablecer la contraseña'); }
  };

  const handleToggle = async (user: User) => {
    try {
      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, active: !user.active }),
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) { alert('No puedes eliminar tu propio usuario'); return; }
    setShowConfirm({
      title: 'Eliminar usuario',
      message: 'Esta acción eliminará permanentemente al usuario y no puede deshacerse.',
      onConfirm: async () => {
        try { await apiRequest(`/api/users/${id}`, { method: 'DELETE' }); fetchUsers(); }
        catch (e) { console.error(e); }
        setShowConfirm(null);
      },
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <p className="text-sm text-slate-400">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {users.map(user => (
          <div key={user.id} className="card flex items-start gap-4">
            <div className="w-11 h-11 bg-brand/10 text-brand rounded-2xl flex items-center justify-center font-bold text-base shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{user.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail size={11} className="shrink-0" />{user.email}
                  </p>
                </div>
                <span className={user.role === 'JEFA_MARKETING' ? 'badge-blue shrink-0' : 'badge-gray shrink-0'}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-4 flex-wrap">
                <button className="btn-ghost text-xs py-1 px-2"
                  onClick={() => { setSelectedUser(user); setShowResetModal(true); }}>
                  <Key size={12} /> Contraseña
                </button>
                <button
                  className={`btn-ghost text-xs py-1 px-2 ${user.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  onClick={() => handleToggle(user)}>
                  {user.active ? <><ShieldOff size={12} /> Desactivar</> : <><ShieldCheck size={12} /> Activar</>}
                </button>
                {user.id !== currentUser?.id && (
                  <button className="btn-ghost text-xs py-1 px-2 text-brand hover:bg-brand-light"
                    onClick={() => handleDelete(user.id)}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>

              <div className={`flex items-center gap-1.5 mt-3 text-[11px] font-semibold ${user.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {user.active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {user.active ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Confirm ── */}
      {showConfirm && (
        <div className="modal-overlay z-[100]">
          <div className="modal max-w-sm">
            <div className="p-8 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-brand-light text-brand rounded-2xl flex items-center justify-center"><Trash2 size={24} /></div>
              <div>
                <h3 className="font-bold text-slate-900">{showConfirm.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{showConfirm.message}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button className="btn-secondary flex-1" onClick={() => setShowConfirm(null)}>Cancelar</button>
                <button className="btn-danger flex-1" onClick={showConfirm.onConfirm}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password ── */}
      {showResetModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">Restablecer contraseña</h3>
              <button className="btn-icon" onClick={() => setShowResetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p className="text-sm text-slate-500">Restableciendo contraseña para <strong className="text-slate-700">{selectedUser.name}</strong>.</p>
                <div>
                  <label className="field-label">Nueva contraseña</label>
                  <input type="password" required className="field" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowResetModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Actualizar contraseña</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New User ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">Nuevo usuario</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Nombre completo</label>
                  <input required className="field" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Correo institucional</label>
                  <input type="email" required className="field" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Rol del sistema</label>
                  <select className="field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })}>
                    <option value="JEFA_PRODUCTO">Jefa de Producto</option>
                    <option value="JEFA_MARKETING">Jefa de Marketing</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
