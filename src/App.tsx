import React, { useCallback, useEffect, useState } from 'react';
import {
  advanceSol,
  answerCadetCheckpoint,
  assignCrewTask,
  constructModule,
  continueEndlessOperations,
  createNewCampaign,
  dismissCadetCheckpoint,
  launchExpedition,
  repairModule,
  resolveEventChoice,
  setPowerPriority,
  toggleModuleActive,
  toggleQueuedDirective,
  unlockResearch,
  upgradeModule,
} from './engine/simulation';
import {
  loadAutoSave,
  recordCampaignHistory,
  saveAutoSave,
} from './engine/storage';
import type {
  CampaignConfig,
  CrewTask,
  GameState,
  ModuleId,
  PowerPriorityMode,
  ScreenId,
  SolDirectiveId,
} from './engine/types';
import { LandingScreen, MissionSetupScreen } from './components/LandingAndSetup';
import { JudgeDemoView } from './components/JudgeDemoView';
import { ShellLayout } from './components/ShellLayout';
import type { HubTabId, PrimaryTabId } from './components/ShellLayout';
import { FeedbackToast, TutorialModal } from './components/CommonUI';
import { MissionView } from './components/MissionView';
import { BaseView, CrewView } from './components/BaseAndCrewViews';
import { ExploreView, ScienceView } from './components/ExploreAndScienceViews';
import { FinalReportView, OperationsHubModal } from './components/OperationsHubModal';

type AppPhase = 'landing' | 'demo' | 'setup' | 'mission';

const DEFAULT_QUICK_CONFIG: CampaignConfig = {
  commanderName: 'Cmdr. Elena Vance',
  missionName: 'Artemis Shackleton Alpha',
  crewSize: 4,
  difficulty: 'normal',
  scenario: 'first_outpost',
};

