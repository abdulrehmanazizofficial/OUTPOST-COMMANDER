import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceSol,
  assignCrewTask,
  calculateMissionScore,
  canConstructModule,
  canLaunchExpedition,
  canQueueDirective,
  canUnlockResearch,
  computeBaseBalances,
  constructModule,
  continueEndlessOperations,
  createNewCampaign,
  evaluateFinalReport,
  launchExpedition,
  resolveEventChoice,
  toggleModuleActive,
  toggleQueuedDirective,
  unlockResearch,
  upgradeModule,
} from './simulation';
import { generateDeterministicAdvice } from './advisor';
import { loadAutoSave, saveAutoSave, validateGameState } from './storage';
import { SCENARIOS } from './data';
import { createJudgeDemoState, executeJudgeDecision } from './judgeDemo';
import type { ScenarioId } from './types';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

test('createNewCampaign initializes all 5 scenarios and respects difficulty modifiers', () => {
  const scenarios: ScenarioId[] = [
    'first_outpost',
    'water_ice',
    'power_crisis',
    'dust_emergency',
    'long_night',
  ];

  for (const scenario of scenarios) {
    const easy = createNewCampaign({
      commanderName: 'Vance',
      missionName: `Test ${scenario}`,
      crewSize: 4,
      difficulty: 'easy',
      scenario,
    });
    const hard = createNewCampaign({
      commanderName: 'Vance',
      missionName: `Test ${scenario}`,
      crewSize: 4,
      difficulty: 'hard',
      scenario,
    });

    assert.equal(easy.sol, 1);
    assert.equal(easy.targetSols, SCENARIOS[scenario].targetSols);
    assert.equal(easy.crew.length, 4);
    assert.ok(easy.resources.materials > hard.resources.materials);
    assert.ok(easy.resources.oxygenPct >= hard.resources.oxygenPct);
  }
});

test('impossible actions are blocked with explanatory reasons', () => {
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Validation Base',
    crewSize: 4,
    difficulty: 'hard',
    scenario: 'first_outpost',
  });

  // Exploration Station requires research first
  const expStationCheck = canConstructModule(state, 'exploration_station');
  assert.equal(expStationCheck.allowed, false);
  assert.match(expStationCheck.reason || '', /Requires research/i);

  // Expedition blocked when Rover Garage is unbuilt
  const expCheck = canLaunchExpedition(state, 'site-landing', [state.crew[0].id]);
  assert.equal(expCheck.allowed, false);
  assert.match(expCheck.reason || '', /Rover Garage/i);
});

test('constructing a module deducts materials and finishes commissioning next Sol', () => {
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Build Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'first_outpost',
  });

  const startMaterials = state.resources.materials;
  const { nextState } = constructModule(state, 'greenhouse');
  const gh = nextState.modules.find((m) => m.id === 'greenhouse')!;

  assert.equal(gh.status, 'under_construction');
  assert.equal(nextState.resources.materials, startMaterials - gh.buildCostMaterials);

  const afterSol = advanceSol(nextState, 0.99);
  const ghAfter = afterSol.modules.find((m) => m.id === 'greenhouse')!;
  assert.equal(ghAfter.status, 'operational');
  assert.equal(afterSol.sol, 2);
  assert.ok(afterSol.lastSolSummary !== null);
  assert.equal(afterSol.history.length, 2);
});

test('full 10-Sol campaign completes, generates Final Report, and supports Endless Operations', () => {
  let state = createNewCampaign({
    commanderName: 'Cmdr. Vance',
    missionName: 'Artemis Endurance',
    crewSize: 5,
    difficulty: 'easy',
    scenario: 'first_outpost',
  });

  // Unlock a tech & build greenhouse + rover garage
  state = unlockResearch(state, 'res-eclss-1').nextState;
  state = constructModule(state, 'greenhouse').nextState;
  state = constructModule(state, 'rover_garage').nextState;
  state = assignCrewTask(state, state.crew[0].id, 'Operations');
  state = toggleQueuedDirective(state, 'focused_research');

  for (let i = 0; i < 10; i++) {
    for (const evt of state.events.filter((e) => !e.resolved)) {
      const choice = evt.choices[evt.choices.length - 1];
      state = resolveEventChoice(state, evt.id, choice.id).nextState;
    }

    if (i === 1) {
      const roverReady = state.modules.find((m) => m.id === 'rover_garage')?.status === 'operational';
      if (roverReady) {
        state = launchExpedition(state, 'site-landing', [state.crew[4].id]).nextState;
      }
    }

    if (state.campaignStatus === 'active') {
      state = advanceSol(state, 0.85);
    }
  }

  assert.equal(state.campaignStatus, 'completed');
  const report = evaluateFinalReport(state);
  assert.equal(report.solsCompleted, 10);
  assert.ok(report.score.totalScore >= 50);
  assert.ok(
    ['OUTSTANDING SUCCESS', 'SUCCESSFUL MISSION', 'PARTIAL SUCCESS'].includes(report.score.outcomeTier)
  );

  // Continue Endless Operations
  const endless = continueEndlessOperations(state);
  assert.equal(endless.campaignStatus, 'active');
  assert.equal(endless.endlessMode, true);
  const sol12 = advanceSol(endless, 0.99);
  assert.equal(sol12.sol, 12);
  assert.equal(sol12.campaignStatus, 'active');
});

