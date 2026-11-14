import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Info, X, XCircle } from 'lucide-react';
import type { ModuleStatus } from '../engine/types';

export function StatusIndicator({
  status,
  label,
}: {
  status: 'nominal' | 'caution' | 'warning' | 'critical' | 'inactive';
  label: string;
}) {
  const styles: Record<typeof status, string> = {
    nominal: 'text-emerald-400',
    caution: 'text-sky-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400',
    inactive: 'text-slate-400',
  };
  const glyph: Record<typeof status, string> = {
    nominal: '●',
    caution: '◆',
    warning: '▲',
    critical: '✖',
    inactive: '○',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${styles[status]}`}>
      <span aria-hidden="true">{glyph[status]}</span>
      <span>{label}</span>
    </span>
  );
}

export function ModuleStatusLabel({ status }: { status: ModuleStatus }) {
  switch (status) {
    case 'operational':
      return <StatusIndicator status="nominal" label="Online" />;
    case 'damaged':
      return <StatusIndicator status="warning" label="Damaged" />;
    case 'under_construction':
      return <StatusIndicator status="caution" label="Building" />;
    case 'inactive':
      return <StatusIndicator status="inactive" label="Standby" />;
    case 'unbuilt':
      return <StatusIndicator status="inactive" label="Not Built" />;
  }
}

export function TelemetryMeter({
  label,
  value,
  max = 100,
  unit = '%',
  warningThreshold = 40,
  criticalThreshold = 25,
  invertWarning = false,
  deltaText,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  invertWarning?: boolean;
  deltaText?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const isCritical = invertWarning ? value >= criticalThreshold : value <= criticalThreshold;
  const isWarning = invertWarning ? value >= warningThreshold : value <= warningThreshold;

  const barColor = isCritical
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-sky-500';
  const textColor = isCritical
    ? 'text-rose-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-slate-100';

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-slate-300">{label}</span>
        <div className="flex items-baseline gap-2 shrink-0 whitespace-nowrap">
          {deltaText && (
            <span className="font-mono text-[11px] tabular-nums text-slate-400">{deltaText}</span>
          )}
          <span className={`font-mono text-sm font-semibold tabular-nums ${textColor}`}>
            {Math.round(value)}
            <span className="ml-0.5 text-[11px] font-normal text-slate-400">{unit}</span>
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SciTooltip({ term, explanation }: { term: string; explanation: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 border-b border-dotted border-sky-400/60 text-sky-300 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        aria-expanded={open}
        aria-label={`Explain scientific term: ${term}`}
      >
        <span>{term}</span>
        <HelpCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <span
          role="note"
          className="absolute top-full left-0 sm:left-auto sm:right-0 z-40 mt-2 w-72 max-w-[85vw] rounded border border-slate-700 bg-[#0d1424] p-3 text-xs leading-relaxed text-slate-200 shadow-xl"
        >
          <span className="mb-1 flex items-center justify-between font-semibold text-sky-300">
            <span>{term}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white"
              aria-label={`Close ${term} tooltip`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="block font-normal">{explanation}</span>
        </span>
      )}
    </span>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-md border border-slate-700 bg-[#0b111e] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? 'text-rose-400' : 'text-amber-400'}`}
            aria-hidden="true"
          />
          <div>
            <h2 id="confirm-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-sm font-semibold text-white whitespace-nowrap ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TutorialModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const steps = [
    {
      title: 'Watch Your 5 Outpost Vitals',
      body: 'Power, Oxygen, Water, Food, and Crew Safety keep your outpost alive. Click any vital at the top of the screen anytime to see what affects it and how real lunar habitats work.',
    },
    {
      title: 'Respond to Events & Pick Your Actions',
      body: 'Each turn is one Lunar Sol. On the MISSION tab, resolve any urgent story event first, then pick up to 3 outpost actions. You always see what resources an action will use or gain before advancing.',
    },
    {
      title: 'Build, Assign Crew & Explore the South Pole',
      body: 'Use BASE to construct modules like the Greenhouse or Rover Garage, CREW to match astronauts with roles for a +35% bonus, EXPLORE to gather crater water ice and unlock research, and SCIENCE to inspect real NASA missions.',
    },
  ];

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div className="w-full max-w-lg rounded-md border border-slate-700 bg-[#0b111e] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sky-400">
            <Info className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono text-xs text-sky-300">
              How to Command · Step {step + 1} of {steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 id="tutorial-modal-title" className="mt-4 text-xl font-semibold text-white">
          {current.title}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{current.body}</p>

        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                aria-label={`Go to tutorial step ${idx + 1}`}
                className={`h-2 w-7 rounded-sm transition-colors ${
                  idx === step ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Start Commanding
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedbackToast({
  feedback,
  onDismiss,
}: {
  feedback: { type: 'success' | 'error' | 'info'; message: string } | null;
  onDismiss: () => void;
}) {
  if (!feedback) return null;
  const styles =
    feedback.type === 'error'
      ? 'border-rose-500/50 bg-rose-950/95 text-rose-100'
      : feedback.type === 'success'
      ? 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100'
      : 'border-sky-500/50 bg-slate-900/95 text-slate-100';

  return (
    <div
      role="status"
      className={`no-print fixed top-16 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-2.5 rounded border px-4 py-2.5 text-xs shadow-2xl ${styles}`}
    >
      {feedback.type === 'error' ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
      ) : feedback.type === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
      )}
      <span className="flex-1 leading-snug">{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

export function MultiLineChart({
  title,
  subtitle,
  xLabels,
  series,
  unit = '',
  minY = 0,
  maxY = 100,
}: {
  title: string;
  subtitle?: string;
  xLabels: string[];
  series: ChartSeries[];
  unit?: string;
  minY?: number;
  maxY?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 560;
  const height = 210;
  const padL = 42;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const count = Math.max(1, xLabels.length);

  const getX = (i: number) =>
    count === 1 ? padL + plotW / 2 : padL + (i / (count - 1)) * plotW;
  const getY = (val: number) => {
    const ratio = (val - minY) / Math.max(1, maxY - minY);
    return padT + plotH - Math.max(0, Math.min(1, ratio)) * plotH;
  };

  const yTicks = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <div className="min-w-0 rounded border border-slate-800 bg-[#0b111e] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="inline-block h-2 w-3 rounded-xs" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-52 w-full min-w-[340px]"
          role="img"
          aria-label={title}
        >
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {tick}
                  {unit}
                </text>
              </g>
            );
          })}

          {xLabels.map((lbl, idx) => (
            <text
              key={lbl + idx}
              x={getX(idx)}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400 font-mono text-[10px]"
            >
              {lbl}
            </text>
          ))}

          {series.map((s) => {
            if (s.values.length === 0) return null;
            const points = s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
            return (
              <g key={s.label}>
                {s.values.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                  />
                )}
                {s.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(v)}
                    r={hoverIdx === i ? 4.5 : 3}
                    fill={s.color}
                    stroke="#060911"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

          {hoverIdx !== null && (
            <line
              x1={getX(hoverIdx)}
              y1={padT}
              x2={getX(hoverIdx)}
              y2={padT + plotH}
              stroke="#475569"
              strokeWidth="1"
            />
          )}

          {xLabels.map((_, idx) => {
            const stepW = count === 1 ? plotW : plotW / (count - 1);
            const x1 = Math.max(padL, getX(idx) - stepW / 2);
            const x2 = Math.min(width - padR, getX(idx) + stepW / 2);
            return (
              <rect
                key={idx}
                x={x1}
                y={padT}
                width={Math.max(1, x2 - x1)}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      {hoverIdx !== null && xLabels[hoverIdx] && (
        <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-2 font-mono text-xs tabular-nums text-slate-300">
          <span className="font-semibold text-white">{xLabels[hoverIdx]}</span>
          {series.map((s) => (
            <span key={s.label}>
              <span style={{ color: s.color }}>{s.label}:</span>{' '}
              {s.values[hoverIdx] !== undefined ? `${Math.round(s.values[hoverIdx])}${unit}` : '—'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