export default function App() {
  const [initialBoot] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const loaded = loadAutoSave();

    if (autostart) {
      const fresh = createNewCampaign(DEFAULT_QUICK_CONFIG);
      fresh.tutorialDismissed = true;
      return {
        phase: 'mission' as AppPhase,
        gameState: fresh,
        autosavePreview: loaded.state,
        corrupted: loaded.corrupted,
      };
    }

    return {
      phase: 'landing' as AppPhase,
      gameState: null as GameState | null,
      autosavePreview: loaded.state,
      corrupted: loaded.corrupted,
    };
  });

  const [phase, setPhase] = useState<AppPhase>(initialBoot.phase);
  const [gameState, setGameState] = useState<GameState | null>(initialBoot.gameState);
  const [autosavePreview, setAutosavePreview] = useState<GameState | null>(
    initialBoot.autosavePreview
  );
  const [activeTab, setActiveTab] = useState<PrimaryTabId>('mission');
  const [exploreSubTab, setExploreSubTab] = useState<'expeditions' | 'research'>('expeditions');
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<HubTabId>('advisor');
  const [reportOpen, setReportOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    document.body.dataset.state =
      phase === 'landing'
        ? 'title'
        : phase === 'demo'
        ? 'demo'
        : phase === 'setup'
        ? 'setup'
        : 'playing';
  }, [phase]);

  // Allow Enter or Space on Landing screen to open Mission Setup
  useEffect(() => {
    if (phase !== 'landing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'A') return;
        e.preventDefault();
        setPhase('setup');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const commitState = useCallback(
    (next: GameState, toast?: { type: 'success' | 'error' | 'info'; message: string }) => {
      setGameState(next);
      if (next.autoSaveEnabled) {
        saveAutoSave(next);
        setAutosavePreview(next);
      }
      if (next.campaignStatus !== 'active') {
        recordCampaignHistory(next);
      }
      if (toast) notify(toast.type, toast.message);
    },
    [notify]
  );

  const handleLaunchCampaign = (config: CampaignConfig, skipTutorial = false) => {
    const fresh = createNewCampaign(config);
    if (skipTutorial) fresh.tutorialDismissed = true;
    setActiveTab('mission');
    setExploreSubTab('expeditions');
    setHubOpen(false);
    setReportOpen(false);
    setPhase('mission');
    commitState(fresh, {
      type: 'success',
      message: `${fresh.config.missionName} launched. Welcome to Day 1, ${fresh.config.commanderName}.`,
    });
    if (!fresh.tutorialDismissed) {
      setTutorialOpen(true);
    }
  };

  const handleContinueFromDemo = (demoAfterState?: GameState) => {
    if (demoAfterState) {
      setActiveTab('mission');
      setExploreSubTab('expeditions');
      setHubOpen(false);
      setReportOpen(false);
      setPhase('mission');
      commitState(demoAfterState, {
        type: 'success',
        message: `Welcome to Mission Day 2, Commander. Your crisis decision from the Judge Quick Test has been executed in the outpost simulation!`,
      });
    } else {
      handleLaunchCampaign(DEFAULT_QUICK_CONFIG, true);
    }
  };

  const handleResumeAutosave = () => {
    if (!autosavePreview) return;
    setGameState(autosavePreview);
    setActiveTab('mission');
    setHubOpen(false);
    setReportOpen(false);
    setPhase('mission');
    notify('info', `Resumed ${autosavePreview.config.missionName} on Day ${autosavePreview.day || autosavePreview.sol}.`);
  };

  const runAction = (fn: (s: GameState) => { nextState: GameState; message: string }) => {
    if (!gameState) return;
    try {
      const { nextState, message } = fn(gameState);
      commitState(nextState, { type: 'success', message });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Action could not be completed.');
    }
  };

  const handleAdvanceSol = () => {
    if (!gameState) return;
    try {
      const next = advanceSol(gameState);
      if (next.campaignStatus === 'completed') {
        commitState(next, {
          type: 'success',
          message: `Campaign target of ${next.targetDays || next.targetSols} Days completed! Review your Final Mission Report.`,
        });
        setReportOpen(true);
      } else if (next.campaignStatus === 'interrupted') {
        commitState(next, {
          type: 'error',
          message: 'Emergency abort triggered due to critical survival thresholds.',
        });
        setReportOpen(true);
      } else {
        const unresolved = next.events.filter((e) => !e.resolved).length;
        commitState(next, {
          type: unresolved > 0 ? 'info' : 'success',
          message:
            unresolved > 0
              ? `Advanced to Day ${next.day || next.sol}. ${unresolved} situation(s) need your decision.`
              : `Advanced to Day ${next.day || next.sol}. Outpost telemetry updated.`,
        });
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not advance Mission Day.');
    }
  };

  const handleAnswerCadetCheckpoint = (optionId: string) => {
    if (!gameState || !gameState.activeCheckpoint) return;
    try {
      const res = answerCadetCheckpoint(gameState, gameState.activeCheckpoint.id, optionId);
      commitState(res.nextState, { type: res.wasCorrect ? 'success' : 'info', message: res.message });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not submit cadet answer.');
    }
  };

  const handleDismissCadetCheckpoint = () => {
    if (!gameState) return;
    const next = dismissCadetCheckpoint(gameState);
    commitState(next, { type: 'info', message: 'Checkpoint dismissed.' });
  };

  const handleOpenHub = (tab: HubTabId) => {
    setHubTab(tab);
    setHubOpen(true);
  };

  const handleNavigateLegacyScreen = (screen: ScreenId) => {
    switch (screen) {
      case 'base':
      case 'construction':
      case 'resources':
        setActiveTab('base');
        break;
      case 'crew':
        setActiveTab('crew');
        break;
      case 'exploration':
        setExploreSubTab('expeditions');
        setActiveTab('explore');
        break;
      case 'research':
        setExploreSubTab('research');
        setActiveTab('explore');
        break;
      case 'nasa_data':
        setActiveTab('science');
        break;
      case 'advisor':
      case 'analytics':
      case 'logs':
      case 'settings':
        setHubTab(screen);
        setHubOpen(true);
        break;
      case 'report':
        setReportOpen(true);
        break;
      case 'overview':
      case 'dashboard':
      case 'events':
      default:
        setActiveTab('mission');
        break;
    }
  };

  const handleCloseTutorial = () => {
    setTutorialOpen(false);
    if (gameState && !gameState.tutorialDismissed) {
      commitState({ ...gameState, tutorialDismissed: true });
    }
  };

  if (phase === 'landing') {
    return (
      <LandingScreen
        hasAutosave={Boolean(autosavePreview)}
        autosavePreview={autosavePreview}
        corruptedNotice={initialBoot.corrupted}
        onStartJudgeDemo={() => setPhase('demo')}
        onStartSetup={() => setPhase('setup')}
        onQuickStartDefault={() => handleLaunchCampaign(DEFAULT_QUICK_CONFIG, true)}
        onResumeAutosave={handleResumeAutosave}
      />
    );
  }

  if (phase === 'demo') {
    return (
      <JudgeDemoView
        onExploreFullMission={(demoAfterState) => handleContinueFromDemo(demoAfterState)}
        onExitToTitle={() => setPhase('landing')}
      />
    );
  }

  if (phase === 'setup' || !gameState) {
    return (
      <MissionSetupScreen
        onBack={() => setPhase('landing')}
        onLaunchCampaign={(cfg) => handleLaunchCampaign(cfg, false)}
      />
    );
  }

  return (
    <>
      <ShellLayout
        state={gameState}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenHub={handleOpenHub}
        onOpenReport={() => setReportOpen(true)}
        onAdvanceSol={handleAdvanceSol}
        onOpenTutorial={() => setTutorialOpen(true)}
        onStartJudgeDemo={() => setPhase('demo')}
      >
        {activeTab === 'mission' && (
          <MissionView
            state={gameState}
            onToggleDirective={(id: SolDirectiveId) => {
              try {
                const next = toggleQueuedDirective(gameState, id);
                commitState(next);
              } catch (err) {
                notify('error', err instanceof Error ? err.message : 'Cannot select action.');
              }
            }}
            onResolveChoice={(eventId: string, choiceId: string) =>
              runAction((s) => resolveEventChoice(s, eventId, choiceId))
            }
            onAdvanceSol={handleAdvanceSol}
            onAnswerCheckpoint={handleAnswerCadetCheckpoint}
            onDismissCheckpoint={handleDismissCadetCheckpoint}
            onSelectTab={setActiveTab}
            onOpenHub={handleOpenHub}
            onOpenReport={() => setReportOpen(true)}
          />
        )}

        {activeTab === 'base' && (
          <BaseView
            state={gameState}
            onConstruct={(id: ModuleId) => runAction((s) => constructModule(s, id))}
            onUpgrade={(id: ModuleId) => runAction((s) => upgradeModule(s, id))}
            onRepair={(id: ModuleId) => runAction((s) => repairModule(s, id))}
            onToggleActive={(id: ModuleId) => runAction((s) => toggleModuleActive(s, id))}
            onSetPowerPriority={(mode: PowerPriorityMode) => {
              commitState(setPowerPriority(gameState, mode), {
                type: 'info',
                message: `Power mode set to ${mode.replace(/_/g, ' ')}.`,
              });
            }}
          />
        )}

        {activeTab === 'crew' && (
          <CrewView
            state={gameState}
            onAssignTask={(crewId: string, task: CrewTask) => {
              try {
                const next = assignCrewTask(gameState, crewId, task);
                commitState(next, { type: 'info', message: `Crew duty updated to ${task}.` });
              } catch (err) {
                notify('error', err instanceof Error ? err.message : 'Cannot reassign crew.');
              }
            }}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            state={gameState}
            initialSubTab={exploreSubTab}
            onLaunchExpedition={(siteId: string, crewIds: string[]) =>
              runAction((s) => launchExpedition(s, siteId, crewIds))
            }
            onUnlockResearch={(researchId: string) =>
              runAction((s) => unlockResearch(s, researchId))
            }
          />
        )}

        {activeTab === 'science' && <ScienceView />}
      </ShellLayout>

      <OperationsHubModal
        open={hubOpen}
        activeTab={hubTab}
        state={gameState}
        onSelectTab={setHubTab}
        onClose={() => setHubOpen(false)}
        onNavigateLegacyScreen={handleNavigateLegacyScreen}
        onOpenReport={() => setReportOpen(true)}
        onToggleAutoSave={() => {
          const next = { ...gameState, autoSaveEnabled: !gameState.autoSaveEnabled };
          setGameState(next);
          if (next.autoSaveEnabled) saveAutoSave(next);
          notify('info', `Auto-save ${next.autoSaveEnabled ? 'enabled' : 'disabled'}.`);
        }}
        onLoadState={(loaded: GameState) => {
          commitState(loaded);
          setActiveTab('mission');
        }}
        onResetCampaign={() => {
          const fresh = createNewCampaign(gameState.config);
          fresh.tutorialDismissed = true;
          commitState(fresh, {
            type: 'info',
            message: 'Campaign reset to Sol 1.',
          });
          setActiveTab('mission');
        }}
        onNewCampaignSetup={() => {
          setPhase('setup');
        }}
        onNotify={notify}
      />

      <FinalReportView
        open={reportOpen}
        state={gameState}
        onClose={() => setReportOpen(false)}
        onContinueEndless={() => {
          const next = continueEndlessOperations(gameState);
          commitState(next, {
            type: 'success',
            message: 'Extended Lunar Operations authorized. You may continue advancing Sols.',
          });
          setReportOpen(false);
          setActiveTab('mission');
        }}
        onReplayMission={() => {
          const fresh = createNewCampaign(gameState.config);
          fresh.tutorialDismissed = true;
          commitState(fresh, {
            type: 'success',
            message: `Restarted ${fresh.config.missionName} on Sol 1.`,
          });
          setReportOpen(false);
          setActiveTab('mission');
        }}
      />

      <TutorialModal open={tutorialOpen} onClose={handleCloseTutorial} />
      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </>
  );
}
