import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { fetchAiAdvisorReport, generateDeterministicAdvice } from '../engine/advisor';
import type { AdvisorReport } from '../engine/advisor';
import { SCENARIOS } from '../engine/data';
import { calculateMissionScore, evaluateFinalReport } from '../engine/simulation';
import {
  deleteSaveSlot,
  listCampaignHistory,
  listSaveSlots,
  saveToSlot,
  validateGameState,
} from '../engine/storage';
import type { SaveSlotRecord } from '../engine/storage';
import type { GameState, LogCategory, SavedCampaignMeta, ScreenId } from '../engine/types';
import { ConfirmModal, MultiLineChart, StatusIndicator, TelemetryMeter } from './CommonUI';
import type { HubTabId } from './ShellLayout';

const LOG_CATEGORIES: ('All' | LogCategory)[] = [
  'All',
  'Action',
  'Resource',
  'Construction',
  'Event',
  'Science',
  'Objective',
  'Warning',
];

export function OperationsHubModal({
  open,
  activeTab,
  state,
  onSelectTab,
  onClose,
  onNavigateLegacyScreen,
  onOpenReport,
  onToggleAutoSave,
  onLoadState,
  onResetCampaign,
  onNewCampaignSetup,
  onNotify,
}: {
  open: boolean;
  activeTab: HubTabId;
  state: GameState;
  onSelectTab: (tab: HubTabId) => void;
  onClose: () => void;
  onNavigateLegacyScreen: (screen: ScreenId) => void;
  onOpenReport: () => void;
  onToggleAutoSave: () => void;
  onLoadState: (loaded: GameState) => void;
  onResetCampaign: () => void;
  onNewCampaignSetup: () => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  // Advisor state
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState<AdvisorReport>(() => generateDeterministicAdvice(state));
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Logs state
  const [logCategory, setLogCategory] = useState<'All' | LogCategory>('All');
  const [solFilter, setSolFilter] = useState<'all' | number>('all');

  // Saves state
  const [slots, setSlots] = useState<SaveSlotRecord[]>(() => listSaveSlots());
  const [history] = useState<SavedCampaignMeta[]>(() => listCampaignHistory());
  const [slotName, setSlotName] = useState(`slot-${state.config.scenario}-s${state.sol}`);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'new' | null>(null);

  useEffect(() => {
    setReport(generateDeterministicAdvice(state));
    setSlotName(`slot-${state.config.scenario}-s${state.sol}`);
  }, [state.sol, state.events.length, state.modules, state.config.scenario]);

  useEffect(() => {
    if (open) setSlots(listSaveSlots());
  }, [open]);

  if (!open) return null;

  const handleRequestAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdvisorLoading(true);
    const res = await fetchAiAdvisorReport(state, question.trim() || undefined);
    setReport(res);
    setAdvisorLoading(false);
  };

  const score = calculateMissionScore(state);
  const xLabels = state.history.map((h) => `S${h.sol}`);
  const builtModules = state.modules.filter((m) => m.status !== 'unbuilt');
  const operationalCount = state.modules.filter((m) => m.status === 'operational').length;

  const sols = Array.from(new Set(state.logs.map((l) => l.sol))).sort((a, b) => b - a);
  const filteredLogs = state.logs.filter((l) => {
    if (logCategory !== 'All' && l.category !== logCategory) return false;
    if (solFilter !== 'all' && l.sol !== solFilter) return false;
    return true;
  });

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const id = slotName.trim() || `save-${Date.now()}`;
    const updated = saveToSlot(state, id);
    setSlots(updated);
    onNotify('success', `Saved campaign to slot "${id}".`);
  };

  const handleExportSave = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outpost-commander-save-sol-${state.sol}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSave = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!validateGameState(parsed)) {
        onNotify('error', 'Invalid save file format. Campaign state was not modified.');
        return;
      }
      onLoadState(parsed);
      onClose();
      onNotify('success', `Loaded "${parsed.config.missionName}" (Sol ${parsed.sol}).`);
    } catch {
      onNotify('error', 'Could not parse JSON save file.');
    } finally {
      e.target.value = '';
    }
  };

  const tabs: { id: HubTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'advisor', label: 'AI Advisor', icon: <Bot className="h-3.5 w-3.5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: 'logs', label: 'Mission Logs', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'settings', label: 'Saves & Settings', icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Mission Operations Hub"
    >
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-slate-700 bg-[#060911] shadow-2xl">
        {/* Modal Header + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#080d18] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReport();
              }}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-slate-800 whitespace-nowrap"
            >
              Mission Report
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mission Hub"
            className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'advisor' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Mission AI Advisor</h2>
                  <p className="text-xs text-slate-400">{report.advisoryNotice}</p>
                </div>
                <button
                  type="button"
                  disabled={advisorLoading}
                  onClick={() => handleRequestAi()}
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap"
                >
                  {advisorLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{advisorLoading ? 'Analyzing...' : 'Generate AI Briefing'}</span>
                </button>
              </div>

              <form
                onSubmit={handleRequestAi}
                className="flex flex-col gap-3 rounded border border-slate-800 bg-[#0b111e] p-4 sm:flex-row"
              >
                <label htmlFor="advisor-question" className="sr-only">
                  Ask Mission Advisor a question
                </label>
                <input
                  id="advisor-question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about power margins, next module priority, or expedition readiness..."
                  className="flex-1 rounded border border-slate-700 bg-[#070b14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={advisorLoading}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
                >
                  <Send className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>Consult Advisor</span>
                </button>
              </form>

              <div className="rounded border border-slate-800 bg-[#0b111e] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Bot className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <span>Outpost Risk Assessment</span>
                  </div>
                  <StatusIndicator
                    status={
                      report.riskLevel === 'CRITICAL'
                        ? 'critical'
                        : report.riskLevel === 'HIGH'
                        ? 'warning'
                        : report.riskLevel === 'ELEVATED'
                        ? 'caution'
                        : 'nominal'
                    }
                    label={`Risk: ${report.riskLevel}`}
                  />
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{report.situationSummary}</p>
                <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <strong className="text-sky-300">Engineering Context: </strong>
                  {report.scienceNote}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {report.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between space-y-3 rounded border border-slate-800 bg-[#0b111e] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            rec.priority === 'URGENT'
                              ? 'text-rose-400'
                              : rec.priority === 'HIGH'
                              ? 'text-amber-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {rec.priority} PRIORITY
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {rec.suggestedSection}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-white">{rec.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        {rec.rationale}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateLegacyScreen(rec.targetScreen);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 self-start font-mono text-xs text-sky-400 hover:text-sky-300"
                    >
                      <span>Open {rec.suggestedSection}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Mission Analytics</h2>
                  <p className="text-xs text-slate-400">
                    {state.history.length} Sol snapshot(s) · Illustrative performance scoring
                  </p>
                </div>
                <div className="font-mono text-sm tabular-nums text-white">
                  Performance Score: <strong className="text-sky-300">{score.totalScore} / 100</strong>
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#0b111e] p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <TelemetryMeter label="Crew Safety (30%)" value={score.crewSafetyScore} />
                  <TelemetryMeter
                    label="Sustainability (25%)"
                    value={score.resourceSustainabilityScore}
                  />
                  <TelemetryMeter
                    label="Infrastructure (20%)"
                    value={score.infrastructureReliabilityScore}
                  />
                  <TelemetryMeter label="Science (15%)" value={score.scientificProgressScore} />
                  <TelemetryMeter label="Goals (10%)" value={score.objectiveCompletionScore} />
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 font-mono text-xs tabular-nums sm:grid-cols-4">
                  <div>
                    <span className="text-slate-400">Operational Modules: </span>
                    <strong className="text-white">
                      {operationalCount}/{builtModules.length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Tech Unlocked: </span>
                    <strong className="text-sky-300">
                      {state.research.filter((r) => r.unlocked).length}/{state.research.length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Events Handled: </span>
                    <strong className="text-white">
                      {state.events.filter((e) => e.resolved).length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Discoveries: </span>
                    <strong className="text-emerald-400">{state.discoveries.length}</strong>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <MultiLineChart
                  title="Power Generation vs. Load"
                  subtitle="Solar kW output compared against outpost demand"
                  xLabels={xLabels}
                  unit=" kW"
                  maxY={Math.max(
                    60,
                    ...state.history.flatMap((h) => [
                      Math.ceil(h.powerGeneration / 10) * 10 + 10,
                      Math.ceil(h.powerDemand / 10) * 10 + 10,
                    ])
                  )}
                  series={[
                    {
                      label: 'Generation',
                      color: '#10B981',
                      values: state.history.map((h) => h.powerGeneration),
                    },
                    {
                      label: 'Demand',
                      color: '#F59E0B',
                      values: state.history.map((h) => h.powerDemand),
                    },
                  ]}
                />
                <MultiLineChart
                  title="Life Support & Battery Trends"
                  subtitle="Percentage reserves across completed Sols"
                  xLabels={xLabels}
                  unit="%"
                  series={[
                    { label: 'O2', color: '#38BDF8', values: state.history.map((h) => h.oxygenPct) },
                    { label: 'H2O', color: '#22D3EE', values: state.history.map((h) => h.waterPct) },
                    { label: 'Food', color: '#10B981', values: state.history.map((h) => h.foodPct) },
                    { label: 'Battery', color: '#F59E0B', values: state.history.map((h) => h.batteryPct) },
                  ]}
                />
                <MultiLineChart
                  title="Crew Health, Morale & Fatigue"
                  subtitle="Average astronaut wellbeing indicators"
                  xLabels={xLabels}
                  unit="%"
                  series={[
                    { label: 'Health', color: '#10B981', values: state.history.map((h) => h.avgHealth) },
                    { label: 'Morale', color: '#38BDF8', values: state.history.map((h) => h.avgMorale) },
                    { label: 'Fatigue', color: '#F43F5E', values: state.history.map((h) => h.avgFatigue) },
                  ]}
                />
                <MultiLineChart
                  title="Equipment Reliability & Science"
                  subtitle="Average module condition % and Research Points"
                  xLabels={xLabels}
                  maxY={Math.max(100, ...state.history.map((h) => h.researchPoints))}
                  series={[
                    {
                      label: 'Equip Condition %',
                      color: '#38BDF8',
                      values: state.history.map((h) => h.equipmentAvgPct),
                    },
                    {
                      label: 'Research Pts',
                      color: '#A855F7',
                      values: state.history.map((h) => h.researchPoints),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Mission Logs</h2>
                  <p className="text-xs text-slate-400">{state.logs.length} journal entries</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="hub-log-sol-filter" className="text-slate-400">
                    Filter Sol:
                  </label>
                  <select
                    id="hub-log-sol-filter"
                    value={solFilter}
                    onChange={(e) =>
                      setSolFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className="rounded border border-slate-700 bg-[#0b111e] px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Sols</option>
                    {sols.map((s) => (
                      <option key={s} value={s}>
                        Sol {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {LOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLogCategory(cat)}
                    className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      logCategory === cat
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredLogs.length === 0 ? (
                <div className="rounded border border-slate-800 bg-[#0b111e] p-6 text-sm text-slate-400">
                  No mission log entries match the selected filters.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded border border-slate-800 bg-[#0b111e]">
                  {filteredLogs.map((entry) => (
                    <div key={entry.id} className="space-y-0.5 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-sky-400">SOL {entry.sol}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          · {entry.category} ·
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            entry.severity === 'critical'
                              ? 'text-rose-400'
                              : entry.severity === 'warning'
                              ? 'text-amber-300'
                              : entry.severity === 'success'
                              ? 'text-emerald-300'
                              : 'text-white'
                          }`}
                        >
                          {entry.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Saves &amp; Settings</h2>
                <p className="text-xs text-slate-400">
                  Manage LocalStorage saves, export or import JSON backups, or start a new mission.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5">
                  <h3 className="text-sm font-semibold text-white">Auto-Save &amp; Backups</h3>
                  <label className="flex cursor-pointer items-center justify-between rounded border border-slate-800 bg-[#070b14] p-3">
                    <div>
                      <div className="text-sm font-medium text-white">Automatic Campaign Auto-Save</div>
                      <div className="text-xs text-slate-400">
                        Save to browser LocalStorage after every action and Sol.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.autoSaveEnabled}
                      onChange={onToggleAutoSave}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleExportSave}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                      <span>Export Save JSON</span>
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800">
                      <Upload className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                      <span>Import Save JSON</span>
                      <input
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportSave}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5">
                  <h3 className="text-sm font-semibold text-white">Mission Controls</h3>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Restart {SCENARIOS[state.config.scenario].title} from Sol 1, or return to Mission
                    Setup to pick a different scenario.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmAction('reset')}
                      className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-950/60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Reset Campaign</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('new')}
                      className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      New Mission Setup
                    </button>
                  </div>
                </div>
              </div>

              {/* Manual Save Slots */}
              <div className="space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5">
                <h3 className="text-sm font-semibold text-white">Manual Save Slots</h3>
                <form onSubmit={handleSaveSlot} className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="hub-save-slot-name" className="sr-only">
                    Save slot name
                  </label>
                  <input
                    id="hub-save-slot-name"
                    type="text"
                    value={slotName}
                    onChange={(e) => setSlotName(e.target.value)}
                    maxLength={40}
                    placeholder="Enter save label..."
                    className="flex-1 rounded border border-slate-700 bg-[#070b14] px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Save to Slot</span>
                  </button>
                </form>

                {slots.length === 0 ? (
                  <p className="text-xs text-slate-400">No manual save slots stored yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800 rounded border border-slate-800 bg-[#070b14]">
                    {slots.map((slot) => (
                      <div
                        key={slot.meta.slotId}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {slot.meta.slotId} — {slot.meta.missionName}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {SCENARIOS[slot.meta.scenario].title} · Sol {slot.meta.sol}/
                            {slot.meta.targetSols} · Score {slot.meta.score}/100
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadState(slot.state);
                              onClose();
                              onNotify('success', `Loaded slot "${slot.meta.slotId}".`);
                            }}
                            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 font-medium text-sky-300 hover:bg-slate-800"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSlots(deleteSaveSlot(slot.meta.slotId));
                              onNotify('info', `Deleted save slot "${slot.meta.slotId}".`);
                            }}
                            aria-label={`Delete save slot ${slot.meta.slotId}`}
                            className="rounded border border-slate-800 p-1.5 text-slate-400 hover:border-rose-500/40 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign History */}
              <div className="min-w-0 space-y-3 rounded border border-slate-800 bg-[#0b111e] p-5">
                <h3 className="text-sm font-semibold text-white">Campaign History Archive</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Completed or interrupted campaigns appear here automatically.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 font-mono text-[11px] text-slate-400">
                        <tr>
                          <th className="py-2 pr-4">Mission</th>
                          <th className="py-2 pr-4">Scenario</th>
                          <th className="py-2 pr-4">Difficulty</th>
                          <th className="py-2 pr-4">Sols</th>
                          <th className="py-2 pr-4">Score</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {history.map((h) => (
                          <tr key={h.campaignId}>
                            <td className="py-2.5 pr-4 font-medium text-white">{h.missionName}</td>
                            <td className="py-2.5 pr-4 text-slate-300">
                              {SCENARIOS[h.scenario].title}
                            </td>
                            <td className="py-2.5 pr-4 capitalize text-slate-300">{h.difficulty}</td>
                            <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-200">
                              {h.sol}/{h.targetSols}
                            </td>
                            <td className="py-2.5 pr-4 font-mono tabular-nums text-sky-300">
                              {h.score}/100
                            </td>
                            <td
                              className={`py-2.5 font-mono uppercase ${
                                h.campaignStatus === 'interrupted'
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {h.campaignStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction === 'reset' ? 'Reset Current Campaign?' : 'Start a New Mission?'}
        message={
          confirmAction === 'reset'
            ? 'This will discard your current Sol progress and restart this scenario from Sol 1.'
            : 'Unsaved progress in the current campaign will be replaced once you launch a new mission.'
        }
        confirmLabel={confirmAction === 'reset' ? 'Reset to Sol 1' : 'Go to Mission Setup'}
        danger={confirmAction === 'reset'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          onClose();
          if (action === 'reset') onResetCampaign();
          else if (action === 'new') onNewCampaignSetup();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FINAL MISSION REPORT OVERLAY VIEW                                          */
/* -------------------------------------------------------------------------- */

export function FinalReportView({
  open,
  state,
  onClose,
  onContinueEndless,
  onReplayMission,
}: {
  open: boolean;
  state: GameState;
  onClose: () => void;
  onContinueEndless: () => void;
  onReplayMission: () => void;
}) {
  if (!open) return null;

  const analysis = evaluateFinalReport(state);
  const scenario = SCENARIOS[state.config.scenario];
  const batteryPct = Math.round(
    (state.resources.batteryKwh / Math.max(1, state.resources.batteryCapacityKwh)) * 100
  );
  const avgHealth = Math.round(
    state.crew.reduce((a, c) => a + c.health, 0) / Math.max(1, state.crew.length)
  );
  const avgMorale = Math.round(
    state.crew.reduce((a, c) => a + c.morale, 0) / Math.max(1, state.crew.length)
  );

  const exportReportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      missionName: state.config.missionName,
      commanderName: state.config.commanderName,
      scenario: scenario.title,
      difficulty: state.config.difficulty,
      campaignStatus: state.campaignStatus,
      analysis,
      objectives: state.objectives,
      discoveries: state.discoveries,
      finalResources: state.resources,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outpost-commander-report-sol-${analysis.solsCompleted}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Final Mission Report"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-slate-700 bg-[#060911] shadow-2xl">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#080d18] px-4 py-3 sm:px-6">
          <div>
            <div className="font-mono text-xs text-sky-400">
              {state.campaignStatus === 'active'
                ? `Score Projection · Sol ${state.sol} of ${state.targetSols}`
                : 'Campaign Complete · Official Mission Debrief'}
            </div>
            <h2 className="text-lg font-bold text-white">Final Mission Report</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportReportJson}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Print</span>
            </button>
            {state.campaignStatus === 'completed' && (
              <button
                type="button"
                onClick={onContinueEndless}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
              >
                Continue Endless Ops
              </button>
            )}
            <button
              type="button"
              onClick={onReplayMission}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Replay Mission</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Final Report"
              className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Outcome Banner */}
          <div className="rounded border border-slate-700 bg-[#0c1322] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-sky-400">
                  {state.config.missionName} · {state.config.commanderName} · {scenario.title}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                  {analysis.score.outcomeTier}
                </h3>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-xs text-slate-400">MISSION SCORE</div>
                <div className="text-3xl font-bold text-sky-300">
                  {analysis.score.totalScore}/100
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {analysis.outcomeExplanation}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-slate-800 bg-[#0b111e] p-4 font-mono text-xs tabular-nums">
              <div className="text-slate-400">DAYS COMPLETED</div>
              <div className="mt-1 text-xl font-bold text-white">
                {analysis.daysCompleted || analysis.solsCompleted} / {state.targetDays || state.targetSols}
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-[#0b111e] p-4 font-mono text-xs tabular-nums">
              <div className="text-slate-400">CREW HEALTH / MORALE</div>
              <div className="mt-1 text-xl font-bold text-emerald-400">
                {avgHealth}% / {avgMorale}%
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-[#0b111e] p-4 font-mono text-xs tabular-nums">
              <div className="text-slate-400">REMAINING RESERVES</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                O2 {Math.round(state.resources.oxygenPct)}% · H2O{' '}
                {Math.round(state.resources.waterPct)}% · BAT {batteryPct}%
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-[#0b111e] p-4 font-mono text-xs tabular-nums">
              <div className="text-slate-400">SCIENCE &amp; GOALS</div>
              <div className="mt-1 text-sm font-semibold text-sky-300">
                {state.discoveries.length} Discoveries ·{' '}
                {state.objectives.filter((o) => o.completed).length}/{state.objectives.length}{' '}
                Goals
              </div>
            </div>
          </div>

          {/* Junior Astronaut Cadet Certification (for Cadet Mode) */}
          {(state.trainingMode === 'cadet' || (state.cadetBadges && state.cadetBadges.length > 0)) && (
            <div className="rounded border border-amber-400/50 bg-[#0d1627] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  <h4 className="text-base font-bold text-white">
                    Junior Astronaut Training Certification · NASA Space Apps Challenge 2026
                  </h4>
                </div>
                <span className="font-mono text-xs text-amber-300">
                  {state.cadetBadges?.length || 0}/4 Badges Unlocked
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">
                This certifies that Commander <strong className="text-white">{state.config.commanderName}</strong> has completed the Artemis Junior Astronaut mission training track covering south-pole solar ridge micro-siting, closed-loop ECLSS life support, lunar regolith radiation shielding, and permanently shadowed crater ice extraction.
              </p>
              {state.cadetBadges && state.cadetBadges.length > 0 ? (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                  {state.cadetBadges.map((badgeStr, i) => (
                    <div
                      key={i}
                      className="rounded border border-amber-500/30 bg-[#080d18] p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-label={badgeStr}>
                          🏅
                        </span>
                        <div className="text-xs font-bold text-white">{badgeStr}</div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">Junior Astronaut Training Milestone</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Complete Cadet Checkpoints during mission turns to earn specialized badges and achieve Master Cadet certification.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border border-slate-800 bg-[#0b111e] p-5">
              <h4 className="text-sm font-semibold text-emerald-400">Best Decisions</h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                {analysis.bestDecisions.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-800 bg-[#0b111e] p-5">
              <h4 className="text-sm font-semibold text-amber-400">Major Challenges</h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                {analysis.majorChallenges.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-800 bg-[#0b111e] p-5">
              <h4 className="text-sm font-semibold text-sky-400">Lessons Learned</h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                {analysis.mistakesAndLessons.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