test('upgrading battery storage increases battery capacity and advisor reports structured guidance', () => {
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Power Base',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'power_crisis',
  });

  const capBefore = state.resources.batteryCapacityKwh;
  const upgraded = upgradeModule(state, 'battery_storage').nextState;
  assert.ok(upgraded.resources.batteryCapacityKwh > capBefore);

  const advice = generateDeterministicAdvice(upgraded);
  assert.equal(advice.source, 'deterministic-fallback');
  assert.ok(advice.recommendations.length >= 1);
  const score = calculateMissionScore(upgraded);
  assert.ok(score.totalScore >= 0 && score.totalScore <= 100);
});

test('storage validates saves and handles corrupted data safely', () => {
  const storage = createMemoryStorage();
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Persistence Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'water_ice',
  });

  assert.equal(saveAutoSave(state, storage), true);
  const loaded = loadAutoSave(storage);
  assert.equal(loaded.corrupted, false);
  assert.equal(loaded.state?.campaignId, state.campaignId);

  storage.setItem('outpost_commander_autosave_v1', '{invalid-json');
  const corrupted = loadAutoSave(storage);
  assert.equal(corrupted.corrupted, true);
  assert.equal(corrupted.state, null);
  assert.equal(validateGameState({ bad: true }), false);
});

test('cumulative directive material validation & non-double-charged directive power', () => {
  const base = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Directive Budget Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'first_outpost',
  });

  // Low material test: 15 materials allows repair_solar (8M) OR boost_shielding (10M), not both (18M)
  const tight = structuredClone(base);
  tight.resources.materials = 15;
  const q1 = toggleQueuedDirective(tight, 'repair_solar');
  const secondCheck = canQueueDirective(q1, 'boost_shielding');
  assert.equal(secondCheck.allowed, false);
  assert.match(secondCheck.reason || '', /uncommitted/i);

  // Power consistency: battery delta equals netPowerKw * 1.8 without extra double deduction
  const fullBat = structuredClone(base);
  fullBat.resources.batteryKwh = 100;
  const withComms = toggleQueuedDirective(fullBat, 'maintain_comms');
  const preview = computeBaseBalances(withComms);
  const after = advanceSol(withComms, 0.99);
  const expectedBattery = Math.max(
    0,
    Math.min(withComms.resources.batteryCapacityKwh, Math.round((100 + preview.netPowerKw * 1.8) * 10) / 10)
  );
  assert.equal(after.resources.batteryKwh, expectedBattery);
});

test('crew role synergy improves task yields vs mismatched assignment', () => {
  const base = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Synergy Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'first_outpost',
  });

  // crew[2] is Dr. Lin (Scientist) already on Research; crew[1] is Engineer
  const matched = computeBaseBalances(base);
  // Swap Scientist -> Operations and Commander -> Research (same skill total if we adjust to equal skill)
  const equalSkill = structuredClone(base);
  equalSkill.crew[0].skill = 8; // Commander
  equalSkill.crew[2].skill = 8; // Scientist
  const matchedEq = computeBaseBalances(equalSkill);

  let swapped = assignCrewTask(equalSkill, equalSkill.crew[2].id, 'Operations');
  swapped = assignCrewTask(swapped, swapped.crew[0].id, 'Research');
  const mismatchedEq = computeBaseBalances(swapped);

  assert.ok(matched.researchDelta > 0);
  assert.ok(
    matchedEq.researchDelta > mismatchedEq.researchDelta,
    `Expected matched (${matchedEq.researchDelta}) > mismatched (${mismatchedEq.researchDelta})`
  );
});

