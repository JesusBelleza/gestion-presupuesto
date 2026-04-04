import React, { useEffect, useState } from 'react';
import { Plus, Search, Download, Edit2, Trash2, AlertCircle, Paperclip, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Expense, Product, Activity, AcademicYear, ProviderType, Provider, Category } from '../types';
import { apiRequest } from '../services/api';
import * as XLSX from 'xlsx';

const EMPTY: Partial<Expense> = {
  productId: '', activityId: '', amount: 0, description: '',
  provider: '', providerTypeId: '', attachmentUrls: [], categoryId: '', sslNumber: '',
  sslEmissionDate: '', accountingEntry: '',
  date: new Date().toISOString().split('T')[0],
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export const Expenses: React.FC = () => {
  const { user }           = useAuth();
  const { formatCurrency } = useSettings();

  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [activities, setActivities]       = useState<Activity[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([]);
  const [providers, setProviders]         = useState<Provider[]>([]);

  // local modal state for cascading provider selector
  const [selectedProvTypeId, setSelectedProvTypeId] = useState<string>('');

  const [search, setSearch]                       = useState('');
  const [selectedYear, setSelectedYear]           = useState<number>(new Date().getFullYear());
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  const [showModal, setShowModal]           = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense]         = useState<Partial<Expense>>(EMPTY);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [showConfirm, setShowConfirm]       = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    const [exps, prods, acts, cats, years, pts, provs] = await Promise.all([
      apiRequest<Expense[]>('/api/expenses'),
      apiRequest<Product[]>('/api/products'),
      apiRequest<Activity[]>('/api/activities'),
      apiRequest<Category[]>('/api/categories'),
      apiRequest<AcademicYear[]>('/api/academic-years'),
      apiRequest<ProviderType[]>('/api/provider-types'),
      apiRequest<Provider[]>('/api/providers'),
    ]);
    setExpenses(exps); setProducts(prods); setActivities(acts); setCategories(cats);
    setAcademicYears(years); setProviderTypes(pts); setProviders(provs);
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setNewExpense(expense);
      setAttachmentNames(expense.attachmentUrls ?? (expense.attachmentUrl ? [expense.attachmentUrl] : []));
      // Restore the providerType selection from the saved providerTypeId
      setSelectedProvTypeId(expense.providerTypeId ?? '');
    } else {
      setEditingExpense(null);
      setNewExpense(EMPTY);
      setAttachmentNames([]);
      setSelectedProvTypeId('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setNewExpense(EMPTY);
    setAttachmentNames([]);
    setSelectedProvTypeId('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const url    = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
    const method = editingExpense ? 'PUT' : 'POST';
    await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newExpense,
        attachmentUrls: attachmentNames,
        attachmentUrl: attachmentNames[0] ?? '',
        id: editingExpense?.id ?? Date.now().toString(),
        registeredBy: editingExpense?.registeredBy ?? user?.id,
        createdAt: editingExpense?.createdAt ?? new Date().toISOString(),
      }),
    });
    closeModal(); fetchData();
  };

  const handleDelete = (id: string) => {
    setShowConfirm({
      title: 'Eliminar gasto',
      message: '¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
        setShowConfirm(null); fetchData();
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachmentNames(prev => [...prev, ...files.map(f => f.name)]);
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachmentNames(prev => prev.filter((_, i) => i !== idx));
  };

  // Products for year
  const productsForYear = products.filter(p => selectedYear === 0 || p.year === selectedYear);

  // Main filter
  const filtered = expenses.filter(e => {
    const product  = products.find(p => p.id === e.productId);
    const activity = activities.find(a => a.id === e.activityId);
    const matchYear    = selectedYear === 0 || product?.year === selectedYear;
    const matchProduct = selectedProductId === 'all' || e.productId === selectedProductId;
    const q = search.toLowerCase();
    const matchSearch  = !q
      || product?.name.toLowerCase().includes(q)
      || activity?.name.toLowerCase().includes(q)
      || e.provider.toLowerCase().includes(q)
      || e.description?.toLowerCase().includes(q)
      || e.sslNumber?.toLowerCase().includes(q);
    return matchYear && matchProduct && matchSearch;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  // Can edit: JEFA_MARKETING always, JEFA_PRODUCTO for their own expenses
  const canEdit = (expense: Expense) =>
    user?.role === 'JEFA_MARKETING' ||
    (user?.role === 'JEFA_PRODUCTO' && expense.registeredBy === user?.id);

  // Export XLSX
  const handleExport = () => {
    const rows = filtered.map(e => {
      const product  = products.find(p => p.id === e.productId);
      const activity = activities.find(a => a.id === e.activityId);
      const provType = providerTypes.find(pt => pt.id === e.providerTypeId);
      // Resolve category from categoryId or via activity
      const category = categories.find(c => c.id === e.categoryId)
        ?? categories.find(c => c.id === activity?.categoryId);
      return {
        'Fecha':              fmtDate(e.date),
        'Año':                product?.year ?? '',
        'Producto':           product?.name ?? '',
        'Centro de Costos':   product?.costCenter ?? '',
        'Modalidad':          product?.modality ?? '',
        'Categoría':          category?.name ?? '',
        'Actividad':          activity?.name ?? '',
        'N° SSL':             e.sslNumber ?? '',
        'Fecha Emisión SSL':  fmtDate(e.sslEmissionDate ?? ''),
        '# Partida Contable': e.accountingEntry ?? '',
        'Monto':              e.amount,
        'Tipo Proveedor':     provType?.name ?? '',
        'Proveedor':          e.provider,
        'Descripción':        e.description ?? '',
        'Adjuntos':           (e.attachmentUrls ?? (e.attachmentUrl ? [e.attachmentUrl] : [])).join(' | '),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [
      {wch:12},{wch:6},{wch:28},{wch:16},{wch:12},{wch:22},{wch:14},
      {wch:16},{wch:18},{wch:14},{wch:20},{wch:30},{wch:30},
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    XLSX.writeFile(wb, `gastos_${selectedYear || 'todos'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="page">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input className="field pl-9" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Año</span>
            <select className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => { setSelectedYear(Number(e.target.value)); setSelectedProductId('all'); }}>
              <option value={0}>Todos</option>
              {academicYears.sort((a, b) => b.year - a.year).map(y => (
                <option key={y.id} value={y.year}>{y.year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Producto</span>
            <select className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer max-w-[180px]"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}>
              <option value="all">Todos</option>
              {productsForYear.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={16} /> Exportar XLSX
          </button>
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Registrar gasto
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="flex items-center justify-between bg-white border border-border rounded-xl px-5 py-3 text-sm">
        <span className="text-slate-400 font-medium">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs uppercase font-semibold tracking-wide">Total filtrado</span>
          <span className="font-bold text-slate-900">{formatCurrency(totalFiltered)}</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Centro de costos</th>
              <th>Actividad</th>
              <th>N° SSL</th>
              <th>Fecha Emisión SSL</th>
              <th># Partida</th>
              <th>Monto</th>
              <th>Tipo Proveedor</th>
              <th>Proveedor</th>
              <th>Adjuntos</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(expense => {
              const product    = products.find(p => p.id === expense.productId);
              const activity   = activities.find(a => a.id === expense.activityId);
              const provType   = providerTypes.find(pt => pt.id === expense.providerTypeId);
              const files      = expense.attachmentUrls ?? (expense.attachmentUrl ? [expense.attachmentUrl] : []);
              return (
                <tr key={expense.id}>
                  <td className="text-slate-500 whitespace-nowrap">{fmtDate(expense.date)}</td>
                  <td>
                    <p className="font-semibold text-slate-800 text-sm">{product?.name ?? '—'}</p>
                    {product?.modality && (
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{product.modality}</p>
                    )}
                  </td>
                  <td className="text-slate-500 font-mono text-xs">{product?.costCenter || <span className="text-slate-200">—</span>}</td>
                  <td><span className="badge-blue">{activity?.name ?? '—'}</span></td>
                  <td className="text-slate-500 font-mono text-xs">{expense.sslNumber || <span className="text-slate-200">—</span>}</td>
                  <td className="text-slate-500 text-xs whitespace-nowrap">{fmtDate(expense.sslEmissionDate ?? '')}</td>
                  <td className="text-slate-500 font-mono text-xs">{expense.accountingEntry || <span className="text-slate-200">—</span>}</td>
                  <td className="font-bold text-slate-900 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                  <td className="text-slate-400 text-xs">{provType?.name || <span className="text-slate-200">—</span>}</td>
                  <td className="text-slate-500">{expense.provider || <span className="text-slate-200">—</span>}</td>
                  <td>
                    {files.length > 0
                      ? <div className="flex flex-col gap-0.5">
                          {files.map((f, i) => (
                            <span key={i} className="flex items-center gap-1 text-navy text-xs font-semibold">
                              <Paperclip size={11} />
                              <span className="truncate max-w-[90px]">{f}</span>
                            </span>
                          ))}
                        </div>
                      : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit(expense) && (
                        <>
                          <button className="btn-icon" onClick={() => openModal(expense)}>
                            <Edit2 size={14} />
                          </button>
                          {user?.role === 'JEFA_MARKETING' && (
                            <button className="btn-icon text-brand hover:bg-brand-light" onClick={() => handleDelete(expense.id)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-16 text-slate-300 text-sm">
                  No hay gastos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Confirm ── */}
      {showConfirm && (
        <div className="modal-overlay z-[100]">
          <div className="modal max-w-sm">
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-brand-light text-brand rounded-2xl flex items-center justify-center">
                <AlertCircle size={26} />
              </div>
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

      {/* ── Register / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-slate-900">{editingExpense ? 'Editar gasto' : 'Registrar gasto'}</h3>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body grid grid-cols-2 gap-4">

                {/* Producto */}
                <div className="col-span-2">
                  <label className="field-label">Producto académico</label>
                  <select required className="field" value={newExpense.productId}
                    onChange={e => setNewExpense({ ...newExpense, productId: e.target.value })}>
                    <option value="">Seleccione un producto</option>
                    {products
                      .filter(p => p.assignedProductManagers?.includes(user?.id ?? '') || user?.role === 'JEFA_MARKETING')
                      .map(p => <option key={p.id} value={p.id}>{p.name} {p.costCenter ? `— ${p.costCenter}` : ''}</option>)}
                  </select>
                  {newExpense.productId && (() => {
                    const p = products.find(pr => pr.id === newExpense.productId);
                    return p?.costCenter ? (
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        Centro de costos: <span className="font-bold text-slate-600 font-mono">{p.costCenter}</span>
                      </p>
                    ) : null;
                  })()}
                </div>

                {/* Actividad */}
                <div>
                  <label className="field-label">Actividad</label>
                  <select required className="field" value={newExpense.activityId}
                    onChange={e => {
                      const act = activities.find(a => a.id === e.target.value);
                      setNewExpense({ ...newExpense, activityId: e.target.value, categoryId: act?.categoryId ?? '' });
                    }}>
                    <option value="">Seleccione actividad</option>
                    {activities.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="field-label">Fecha</label>
                  <input type="date" required className="field" value={newExpense.date}
                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                </div>

                {/* Monto */}
                <div>
                  <label className="field-label">Monto</label>
                  <input type="number" required min="0" step="0.01" className="field" value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
                </div>

                {/* Tipo de proveedor — oculto, se guarda automáticamente */}
                {/* Proveedor — lista completa, tipo se resuelve automáticamente */}
                <div>
                  <label className="field-label">Proveedor</label>
                  <select
                    required
                    className="field"
                    value={newExpense.provider ?? ''}
                    onChange={e => {
                      const selected = providers.find(p => p.name === e.target.value);
                      setNewExpense({
                        ...newExpense,
                        provider: e.target.value,
                        providerTypeId: selected?.providerTypeId ?? '',
                      });
                    }}
                  >
                    <option value="">Seleccione proveedor…</option>
                    {providers.filter(p => p.active).map(p => {
                      const pt = providerTypes.find(t => t.id === p.providerTypeId);
                      return (
                        <option key={p.id} value={p.name}>
                          {p.name}{pt ? ` (${pt.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* N° SSL */}
                <div>
                  <label className="field-label">N° SSL</label>
                  <input className="field" placeholder="Ej: SSL-2024-001" value={newExpense.sslNumber ?? ''}
                    onChange={e => setNewExpense({ ...newExpense, sslNumber: e.target.value })} />
                </div>

                {/* Fecha emisión SSL */}
                <div>
                  <label className="field-label">Fecha de emisión SSL</label>
                  <input type="date" className="field" value={newExpense.sslEmissionDate ?? ''}
                    onChange={e => setNewExpense({ ...newExpense, sslEmissionDate: e.target.value })} />
                </div>

                {/* Partida contable */}
                <div>
                  <label className="field-label"># Partida contable</label>
                  <input className="field" placeholder="Ej: 6301.01" value={newExpense.accountingEntry ?? ''}
                    onChange={e => setNewExpense({ ...newExpense, accountingEntry: e.target.value })} />
                </div>

                {/* Descripción */}
                <div className="col-span-2">
                  <label className="field-label">Descripción / Concepto</label>
                  <textarea rows={2} className="field resize-none" value={newExpense.description}
                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                </div>

                {/* Adjuntos múltiples */}
                <div className="col-span-2">
                  <label className="field-label">Comprobantes (PDF, JPG, PNG — múltiples)</label>
                  <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-border rounded-xl py-4 px-4 cursor-pointer hover:border-brand/40 hover:bg-slate-50 transition-colors">
                    <Paperclip size={18} className="text-slate-300" />
                    <span className="text-xs text-slate-500">Haz clic para agregar archivos</span>
                    <span className="text-[11px] text-slate-300">PNG, JPG, PDF</span>
                    <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" multiple
                      onChange={handleFileChange} />
                  </label>
                  {attachmentNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachmentNames.map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Paperclip size={11} className="text-slate-400" />
                          <span className="max-w-[140px] truncate">{name}</span>
                          <button type="button" onClick={() => removeAttachment(i)}
                            className="text-slate-400 hover:text-brand ml-0.5">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingExpense ? 'Guardar cambios' : 'Registrar gasto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
