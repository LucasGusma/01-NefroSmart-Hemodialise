import MonochromeIcon from './MonochromeIcon';
import React, { useState } from 'react';
import {
  DIAS_SEMANA_ABREV,
  MESES_EXTENSO,
  getCalendarMonthDays,
  formatDateBR
} from '../services/schedule';

const MonthlyAttendanceCalendar = ({
  selectedDate,
  onSelectDate,
  monthStats = {},
}) => {
  const [currentYear, setCurrentYear] = useState(() => {
    if (selectedDate) return Number(selectedDate.split('-')[0]);
    return new Date().getFullYear();
  });

  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    if (selectedDate) return Number(selectedDate.split('-')[1]) - 1;
    return new Date().getMonth();
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const handlePrevMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonthIndex - 1;
    if (currentMonthIndex === 0) {
      nextM = 11;
      nextY = currentYear - 1;
    }
    setCurrentMonthIndex(nextM);
    setCurrentYear(nextY);
    const newDateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
    if (onSelectDate) onSelectDate(newDateStr);
  };

  const handleNextMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonthIndex + 1;
    if (currentMonthIndex === 11) {
      nextM = 0;
      nextY = currentYear + 1;
    }
    setCurrentMonthIndex(nextM);
    setCurrentYear(nextY);
    const newDateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
    if (onSelectDate) onSelectDate(newDateStr);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
    onSelectDate(todayStr);
  };

  const daysGrid = getCalendarMonthDays(currentYear, currentMonthIndex);

  return (
    <div className="fp-panel-bg rounded-xl border fp-border shadow-sm overflow-hidden mb-6">
      
      {/* Barra de Navegação do Mês com a Cor Institucional #40baab */}
      <div className="p-4 fp-field-bg border-b fp-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 fp-selected-bg fp-text rounded-xl shadow-xs flex items-center justify-center text-xl">
            <MonochromeIcon name="calendar" className="fp-semantic-icon" />
          </div>
          <div>
            <h3 className="text-lg font-bold fp-text">
              {MESES_EXTENSO[currentMonthIndex]} de {currentYear}
            </h3>
            <p className="text-xs fp-selection-text">
              Clique em qualquer dia para abrir a lista de presença e coletar assinaturas no tablet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-3 py-1.5 text-xs font-semibold fp-panel-bg border fp-border hover:border-[#40baab] hover:bg-[#f0faf8] fp-selection-text rounded-lg shadow-xs transition-colors flex items-center gap-1"
            title="Mês anterior"
          >
            ◀ Mês Anterior
          </button>
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-3.5 py-1.5 text-xs font-bold fp-selected-bg hover:bg-[#34a99b] fp-text rounded-lg shadow-xs transition-colors border fp-border"
            title="Ir para o dia de hoje"
          >
            Ir para Hoje
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="px-3 py-1.5 text-xs font-semibold fp-panel-bg border fp-border hover:border-[#40baab] hover:bg-[#f0faf8] fp-selection-text rounded-lg shadow-xs transition-colors flex items-center gap-1"
            title="Próximo mês"
          >
            Próximo Mês ▶
          </button>
        </div>
      </div>

      {/* Legenda Explicativa das Cores */}
      <div className="px-4 py-2 fp-field-bg border-b fp-border flex flex-wrap items-center gap-4 text-xs fp-muted">
        <span className="font-bold fp-selection-text">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded fp-neutral-bg border fp-border inline-block"></span>
          <span>Dias Passados (Cinza escuro)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded fp-selected-bg border-2 fp-border inline-block"></span>
          <span>Dia de Hoje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded fp-panel-bg border fp-border inline-block"></span>
          <span>Dias Futuros (Fechado)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded ring-2 ring-[#087b70] fp-selected-bg inline-block"></span>
          <span>Dia Selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-full fp-selected-bg fp-selection-text font-bold text-[10px] border fp-border">✓ Presenças</span>
          <span>Comparecimentos Registrados</span>
        </div>
      </div>

      {/* Grade dos 7 Dias da Semana com Cor da Marca */}
      <div className="fp-calendar-scroll" tabIndex={0} role="region" aria-label="Calendário mensal com rolagem horizontal">
      <div className="grid grid-cols-7 border-b fp-border text-center fp-field-bg font-bold text-xs fp-selection-text uppercase tracking-wider py-2">
        {DIAS_SEMANA_ABREV.map((dia, idx) => (
          <div key={dia} className={idx === 0 ? 'fp-error-text' : 'fp-selection-text'}>
            {dia}
          </div>
        ))}
      </div>

      {/* Células de Dias do Calendário */}
      <div className="grid grid-cols-7 gap-1 p-2 fp-field-bg">
        {daysGrid.map((cell, index) => {
          const { dateStr, dayNumber, isCurrentMonth } = cell;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isPast = isCurrentMonth && dateStr < todayStr;
          const isFuture = isCurrentMonth && dateStr > todayStr;
          const isSunday = new Date(dateStr + 'T12:00:00').getDay() === 0;
          const totalPresentes = monthStats[dateStr] || 0;

          // Regras de Estilo:
          // "os dias que ja passarão devem estar em um cinza um pouco mais escuro"
          let cellStyle = 'fp-panel-bg fp-text fp-border hover:bg-[#f0faf8]';

          if (!isCurrentMonth) {
            cellStyle = 'fp-field-bg text-slate-300 border-transparent opacity-50 cursor-default';
          } else if (isPast) {
            // Cinza visivelmente mais escuro para os dias já passados
            cellStyle = 'fp-neutral-bg fp-text fp-border hover:bg-slate-400 font-semibold';
          } else if (isToday) {
            cellStyle = 'fp-selected-bg border-2 fp-border fp-selection-text font-bold hover:bg-[#c2ebe3]';
          } else if (isFuture) {
            cellStyle = 'fp-panel-bg fp-text fp-border hover:bg-[#f0faf8]';
          }

          if (isSelected) {
            cellStyle += ' fp-calendar-selected font-black';
          }

          return (
            <button
              key={`${dateStr}-${index}`}
              type="button"
              disabled={!isCurrentMonth}
              onClick={() => isCurrentMonth && onSelectDate(dateStr)}
              className={`fp-calendar-day min-h-[82px] sm:min-h-[92px] p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative ${cellStyle}`}
              aria-label={`Selecionar dia ${formatDateBR(dateStr)}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-base font-bold ${isSunday && isCurrentMonth ? 'fp-error-text' : ''}`}>
                  {dayNumber}
                </span>

                {isToday && (
                  <span className="text-[10px] fp-selected-bg fp-text font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                    Hoje
                  </span>
                )}
              </div>

              {/* Indicador de Comparecimentos / Sessão */}
              {isCurrentMonth && (
                <div className="mt-1 w-full space-y-1">
                  {totalPresentes > 0 ? (
                    <span className="block text-[11px] font-bold px-1.5 py-0.5 rounded fp-selected-bg fp-text truncate text-center shadow-xs">
                      ✓ {totalPresentes} assinado{totalPresentes > 1 ? 's' : ''}
                    </span>
                  ) : isSunday ? (
                    <span className="block text-[10px] fp-muted italic text-center">
                      Sem escala
                    </span>
                  ) : isPast ? (
                    <span className="block text-[10px] fp-muted text-center font-medium">
                      Encerrado
                    </span>
                  ) : isFuture ? (
                    <span className="block text-[10px] fp-warning-text fp-warning-bg rounded text-center font-medium">
                      🔒 Fechado
                    </span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      </div>
    </div>
  );
};

export default MonthlyAttendanceCalendar;