test('standby radiation shelter lowers shielding and total blackout degrades output', () => {
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Shield & Blackout Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'long_night',
  });

  const initialShielding = state.resources.radiationShieldingPct;
  const standby = toggleModuleActive(state, 'radiation_shelter').nextState;
  assert.ok(standby.resources.radiationShieldingPct < initialShielding);

  // Force blackout condition (0 battery and negative net power)
  const blackoutBase = structuredClone(state);
  blackoutBase.resources.batteryKwh = 0;
  blackoutBase.environment.solarIlluminationPct = 5;
  const prevBal = computeBaseBalances(blackoutBase);
  assert.ok(prevBal.netPowerKw < 0);

  const afterBlackout = advanceSol(blackoutBase, 0.99);
  assert.ok(afterBlackout.lastSolSummary!.warnings.some((w) => /blackout/i.test(w)));
  assert.ok(afterBlackout.resources.thermalControlPct < blackoutBase.resources.thermalControlPct);
});

test('research prerequisite chain unlocks Cryogenic Coring and Exploration Equipment Station', () => {
  const state = createNewCampaign({
    commanderName: 'Vance',
    missionName: 'Tech Chain Test',
    crewSize: 4,
    difficulty: 'normal',
    scenario: 'first_outpost',
  });
  state.resources.researchPoints = 200;
  state.resources.materials = 200;

  assert.equal(canUnlockResearch(state, 'res-explore-1').allowed, false);
  const s1 = unlockResearch(state, 'res-water-1').nextState;
  assert.equal(canUnlockResearch(s1, 'res-explore-1').allowed, true);
  const s2 = unlockResearch(s1, 'res-explore-1').nextState;
  assert.equal(canConstructModule(s2, 'exploration_station').allowed, true);
});

test('Judge Quick Test preset triggers real power deficit and 3 distinct real simulation trade-offs', () => {
  const demo = createJudgeDemoState();
  assert.equal(demo.sol, 1);
  assert.equal(demo.autoSaveEnabled, false);
  assert.ok(demo.resources.powerGeneration < demo.resources.powerDemand);

  const lifeSupport = executeJudgeDecision(demo, 'prioritize_life_support');
  const preserveBat = executeJudgeDecision(demo, 'preserve_battery');
  const contScience = executeJudgeDecision(demo, 'continue_science');

  // Real simulation engine advances Sol from 1 -> 2
  assert.equal(lifeSupport.afterState.sol, 2);
  assert.equal(preserveBat.afterState.sol, 2);
  assert.equal(contScience.afterState.sol, 2);

  // Prioritize Life Support keeps highest O2 & Crew Safety
  assert.ok(
    lifeSupport.after.oxygenPct > preserveBat.after.oxygenPct &&
      lifeSupport.after.oxygenPct > contScience.after.oxygenPct,
    `Expected O2 highest in life support (${lifeSupport.after.oxygenPct} vs ${preserveBat.after.oxygenPct}, ${contScience.after.oxygenPct})`
  );
  assert.ok(lifeSupport.after.crewSafetyPct > lifeSupport.before.crewSafetyPct);

  // Preserve Battery saves the most battery and restores Solar Array to operational
  assert.ok(
    preserveBat.after.batteryKwh > lifeSupport.after.batteryKwh &&
      preserveBat.after.batteryKwh > contScience.after.batteryKwh,
    `Expected Battery highest in preserveBat (${preserveBat.after.batteryKwh} vs ${lifeSupport.after.batteryKwh}, ${contScience.after.batteryKwh})`
  );
  assert.equal(preserveBat.after.solarStatus, 'operational');
  assert.ok(preserveBat.after.foodPct < preserveBat.before.foodPct);

  // Continue Science yields highest Research Points at steepest battery & crew cost
  assert.ok(
    contScience.after.researchPoints > lifeSupport.after.researchPoints &&
      contScience.after.researchPoints > preserveBat.after.researchPoints,
    `Expected RP highest in contScience (${contScience.after.researchPoints} vs ${lifeSupport.after.researchPoints}, ${preserveBat.after.researchPoints})`
  );
  assert.ok(contScience.after.crewAvgHealth < contScience.before.crewAvgHealth);
  assert.ok(contScience.after.thermalControlPct < contScience.before.thermalControlPct);
});


