import React, { useEffect, useState } from 'react';
import { Category, Activity, User, Product, AcademicYear } from '../types';
import { Plus, Tag, Layers, CheckCircle, XCircle, Edit2, Save, Users as UsersIcon, BookOpen, Calendar, Trash2, Settings2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { apiRequest } from '../services/api';

/* ─── Reusable toggle row ─── */
const ItemRow = ({ label, sublabel, active, onToggle, onEdit, onDelete }: {
  label: string; sublabel?: string; active: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) => (
  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-border/60 hover:border-border transition-colors">
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-400 uppercase font-bold mt-0.5">{sublabel}</p>}
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
          active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
        {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {active ? 'Activo' : 'Inactivo'}
      </button>
      <button className="btn-icon" onClick={onEdit}><Edit2 size={13} /></button>
      <button className="btn-icon text-brand hover:bg-brand-light" onClick={onDelete}><Trash2 size={13} /></button>
    </div>
  </div>
);

/* ─── Section card ─── */
const Section = ({ icon: Icon, iconBg, title, children, action }: {
  icon: React.ElementType; iconBg: string; title: string;
  children: React.ReactNode; action?: React.ReactNode;
}) => (
  <div className="card">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}><Icon size={18} /></div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

/* ─── Component ─── */
export const Configuration: React.FC = () => {
  const { user }   = useAuth();
  const { currency, language, logoUrl, setCurrency, setLanguage, setLogoUrl } = useSettings();

  const [categories, setCategories]       = useState<Category[]>([]);
  const [activities, setActivities]       = useState<Activity[]>([]);
  const [users, setUsers]                 = useState<User[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading]             = useState(true);

  const [showCatModal, setShowCatModal]     = useState(false);
  const [showActModal, setShowActModal]     = useState(false);
  const [showYearModal, setShowYearModal]   = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConfirm, setShowConfirm]       = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingYear, setEditingYear]         = useState<AcademicYear | null>(null);
  const [selectedUser, setSelectedUser]       = useState<User | null>(null);

  const [newCategory, setNewCategory] = useState({ name: '' });
  const [newActivity, setNewActivity] = useState({ name: '', categoryId: '' });
  const [newYear, setNewYear]         = useState({ year: new Date().getFullYear() });

  const [tempCurrency, setTempCurrency] = useState(currency);
  const [tempLanguage, setTempLanguage] = useState(language);
  const [tempLogoUrl, setTempLogoUrl]   = useState(logoUrl);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchData = async () => {
    try {
      const [cats, acts, usrs, prods, years] = await Promise.all([
        apiRequest<Category[]>('/api/categories'),
        apiRequest<Activity[]>('/api/activities'),
        apiRequest<User[]>('/api/users'),
        apiRequest<Product[]>('/api/products'),
        apiRequest<AcademicYear[]>('/api/academic-years'),
      ]);
      setCategories(cats); setActivities(acts); setUsers(usrs); setProducts(prods); setAcademicYears(years);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Handlers ── */
  const confirmDelete = (title: string, message: string, onConfirm: () => Promise<void>) =>
    setShowConfirm({ title, message, onConfirm: async () => { await onConfirm(); setShowConfirm(null); fetchData(); } });

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    await apiRequest(url, {
      method: editingCategory ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCategory, id: editingCategory?.id ?? Date.now().toString(), active: editingCategory?.active ?? true }),
    });
    setShowCatModal(false); setEditingCategory(null); setNewCategory({ name: '' }); fetchData();
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingActivity ? `/api/activities/${editingActivity.id}` : '/api/activities';
    await apiRequest(url, {
      method: editingActivity ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newActivity, id: editingActivity?.id ?? Date.now().toString(), active: editingActivity?.active ?? true }),
    });
    setShowActModal(false); setEditingActivity(null); setNewActivity({ name: '', categoryId: '' }); fetchData();
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingYear ? `/api/academic-years/${editingYear.id}` : '/api/academic-years';
    await apiRequest(url, {
      method: editingYear ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newYear, id: editingYear?.id ?? Date.now().toString(), active: editingYear?.active ?? true }),
    });
    setShowYearModal(false); setEditingYear(null); setNewYear({ year: new Date().getFullYear() }); fetchData();
  };

  const toggle = async (url: string, item: Record<string, unknown>) => {
    await apiRequest(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, active: !item.active }) });
    fetchData();
  };

  const handleSaveSettings = () => {
    setCurrency(tempCurrency); setLanguage(tempLanguage); setLogoUrl(tempLogoUrl);
    setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleAssignProducts = async () => {
    if (!selectedUser) return;
    await Promise.all(products.map(p =>
      apiRequest(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }),
    ));
    setShowAssignModal(false); setSelectedUser(null); fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Cargando…</div>;

  const AddBtn = ({ onClick }: { onClick: () => void }) => (
    <button className="btn-primary text-xs py-1.5" onClick={onClick}><Plus size={14} /> Nuevo</button>
  );

  return (
    <div className="page">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Academic Years ── */}
        <Section icon={Calendar} iconBg="bg-violet-50 text-violet-600" title="Años académicos"
          action={<AddBtn onClick={() => { setEditingYear(null); setNewYear({ year: new Date().getFullYear() }); setShowYearModal(true); }} />}>
          <div className="space-y-2">
            {academicYears.sort((a, b) => b.year - a.year).map(y => (
              <ItemRow key={y.id} label={String(y.year)} active={y.active}
                onToggle={() => toggle(`/api/academic-years/${y.id}`, y as unknown as Record<string, unknown>)}
                onEdit={() => { setEditingYear(y); setNewYear({ year: y.year }); setShowYearModal(true); }}
                onDelete={() => confirmDelete('Eliminar año académico', '¿Eliminar este año académico?', async () => apiRequest(`/api/academic-years/${y.id}`, { method: 'DELETE' }))} />
            ))}
            {academicYears.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin años registrados</p>}
          </div>
        </Section>

        {/* ── Categories ── */}
        <Section icon={Layers} iconBg="bg-navy-light text-navy" title="Categorías"
          action={<AddBtn onClick={() => { setEditingCategory(null); setNewCategory({ name: '' }); setShowCatModal(true); }} />}>
          <div className="space-y-2">
            {categories.map(cat => (
              <ItemRow key={cat.id} label={cat.name} active={cat.active}
                onToggle={() => toggle(`/api/categories/${cat.id}`, cat as unknown as Record<string, unknown>)}
                onEdit={() => { setEditingCategory(cat); setNewCategory({ name: cat.name }); setShowCatModal(true); }}
                onDelete={() => confirmDelete('Eliminar categoría', 'Se eliminarán también sus actividades.', async () => apiRequest(`/api/categories/${cat.id}`, { method: 'DELETE' }))} />
            ))}
            {categories.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin categorías registradas</p>}
          </div>
        </Section>

        {/* ── Activities ── */}
        <Section icon={Tag} iconBg="bg-brand-light text-brand" title="Actividades"
          action={<AddBtn onClick={() => { setEditingActivity(null); setNewActivity({ name: '', categoryId: '' }); setShowActModal(true); }} />}>
          <div className="space-y-2">
            {activities.map(act => {
              const cat = categories.find(c => c.id === act.categoryId);
              return (
                <ItemRow key={act.id} label={act.name} sublabel={cat?.name ?? 'Sin categoría'} active={act.active}
                  onToggle={() => toggle(`/api/activities/${act.id}`, act as unknown as Record<string, unknown>)}
                  onEdit={() => { setEditingActivity(act); setNewActivity({ name: act.name, categoryId: act.categoryId }); setShowActModal(true); }}
                  onDelete={() => confirmDelete('Eliminar actividad', '¿Eliminar esta actividad?', async () => apiRequest(`/api/activities/${act.id}`, { method: 'DELETE' }))} />
              );
            })}
            {activities.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Sin actividades registradas</p>}
          </div>
        </Section>

        {/* ── Program Assignment ── */}
        {user?.role === 'JEFA_MARKETING' && (
          <Section icon={UsersIcon} iconBg="bg-emerald-50 text-emerald-600" title="Asignación de programas">
            <div className="space-y-3">
              {users.filter(u => u.role === 'JEFA_PRODUCTO').map(u => {
                const count = products.filter(p => p.assignedProductManagers?.includes(u.id)).length;
                return (
                  <div key={u.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-border/60">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{u.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><BookOpen size={10} /> {count} programa{count !== 1 ? 's' : ''} asignado{count !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="btn-secondary text-xs py-1.5"
                      onClick={() => { setSelectedUser(u); setShowAssignModal(true); }}>
                      Gestionar
                    </button>
                  </div>
                );
              })}
              {users.filter(u => u.role === 'JEFA_PRODUCTO').length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No hay jefas de producto registradas</p>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* ── General Settings ── */}
      <Section icon={Settings2} iconBg="bg-slate-100 text-slate-500" title="Configuración general">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="field-label">Moneda del sistema</label>
            <select className="field" value={tempCurrency} onChange={e => setTempCurrency(e.target.value)}>
              <option value="USD">Dólares americanos (USD)</option>
              <option value="PEN">Soles peruanos (PEN)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Idioma de la interfaz</label>
            <select className="field" value={tempLanguage} onChange={e => setTempLanguage(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">URL del logotipo</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input type="url" placeholder="https://ejemplo.com/logo.png" className="field"
                  value={tempLogoUrl} onChange={e => setTempLogoUrl(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1.5">Ingresa la URL de una imagen para personalizar el logotipo del sistema.</p>
              </div>
              {tempLogoUrl && (
                <div className="w-12 h-12 rounded-xl border border-border overflow-hidden shrink-0 bg-slate-50">
                  <img src={tempLogoUrl} alt="preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 pt-5 border-t border-border flex justify-end">
          <button className="btn-primary" onClick={handleSaveSettings}>
            {settingsSaved ? <><CheckCircle size={15} /> Guardado</> : <><Save size={15} /> Guardar cambios</>}
          </button>
        </div>
      </Section>

      {/* ════ Modals ════ */}

      {/* Confirm */}
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

      {/* Year modal */}
      {showYearModal && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">{editingYear ? 'Editar año' : 'Nuevo año académico'}</h3>
              <button className="btn-icon" onClick={() => { setShowYearModal(false); setEditingYear(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveYear}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Año</label>
                  <input type="number" required className="field" value={newYear.year} onChange={e => setNewYear({ year: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowYearModal(false); setEditingYear(null); }}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingYear ? 'Guardar' : 'Crear año'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button className="btn-icon" onClick={() => { setShowCatModal(false); setEditingCategory(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Nombre</label>
                  <input required className="field" value={newCategory.name} onChange={e => setNewCategory({ name: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowCatModal(false); setEditingCategory(null); }}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Guardar' : 'Crear categoría'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity modal */}
      {showActModal && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">{editingActivity ? 'Editar actividad' : 'Nueva actividad'}</h3>
              <button className="btn-icon" onClick={() => { setShowActModal(false); setEditingActivity(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveActivity}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Nombre</label>
                  <input required className="field" value={newActivity.name} onChange={e => setNewActivity({ ...newActivity, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Categoría</label>
                  <select required className="field" value={newActivity.categoryId} onChange={e => setNewActivity({ ...newActivity, categoryId: e.target.value })}>
                    <option value="">Seleccionar…</option>
                    {categories.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowActModal(false); setEditingActivity(null); }}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingActivity ? 'Guardar' : 'Crear actividad'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal max-w-lg">
            <div className="modal-header">
              <div>
                <h3 className="font-bold text-slate-900">Asignar programas</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedUser.name}</p>
              </div>
              <button className="btn-icon" onClick={() => { setShowAssignModal(false); setSelectedUser(null); }}>✕</button>
            </div>
            <div className="modal-body max-h-[55vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {products.map(prod => {
                  const isAssigned = prod.assignedProductManagers?.includes(selectedUser.id);
                  return (
                    <label key={prod.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isAssigned ? 'bg-navy-light border-navy/30' : 'bg-white border-border hover:border-slate-300'}`}>
                      <input type="checkbox" className="w-4 h-4 rounded text-brand focus:ring-brand/20 border-border"
                        checked={isAssigned} onChange={e => {
                          const current = prod.assignedProductManagers ?? [];
                          setProducts(products.map(p => p.id !== prod.id ? p : {
                            ...p,
                            assignedProductManagers: e.target.checked
                              ? [...current, selectedUser.id]
                              : current.filter(id => id !== selectedUser.id),
                          }));
                        }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{prod.name}</p>
                        <p className="text-[11px] text-slate-400 uppercase font-bold">{prod.modality}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowAssignModal(false); setSelectedUser(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleAssignProducts}><Save size={14} /> Guardar asignaciones</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
