/**
 * generateDashboardPDF
 * Informe PDF profesional — Canvas API nativa, sin dependencias externas.
 * Header rojo institucional, logo desde configuración, descarga directa .pdf
 */

const RED    = '#C8102E';
const RED2   = '#A00D24';   // darker accent
const NAVY   = '#002D72';
const GREEN  = '#059669';
const AMBER  = '#D97706';
const SLATE  = '#64748B';
const LIGHT  = '#F1F5F9';
const WHITE  = '#FFFFFF';
const BORDER = '#E2E8F0';
const PIE_COLORS = [RED, NAVY, GREEN, AMBER, '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

function fmt(n: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(n);
}
function shortFmt(n: number): string {
  if (n >= 1_000_000) return `S/${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `S/${(n / 1_000).toFixed(0)}K`;
  return `S/${n.toFixed(0)}`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
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

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: { name: string; Planificado: number; Ejecutado: number }[],
  x: number, y: number, w: number, h: number
) {
  const maxVal = Math.max(...data.flatMap(d => [d.Planificado, d.Ejecutado]), 1);
  const padL = 62, padR = 14, padT = 16, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const barGroupW = chartW / data.length;
  const barW = Math.min(16, barGroupW * 0.28);

  for (let i = 0; i <= 4; i++) {
    const gy = y + padT + chartH - (i / 4) * chartH;
    ctx.strokeStyle = i === 0 ? BORDER : '#F1F5F9'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + padL, gy); ctx.lineTo(x + padL + chartW, gy); ctx.stroke();
    txt(ctx, shortFmt((maxVal * i) / 4), x + padL - 5, gy + 4, 9, '#94A3B8', 'normal', 'right');
  }
  data.forEach((d, i) => {
    const cx    = x + padL + i * barGroupW + barGroupW / 2;
    const planH = maxVal > 0 ? (d.Planificado / maxVal) * chartH : 0;
    const execH = maxVal > 0 ? (d.Ejecutado   / maxVal) * chartH : 0;
    ctx.fillStyle = NAVY; rr(ctx, cx - barW - 2, y + padT + chartH - planH, barW, Math.max(planH, 2), 3); ctx.fill();
    ctx.fillStyle = RED;  rr(ctx, cx + 2,        y + padT + chartH - execH, barW, Math.max(execH, 2), 3); ctx.fill();
    txt(ctx, d.name, cx, y + padT + chartH + 18, 9, SLATE, 'normal', 'center');
  });
}

function drawDonut(
  ctx: CanvasRenderingContext2D,
  data: { name: string; value: number }[],
  cx: number, cy: number, outer: number, inner: number
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, angle, angle + slice); ctx.closePath();
    ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length]; ctx.fill();
    ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.stroke();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = WHITE; ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, maxWidth: number, lineH: number, size: number, color: string
): number {
  ctx.font = `normal ${size}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = 'left';
  const words = text.split(' ');
  let line = ''; let cy = y;
  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy); line = word; cy += lineH;
    } else { line = test; }
  });
  if (line) ctx.fillText(line, x, cy);
  return cy + lineH;
}

