import React, { useState } from 'react';
import { ArrowUpCircle, Hammer, Power, Wrench } from 'lucide-react';
import {
  canConstructModule,
  canRepairModule,
  canUpgradeModule,
  computeBaseBalances,
} from '../engine/simulation';
import type { CrewTask, GameState, ModuleId, ModuleState, PowerPriorityMode } from '../engine/types';
import { ModuleStatusLabel, StatusIndicator, TelemetryMeter } from './CommonUI';

/* -------------------------------------------------------------------------- */
/* BASE VIEW (Interactive Schematic + Module Catalog + Power Priority)        */
/* -------------------------------------------------------------------------- */

const CONDUITS: [ModuleId, ModuleId, 'power' | 'tunnel'][] = [
  ['solar_array', 'battery_storage', 'power'],
  ['battery_storage', 'main_habitat', 'power'],
  ['main_habitat', 'life_support', 'tunnel'],
  ['life_support', 'water_facility', 'tunnel'],
  ['main_habitat', 'radiation_shelter', 'tunnel'],
  ['main_habitat', 'medical_module', 'tunnel'],
  ['main_habitat', 'science_lab', 'tunnel'],
  ['science_lab', 'greenhouse', 'tunnel'],
  ['science_lab', 'comms_array', 'power'],
  ['science_lab', 'rover_garage', 'tunnel'],
  ['rover_garage', 'exploration_station', 'power'],
];

function getModuleVisualPalette(mod: ModuleState, selected: boolean) {
  const stroke = selected
    ? '#38BDF8'
    : mod.status === 'operational'
    ? '#10B981'
    : mod.status === 'damaged'
    ? '#F59E0B'
    : mod.status === 'under_construction'
    ? '#0EA5E9'
    : mod.status === 'inactive'
    ? '#64748B'
    : '#334155';

  const fill =
    mod.status === 'operational'
      ? '#0f1d2e'
      : mod.status === 'damaged'
      ? '#261a0b'
      : mod.status === 'under_construction'
      ? '#0c1f33'
      : mod.status === 'inactive'
      ? '#111827'
      : '#080c15';

  return { stroke, fill };
}

