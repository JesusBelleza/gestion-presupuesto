import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Wallet, TrendingUp, AlertTriangle, CheckCircle2,
  BarChart2, ChevronLeft, ChevronRight, FileDown, X,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Product, Expense, BudgetPlan, Category, AcademicYear, Activity, ProviderType } from '../types';
import { apiRequest } from '../services/api';
import { generateDashboardPDF, PDFReportData } from '../utils/generateDashboardPDF';

/* ─────────────────────────────────────── helpers ─── */

// Distinct, clearly differentiable palette
const PIE_COLORS   = ['#C8102E','#002D72','#059669','#D97706','#7C3AED','#0891B2','#DB2777','#65A30D'];
const PLAN_COLOR   = '#002D72';
const EXEC_COLOR   = '#C8102E';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const KPICard = ({
  title, value, subtitle, icon: Icon, accent = false,
}: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; accent?: boolean;
}) => (
  <div className={`stat-card ${accent ? 'border-brand/30 bg-brand-light/40' : ''}`}>
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${accent ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={20} />
      </div>
    </div>
    <div>
      <p className="stat-label">{title}</p>
      <p className="stat-value mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  </div>
);

type ChartType = 'bar' | 'line' | 'pie';

/* ─────────────────────────────────────── component ─── */

export const Dashboard: React.FC = () => {
  const { formatCurrency, logoUrl } = useSettings();

  const [products, setProducts]           = useState<Product[]>([]);
  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [budgetPlans, setBudgetPlans]     = useState<BudgetPlan[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [activities, setActivities]       = useState<Activity[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([]);
  const [loading, setLoading]             = useState(true);

  // Global filters — multi-product
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);  // empty = all
  const [selectedYear, setSelectedYear]             = useState<number>(new Date().getFullYear());
  const [productDropOpen, setProductDropOpen]       = useState(false);

  // Chart navigation
  const [chartOffset, setChartOffset]     = useState<number>(0);
  const [chartViewYear, setChartViewYear] = useState<number>(new Date().getFullYear());
  const [chartType, setChartType]         = useState<ChartType>('bar');

  // Table navigation
  const [tableOffset, setTableOffset]     = useState<number>(0);
  const [tableViewYear, setTableViewYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const [prods, exps, plans, cats, years, acts, pts] = await Promise.all([
          apiRequest<Product[]>('/api/products'),
          apiRequest<Expense[]>('/api/expenses'),
          apiRequest<BudgetPlan[]>('/api/budget-plans'),
          apiRequest<Category[]>('/api/categories'),
          apiRequest<AcademicYear[]>('/api/academic-years'),
          apiRequest<Activity[]>('/api/activities'),
          apiRequest<ProviderType[]>('/api/provider-types'),
        ]);
        setProducts(prods); setExpenses(exps); setBudgetPlans(plans);
        setCategories(cats); setAcademicYears(years); setActivities(acts);
        setProviderTypes(pts);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    setChartViewYear(selectedYear); setChartOffset(0);
    setTableViewYear(selectedYear); setTableOffset(0);
    setSelectedProductIds([]);
  }, [selectedYear]);

  // Helper: is a product selected?
  const isSelected = (id: string) => selectedProductIds.length === 0 || selectedProductIds.includes(id);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        return next;
      }
      return [...prev, id];
    });
  };

  const productsForYear = products.filter(p => p.year === selectedYear);

  // ── Filtered data ──
  const filteredProducts = productsForYear.filter(p => isSelected(p.id));
  const filteredExpenses = expenses.filter(e => {
    const product = products.find(p => p.id === e.productId);
    return product?.year === selectedYear && isSelected(e.productId);
  });
  const filteredPlans = budgetPlans.filter(p => {
    const product = products.find(prod => prod.id === p.productId);
    return product?.year === selectedYear && isSelected(p.productId);
  });

  const totalBudget   = filteredProducts.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent    = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const executionRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // ── Chart window — full 12 months of selected year ──
  const chartWindowMonths: { label: string; year: number; monthIdx: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const tot = chartOffset + i;
    chartWindowMonths.push({ label: MONTHS_SHORT[tot % 12], year: chartViewYear + Math.floor(tot / 12), monthIdx: tot % 12 });
  }

  const chartExpenses = expenses.filter(e => isSelected(e.productId));
  const chartPlans    = budgetPlans.filter(p => isSelected(p.productId));

  const chartData = chartWindowMonths.map(({ label, year, monthIdx }) => {
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    const monthNum = String(monthIdx + 1).padStart(2, '0');
    const planned  = chartPlans
      .filter(p => p.month === monthKey || (p.month === monthNum && products.find(pr => pr.id === p.productId)?.year === year))
      .reduce((s, p) => s + p.amount, 0);
    const spent = chartExpenses.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
    return { name: label, Planificado: planned, Ejecutado: spent };
  });

  const isCurrentWindow = chartOffset === 0 && chartViewYear === selectedYear;
  const handleChartPrev = () => chartOffset > 0 ? setChartOffset(chartOffset - 1) : (setChartViewYear(chartViewYear - 1), setChartOffset(11));
  const handleChartNext = () => {
    if (chartOffset < 1) { setChartOffset(chartOffset + 1); }
    else { setChartViewYear(chartViewYear + 1); setChartOffset(0); }
  };
  const handleChartReset = () => { setChartViewYear(selectedYear); setChartOffset(0); };

  const firstM = chartWindowMonths[0]; const lastM = chartWindowMonths[11];
  const rangeLabel = firstM.year === lastM.year
    ? `${MONTHS_FULL[firstM.monthIdx]} – ${MONTHS_FULL[lastM.monthIdx]} ${firstM.year}`
    : `${MONTHS_FULL[firstM.monthIdx]} ${firstM.year} – ${MONTHS_FULL[lastM.monthIdx]} ${lastM.year}`;

  // ── Table window ──
  const tableWindowMonths: { label: string; year: number; monthIdx: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const tot = tableOffset + i;
    tableWindowMonths.push({ label: MONTHS_SHORT[tot % 12], year: tableViewYear + Math.floor(tot / 12), monthIdx: tot % 12 });
  }
  const isTableCurrentWindow = tableOffset === 0 && tableViewYear === selectedYear;
  const handleTablePrev = () => tableOffset > 0 ? setTableOffset(tableOffset - 1) : (setTableViewYear(tableViewYear - 1), setTableOffset(11));
  const handleTableNext = () => tableOffset < 6 ? setTableOffset(tableOffset + 1) : (setTableViewYear(tableViewYear + 1), setTableOffset(0));
  const handleTableReset = () => { setTableViewYear(selectedYear); setTableOffset(0); };

  const firstTM = tableWindowMonths[0]; const lastTM = tableWindowMonths[5];
  const tableRangeLabel = firstTM.year === lastTM.year
    ? `${MONTHS_FULL[firstTM.monthIdx]} – ${MONTHS_FULL[lastTM.monthIdx]} ${firstTM.year}`
    : `${MONTHS_FULL[firstTM.monthIdx]} ${firstTM.year} – ${MONTHS_FULL[lastTM.monthIdx]} ${lastTM.year}`;

  // ── Pie data by category ──
  const pieData = categories.map(cat => {
    const catActs = activities.filter(a => a.categoryId === cat.id).map(a => a.id);
    const value   = filteredExpenses
      .filter(e => e.categoryId === cat.id || (!e.categoryId && catActs.includes(e.activityId)))
      .reduce((s, e) => s + e.amount, 0);
    return { name: cat.name, value };
  }).filter(c => c.value > 0);

  // ── Pie data by provider type ──
  const pieProviderData = providerTypes.map(pt => {
    const value = filteredExpenses
      .filter((e: any) => e.providerTypeId === pt.id)
      .reduce((s, e) => s + e.amount, 0);
    return { name: pt.name, value };
  }).filter(p => p.value > 0);

  // ── Activity table ──
  const tableExpenses = expenses.filter(e => isSelected(e.productId));
  const tablePlans    = budgetPlans.filter(p => isSelected(p.productId));

  const activityMonthTable = activities.map(act => {
    const row: Record<string, string | number | boolean> = { activity: act.name };
    let hasAnyData = false;
    tableWindowMonths.forEach(({ year, monthIdx }, i) => {
      const monthNum = String(monthIdx + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNum}`;
      const plan = tablePlans
        .filter(p => p.activityId === act.id && (p.month === monthKey || (p.month === monthNum && products.find(pr => pr.id === p.productId)?.year === year)))
        .reduce((s, p) => s + p.amount, 0);
      const exec = tableExpenses
        .filter(e => e.activityId === act.id && e.date?.startsWith(monthKey))
        .reduce((s, e) => s + e.amount, 0);
      row[`plan_${i}`] = plan; row[`exec_${i}`] = exec;
      if (plan > 0 || exec > 0) hasAnyData = true;
    });
    return { ...row, hasAnyData };
  }).filter(r => r.hasAnyData);

  // ── PDF Export — informe profesional ──
  const handleExportPDF = async () => {
    const productRanking = filteredProducts.map(p => {
      const spent = filteredExpenses.filter(e => e.productId === p.id).reduce((s, e) => s + e.amount, 0);
      return { name: p.name, pct: p.totalBudget > 0 ? (spent / p.totalBudget) * 100 : 0, budget: p.totalBudget, spent };
    }).sort((a, b) => b.pct - a.pct);

    const reportData: PDFReportData = {
      year: selectedYear,
      selectedProductNames: selectedProductIds.length === 0
        ? [] : selectedProductIds.map(id => productsForYear.find(p => p.id === id)?.name ?? id),
      totalBudget,
      totalSpent,
      executionRate,
      chartData,
      pieData,
      products: filteredProducts,
      expenses: filteredExpenses,
      productRanking,
      logoUrl,
    };
    await generateDashboardPDF(reportData);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando…</div>
  );

  return (
    <div className="page">

      {/* ── Filters ── */}
      <div className="flex items-center justify-between gap-4 bg-white border border-border rounded-2xl px-5 py-3">
        <div className="flex items-center gap-4">
          {/* Year */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Año</span>
            <select className="field py-1.5 w-24 text-sm" value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}>
              {academicYears.sort((a, b) => b.year - a.year).map(y => (
                <option key={y.id} value={y.year}>{y.year}</option>
              ))}
            </select>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* Multi-product dropdown */}
          <div className="relative flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Productos</span>
            <button
              className="field py-1.5 px-3 text-sm min-w-[180px] flex items-center justify-between gap-2"
              onClick={() => setProductDropOpen(o => !o)}
              type="button"
            >
              <span className="truncate text-left">
                {selectedProductIds.length === 0
                  ? 'Todos'
                  : selectedProductIds.length === 1
                    ? productsForYear.find(p => p.id === selectedProductIds[0])?.name ?? '1 seleccionado'
                    : `${selectedProductIds.length} seleccionados`}
              </span>
              <ChevronRight size={14} className={`shrink-0 transition-transform ${productDropOpen ? 'rotate-90' : ''}`} />
            </button>

            {productDropOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-border rounded-xl shadow-lg w-72 py-2 max-h-64 overflow-y-auto">
                <button
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center justify-between"
                  onClick={() => setSelectedProductIds([])}
                >
                  Todos los productos
                  {selectedProductIds.length === 0 && <span className="text-navy font-bold">✓</span>}
                </button>
                <div className="border-t border-border/60 my-1" />
                {productsForYear.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="accent-navy w-3.5 h-3.5" />
                    <span className="text-sm text-slate-700 truncate">{p.name}</span>
                  </label>
                ))}
                {productsForYear.length === 0 && (
                  <p className="text-xs text-slate-300 px-4 py-2">Sin productos para este año</p>
                )}
                <div className="border-t border-border/60 mt-1 pt-1 px-4 pb-1">
                  <button className="text-xs text-navy font-semibold hover:underline"
                    onClick={() => setProductDropOpen(false)}>Cerrar</button>
                </div>
              </div>
            )}
          </div>

          {/* Selected chips */}
          {selectedProductIds.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center mt-4">
              {selectedProductIds.map(id => {
                const p = productsForYear.find(pr => pr.id === id);
                return p ? (
                  <span key={id} className="flex items-center gap-1 bg-navy/10 text-navy text-xs font-semibold px-2 py-0.5 rounded-full">
                    {p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name}
                    <button onClick={() => toggleProduct(id)}><X size={10} /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* PDF export */}
        <button className="btn-secondary flex items-center gap-2 text-xs shrink-0" onClick={handleExportPDF}>
          <FileDown size={15} /> Exportar PDF
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="Presupuesto total"  value={formatCurrency(totalBudget)}          subtitle="Asignado a productos"    icon={Wallet} />
        <KPICard title="Gasto ejecutado"    value={formatCurrency(totalSpent)}           subtitle="Gasto real acumulado"    icon={TrendingUp} />
        <KPICard title="Saldo disponible"   value={formatCurrency(totalBudget - totalSpent)} subtitle="Presupuesto restante" icon={CheckCircle2} />
        <KPICard title="Ejecución"          value={`${executionRate.toFixed(1)}%`}        subtitle="Porcentaje utilizado"
          icon={executionRate > 90 ? AlertTriangle : BarChart2} accent={executionRate > 90} />
      </div>

      {/* ── Alert ── */}
      {executionRate >= 90 && (
        <div className={`alert ${executionRate >= 100 ? 'alert-red' : executionRate >= 95 ? 'alert-amber' : 'alert-yellow'}`}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {executionRate >= 100 ? 'Presupuesto agotado — ' : executionRate >= 95 ? 'Alerta crítica — ' : 'Aviso — '}
            </span>
            La ejecución global ha alcanzado el {executionRate.toFixed(1)}%.
          </div>
        </div>
      )}

      {/* ── Chart type toggle ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ver gráfico como:</span>
        {(['bar', 'line', 'pie'] as ChartType[]).map(type => (
          <button key={type} onClick={() => setChartType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              ${chartType === type ? 'bg-navy text-white border-navy' : 'bg-white text-slate-500 border-border hover:border-navy/40'}`}>
            {type === 'bar' ? '▊ Barras' : type === 'line' ? '↗ Líneas' : '◉ Torta'}
          </button>
        ))}
      </div>

      {/* ── ROW 1: Bar/Line chart — full width ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Ejecución mensual vs. planificado</h3>
          <div className="flex items-center gap-1.5">
            <button className="btn-icon" onClick={handleChartPrev}><ChevronLeft size={15} /></button>
            <span className="text-xs font-semibold text-slate-600 min-w-[220px] text-center">{rangeLabel}</span>
            <button className="btn-icon" onClick={handleChartNext}><ChevronRight size={15} /></button>
            {!isCurrentWindow && (
              <button className="ml-1 text-[11px] font-semibold text-navy border border-navy/30 rounded-md px-2 py-1 hover:bg-navy/5"
                onClick={handleChartReset}>Hoy</button>
            )}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} barGap={4} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={54}
                  tickFormatter={(v: number) => formatCurrency(v).slice(0, 8)} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="Planificado" fill={PLAN_COLOR} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="Ejecutado"   fill={EXEC_COLOR} radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={54}
                  tickFormatter={(v: number) => formatCurrency(v).slice(0, 8)} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="Planificado" stroke={PLAN_COLOR} strokeWidth={2.5} dot={{ r: 3, fill: PLAN_COLOR }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Ejecutado"   stroke={EXEC_COLOR} strokeWidth={2.5} dot={{ r: 3, fill: EXEC_COLOR }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={[
                  { name: 'Planificado', value: chartData.reduce((s, d) => s + d.Planificado, 0) },
                  { name: 'Ejecutado',   value: chartData.reduce((s, d) => s + d.Ejecutado,   0) },
                ]} innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  <Cell fill={PLAN_COLOR} />
                  <Cell fill={EXEC_COLOR} />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {chartType !== 'pie' && (
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PLAN_COLOR }} /> Planificado
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: EXEC_COLOR }} /> Ejecutado
            </span>
          </div>
        )}
      </div>

      {/* ── ROW 2: Pie por categoría + Pie por tipo de proveedor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pie por categoría */}
        <div className="card">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Distribución por categoría</h3>
          {pieData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-300 gap-3">
              <BarChart2 size={32} strokeWidth={1} />
              <p className="text-sm font-medium text-slate-400">Sin datos aún</p>
            </div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value"
                      startAngle={90} endAngle={-270}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                      formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-700">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pie por tipo de proveedor */}
        <div className="card">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Distribución por tipo de proveedor</h3>
          {pieProviderData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-300 gap-3">
              <BarChart2 size={32} strokeWidth={1} />
              <p className="text-sm font-medium text-slate-400">Sin datos aún</p>
            </div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieProviderData} innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value"
                      startAngle={90} endAngle={-270}>
                      {pieProviderData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                      formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {pieProviderData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[(i + 3) % PIE_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-700">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Activity/Month table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Planificado vs. Ejecutado — por Actividad / Mes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Valores en rojo superan lo planificado</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn-icon" onClick={handleTablePrev}><ChevronLeft size={15} /></button>
            <span className="text-xs font-semibold text-slate-600 min-w-[220px] text-center">{tableRangeLabel}</span>
            <button className="btn-icon" onClick={handleTableNext}><ChevronRight size={15} /></button>
            {!isTableCurrentWindow && (
              <button className="ml-1 text-[11px] font-semibold text-navy border border-navy/30 rounded-md px-2 py-1 hover:bg-navy/5"
                onClick={handleTableReset}>Hoy</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 min-w-[150px]">Actividad</th>
                {tableWindowMonths.map(({ label, year }, i) => (
                  <th key={i} colSpan={2} className="text-center border-l border-border/40 px-2">
                    <span className="block">{label}</span>
                    {tableWindowMonths[0].year !== tableWindowMonths[5].year && (
                      <span className="text-[9px] text-slate-300 font-normal">{year}</span>
                    )}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-white z-10" />
                {tableWindowMonths.map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="text-center border-l border-border/40 text-slate-400 font-semibold px-2">Pla</th>
                    <th className="text-center text-slate-400 font-semibold px-2">Eje</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityMonthTable.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-10 text-slate-300">No hay datos para este período.</td></tr>
              ) : activityMonthTable.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="sticky left-0 bg-white z-10 font-semibold text-slate-700 max-w-[150px] truncate">
                    {row.activity as string}
                  </td>
                  {tableWindowMonths.map((_, i) => {
                    const plan = row[`plan_${i}`] as number;
                    const exec = row[`exec_${i}`] as number;
                    const over = exec > plan && plan > 0;
                    return (
                      <React.Fragment key={i}>
                        <td className="text-right border-l border-border/40 text-slate-500 px-2">
                          {plan > 0 ? formatCurrency(plan) : <span className="text-slate-200">—</span>}
                        </td>
                        <td className={`text-right font-semibold px-2 ${over ? 'text-brand' : exec > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                          {exec > 0 ? formatCurrency(exec) : '—'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