function buildConclusions(
  totalBudget: number, totalSpent: number, executionRate: number,
  products: any[], expenses: any[],
  chartData: { name: string; Planificado: number; Ejecutado: number }[],
  pieData: { name: string; value: number }[]
): string[] {
  const c: string[] = [];
  if (totalBudget === 0) { c.push('No se encontró presupuesto registrado para los filtros seleccionados.'); return c; }
  const saldo = totalBudget - totalSpent;
  if (executionRate >= 100)
    c.push(`El presupuesto ha sido agotado al ${executionRate.toFixed(1)}%. Se requiere revisión urgente antes de registrar nuevos gastos. Saldo: ${fmt(saldo)}.`);
  else if (executionRate >= 90)
    c.push(`La ejecución alcanzó el ${executionRate.toFixed(1)}%, con saldo disponible de solo ${fmt(saldo)}. Se recomienda mayor control del gasto.`);
  else if (executionRate >= 60)
    c.push(`La ejecución global es del ${executionRate.toFixed(1)}%, dentro de un rango saludable. Saldo disponible: ${fmt(saldo)}.`);
  else
    c.push(`La ejecución global es del ${executionRate.toFixed(1)}%, con amplio margen disponible (${fmt(saldo)}). Se sugiere verificar compromisos pendientes de registro.`);

  const maxMonth = chartData.reduce((b, d) => d.Ejecutado > (b?.Ejecutado ?? 0) ? d : b, null as any);
  if (maxMonth?.Ejecutado > 0)
    c.push(`El mes con mayor gasto ejecutado fue ${maxMonth.name}, alcanzando ${fmt(maxMonth.Ejecutado)}.`);

  const totPlan = chartData.reduce((s, d) => s + d.Planificado, 0);
  const totExec = chartData.reduce((s, d) => s + d.Ejecutado, 0);
  if (totPlan > 0 && totExec > 0) {
    const diff = totExec - totPlan;
    if (diff > 0)
      c.push(`El gasto ejecutado superó lo planificado en ${fmt(diff)}, una desviación del ${((diff / totPlan) * 100).toFixed(1)}%.`);
    else if (diff < 0)
      c.push(`El gasto ejecutado fue ${fmt(Math.abs(diff))} inferior a lo planificado, lo que puede indicar retrasos en actividades programadas.`);
    else
      c.push('El gasto ejecutado se alineó exactamente con lo planificado en el período analizado.');
  }
  if (pieData.length > 0) {
    const top = pieData.reduce((a, b) => a.value > b.value ? a : b);
    c.push(`La categoría de mayor concentración es "${top.name}", con el ${((top.value / totalSpent) * 100).toFixed(1)}% del gasto total (${fmt(top.value)}).`);
  }
  if (products.length > 1) {
    const ranked = products
      .map((p: any) => ({
        name: p.name,
        exec: expenses.filter((e: any) => e.productId === p.id).reduce((s: number, e: any) => s + e.amount, 0),
        budget: p.totalBudget,
      }))
      .filter((p: any) => p.budget > 0)
      .sort((a: any, b: any) => (b.exec / b.budget) - (a.exec / a.budget));
    if (ranked.length > 0) {
      const top = ranked[0];
      c.push(`El producto con mayor porcentaje de ejecución es "${top.name}" con el ${((top.exec / top.budget) * 100).toFixed(1)}% (${fmt(top.exec)} de ${fmt(top.budget)}).`);
    }
  }
  return c;
}