export function BaseView({
  state,
  onConstruct,
  onUpgrade,
  onRepair,
  onToggleActive,
  onSetPowerPriority,
}: {
  state: GameState;
  onConstruct: (id: ModuleId) => void;
  onUpgrade: (id: ModuleId) => void;
  onRepair: (id: ModuleId) => void;
  onToggleActive: (id: ModuleId) => void;
  onSetPowerPriority: (mode: PowerPriorityMode) => void;
}) {
  const [subView, setSubView] = useState<'map' | 'catalog'>('map');
  const [selectedId, setSelectedId] = useState<ModuleId>('main_habitat');
  const [filter, setFilter] = useState<'all' | 'unbuilt' | 'built' | 'repair'>('all');

  const balances = computeBaseBalances(state);
  const selected = state.modules.find((m) => m.id === selectedId) || state.modules[0];
  const constructCheck = canConstructModule(state, selected.id);
  const upgradeCheck = canUpgradeModule(state, selected.id);
  const repairCheck = canRepairModule(state, selected.id);
  const canToggle =
    selected.id !== 'main_habitat' &&
    selected.id !== 'life_support' &&
    (selected.status === 'operational' || selected.status === 'inactive');

  const filteredModules = state.modules.filter((m) => {
    if (filter === 'unbuilt') return m.status === 'unbuilt';
    if (filter === 'built') return m.status !== 'unbuilt';
    if (filter === 'repair') return m.status === 'damaged' || m.conditionPct < 85;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Clean Header + Sub-view Switcher + Power Bus Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lunar Base</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Click any module pad to build, repair, upgrade, or learn how it supports your crew.{' '}
            <span className="font-mono text-sky-300">
              {Math.round(state.resources.materials)} Materials available
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#0b111e] p-1">
            <button
              type="button"
              onClick={() => setSubView('map')}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subView === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Outpost Map
            </button>
            <button
              type="button"
              onClick={() => setSubView('catalog')}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subView === 'catalog'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              All Modules (12)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="base-power-priority" className="text-slate-400 whitespace-nowrap">
              Power Mode:
            </label>
            <select
              id="base-power-priority"
              value={state.powerPriority}
              onChange={(e) => onSetPowerPriority(e.target.value as PowerPriorityMode)}
              className="rounded border border-slate-700 bg-[#0b111e] px-2.5 py-1.5 text-xs font-medium text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="balanced">Balanced ({balances.netPowerKw >= 0 ? '+' : ''}{balances.netPowerKw} kW)</option>
              <option value="life_support_first">Life Support First</option>
              <option value="science_push">Science Push (+25% RP)</option>
              <option value="conservation">Conservation (-18% Load)</option>
            </select>
          </div>
        </div>
      </div>

      {subView === 'map' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          {/* Interactive Top-Down Schematic */}
          <div className="min-w-0 rounded border border-slate-800 bg-[#070b14] p-4 xl:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px]">SHACKLETON RIM OUTPOST LAYOUT</span>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-xs bg-emerald-500" /> Online
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-xs bg-amber-500" /> Damaged
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-xs bg-sky-500" /> Building
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-xs border border-slate-600 bg-slate-900" /> Empty Pad
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox="0 0 740 350"
                className="h-auto w-full min-w-[540px]"
                role="img"
                aria-label="Interactive Lunar Base Top-Down Schematic"
              >
                <defs>
                  <pattern id="lunarGrid" width="37" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 37 0 L 0 0 0 35" fill="none" stroke="#111a2c" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="740" height="350" fill="url(#lunarGrid)" />

                <path
                  d="M 0 320 Q 220 280 420 330 T 740 300"
                  fill="none"
                  stroke="#162136"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
                <path
                  d="M 20 35 Q 240 15 500 45 T 730 25"
                  fill="none"
                  stroke="#162136"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {CONDUITS.map(([aId, bId, kind]) => {
                  const a = state.modules.find((m) => m.id === aId);
                  const b = state.modules.find((m) => m.id === bId);
                  if (!a || !b) return null;
                  const bothBuilt = a.status !== 'unbuilt' && b.status !== 'unbuilt';
                  return (
                    <line
                      key={`${aId}-${bId}`}
                      x1={a.svgX}
                      y1={a.svgY}
                      x2={b.svgX}
                      y2={b.svgY}
                      stroke={
                        bothBuilt
                          ? kind === 'power'
                            ? '#0284C7'
                            : '#334155'
                          : '#162033'
                      }
                      strokeWidth={kind === 'tunnel' ? 6 : 2.5}
                      strokeDasharray={bothBuilt ? (kind === 'power' ? '5 4' : undefined) : '3 5'}
                    />
                  );
                })}

                {state.modules.map((mod) => {
                  const isSelected = mod.id === selected.id;
                  const { stroke, fill } = getModuleVisualPalette(mod, isSelected);
                  const w = 114;
                  const h = mod.id === 'main_habitat' ? 54 : 48;
                  const shortLabelMap: Record<ModuleId, string> = {
                    main_habitat: 'Main Habitat',
                    solar_array: 'Solar Array',
                    battery_storage: 'Battery Storage',
                    life_support: 'Life Support',
                    water_facility: 'Water Facility',
                    greenhouse: 'Greenhouse',
                    science_lab: 'Science Lab',
                    medical_module: 'Medical Bay',
                    radiation_shelter: 'Rad Shelter',
                    comms_array: 'Comms Array',
                    rover_garage: 'Rover Garage',
                    exploration_station: 'Equip Station',
                  };

                  return (
                    <g
                      key={mod.id}
                      transform={`translate(${mod.svgX - w / 2}, ${mod.svgY - h / 2})`}
                      onClick={() => setSelectedId(mod.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(mod.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${mod.name} (${mod.status})`}
                      className="cursor-pointer focus:outline-none"
                    >
                      <rect
                        width={w}
                        height={h}
                        rx={mod.id === 'main_habitat' ? 10 : 4}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2.4 : 1.5}
                        strokeDasharray={mod.status === 'unbuilt' ? '4 3' : undefined}
                      />
                      <text
                        x={w / 2}
                        y={16}
                        textAnchor="middle"
                        className="fill-sky-300 font-mono text-[9px] font-semibold"
                      >
                        {mod.shortCode}
                      </text>
                      <text
                        x={w / 2}
                        y={30}
                        textAnchor="middle"
                        className="fill-slate-100 text-[9.5px] font-medium"
                      >
                        {shortLabelMap[mod.id]}
                      </text>
                      <text
                        x={w / 2}
                        y={42}
                        textAnchor="middle"
                        className="fill-slate-400 font-mono text-[8.5px]"
                      >
                        {mod.status === 'unbuilt'
                          ? `BUILD ${mod.buildCostMaterials}M`
                          : mod.status === 'under_construction'
                          ? 'BUILDING'
                          : `LV${mod.level} · ${Math.round(mod.conditionPct)}%`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3">
              {state.modules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                    m.id === selected.id
                      ? 'border-sky-400 bg-sky-950/60 text-white'
                      : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {m.shortCode}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Module Inspector */}
          <div className="min-w-0 flex flex-col justify-between space-y-5 rounded border border-slate-800 bg-[#0b111e] p-5 xl:col-span-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="font-mono text-xs text-sky-400">{selected.category}</div>
                  <h2 className="mt-0.5 text-lg font-bold text-white">{selected.name}</h2>
                </div>
                <ModuleStatusLabel status={selected.status} />
              </div>

              <p className="text-xs leading-relaxed text-slate-300">{selected.description}</p>

              {selected.status !== 'unbuilt' && (
                <div className="space-y-2">
                  <TelemetryMeter label="Condition" value={selected.conditionPct} />
                  <div className="flex justify-between font-mono text-xs text-slate-400">
                    <span>Upgrade Tier</span>
                    <span className="text-white">
                      Level {selected.level} / {selected.maxLevel}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 rounded border border-slate-800 bg-[#070b14] p-3 font-mono text-xs tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">POWER</div>
                  <div className={selected.powerDrawKw < 0 ? 'text-emerald-400' : 'text-slate-200'}>
                    {selected.powerDrawKw < 0
                      ? `+${Math.abs(selected.powerDrawKw)} kW`
                      : `-${selected.powerDrawKw} kW`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">O2 / H2O</div>
                  <div className="text-slate-200">
                    {selected.oxygenDelta >= 0 ? '+' : ''}
                    {selected.oxygenDelta} / {selected.waterDelta >= 0 ? '+' : ''}
                    {selected.waterDelta}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">FOOD / SCIENCE</div>
                  <div className="text-slate-200">
                    +{selected.foodDelta} / +{selected.researchDelta}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">BUILD COST</div>
                  <div className="text-sky-300">{selected.buildCostMaterials} Mat</div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
                <strong className="text-slate-200">How NASA uses this: </strong>
                {selected.scienceNote}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-800 pt-4">
              {selected.status === 'unbuilt' ? (
                <div>
                  <button
                    type="button"
                    disabled={!constructCheck.allowed}
                    onClick={() => onConstruct(selected.id)}
                    className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                  >
                    <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Construct Module ({selected.buildCostMaterials} Materials)</span>
                  </button>
                  {!constructCheck.allowed && constructCheck.reason && (
                    <p className="mt-1.5 text-xs text-amber-400">{constructCheck.reason}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!repairCheck.allowed}
                      onClick={() => onRepair(selected.id)}
                      className="flex items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Wrench className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                      <span>Repair ({selected.status === 'damaged' ? 14 : 8}M)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!upgradeCheck.allowed}
                      onClick={() => onUpgrade(selected.id)}
                      className="flex items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {selected.level >= selected.maxLevel
                          ? 'Max Level'
                          : `Upgrade (${selected.upgradeCostMaterials * selected.level}M)`}
                      </span>
                    </button>
                  </div>

                  {!repairCheck.allowed && repairCheck.reason && selected.conditionPct < 98 && (
                    <p className="text-[11px] text-amber-400">{repairCheck.reason}</p>
                  )}
                  {!upgradeCheck.allowed && upgradeCheck.reason && selected.level < selected.maxLevel && (
                    <p className="text-[11px] text-amber-400">{upgradeCheck.reason}</p>
                  )}

                  {canToggle && (
                    <button
                      type="button"
                      onClick={() => onToggleActive(selected.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-[#070b14] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                    >
                      <Power className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                      <span>
                        {selected.status === 'operational'
                          ? 'Set Module to Standby'
                          : 'Bring Module Online'}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Filterable All-Modules Catalog */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'All (12)'],
                ['unbuilt', 'Unbuilt'],
                ['built', 'Built'],
                ['repair', 'Needs Service'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredModules.length === 0 ? (
            <div className="rounded border border-slate-800 bg-[#0b111e] p-8 text-center text-sm text-slate-400">
              No modules match this filter.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((mod) => {
                const cCheck = canConstructModule(state, mod.id);
                const uCheck = canUpgradeModule(state, mod.id);
                const rCheck = canRepairModule(state, mod.id);

                return (
                  <div
                    key={mod.id}
                    className="flex flex-col justify-between space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-[11px] text-sky-400">{mod.category}</div>
                          <h2 className="text-base font-semibold text-white">{mod.name}</h2>
                        </div>
                        <ModuleStatusLabel status={mod.status} />
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">{mod.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800/80 pt-2.5 font-mono text-[11px] tabular-nums text-slate-300">
                        <span>
                          Power:{' '}
                          {mod.powerDrawKw < 0
                            ? `+${Math.abs(mod.powerDrawKw)} kW`
                            : `-${mod.powerDrawKw} kW`}
                        </span>
                        {mod.oxygenDelta !== 0 && (
                          <span>
                            O2: {mod.oxygenDelta > 0 ? '+' : ''}
                            {mod.oxygenDelta}
                          </span>
                        )}
                        {mod.waterDelta !== 0 && (
                          <span>
                            H2O: {mod.waterDelta > 0 ? '+' : ''}
                            {mod.waterDelta}
                          </span>
                        )}
                        {mod.foodDelta !== 0 && <span>Food: +{mod.foodDelta}</span>}
                        {mod.researchDelta !== 0 && <span>RP: +{mod.researchDelta}</span>}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      {mod.status === 'unbuilt' ? (
                        <>
                          <button
                            type="button"
                            disabled={!cCheck.allowed}
                            onClick={() => onConstruct(mod.id)}
                            className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                          >
                            Build Module ({mod.buildCostMaterials} Materials)
                          </button>
                          {!cCheck.allowed && cCheck.reason && (
                            <p className="text-[11px] text-amber-400">{cCheck.reason}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                            <span>
                              Tier Lv {mod.level}/{mod.maxLevel}
                            </span>
                            <span>Condition {Math.round(mod.conditionPct)}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={!rCheck.allowed}
                              onClick={() => onRepair(mod.id)}
                              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              Repair ({mod.status === 'damaged' ? 14 : 8}M)
                            </button>
                            <button
                              type="button"
                              disabled={!uCheck.allowed}
                              onClick={() => onUpgrade(mod.id)}
                              className="rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-400"
                            >
                              {mod.level >= mod.maxLevel
                                ? 'Max Tier'
                                : `Upgrade (${mod.upgradeCostMaterials * mod.level}M)`}
                            </button>
                          </div>
                          {!rCheck.allowed && rCheck.reason && mod.conditionPct < 98 && (
                            <p className="text-[11px] text-amber-400">{rCheck.reason}</p>
                          )}
                          {!uCheck.allowed && uCheck.reason && mod.level < mod.maxLevel && (
                            <p className="text-[11px] text-amber-400">{uCheck.reason}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CREW VIEW                                                                  */
/* -------------------------------------------------------------------------- */

const ALL_TASKS: CrewTask[] = [
  'Operations',
  'Power & Repairs',
  'Life Support',
  'Agriculture',
  'Research',
  'Exploration',
  'Rest & Recovery',
];

const TASK_EFFECTS: Record<CrewTask, string> = {
  Operations: 'Keeps base routines smooth and gives a small boost to O2 efficiency.',
  'Power & Repairs': 'Improves solar power output and slows daily module wear.',
  'Life Support': 'Boosts Oxygen generation and Water recycling throughput.',
  Agriculture: 'Increases fresh food harvest inside the Greenhouse.',
  Research: 'Generates extra Research Points each Sol.',
  Exploration: 'Prepares rovers and readies this astronaut for surface sorties.',
  'Rest & Recovery': 'Cuts fatigue (-22%), heals Health, and raises Morale (+7%).',
};

export function CrewView({
  state,
  onAssignTask,
}: {
  state: GameState;
  onAssignTask: (crewId: string, task: CrewTask) => void;
}) {
  const avgHealth = Math.round(
    state.crew.reduce((a, c) => a + c.health, 0) / Math.max(1, state.crew.length)
  );
  const avgFatigue = Math.round(
    state.crew.reduce((a, c) => a + c.fatigue, 0) / Math.max(1, state.crew.length)
  );
  const avgMorale = Math.round(
    state.crew.reduce((a, c) => a + c.morale, 0) / Math.max(1, state.crew.length)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Crew Roster ({state.crew.length})</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Match each astronaut to their specialty for a +35% efficiency bonus, or rotate tired
            crew into Rest &amp; Recovery.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 font-mono text-xs tabular-nums">
          <span>
            Avg Health: <strong className="text-emerald-400">{avgHealth}%</strong>
          </span>
          <span>
            Avg Morale: <strong className="text-sky-300">{avgMorale}%</strong>
          </span>
          <span>
            Avg Fatigue:{' '}
            <strong className={avgFatigue >= 65 ? 'text-amber-400' : 'text-slate-200'}>
              {avgFatigue}%
            </strong>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {state.crew.map((member) => {
          const onEva = Boolean(member.onExpeditionId);
          const hasSynergy =
            !onEva &&
            ((member.role === 'Mission Commander' && member.task === 'Operations') ||
              (member.role === 'Engineer' && member.task === 'Power & Repairs') ||
              (member.role === 'Scientist' && member.task === 'Research') ||
              (member.role === 'Medical Officer' &&
                (member.task === 'Life Support' || member.task === 'Rest & Recovery')) ||
              (member.role === 'Robotics Specialist' &&
                (member.task === 'Exploration' || member.task === 'Power & Repairs')) ||
              (member.role === 'Agricultural Specialist' && member.task === 'Agriculture'));

          return (
            <div
              key={member.id}
              className="flex flex-col justify-between space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">{member.name}</h2>
                    <div className="mt-0.5 text-xs text-sky-300">
                      {member.role} · Skill {member.skill}/10
                    </div>
                  </div>
                  {onEva ? (
                    <StatusIndicator status="caution" label="On Surface EVA" />
                  ) : member.fatigue > 75 ? (
                    <StatusIndicator status="warning" label="Needs Rest" />
                  ) : (
                    <StatusIndicator status="nominal" label="Ready" />
                  )}
                </div>

                <div className="mt-4 space-y-2.5">
                  <TelemetryMeter label="Health" value={member.health} />
                  <TelemetryMeter label="Morale" value={member.morale} />
                  <TelemetryMeter
                    label="Fatigue (Lower is Better)"
                    value={member.fatigue}
                    invertWarning
                    warningThreshold={60}
                    criticalThreshold={80}
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <label
                  htmlFor={`crew-task-${member.id}`}
                  className="block text-xs font-medium text-slate-300"
                >
                  Assigned Duty
                </label>
                <select
                  id={`crew-task-${member.id}`}
                  disabled={onEva}
                  value={member.task}
                  onChange={(e) => onAssignTask(member.id, e.target.value as CrewTask)}
                  className="mt-1.5 w-full rounded border border-slate-700 bg-[#070b14] px-3 py-2 text-xs text-white disabled:opacity-60"
                >
                  {ALL_TASKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {onEva
                    ? 'Currently out exploring the lunar surface.'
                    : TASK_EFFECTS[member.task]}
                </p>
                {hasSynergy && (
                  <div className="mt-1 font-mono text-[10px] text-emerald-400">
                    ★ Role Match (+35% task effectiveness)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
