import { calculateMissionScore } from './simulation';
import type { GameState, SavedCampaignMeta } from './types';

const AUTOSAVE_KEY = 'outpost_commander_autosave_v1';
const SLOTS_KEY = 'outpost_commander_slots_v1';
const HISTORY_KEY = 'outpost_commander_history_v1';

export interface SaveSlotRecord {
  meta: SavedCampaignMeta;
  state: GameState;
}

export function validateGameState(candidate: unknown): candidate is GameState {
  if (!candidate || typeof candidate !== 'object') return false;
  const g = candidate as Partial<GameState>;
  return (
    typeof g.version === 'number' &&
    typeof g.campaignId === 'string' &&
    typeof g.sol === 'number' &&
    typeof g.targetSols === 'number' &&
    Boolean(g.config && typeof g.config.scenario === 'string' && typeof g.config.difficulty === 'string') &&
    Boolean(g.resources && typeof g.resources.oxygenPct === 'number' && typeof g.resources.batteryKwh === 'number') &&
    Array.isArray(g.modules) &&
    g.modules.length > 0 &&
    Array.isArray(g.crew) &&
    g.crew.length > 0 &&
    Array.isArray(g.research) &&
    Array.isArray(g.sites) &&
    Array.isArray(g.objectives) &&
    Array.isArray(g.logs)
  );
}

export function saveAutoSave(state: GameState, storage: Storage = window.localStorage): boolean {
  try {
    storage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadAutoSave(storage: Storage = window.localStorage): {
  state: GameState | null;
  corrupted: boolean;
} {
  try {
    const raw = storage.getItem(AUTOSAVE_KEY);
    if (!raw) return { state: null, corrupted: false };
    const parsed = JSON.parse(raw);
    if (!validateGameState(parsed)) {
      return { state: null, corrupted: true };
    }
    return { state: parsed, corrupted: false };
  } catch {
    return { state: null, corrupted: true };
  }
}

export function clearAutoSave(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function listSaveSlots(storage: Storage = window.localStorage): SaveSlotRecord[] {
  try {
    const raw = storage.getItem(SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SaveSlotRecord =>
        Boolean(item && item.meta && typeof item.meta.slotId === 'string' && validateGameState(item.state))
    );
  } catch {
    return [];
  }
}

export function saveToSlot(
  state: GameState,
  slotId: string,
  storage: Storage = window.localStorage
): SaveSlotRecord[] {
  const existing = listSaveSlots(storage).filter((s) => s.meta.slotId !== slotId);
  const score = calculateMissionScore(state).totalScore;
  const record: SaveSlotRecord = {
    meta: {
      slotId,
      campaignId: state.campaignId,
      missionName: state.config.missionName,
      commanderName: state.config.commanderName,
      scenario: state.config.scenario,
      difficulty: state.config.difficulty,
      sol: state.sol,
      targetSols: state.targetSols,
      campaignStatus: state.campaignStatus,
      savedAt: new Date().toISOString(),
      score,
    },
    state,
  };
  const updated = [record, ...existing].slice(0, 6);
  try {
    storage.setItem(SLOTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota errors
  }
  return updated;
}

export function deleteSaveSlot(slotId: string, storage: Storage = window.localStorage): SaveSlotRecord[] {
  const updated = listSaveSlots(storage).filter((s) => s.meta.slotId !== slotId);
  try {
    storage.setItem(SLOTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function listCampaignHistory(storage: Storage = window.localStorage): SavedCampaignMeta[] {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is SavedCampaignMeta => Boolean(m && typeof m.campaignId === 'string'));
  } catch {
    return [];
  }
}

export function recordCampaignHistory(
  state: GameState,
  storage: Storage = window.localStorage
): SavedCampaignMeta[] {
  const existing = listCampaignHistory(storage).filter((h) => h.campaignId !== state.campaignId);
  const entry: SavedCampaignMeta = {
    slotId: `hist-${state.campaignId}`,
    campaignId: state.campaignId,
    missionName: state.config.missionName,
    commanderName: state.config.commanderName,
    scenario: state.config.scenario,
    difficulty: state.config.difficulty,
    sol: Math.max(1, state.sol - 1),
    targetSols: state.targetSols,
    campaignStatus: state.campaignStatus,
    savedAt: new Date().toISOString(),
    score: calculateMissionScore(state).totalScore,
  };
  const updated = [entry, ...existing].slice(0, 12);
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}
