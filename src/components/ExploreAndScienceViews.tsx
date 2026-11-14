import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  FlaskConical,
  Image as ImageIcon,
  Lock,
  Navigation,
  Radio,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { NASA_SCIENCE_TOPICS, SIMULATION_DISCLAIMER } from '../engine/data';
import { canLaunchExpedition, canUnlockResearch } from '../engine/simulation';
import type { GameState } from '../engine/types';
import { StatusIndicator } from './CommonUI';
import lunarMapImg from '../assets/images/lunar_surface_map_bg_1794669957916.jpg';

/* -------------------------------------------------------------------------- */
/* EXPLORE VIEW (Surface Expeditions + Research Lab)                          */
/* -------------------------------------------------------------------------- */

export function ExploreView({
  state,
  initialSubTab = 'expeditions',
  onLaunchExpedition,
  onUnlockResearch,
}: {
  state: GameState;
  initialSubTab?: 'expeditions' | 'research';
  onLaunchExpedition: (siteId: string, crewIds: string[]) => void;
  onUnlockResearch: (researchId: string) => void;
}) {
  const [subTab, setSubTab] = useState<'expeditions' | 'research'>(initialSubTab);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(state.sites[0].id);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [mapImgError, setMapImgError] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const selectedSite = state.sites.find((s) => s.id === selectedSiteId) || state.sites[0];
  const roverMod = state.modules.find((m) => m.id === 'rover_garage');
  const availableCrew = state.crew.filter((c) => !c.onExpeditionId);
  const unlockedCount = state.research.filter((r) => r.unlocked).length;

  const toggleCrew = (id: string) => {
    setSelectedCrewIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const launchCheck = canLaunchExpedition(state, selectedSite.id, selectedCrewIds);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore &amp; Research</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Send rover teams to south-pole craters for water ice and science, then spend Research
            Points on lunar technology.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#0b111e] p-1">
            <button
              type="button"
              onClick={() => setSubTab('expeditions')}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'expeditions'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Surface Expeditions
            </button>
            <button
              type="button"
              onClick={() => setSubTab('research')}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'research'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Research Lab ({unlockedCount}/{state.research.length})
            </button>
          </div>
          <div className="font-mono text-xs tabular-nums text-sky-300">
            <strong>{Math.round(state.resources.researchPoints)} RP</strong> ·{' '}
            {state.discoveries.length} Discoveries
          </div>
        </div>
      </div>

      {subTab === 'expeditions' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          {/* Interactive South Pole Map */}
          <div className="min-w-0 space-y-4 rounded border border-slate-800 bg-[#0b111e] p-4 xl:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
              <span>SHACKLETON CRATER SECTOR · CLICK SITE TO PLAN SORTIE</span>
              <span>
                Rover:{' '}
                {roverMod?.status === 'operational' || roverMod?.status === 'damaged'
                  ? `${Math.round(roverMod.conditionPct)}%`
                  : 'Garage Needed'}{' '}
                · Comms {Math.round(state.resources.commsQualityPct)}%
              </span>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded border border-slate-800 bg-[#050810]">
              {!mapImgError ? (
                <img
                  src={lunarMapImg}
                  alt="Top-down lunar south pole crater terrain around Shackleton Crater"
                  referrerPolicy="no-referrer"
                  onError={() => setMapImgError(true)}
                  className="h-full w-full object-cover opacity-75"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_50%_40%,#1e293b_0%,#050810_80%)]" />
              )}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {state.sites.map((site) => {
                  if (site.id === 'site-landing') return null;
                  const activeRoute = site.id === selectedSite.id;
                  return (
                    <line
                      key={site.id}
                      x1={48}
                      y1={50}
                      x2={site.mapX}
                      y2={site.mapY}
                      stroke={activeRoute ? '#38BDF8' : '#94A3B8'}
                      strokeOpacity={activeRoute ? 0.95 : 0.45}
                      strokeWidth={activeRoute ? 0.8 : 0.45}
                      strokeDasharray="1.5 1.2"
                    />
                  );
                })}
              </svg>

              {state.sites.map((site) => {
                const isSelected = site.id === selectedSite.id;
                const isActive = state.activeExpeditions.some((e) => e.siteId === site.id);
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setSelectedSiteId(site.id)}
                    style={{ left: `${site.mapX}%`, top: `${site.mapY}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-1 font-mono text-[10px] font-semibold transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'z-20 border-sky-300 bg-blue-600 text-white shadow-lg'
                        : isActive
                        ? 'z-10 border-amber-400 bg-amber-950/90 text-amber-200'
                        : 'border-slate-600 bg-slate-950/85 text-slate-200 hover:border-sky-400'
                    }`}
                  >
                    {site.sectorCode} · {site.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded border border-slate-800 bg-[#070b14] p-3.5">
                <h2 className="text-xs font-semibold text-slate-200">Active Rover Teams</h2>
                {state.activeExpeditions.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No rover sorties currently outside base.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {state.activeExpeditions.map((exp) => (
                      <li key={exp.id} className="text-xs text-sky-200">
                        <span className="font-semibold">{exp.siteName}</span> —{' '}
                        <span className="font-mono">{exp.solsRemaining} Sol(s) left</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border border-slate-800 bg-[#070b14] p-3.5">
                <h2 className="text-xs font-semibold text-slate-200">Recent Discoveries</h2>
                {state.discoveries.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Complete expeditions to log water-ice and geology findings.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-xs text-emerald-300">
                    {state.discoveries.slice(0, 3).map((d, i) => (
                      <li key={i} className="leading-snug">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Site Details & Crew Launch Planner */}
          <div className="min-w-0 flex flex-col justify-between space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5 xl:col-span-5">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-sky-400">
                    {selectedSite.sectorCode} · {selectedSite.terrainType}
                  </span>
                  <span className="text-slate-300">
                    {selectedSite.distanceKm} km ·{' '}
                    {selectedSite.completedCount > 0
                      ? `Surveyed (${selectedSite.completedCount}×)`
                      : 'New Target'}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-bold text-white">{selectedSite.name}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  {selectedSite.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded border border-slate-800 bg-[#070b14] p-3 font-mono text-xs tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">POWER COST</div>
                  <div className="text-amber-300">{selectedSite.powerCostKwh} kWh</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">DURATION</div>
                  <div className="text-white">{selectedSite.durationSols} Sol(s)</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">MIN ROVER</div>
                  <div className="text-slate-200">{selectedSite.minRoverCondition}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">MIN COMMS</div>
                  <div className="text-slate-200">{selectedSite.minCommsPct}%</div>
                </div>
                <div className="col-span-2 border-t border-slate-800 pt-2 text-emerald-300">
                  Expected Reward: +{selectedSite.waterBonus}% H2O · +{selectedSite.materialsBonus}{' '}
                  Mat · +{selectedSite.researchBonus} RP
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">Pick 1–2 Astronauts</span>
                  <span className="font-mono text-slate-400">{selectedCrewIds.length} / 2</span>
                </div>
                <div className="space-y-1.5">
                  {availableCrew.map((member) => {
                    const checked = selectedCrewIds.includes(member.id);
                    const unfit = member.fatigue >= 82 || member.health <= 45;
                    return (
                      <label
                        key={member.id}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded border px-3 py-2 text-xs ${
                          checked
                            ? 'border-blue-500 bg-blue-950/40 text-white'
                            : unfit
                            ? 'border-amber-500/30 bg-[#070b14] text-slate-400'
                            : 'border-slate-800 bg-[#070b14] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCrew(member.id)}
                            className="accent-blue-500 shrink-0"
                          />
                          <span className="truncate">
                            <strong className="font-medium text-white">{member.name}</strong> ·{' '}
                            {member.role}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                          HP {Math.round(member.health)}% · Fat {Math.round(member.fatigue)}%
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                disabled={!launchCheck.allowed}
                onClick={() => {
                  onLaunchExpedition(selectedSite.id, selectedCrewIds);
                  setSelectedCrewIds([]);
                }}
                className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dispatch Rover Expedition</span>
              </button>
              {!launchCheck.allowed && launchCheck.reason && (
                <p className="text-xs text-amber-400">{launchCheck.reason}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Research Lab Sub-Tab */
        <div className="grid gap-4 md:grid-cols-2">
          {state.research.map((node) => {
            const check = canUnlockResearch(state, node.id);
            const prereqNames = node.prerequisites.map(
              (pid) => state.research.find((r) => r.id === pid)?.name || pid
            );

            return (
              <div
                key={node.id}
                className={`flex flex-col justify-between space-y-4 rounded border p-5 ${
                  node.unlocked
                    ? 'border-emerald-500/40 bg-emerald-950/15'
                    : 'border-slate-800 bg-[#0b111e]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] text-sky-400">{node.category}</div>
                      <h2 className="mt-0.5 text-base font-semibold text-white">{node.name}</h2>
                    </div>
                    {node.unlocked ? (
                      <StatusIndicator status="nominal" label="Unlocked" />
                    ) : (
                      <span className="font-mono text-xs tabular-nums text-sky-300">
                        {node.cost} RP
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">{node.description}</p>

                  <div className="rounded border border-slate-800 bg-[#070b14] p-2.5 text-xs text-emerald-300">
                    <strong>Benefit: </strong>
                    {node.benefitSummary}
                  </div>

                  {prereqNames.length > 0 && (
                    <div className="text-[11px] text-slate-400">
                      Requires: {prereqNames.join(', ')}
                    </div>
                  )}
                </div>

                {!node.unlocked && (
                  <div>
                    <button
                      type="button"
                      disabled={!check.allowed}
                      onClick={() => onUnlockResearch(node.id)}
                      className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                    >
                      {check.allowed ? (
                        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Research Technology ({node.cost} RP)</span>
                    </button>
                    {!check.allowed && check.reason && (
                      <p className="mt-1.5 text-[11px] text-amber-400">{check.reason}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SCIENCE VIEW (NASA Science & Space Apps Challenge Alignment)               */
/* -------------------------------------------------------------------------- */

const CURATED_NASA_SOUTH_POLE_IMAGES: NasaImageItem[] = [
  {
    nasaId: 'PIA24982',
    title: 'Shackleton Crater Rim Illumination (Lunar South Pole)',
    description: 'NASA Lunar Reconnaissance Orbiter (LRO) visualization of illumination conditions along the Shackleton Crater rim, identifying potential Artemis landing and outpost sites.',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA24982/PIA24982~thumb.jpg',
    dateCreated: '2021-11-15',
    center: 'NASA GSFC / LRO',
  },
  {
    nasaId: 'PIA12077',
    title: 'LCROSS Impact Plume Water Detection at Cabeus Crater',
    description: 'Artist illustration and scientific data plot confirming water ice (~5.6% by mass) in the permanently shadowed cryogenic cold trap of Cabeus crater.',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA12077/PIA12077~thumb.jpg',
    dateCreated: '2009-11-13',
    center: 'NASA Ames Research Center',
  },
  {
    nasaId: 'ACD20-0047',
    title: 'Artemis Base Camp Surface Habitat & Power Architecture',
    description: 'Concept rendering of NASA Artemis base camp featuring vertical solar arrays, inflatable habitats, and pressurized rovers operating near the lunar south pole.',
    thumbUrl: 'https://images-assets.nasa.gov/image/ACD20-0047/ACD20-0047~thumb.jpg',
    dateCreated: '2020-09-21',
    center: 'NASA Headquarters',
  },
];

interface NasaImageItem {
  nasaId: string;
  title: string;
  description: string;
  thumbUrl: string;
  dateCreated: string;
  center: string;
}

interface SpaceWeatherPayload {
  source: string;
  timestamp: string;
  solarCycle: string;
  lunarDoseRateMgyPerDay: string;
  flareEvents: Array<{
    flrID: string;
    classType: string;
    beginTime: string;
    peakTime: string;
    link: string;
  }>;
  spaceWeatherAlertThresholds: {
    nominal: string;
    warning: string;
    critical: string;
  };
  officialDatasets: Array<{
    id: string;
    title: string;
    organization: string;
    datasetUrl: string;
    summary: string;
  }>;
}

export function ScienceView() {
  const [images, setImages] = useState<NasaImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherPayload | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const loadSpaceWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch('/api/nasa-space-weather');
      if (res.ok) {
        const json = await res.json();
        setSpaceWeather(json);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadNasaImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        'https://images-api.nasa.gov/search?q=Shackleton%20Moon%20south%20pole&media_type=image'
      );
      if (!res.ok) throw new Error(`NASA Image API responded with status ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.collection?.items) ? json.collection.items : [];
      const parsed: NasaImageItem[] = [];
      const seenTitles = new Set<string>();
      const excludedTerms = [
        'saturn',
        'cassini',
        'titan',
        'enceladus',
        'epimetheus',
        'mimas',
        'tethys',
        'dione',
        'rhea',
        'iapetus',
        'mars',
        'jupiter',
      ];

      for (const item of items) {
        const data = item?.data?.[0];
        const link = Array.isArray(item?.links)
          ? item.links.find((l: { render?: string; href?: string }) => l.render === 'image' || l.href)
          : null;
        if (data?.title && link?.href) {
          const textBlob = `${data.title} ${data.description || ''}`.toLowerCase();
          if (excludedTerms.some((term) => textBlob.includes(term))) continue;
          const normTitle = String(data.title).trim();
          if (seenTitles.has(normTitle)) continue;
          seenTitles.add(normTitle);
          parsed.push({
            nasaId: data.nasa_id || normTitle,
            title: normTitle,
            description: (data.description || '').slice(0, 220),
            thumbUrl: link.href,
            dateCreated: (data.date_created || '').slice(0, 10),
            center: data.center || 'NASA',
          });
        }
        if (parsed.length >= 6) break;
      }

      setImages(parsed.length > 0 ? parsed : CURATED_NASA_SOUTH_POLE_IMAGES);
    } catch {
      setImages(CURATED_NASA_SOUTH_POLE_IMAGES);
      setError(null); // suppress error display since curated fallback is active
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNasaImages();
    loadSpaceWeather();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Real NASA Lunar Science</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            How every mechanic in Outpost Commander connects to Artemis south-pole science and
            closed-loop habitat engineering.
          </p>
        </div>
        <a
          href="https://science.nasa.gov/moon/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-sky-300 hover:bg-slate-800 whitespace-nowrap"
        >
          <span>NASA Moon Science Portal</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      {/* Live NASA DONKI Space Weather & Radiation Environment */}
      <section className="rounded border border-amber-500/40 bg-[#0d131f] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 text-amber-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Space Weather &amp; Lunar Surface Radiation (NASA DONKI / LRO CRaTER)
              </h2>
              <p className="text-xs text-slate-400">
                Live solar activity notifications and lunar surface ionizing radiation baselines.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-amber-300">
            {spaceWeather?.source === 'nasa-donki-live' ? 'Live DONKI Feed' : 'NASA Validated Baseline'}
          </span>
        </div>

        {weatherLoading ? (
          <div className="h-20 animate-pulse rounded border border-slate-800 bg-slate-900/50" />
        ) : spaceWeather ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border border-slate-800 bg-[#070b14] p-3.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">SOLAR CYCLE STATUS</div>
              <div className="text-sm font-bold text-white">{spaceWeather.solarCycle}</div>
              <p className="text-[11px] text-slate-300">
                Peak coronal mass ejections and energetic proton storms that challenge lunar surface outposts.
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-[#070b14] p-3.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">LUNAR SURFACE DOSE RATE</div>
              <div className="text-sm font-bold text-sky-300">{spaceWeather.lunarDoseRateMgyPerDay}</div>
              <p className="text-[11px] text-slate-300">
                From LRO Cosmic Ray Telescope (CRaTER). Requires 1–2m packed regolith shielding for habitat berms.
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-[#070b14] p-3.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">RECENT SOLAR FLARES (DONKI)</div>
              <div className="text-xs font-semibold text-amber-300">
                {spaceWeather.flareEvents[0]?.classType || 'M-Class Active'} ({spaceWeather.flareEvents[0]?.beginTime?.slice(0, 10)})
              </div>
              <a
                href={spaceWeather.flareEvents[0]?.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline pt-0.5"
              >
                <span>View DONKI Alert Details</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        ) : null}

        {/* Official NASA PDS Datasets */}
        {spaceWeather?.officialDatasets && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Official NASA Planetary Data System (PDS) Archives
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {spaceWeather.officialDatasets.map((ds) => (
                <a
                  key={ds.id}
                  href={ds.datasetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-slate-800 bg-[#070b14] p-3 transition-colors hover:border-sky-500/50 hover:bg-slate-900 block"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{ds.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{ds.organization}</div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-300">{ds.summary}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Why Lunar Bases Matter + Disclaimer */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded border border-slate-800 bg-[#0b111e] p-5 lg:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-white">
            Why the Moon&apos;s South Pole Matters for Artemis
          </h2>
          <p className="text-xs leading-relaxed text-slate-300">
            Unlike the Apollo landing sites near the lunar equator, the south pole features sunlit
            crater rims right beside permanently shadowed crater floors holding ancient water ice.
            Learning how solar power, water recycling, radiation shielding, and lunar dust interact
            helps prepare future explorers for living sustainably beyond Earth.
          </p>
        </div>
        <div className="rounded border border-sky-500/30 bg-[#0c1526] p-5 text-xs leading-relaxed text-slate-200">
          <strong className="block mb-1 text-sky-300">Illustrative Simulation Model</strong>
          {SIMULATION_DISCLAIMER}
        </div>
      </div>

      {/* Curated NASA Concepts Connected to Gameplay */}
      <div className="grid gap-4 md:grid-cols-2">
        {NASA_SCIENCE_TOPICS.map((topic) => (
          <article
            key={topic.id}
            className="flex flex-col justify-between space-y-3 rounded border border-slate-800 bg-[#0b111e] p-5"
          >
            <div className="space-y-2">
              <div className="font-mono text-[11px] text-sky-400">{topic.badge}</div>
              <h2 className="text-base font-semibold text-white">{topic.title}</h2>
              <p className="text-xs leading-relaxed text-slate-300">
                <strong className="text-slate-100">Real Science: </strong>
                {topic.verifiedScience}
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                <strong className="text-sky-300">In the Game: </strong>
                {topic.gameplayConnection}
              </p>
            </div>
            <div className="border-t border-slate-800 pt-2.5">
              <a
                href={topic.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:underline"
              >
                <span>{topic.sourceTitle}</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Live NASA Image Gallery */}
      <section className="space-y-4 rounded border border-slate-800 bg-[#0b111e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              NASA South-Pole &amp; Lunar Photo Archive
            </h2>
            <p className="text-xs text-slate-400">
              Live public photos from <span className="font-mono text-slate-300">images-api.nasa.gov</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={loadNasaImages}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Gallery</span>
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-56 animate-pulse rounded border border-slate-800 bg-slate-900/60" />
            ))}
          </div>
        ) : error || images.length === 0 ? (
          <div className="rounded border border-slate-800 bg-[#070b14] p-6 text-center space-y-3">
            <ImageIcon className="mx-auto h-8 w-8 text-slate-500" aria-hidden="true" />
            <div className="text-sm font-medium text-slate-200">
              NASA Image Library currently unavailable
            </div>
            <p className="mx-auto max-w-md text-xs text-slate-400">
              {error || 'No images returned.'} Gameplay works offline. Browse directly at{' '}
              <a
                href="https://images.nasa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline"
              >
                images.nasa.gov
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <figure
                key={img.nasaId}
                className="flex flex-col overflow-hidden rounded border border-slate-800 bg-[#070b14]"
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={img.thumbUrl}
                    alt={img.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="flex flex-1 flex-col justify-between p-3 space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-white line-clamp-2">{img.title}</div>
                    {img.description && (
                      <p className="mt-1 text-[11px] leading-snug text-slate-400 line-clamp-3">
                        {img.description}
                      </p>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-sky-400">
                    Credit: {img.center} · {img.dateCreated || 'NASA Archive'}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
