import React, { useEffect, useState } from 'react';
import { Expense } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { apiRequest } from '../services/api';

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const CalendarView: React.FC = () => {
  const { formatCurrency }            = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses]       = useState<Expense[]>([]);

  useEffect(() => { apiRequest<Expense[]>('/api/expenses').then(setExpenses); }, []);

  const monthStart = startOfMonth(currentDate);
  const days       = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  const today      = new Date();

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white border border-border rounded-2xl px-5 py-3">
        <h3 className="text-base font-bold text-slate-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex gap-1">
          <button className="btn-icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft size={18} /></button>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setCurrentDate(new Date())}>Hoy</button>
          <button className="btn-icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Offset for first day */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`pre-${i}`} className="min-h-[110px] bg-slate-50/40 border-b border-r border-border/40" />
          ))}

          {days.map((day, idx) => {
            const dayExpenses = expenses.filter(e => {
              const [y, m, d] = e.date.split('-').map(Number);
              return isSameDay(new Date(y, m - 1, d), day);
            });
            const total       = dayExpenses.reduce((s, e) => s + e.amount, 0);
            const isToday     = isSameDay(day, today);
            const isLast      = idx === days.length - 1;
            const col         = (monthStart.getDay() + idx) % 7;

            return (
              <div
                key={day.toString()}
                className={`min-h-[110px] p-2 border-b border-r border-border/40 transition-colors hover:bg-slate-50 flex flex-col gap-1 ${isLast && col !== 6 ? '' : ''}`}
              >
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full self-start ${
                  isToday ? 'bg-brand text-white' : 'text-slate-400'
                }`}>
                  {format(day, 'd')}
                </span>

                <div className="flex flex-col gap-0.5 flex-1">
                  {dayExpenses.slice(0, 2).map(exp => (
                    <div key={exp.id} className="text-[10px] bg-navy-light text-navy px-1.5 py-0.5 rounded font-semibold truncate">
                      {exp.provider}
                    </div>
                  ))}
                  {dayExpenses.length > 2 && (
                    <p className="text-[9px] text-slate-400 font-bold text-center mt-0.5">
                      +{dayExpenses.length - 2} más
                    </p>
                  )}
                </div>

                {total > 0 && (
                  <div className="text-[10px] font-bold text-brand text-right border-t border-border/60 pt-1 mt-auto">
                    {formatCurrency(total)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
