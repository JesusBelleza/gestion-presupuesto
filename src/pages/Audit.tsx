import React, { useEffect, useState } from 'react';
import { AuditLog } from '../types';
import { Search, Download, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../services/api';

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
};

export const Audit: React.FC = () => {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    apiRequest<AuditLog[]>('/api/audit-logs').then(data =>
      setLogs([...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())),
    );
  }, []);

  const filtered = logs.filter(l =>
    [l.userName, l.action, l.entity, l.details].some(f => f.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleExport = () => {
    const csv = ['Fecha,Usuario,Acción,Entidad,Detalles',
      ...filtered.map(l => [l.timestamp, l.userName, l.action, l.entity, `"${l.details}"`].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input className="field pl-9" placeholder="Filtrar por usuario, acción…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={handleExport}><Download size={16} /> Exportar log</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td className="text-slate-500 font-mono text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('es-PE')}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                      {log.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{log.userName}</span>
                  </div>
                </td>
                <td>
                  <span className={ACTION_STYLE[log.action] ?? 'badge-gray'}>{log.action}</span>
                </td>
                <td className="font-medium text-slate-600">{log.entity}</td>
                <td className="text-slate-500 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <ShieldCheck size={36} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">No hay eventos de auditoría registrados.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
