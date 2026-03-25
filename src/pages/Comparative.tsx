import React, { useEffect, useState } from 'react';
import { Product, Expense, AcademicYear } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Award, Target, TrendingUp } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { apiRequest } from '../services/api';

export const Comparative: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [products, setProducts]           = useState<Product[]>([]);
  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear]   = useState<number>(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      apiRequest<Product[]>('/api/products'),
      apiRequest<Expense[]>('/api/expenses'),
      apiRequest<AcademicYear[]>('/api/academic-years'),
    ]).then(([p, e, y]) => {
      setProducts(p); setExpenses(e); setAcademicYears(y);
    });
  }, []);

  const filteredProducts = products.filter(p => p.year === selectedYear);

  const data = filteredProducts.map(p => {
    const spent = expenses.filter(e => e.productId === p.id).reduce((s, e) => s + e.amount, 0);
    return {
      name: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
      fullName: p.name,
      Presupuesto: p.totalBudget,
      Ejecutado: spent,
      porcentaje: p.totalBudget > 0 ? (spent / p.totalBudget) * 100 : 0,
      costoAlumno: p.studentGoal > 0 ? spent / p.studentGoal : 0,
      metaAlumnos: p.studentGoal,
    };
  }).sort((a, b) => b.porcentaje - a.porcentaje);

  const topProduct    = data[0];
  const mostStudents  = [...filteredProducts].sort((a, b) => b.studentGoal - a.studentGoal)[0];
  const avgExecution  = data.length ? data.reduce((s, d) => s + d.porcentaje, 0) / data.length : 0;

  return (
    <div className="page">

      {/* ── Year filter ── */}
      <div className="flex items-center justify-end gap-3 bg-white border border-border rounded-2xl px-5 py-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Año</span>
        <select
          className="field py-1.5 w-24 text-sm"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
        >
          {academicYears.sort((a, b) => b.year - a.year).map(y => (
            <option key={y.id} value={y.year}>{y.year}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-5">
        <div className="stat-card">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl w-fit"><Award size={18} /></div>
          <div>
            <p className="stat-label">Mayor ejecución</p>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate">{topProduct?.fullName ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{topProduct?.porcentaje.toFixed(1) ?? 0}% ejecutado</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="p-2.5 bg-navy/10 text-navy rounded-xl w-fit"><Target size={18} /></div>
          <div>
            <p className="stat-label">Mayor meta de alumnos</p>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate">{mostStudents?.name ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{mostStudents?.studentGoal ?? 0} alumnos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl w-fit"><TrendingUp size={18} /></div>
          <div>
            <p className="stat-label">Ejecución promedio</p>
            <p className="stat-value mt-1">{avgExecution.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-0.5">sobre {data.length} productos</p>
          </div>
        </div>
      </div>

      {/* ── Chart + Ranking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card lg:col-span-3">
          <h3 className="text-sm font-bold text-slate-800 mb-5">Presupuesto vs. gasto real por producto</h3>
          {data.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-300 text-sm">
              No hay productos para el año {selectedYear}
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={v => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }} width={130} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: '12px' }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend />
                  <Bar dataKey="Presupuesto" fill="#002D72" radius={[0, 3, 3, 0]} maxBarSize={14} />
                  <Bar dataKey="Ejecutado"   fill="#C8102E" radius={[0, 3, 3, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-5">Ranking de ejecución</h3>
          <div className="space-y-2.5">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-slate-200 text-slate-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{item.fullName}</p>
                  <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(item.porcentaje, 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 shrink-0">{item.porcentaje.toFixed(1)}%</span>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos disponibles</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