function embedImageInPDF(jpegB64: string, imgW: number, imgH: number): Uint8Array {
  const raw = atob(jpegB64);
  const imgBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) imgBytes[i] = raw.charCodeAt(i);
  const enc = new TextEncoder();
  const WPT = (imgW / 150) * 72;
  const HPT = (imgH / 150) * 72;
  const o1  = enc.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const o2  = enc.encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const o3  = enc.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WPT.toFixed(2)} ${HPT.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
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
  const out   = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

export interface PDFReportData {
  year: number;
  selectedProductNames: string[];
  totalBudget: number;
  totalSpent: number;
  executionRate: number;
  chartData: { name: string; Planificado: number; Ejecutado: number }[];
  pieData:   { name: string; value: number }[];
  products:  any[];
  expenses:  any[];
  productRanking: { name: string; pct: number; budget: number; spent: number }[];
  logoUrl: string;
}

// Loads an image URL into an HTMLImageElement (returns null on error)
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateDashboardPDF(data: PDFReportData) {
  const PW = 1240, PH = 1754;
  const M  = 52;

  const canvas = document.createElement('canvas');
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, PW, PH);

  const fecha  = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const logoImg = await loadImage(data.logoUrl);
  let curY = 0;

  // ── HEADER — fondo rojo institucional ──────────────────────────────────
  const headerH = 120;

  // Gradient rojo
  const grad = ctx.createLinearGradient(0, 0, PW, 0);
  grad.addColorStop(0, RED2);
  grad.addColorStop(1, RED);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PW, headerH);

  // Patrón decorativo sutil (círculos semitransparentes)
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath(); ctx.arc(PW - 60, -30, 140, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(PW - 10, 130, 80,  0, Math.PI * 2); ctx.fill();

  // Logo (si existe)
  const logoSize = 72;
  const logoX = M;
  const logoY = (headerH - logoSize) / 2;

  if (logoImg) {
    // Fondo blanco circular para el logo
    ctx.fillStyle = WHITE;
    rr(ctx, logoX, logoY, logoSize, logoSize, 10); ctx.fill();
    // Dibujar logo ajustado
    const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
    const lw = logoImg.width * ratio;
    const lh = logoImg.height * ratio;
    ctx.drawImage(logoImg, logoX + (logoSize - lw) / 2, logoY + (logoSize - lh) / 2, lw, lh);
  } else {
    // Fallback: badge "PAD"
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, logoX, logoY, logoSize, logoSize, 10); ctx.fill();
    txt(ctx, 'PAD', logoX + logoSize / 2, logoY + logoSize / 2 + 8, 20, WHITE, 'bold', 'center');
  }

  // Título y subtítulo
  const textX = logoX + logoSize + 20;
  txt(ctx, 'INFORME DE GESTIÓN PRESUPUESTARIA', textX, headerH / 2 - 4, 22, WHITE, 'bold');

  // Línea divisoria fina blanca
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(textX, headerH / 2 + 6, 460, 1);

  // Fecha + filtros debajo del título
  const prodLabel = data.selectedProductNames.length === 0 ? 'Todos los productos'
    : data.selectedProductNames.length === 1 ? data.selectedProductNames[0]
    : `${data.selectedProductNames.length} productos seleccionados`;
  txt(ctx, `${prodLabel}  ·  Generado el ${fecha}`, textX, headerH / 2 + 24, 11, 'rgba(255,255,255,0.80)');

  // Línea inferior de acento más oscuro
  ctx.fillStyle = RED2;
  ctx.fillRect(0, headerH, PW, 4);

  curY = headerH + 4 + 22;

  // ── KPI CARDS ───────────────────────────────────────────────────────────
  const kpis = [
    { label: 'PRESUPUESTO TOTAL', value: fmt(data.totalBudget),                    sub: 'Asignado al período',      color: NAVY  },
    { label: 'GASTO EJECUTADO',   value: fmt(data.totalSpent),                     sub: 'Acumulado real',           color: RED   },
    { label: 'SALDO DISPONIBLE',  value: fmt(data.totalBudget - data.totalSpent),  sub: 'Pendiente de utilización', color: GREEN },
    { label: 'TASA DE EJECUCIÓN', value: `${data.executionRate.toFixed(1)}%`,       sub: 'Del presupuesto total',
      color: data.executionRate > 90 ? RED : data.executionRate > 60 ? AMBER : GREEN },
  ];
  const kpiW = (PW - M * 2 - 24) / 4;
  kpis.forEach((k, i) => {
    const kx = M + i * (kpiW + 8);
    card(ctx, kx, curY, kpiW, 92);
    ctx.fillStyle = k.color; rr(ctx, kx, curY, 4, 92, 3); ctx.fill();
    txt(ctx, k.label, kx + 18, curY + 24,  8, '#94A3B8');
    txt(ctx, k.value, kx + 18, curY + 58, 19, '#0F172A', 'bold');
    txt(ctx, k.sub,   kx + 18, curY + 78,  9, SLATE);
  });
  curY += 110;

  // ── ALERT ────────────────────────────────────────────────────────────────
  if (data.executionRate >= 90) {
    const isOver = data.executionRate >= 100;
    ctx.fillStyle = isOver ? '#FEF2F2' : '#FFFBEB';
    rr(ctx, M, curY, PW - M * 2, 38, 8); ctx.fill();
    ctx.strokeStyle = isOver ? RED : AMBER; ctx.lineWidth = 1;
    rr(ctx, M, curY, PW - M * 2, 38, 8); ctx.stroke();
    const msg = isOver
      ? `⚠  ALERTA CRÍTICA — Presupuesto agotado (${data.executionRate.toFixed(1)}%). Revisión inmediata requerida.`
      : `⚠  AVISO — Ejecución al ${data.executionRate.toFixed(1)}%. El presupuesto se acerca a su límite.`;
    txt(ctx, msg, M + 16, curY + 24, 11, isOver ? RED : AMBER, 'bold');
    curY += 54;
  }

  // ── EJECUCIÓN MENSUAL ────────────────────────────────────────────────────
  ctx.fillStyle = RED; ctx.fillRect(M, curY, 4, 22);
  txt(ctx, 'EJECUCIÓN MENSUAL VS. PLANIFICADO', M + 16, curY + 16, 11, '#0F172A', 'bold');
  curY += 30;
  const barH = 210;
  card(ctx, M, curY, PW - M * 2, barH);
  drawBarChart(ctx, data.chartData, M, curY, PW - M * 2, barH);
  const legY = curY + barH - 16;
  ctx.fillStyle = NAVY; ctx.fillRect(M + 20, legY - 9, 14, 14);
  txt(ctx, 'Planificado', M + 38, legY, 9, SLATE);
  ctx.fillStyle = RED; ctx.fillRect(M + 128, legY - 9, 14, 14);
  txt(ctx, 'Ejecutado', M + 146, legY, 9, SLATE);
  curY += barH + 18;

  // ── DONUT + RANKING ──────────────────────────────────────────────────────
  ctx.fillStyle = RED; ctx.fillRect(M, curY, 4, 22);
  txt(ctx, 'DISTRIBUCIÓN POR CATEGORÍA', M + 16, curY + 16, 11, '#0F172A', 'bold');
  const colMid = M + (PW - M * 2) / 2 + 10;
  ctx.fillStyle = RED; ctx.fillRect(colMid, curY, 4, 22);
  txt(ctx, 'RANKING DE EJECUCIÓN POR PRODUCTO', colMid + 16, curY + 16, 11, '#0F172A', 'bold');
  curY += 30;

  const col2W = (PW - M * 2 - 16) / 2;
  const row2H = Math.max(210, 30 + data.productRanking.length * 38 + 20);

  card(ctx, M, curY, col2W, row2H);
  const dcx = M + 90, dcy = curY + row2H / 2;
  drawDonut(ctx, data.pieData, dcx, dcy, 70, 34);
  txt(ctx, `${data.executionRate.toFixed(0)}%`, dcx, dcy + 5, 14, RED, 'bold', 'center');

  let lY = curY + 20;
  const legX = M + 176;
  data.pieData.slice(0, 7).forEach((d, i) => {
    const pct = data.totalSpent > 0 ? ((d.value / data.totalSpent) * 100).toFixed(1) : '0.0';
    ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length]; rr(ctx, legX, lY, 10, 10, 2); ctx.fill();
    txt(ctx, d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name, legX + 14, lY + 9, 9, '#475569');
    txt(ctx, `${pct}%`, legX + col2W - 54, lY + 9, 9, '#0F172A', 'bold', 'right');
    lY += 22;
  });

  const rankX = M + col2W + 16;
  card(ctx, rankX, curY, col2W, row2H);
  let rY = curY + 24;
  if (data.productRanking.length === 0) {
    txt(ctx, 'Sin datos de productos', rankX + col2W / 2, curY + row2H / 2, 11, '#94A3B8', 'normal', 'center');
  } else {
    data.productRanking.forEach((p, i) => {
      const bf = i === 0 ? '#FEF08A' : i === 1 ? '#E2E8F0' : i === 2 ? '#FDE68A' : LIGHT;
      const bt = i === 0 ? '#713F12' : i === 1 ? '#475569' : i === 2 ? '#78350F' : SLATE;
      ctx.fillStyle = bf; rr(ctx, rankX + 14, rY, 22, 22, 11); ctx.fill();
      txt(ctx, String(i + 1), rankX + 25, rY + 15, 10, bt, 'bold', 'center');
      const name  = p.name.length > 26 ? p.name.slice(0, 24) + '…' : p.name;
      const color = p.pct > 90 ? RED : p.pct > 60 ? AMBER : GREEN;
      txt(ctx, name, rankX + 44, rY + 14, 10, '#334155');
      txt(ctx, `${p.pct.toFixed(1)}%`, rankX + col2W - 14, rY + 14, 10, color, 'bold', 'right');
      rY += 16;
      ctx.fillStyle = LIGHT; rr(ctx, rankX + 44, rY, col2W - 64, 5, 3); ctx.fill();
      if (p.pct > 0) { ctx.fillStyle = color; rr(ctx, rankX + 44, rY, (col2W - 64) * Math.min(p.pct / 100, 1), 5, 3); ctx.fill(); }
      rY += 22;
    });
  }
  curY += row2H + 20;

  // ── CONCLUSIONS ──────────────────────────────────────────────────────────
  ctx.fillStyle = RED; ctx.fillRect(M, curY, 4, 22);
  txt(ctx, 'CONCLUSIONES Y OBSERVACIONES', M + 16, curY + 16, 11, '#0F172A', 'bold');
  curY += 30;
  const conclusions = buildConclusions(
    data.totalBudget, data.totalSpent, data.executionRate,
    data.products, data.expenses, data.chartData, data.pieData
  );
  const concH = conclusions.length * 52 + 48;
  card(ctx, M, curY, PW - M * 2, concH);
  let concY = curY + 44;
  conclusions.forEach((c, i) => {
    const dc = i === 0 && data.executionRate >= 90 ? RED : NAVY;
    ctx.fillStyle = dc + '1A'; rr(ctx, M + 16, concY - 15, 24, 24, 12); ctx.fill();
    txt(ctx, String(i + 1), M + 28, concY, 10, dc, 'bold', 'center');
    wrapText(ctx, c, M + 52, concY, PW - M * 2 - 72, 16, 11, '#334155');
    concY += 52;
  });
  curY += concH + 20;

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const footerY = Math.max(curY + 10, PH - 52);
  ctx.fillStyle = LIGHT; ctx.fillRect(0, footerY, PW, PH - footerY);
  ctx.fillStyle = RED; ctx.fillRect(0, footerY, PW, 3);
  txt(ctx, 'PAD — Escuela de Dirección · Documento de uso interno generado automáticamente', M, footerY + 20, 9, SLATE);
  txt(ctx, `Presupuesto: ${fmt(data.totalBudget)}  ·  Ejecutado: ${fmt(data.totalSpent)}  ·  Saldo: ${fmt(data.totalBudget - data.totalSpent)}`, M, footerY + 36, 9, SLATE);
  txt(ctx, `${fecha}  ·  Página 1`, PW - M, footerY + 28, 9, SLATE, 'normal', 'right');

  // ── DOWNLOAD ─────────────────────────────────────────────────────────────
  const b64      = canvas.toDataURL('image/jpeg', 0.96).split(',')[1];
  const pdfData  = embedImageInPDF(b64, PW, PH);
  const blob     = new Blob([pdfData], { type: 'application/pdf' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `informe_presupuesto_${data.year}_${new Date().toISOString().split('T')[0]}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
