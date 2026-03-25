import React, { useEffect, useState } from 'react';
import { Product, Activity, BudgetPlan, AcademicYear, Expense } from '../types';
import {
  Plus, Search, Calendar, Users, DollarSign, BookOpen,
  LayoutGrid, Save, AlertCircle, Edit2, Trash2,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { apiRequest } from '../services/api';

/* ─────────────────────────── helpers ─── */

const EMPTY_PRODUCT: Partial<Product> = {
  name: '', year: new Date().getFullYear(), totalBudget: 0,
  studentGoal: 0, salesGoal: 0, productPrice: 0, avgDiscount: 0,
  modality: 'Presencial', executiveDirector: '', costCenter: '',
  startDate: new Date().toISOString().split('T')[0], campaignMonths: 6,
};

function getCampaignMonths(product: Product): { id: string; label: string }[] {
  const months: { id: string; label: string }[] = [];
  const SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // Parse the date parts directly to avoid timezone shifting
  const [startYear, startMonth] = (product.startDate ?? '').split('T')[0].split('-').map(Number);
  if (!startYear || !startMonth) return months;
  for (let i = 0; i < (product.campaignMonths || 6); i++) {
    const totalMonth = startMonth - 1 + i;           // 0-based
    const yr = startYear + Math.floor(totalMonth / 12);
    const mo = totalMonth % 12;
    months.push({
      id:    `${yr}-${String(mo + 1).padStart(2, '0')}`,
      label: `${SHORT[mo]} ${String(yr).slice(-2)}`,
    });
  }
  return months;
}

/* ─────────────────────────── component ─── */

export const Products: React.FC = () => {
  const { user }           = useAuth();
  const { formatCurrency } = useSettings();

  const [products, setProducts]         = useState<Product[]>([]);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans]   = useState<BudgetPlan[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading]           = useState(true);

  const [showModal, setShowModal]       = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showConfirm, setShowConfirm]   = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [editingProduct, setEditingProduct]   = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct]           = useState<Partial<Product>>(EMPTY_PRODUCT);
  const [planData, setPlanData]               = useState<Record<string, number>>({});
  const [search, setSearch]                   = useState('');
  const [selectedYear, setSelectedYear]       = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    try {
      const [allProducts, acts, plans, years, exps] = await Promise.all([
        apiRequest<Product[]>('/api/products'),
        apiRequest<Activity[]>('/api/activities'),
        apiRequest<BudgetPlan[]>('/api/budget-plans'),
        apiRequest<AcademicYear[]>('/api/academic-years'),
        apiRequest<Expense[]>('/api/expenses'),
      ]);
      setProducts(user?.role === 'JEFA_PRODUCTO'
        ? allProducts.filter(p => p.assignedProductManagers?.includes(user.id))
        : allProducts);
      setActivities(acts); setBudgetPlans(plans);
      setAcademicYears(years); setExpenses(exps);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  /* ── CRUD ── */
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const url    = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';
    const start  = new Date(newProduct.startDate ?? '');
    await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        id: editingProduct?.id ?? Date.now().toString(),
        endDate: new Date(start.getFullYear(), start.getMonth() + (newProduct.campaignMonths ?? 6), 1).toISOString(),
        assignedProductManagers: editingProduct?.assignedProductManagers ?? [],
      }),
    });
    setShowModal(false); setEditingProduct(null); setNewProduct(EMPTY_PRODUCT); fetchData();
  };

  const handleDeleteProduct = (id: string) => {
    setShowConfirm({
      title: 'Eliminar producto',
      message: '¿Está seguro? Se eliminarán también los planes y gastos asociados.',
      onConfirm: async () => {
        await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
        setShowConfirm(null); fetchData();
      },
    });
  };

  const openPlanModal = (product: Product) => {
    setSelectedProduct(product);
    const initial: Record<string, number> = {};
    budgetPlans.filter(p => p.productId === product.id)
      .forEach(p => { initial[`${p.activityId}-${p.month}`] = p.amount; });
    setPlanData(initial);
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!selectedProduct) return;
    const plansToSave: BudgetPlan[] = [];
    Object.entries(planData).forEach(([key, amount]) => {
      if (Number(amount) > 0) {
        const dashIdx    = key.indexOf('-');
        const activityId = key.substring(0, dashIdx);
        const month      = key.substring(dashIdx + 1); // YYYY-MM
        plansToSave.push({
          id: `${selectedProduct.id}-${activityId}-${month}`,
          productId: selectedProduct.id, activityId, month, amount: Number(amount),
        });
      }
    });
    await apiRequest('/api/budget-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plansToSave),
    });
    setShowPlanModal(false); fetchData();
  };

  /* ── Computed ── */
  const campaignMonths    = selectedProduct ? getCampaignMonths(selectedProduct) : [];
  const totalPlanned      = Object.values(planData).reduce((s, v) => s + Number(v), 0);
  const planRatio         = selectedProduct?.totalBudget
    ? (totalPlanned / selectedProduct.totalBudget) * 100 : 0;
  const filteredProducts = products.filter(p =>
    (selectedYear === 0 || p.year === selectedYear) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Cargando…</div>;

  return (
    <div className="page">
      {/* ── Toolbar ── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input className="field pl-9" placeholder="Buscar producto…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Año</span>
            <select
              className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              <option value={0}>Todos</option>
              {academicYears.sort((a, b) => b.year - a.year).map(y => (
                <option key={y.id} value={y.year}>{y.year}</option>
              ))}
            </select>
          </div>
        </div>
        {user?.role === 'JEFA_MARKETING' && (
          <button className="btn-primary" onClick={() => { setEditingProduct(null); setNewProduct(EMPTY_PRODUCT); setShowModal(true); }}>
            <Plus size={16} /> Nuevo producto
          </button>
        )}
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProducts.map(product => {
          const spent = expenses.filter(e => e.productId === product.id).reduce((s, e) => s + e.amount, 0);
          const pct   = product.totalBudget > 0 ? Math.min(Math.round((spent / product.totalBudget) * 100), 100) : 0;
          const barColor = pct >= 100 ? 'bg-brand' : pct >= 90 ? 'bg-amber-500' : 'bg-navy';

          return (
            <div key={product.id} className="card-hover flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{product.name}</h4>
                {user?.role === 'JEFA_MARKETING' && (
                  <div className="flex gap-1 shrink-0">
                    <button className="btn-icon" onClick={() => { setEditingProduct(product); setNewProduct(product); setShowModal(true); }}><Edit2 size={15} /></button>
                    <button className="btn-icon text-brand hover:bg-brand-light" onClick={() => handleDeleteProduct(product.id)}><Trash2 size={15} /></button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div className="flex flex-col items-center bg-slate-50 rounded-xl py-2 px-1">
                  <Calendar size={13} className="mb-1 text-slate-400" />
                  <span className="font-semibold text-slate-700">{product.campaignMonths ?? 6}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">meses</span>
                </div>
                <div className="flex flex-col items-center bg-slate-50 rounded-xl py-2 px-1">
                  <Users size={13} className="mb-1 text-slate-400" />
                  <span className="font-semibold text-slate-700">{product.studentGoal}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">meta</span>
                </div>
                <div className="flex flex-col items-center bg-slate-50 rounded-xl py-2 px-1">
                  <DollarSign size={13} className="mb-1 text-slate-400" />
                  <span className="font-semibold text-slate-700 text-[11px]">{formatCurrency(product.totalBudget)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">total</span>
                </div>
              </div>
              {product.costCenter && (
                <div className="flex items-center gap-2 text-xs bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Centro de costos</span>
                  <span className="font-bold text-slate-700 ml-auto">{product.costCenter}</span>
                </div>
              )}

              {/* Execution bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                  <span className="text-slate-400 uppercase tracking-wide">Ejecución</span>
                  <span className={pct >= 100 ? 'text-brand' : pct >= 90 ? 'text-amber-600' : 'text-navy'}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                {pct >= 100 && <p className="text-[11px] text-brand font-semibold mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> Presupuesto agotado</p>}
                {pct >= 95 && pct < 100 && <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> 95% ejecutado — alerta</p>}
                {pct >= 90 && pct < 95 && <p className="text-[11px] text-yellow-600 font-semibold mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> 90% ejecutado — aviso</p>}
              </div>

              <button className="btn-secondary w-full text-xs" onClick={() => openPlanModal(product)}>
                <LayoutGrid size={14} /> Planificar presupuesto
              </button>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-2xl">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium text-sm">No hay productos registrados</p>
          </div>
        )}
      </div>

      {/* ════════════════ Modals ════════════════ */}

      {/* ── Confirm ── */}
      {showConfirm && (
        <div className="modal-overlay z-[100]">
          <div className="modal max-w-sm text-center">
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-14 h-14 bg-brand-light text-brand rounded-2xl flex items-center justify-center">
                <Trash2 size={26} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{showConfirm.title}</h3>
                <p className="text-slate-500 text-sm mt-1">{showConfirm.message}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button className="btn-secondary flex-1" onClick={() => setShowConfirm(null)}>Cancelar</button>
                <button className="btn-danger flex-1" onClick={showConfirm.onConfirm}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Product ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className="btn-icon" onClick={() => { setShowModal(false); setEditingProduct(null); setNewProduct(EMPTY_PRODUCT); }}>✕</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="field-label">Nombre del producto</label>
                  <input required className="field" value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Presupuesto total</label>
                  <input type="number" required className="field" value={newProduct.totalBudget}
                    onChange={e => setNewProduct({ ...newProduct, totalBudget: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label">Meta de alumnos</label>
                  <input type="number" required className="field" value={newProduct.studentGoal}
                    onChange={e => setNewProduct({ ...newProduct, studentGoal: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label">Precio del producto</label>
                  <input type="number" required className="field" value={newProduct.productPrice}
                    onChange={e => setNewProduct({ ...newProduct, productPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label">Año académico</label>
                  <select required className="field" value={newProduct.year}
                    onChange={e => setNewProduct({ ...newProduct, year: Number(e.target.value) })}>
                    <option value="">Seleccionar…</option>
                    {academicYears.filter(y => y.active).map(y => (
                      <option key={y.id} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Modalidad</label>
                  <select className="field" value={newProduct.modality}
                    onChange={e => setNewProduct({ ...newProduct, modality: e.target.value })}>
                    <option>Presencial</option><option>Online</option><option>Híbrida</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Centro de costos</label>
                  <input className="field" placeholder="Ej. CC-001" value={newProduct.costCenter ?? ''}
                    onChange={e => setNewProduct({ ...newProduct, costCenter: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Fecha de inicio</label>
                  <input type="date" required className="field"
                    value={newProduct.startDate?.split('T')[0] ?? ''}
                    onChange={e => setNewProduct({ ...newProduct, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Duración (meses)</label>
                  <input type="number" required min="1" max="24" className="field"
                    value={newProduct.campaignMonths}
                    onChange={e => setNewProduct({ ...newProduct, campaignMonths: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary"
                  onClick={() => { setShowModal(false); setEditingProduct(null); setNewProduct(EMPTY_PRODUCT); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Budget Planning ── */}
      {showPlanModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal w-[95vw] max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="modal-header shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">Planificación presupuestaria</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedProduct.name} · Presupuesto global:&nbsp;
                  <span className="font-bold text-slate-600">{formatCurrency(selectedProduct.totalBudget)}</span>
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
              <div style={{ minWidth: Math.max(800, 260 + campaignMonths.length * 110) }}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 bg-white z-10 py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-56">
                        Actividad / Mes
                      </th>
                      {campaignMonths.map(m => (
                        <th key={m.id} className="py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[95px]">
                          {m.label}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.filter(a => a.active).map(act => {
                      const actTotal = campaignMonths.reduce((s, m) => s + (planData[`${act.id}-${m.id}`] || 0), 0);
                      return (
                        <tr key={act.id} className="border-b border-border/50 hover:bg-slate-50/60 transition-colors">
                          <td className="sticky left-0 bg-white z-10 py-2 px-3 font-medium text-slate-700">{act.name}</td>
                          {campaignMonths.map(m => (
                            <td key={m.id} className="py-1 px-1">
                              <input
                                type="number" min="0"
                                className="w-full py-1.5 px-2 text-center text-sm border border-transparent rounded-lg
                                           hover:border-border focus:border-brand focus:ring-1 focus:ring-brand/20
                                           focus:outline-none transition-colors bg-transparent"
                                value={planData[`${act.id}-${m.id}`] || ''}
                                placeholder="0"
                                onChange={e => setPlanData({ ...planData, [`${act.id}-${m.id}`]: Number(e.target.value) })}
                              />
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-bold text-slate-800">{formatCurrency(actTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-border bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total planificado</p>
                  <p className={`text-xl font-bold mt-0.5 ${totalPlanned > selectedProduct.totalBudget ? 'text-brand' : planRatio >= 90 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {formatCurrency(totalPlanned)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{planRatio.toFixed(1)}% del presupuesto global</p>
                </div>
                {totalPlanned > selectedProduct.totalBudget && (
                  <div className="alert-red text-xs"><AlertCircle size={13} className="shrink-0" /> Excede el presupuesto global</div>
                )}
                {totalPlanned <= selectedProduct.totalBudget && planRatio >= 95 && (
                  <div className="alert-amber text-xs"><AlertCircle size={13} className="shrink-0" /> 95% del presupuesto — cerca del límite</div>
                )}
                {planRatio >= 90 && planRatio < 95 && (
                  <div className="alert-yellow text-xs"><AlertCircle size={13} className="shrink-0" /> 90% del presupuesto — revise la distribución</div>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <button className="btn-secondary" onClick={() => setShowPlanModal(false)}>Cancelar</button>
                <button className="btn-primary" disabled={totalPlanned > selectedProduct.totalBudget} onClick={handleSavePlan}>
                  <Save size={15} /> Guardar planificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
