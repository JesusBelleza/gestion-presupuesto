import React, { useEffect, useRef, useState } from 'react';
import { Product, Expense, AcademicYear } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Award, Target, TrendingUp, Download, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { apiRequest } from '../services/api';

const RED  = '#C8102E';
const RED2 = '#A00D24';
const NAVY = '#002D72';
const SLATE_COL = '#64748B';
const LIGHT = '#F1F5F9';
const WHITE = '#FFFFFF';
const BORDER = '#E2E8F0';
const GREEN = '#059669';
const AMBER = '#D97706';
const PIE_COLORS = [RED, NAVY, GREEN, AMBER, '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function cardPDF(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.shadowColor = 'rgba(0,0,0,0.07)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = WHITE; rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 10); ctx.stroke();
}
function txt(
  ctx: CanvasRenderingContext2D, s: string, x: number, y: number,
  size: number, color: string, weight: 'normal' | 'bold' = 'normal', align: CanvasTextAlign = 'left'
) {
  ctx.font = `${weight} ${size}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align;
  ctx.fillText(s, x, y); ctx.textAlign = 'left';
}
function shortFmt(n: number): string {
  if (n >= 1_000_000) return `S/${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `S/${(n / 1_000).toFixed(0)}K`;
  return `S/${n.toFixed(0)}`;
}
function fmtPDF(n: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(n);
}
function embedImageInPDF(jpegB64: string, imgW: number, imgH: number): Uint8Array {
  const raw = atob(jpegB64);
  const imgBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) imgBytes[i] = raw.charCodeAt(i);
  const enc = new TextEncoder();
  const WPT = (imgW / 150) * 72;
  const HPT = (imgH / 150) * 72;
  const o1 = enc.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const o2 = enc.encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const o3 = enc.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WPT.toFixed(2)} ${HPT.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
  const sc  = enc.encode(`q\n${WPT.toFixed(2)} 0 0 ${HPT.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`);
  const o4h = enc.encode(`4 0 obj\n<< /Length ${sc.length} >>\nstream\n`);
  const o4f = enc.encode('\nendstream\nendobj\n');
  const o5h = enc.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
  const o5f = enc.encode('\nendstream\nendobj\n');
  const hdr = enc.encode('%PDF-1.4\n');
  const offs: number[] = [];
  let pos = hdr.length;
  [o1, o2, o3].forEach(o => { offs.push(pos); pos += o.length; });
  offs.push(pos); pos += o4h.length + sc.length + o4f.length;
  offs.push(pos); pos += o5h.length + imgBytes.length + o5f.length;
  const xrefOff = pos;
  const xref = enc.encode(`xref\n0 6\n0000000000 65535 f \n` +
    offs.map(o => o.toString().padStart(10, '0') + ' 00000 n ').join('\n') + '\n');
  const tlr  = enc.encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`);
  const parts = [hdr, o1, o2, o3, o4h, sc, o4f, o5h, imgBytes, o5f, xref, tlr];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export const Comparative: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [products, setProducts]           = useState<Product[]>([]);
  const [expenses, setExpenses]           = useState<Expense[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear]   = useState<number>(new Date().getFullYear());
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [exporting, setExporting]         = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<Product[]>('/api/products'),
      apiRequest<Expense[]>('/api/expenses'),
      apiRequest<AcademicYear[]>('/api/academic-years'),
    ]).then(([p, e, y]) => {
      setProducts(p); setExpenses(e); setAcademicYears(y);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredByYear = products.filter(p => p.year === selectedYear);

  // When year changes, reset selection
  useEffect(() => { setSelectedIds(new Set()); }, [selectedYear]);

  const filteredProducts = selectedIds.size === 0
    ? filteredByYear
    : filteredByYear.filter(p => selectedIds.has(p.id));

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filteredByYear.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredByYear.map(p => p.id)));
  };

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

  const topProduct   = data[0];
  const mostStudents = [...filteredProducts].sort((a, b) => b.studentGoal - a.studentGoal)[0];
  const avgExecution = data.length ? data.reduce((s, d) => s + d.porcentaje, 0) / data.length : 0;

  const handleExportPDF = async () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const PW = 1240, M = 52;
      const rowH = 56;
      const tableH = 40 + data.length * rowH + 20;
      const barH = 280;
      const PH = 120 + 4 + 22 + 110 + 30 + barH + 20 + 30 + tableH + 60;

      const canvas = document.createElement('canvas');
      canvas.width = PW; canvas.height = PH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#F8FAFC'; ctx.fillRect(0, 0, PW, PH);

      const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

      // Header
      const headerH = 120;
      const grad = ctx.createLinearGradient(0, 0, PW, 0);
      grad.addColorStop(0, RED2); grad.addColorStop(1, RED);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, PW, headerH);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath(); ctx.arc(PW - 60, -30, 140, 0, Math.PI * 2); ctx.fill();
      const logoSize = 72, logoX = M, logoY = (headerH - logoSize) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, logoX, logoY, logoSize, logoSize, 10); ctx.fill();
      txt(ctx, 'PAD', logoX + logoSize / 2, logoY + logoSize / 2 + 8, 20, WHITE, 'bold', 'center');
      const textX = logoX + logoSize + 20;
      txt(ctx, 'COMPARATIVA DE CAMPAÑAS', textX, headerH / 2 - 4, 22, WHITE, 'bold');
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(textX, headerH / 2 + 6, 460, 1);
      const label = selectedIds.size === 0 ? `Todas las campañas · ${selectedYear}` : `${selectedIds.size} campaña(s) seleccionada(s) · ${selectedYear}`;
      txt(ctx, `${label}  ·  Generado el ${fecha}`, textX, headerH / 2 + 24, 11, 'rgba(255,255,255,0.80)');
      ctx.fillStyle = RED2; ctx.fillRect(0, headerH, PW, 4);
      let curY = headerH + 4 + 22;

      // KPI cards
      const totalBudget = data.reduce((s, d) => s + d.Presupuesto, 0);
      const totalSpent  = data.reduce((s, d) => s + d.Ejecutado, 0);
      const kpis = [
        { label: 'PRESUPUESTO TOTAL',   value: fmtPDF(totalBudget),          sub: 'Sumado de campañas',     color: NAVY },
        { label: 'GASTO EJECUTADO',     value: fmtPDF(totalSpent),            sub: 'Acumulado real',         color: RED },
        { label: 'SALDO DISPONIBLE',    value: fmtPDF(totalBudget - totalSpent), sub: 'Pendiente',           color: GREEN },
        { label: 'EJECUCIÓN PROMEDIO',  value: `${avgExecution.toFixed(1)}%`, sub: `Sobre ${data.length} campañas`, color: avgExecution > 90 ? RED : avgExecution > 60 ? AMBER : GREEN },
      ];
      const kpiW = (PW - M * 2 - 24) / 4;
      kpis.forEach((k, i) => {
        const kx = M + i * (kpiW + 8);
        cardPDF(ctx, kx, curY, kpiW, 92);
        ctx.fillStyle = k.color; rr(ctx, kx, curY, 4, 92, 3); ctx.fill();
        txt(ctx, k.label, kx + 18, curY + 24, 8, '#94A3B8');
        txt(ctx, k.value, kx + 18, curY + 58, 17, '#0F172A', 'bold');
        txt(ctx, k.sub,   kx + 18, curY + 78,  9, SLATE_COL);
      });
      curY += 110;

      // Bar chart
      ctx.fillStyle = RED; ctx.fillRect(M, curY, 4, 22);
      txt(ctx, 'PRESUPUESTO VS. GASTO EJECUTADO POR CAMPAÑA', M + 16, curY + 16, 11, '#0F172A', 'bold');
      curY += 30;
      cardPDF(ctx, M, curY, PW - M * 2, barH);
      const maxVal = Math.max(...data.flatMap(d => [d.Presupuesto, d.Ejecutado]), 1);
      const padL = 62, padR = 14, padT = 16, padB = 30;
      const chartW = (PW - M * 2) - padL - padR;
      const chartH = barH - padT - padB;
      const barGroupW = chartW / data.length;
      const barW = Math.min(18, barGroupW * 0.28);
      for (let i = 0; i <= 4; i++) {
        const gy = curY + padT + chartH - (i / 4) * chartH;
        ctx.strokeStyle = i === 0 ? BORDER : '#F1F5F9'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(M + padL, gy); ctx.lineTo(M + padL + chartW, gy); ctx.stroke();
        txt(ctx, shortFmt((maxVal * i) / 4), M + padL - 5, gy + 4, 9, '#94A3B8', 'normal', 'right');
      }
      data.forEach((d, i) => {
        const cx    = M + padL + i * barGroupW + barGroupW / 2;
        const planH = maxVal > 0 ? (d.Presupuesto / maxVal) * chartH : 0;
        const execH = maxVal > 0 ? (d.Ejecutado   / maxVal) * chartH : 0;
        ctx.fillStyle = NAVY; rr(ctx, cx - barW - 2, curY + padT + chartH - planH, barW, Math.max(planH, 2), 3); ctx.fill();
        ctx.fillStyle = RED;  rr(ctx, cx + 2, curY + padT + chartH - execH, barW, Math.max(execH, 2), 3); ctx.fill();
        const lbl = d.name.length > Math.floor(barGroupW / 6) ? d.name.slice(0, Math.floor(barGroupW / 6)) + '…' : d.name;
        txt(ctx, lbl, cx, curY + padT + chartH + 18, 9, SLATE_COL, 'normal', 'center');
      });
      const legY2 = curY + barH - 16;
      ctx.fillStyle = NAVY; ctx.fillRect(M + 20, legY2 - 9, 14, 14);
      txt(ctx, 'Presupuesto', M + 38, legY2, 9, SLATE_COL);
      ctx.fillStyle = RED; ctx.fillRect(M + 140, legY2 - 9, 14, 14);
      txt(ctx, 'Ejecutado', M + 158, legY2, 9, SLATE_COL);
      curY += barH + 20;

      // Table
      ctx.fillStyle = RED; ctx.fillRect(M, curY, 4, 22);
      txt(ctx, 'DETALLE POR CAMPAÑA', M + 16, curY + 16, 11, '#0F172A', 'bold');
      curY += 30;
      cardPDF(ctx, M, curY, PW - M * 2, tableH);
      const cols = [
        { label: '#',           x: M + 18,           w: 30 },
        { label: 'CAMPAÑA',     x: M + 54,           w: 340 },
        { label: 'PRESUPUESTO', x: M + 400,          w: 160 },
        { label: 'EJECUTADO',   x: M + 570,          w: 160 },
        { label: 'SALDO',       x: M + 740,          w: 160 },
        { label: 'EJECUCIÓN',   x: M + 900,          w: 120 },
        { label: 'META ALUMNOS',x: M + 1030,         w: 120 },
      ];
      let ty = curY + 24;
      cols.forEach(c => txt(ctx, c.label, c.x, ty, 9, '#94A3B8', 'bold'));
      ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M + 10, ty + 8); ctx.lineTo(M + (PW - M * 2) - 10, ty + 8); ctx.stroke();
      ty += rowH * 0.7;
      data.forEach((d, i) => {
        const saldo = d.Presupuesto - d.Ejecutado;
        const color = d.porcentaje > 90 ? RED : d.porcentaje > 60 ? AMBER : GREEN;
        if (i % 2 === 0) {
          ctx.fillStyle = LIGHT; rr(ctx, M + 10, ty - 14, PW - M * 2 - 20, rowH - 4, 6); ctx.fill();
        }
        const bf = i === 0 ? '#FEF08A' : i === 1 ? '#E2E8F0' : i === 2 ? '#FDE68A' : LIGHT;
        const bt = i === 0 ? '#713F12' : i === 1 ? '#475569' : i === 2 ? '#78350F' : SLATE_COL;
        ctx.fillStyle = bf; rr(ctx, cols[0].x, ty - 10, 22, 22, 11); ctx.fill();
        txt(ctx, String(i + 1), cols[0].x + 11, ty + 4, 9, bt, 'bold', 'center');
        const nm = d.fullName.length > 38 ? d.fullName.slice(0, 36) + '…' : d.fullName;
        txt(ctx, nm, cols[1].x, ty + 4, 10, '#334155');
        txt(ctx, fmtPDF(d.Presupuesto), cols[2].x, ty + 4, 10, '#334155', 'bold');
        txt(ctx, fmtPDF(d.Ejecutado), cols[3].x, ty + 4, 10, '#334155', 'bold');
        txt(ctx, fmtPDF(saldo), cols[4].x, ty + 4, 10, saldo < 0 ? RED : GREEN, 'bold');
        txt(ctx, `${d.porcentaje.toFixed(1)}%`, cols[5].x, ty + 4, 10, color, 'bold');
        txt(ctx, String(d.metaAlumnos), cols[6].x, ty + 4, 10, '#334155');
        ty += rowH;
      });
      curY += tableH + 20;

      // Footer
      const footerY = curY + 10;
      ctx.fillStyle = LIGHT; ctx.fillRect(0, footerY, PW, PH - footerY);
      ctx.fillStyle = RED; ctx.fillRect(0, footerY, PW, 3);
      txt(ctx, 'PAD — Escuela de Dirección · Documento de uso interno generado automáticamente', M, footerY + 20, 9, SLATE_COL);
      txt(ctx, `${fecha}  ·  Comparativa ${selectedYear}`, PW - M, footerY + 20, 9, SLATE_COL, 'normal', 'right');

      const b64     = canvas.toDataURL('image/jpeg', 0.96).split(',')[1];
      const pdfData = embedImageInPDF(b64, PW, PH);
      const blob    = new Blob([pdfData], { type: 'application/pdf' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href = url; a.download = `comparativa_${selectedYear}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 bg-white border border-border rounded-2xl px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Year */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Campaign selector */}
          <div className="relative" ref={dropRef}>
            <button
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:border-brand hover:text-brand transition-colors bg-white"
              onClick={() => setDropdownOpen(v => !v)}
            >
              <span>
                {selectedIds.size === 0
                  ? `Todas las campañas (${filteredByYear.length})`
                  : `${selectedIds.size} campaña${selectedIds.size !== 1 ? 's' : ''} seleccionada${selectedIds.size !== 1 ? 's' : ''}`}
              </span>
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-border rounded-xl shadow-lg min-w-[260px] max-h-64 overflow-y-auto py-1">
                {/* Select all */}
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 font-semibold border-b border-border"
                  onClick={toggleAll}
                >
                  {selectedIds.size === filteredByYear.length && filteredByYear.length > 0
                    ? <CheckSquare size={15} className="text-brand shrink-0" />
                    : <Square size={15} className="text-slate-300 shrink-0" />}
                  Seleccionar todas
                </button>
                {filteredByYear.length === 0 && (
                  <p className="text-xs text-slate-400 px-3 py-3 text-center">No hay campañas para {selectedYear}</p>
                )}
                {filteredByYear.map(p => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                    onClick={() => toggleId(p.id)}
                  >
                    {selectedIds.has(p.id)
                      ? <CheckSquare size={15} className="text-brand shrink-0" />
                      : <Square size={15} className="text-slate-300 shrink-0" />}
                    <span className="truncate text-slate-700">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export PDF */}
        <button
          className="btn-primary flex items-center gap-2 text-sm"
          onClick={handleExportPDF}
          disabled={exporting || data.length === 0}
        >
          <Download size={15} />
          {exporting ? 'Generando…' : 'Exportar PDF'}
        </button>
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
