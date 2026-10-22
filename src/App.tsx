import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TodayView } from './components/TodayView';
import { ScheduleView } from './components/ScheduleView';
import { TasksEventsView } from './components/TasksEventsView';
import { SettingsView } from './components/SettingsView';
import { UnifiedAddModal } from './components/UnifiedAddModal';
import { SquadRadarModal } from './components/SquadRadarModal';
import { FocusTimerModal } from './components/FocusTimerModal';
import { InstallPromptBanner } from './components/InstallPromptBanner';
import { CourseTemplateModal } from './components/CourseTemplateModal';
import { AddOnsModal } from './components/AddOnsModal';
import { ImportOutlineModal } from './components/ImportOutlineModal';
import { getAddonStatus, AddonStatus } from './utils/addons';
const LegalLicenseModal = React.lazy(() => import('./components/LegalLicenseModal').then(m => ({ default: m.LegalLicenseModal })));
import { 
  WorkTask, 
  LifeEvent, 
  ScheduledSlot, 
  ScheduleSettings,
  DayMode,
  SquadSharePayload,
  SquadFocusBlock
} from './types';
import { 
  loadSettings, 
  saveSettings, 
  loadEvents, 
  saveEvents, 
  loadTasks, 
  saveTasks, 
  loadSlots, 
  saveSlots,
  loadIsSampleSchedule,
  saveIsSampleSchedule,
  clearSampleData,
  isDefaultItem
} from './utils/storage';
import { formatDateKey, recalculateSchedule, addDays } from './utils/scheduler';
import { parseSquadFromUrl, encodeSquadPayload, parsePairFromUrl } from './utils/squad';
import { cleanTaskTitle } from './utils/format';
import { parseTemplateFromUrl, materializeTemplate, CourseTemplatePayload } from './utils/template';

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'schedule' | 'tasks' | 'settings'>('today');

  // Load state from local storage or defaults
  const [settings, setSettings] = useState<ScheduleSettings>(() => loadSettings());
  const [events, setEvents] = useState<LifeEvent[]>(() => loadEvents());
  const [tasks, setTasks] = useState<WorkTask[]>(() => loadTasks());
  const [slots, setSlots] = useState<ScheduledSlot[]>(() => loadSlots(tasks, events, settings));
  const [isSampleSchedule, setIsSampleSchedule] = useState<boolean>(() => loadIsSampleSchedule());

  // Inbound squad radar state
  const [inboundSquad, setInboundSquad] = useState<SquadSharePayload | null>(() => parseSquadFromUrl());
  const [matchedSlotId, setMatchedSlotId] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSquadRadarOpen, setIsSquadRadarOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isCourseTemplateOpen, setIsCourseTemplateOpen] = useState(false);
  const [isAddOnsOpen, setIsAddOnsOpen] = useState(false);
  const [isImportOutlineOpen, setIsImportOutlineOpen] = useState(false);
  const [addons, setAddons] = useState<AddonStatus>(() => getAddonStatus());
  const [templateNotice, setTemplateNotice] = useState<{ name: string; taskCount: number } | null>(null);
  const [activeFocusSlot, setActiveFocusSlot] = useState<ScheduledSlot | null>(null);
  const [focusTimerMode, setFocusTimerMode] = useState<'focus' | 'ramp_up'>('focus');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const todayKey = formatDateKey(new Date());

  // Automatic Post-Purchase Unlock Detection (?unlocked=true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search && window.location.search.includes('unlocked=true')) {
      try {
        localStorage.setItem('cadence_addon_importer', 'true');
        const cleanPath = window.location.pathname || '/';
        window.history.replaceState({}, '', cleanPath);
        setAddons({ importer: true });
        setToastMessage("✨ Cadence Pro Unlocked! 1-Click Task & Course Importer is now active.");
      } catch (err) {
        console.error('Failed to process unlock parameter:', err);
      }
    }
  }, []);

  // Listen to add-on changes (from storage or other tabs)
  useEffect(() => {
    const handleAddonsChanged = () => {
      setAddons(getAddonStatus());
    };
    window.addEventListener('cadence_addons_changed', handleAddonsChanged);
    window.addEventListener('storage', handleAddonsChanged);
    return () => {
      window.removeEventListener('cadence_addons_changed', handleAddonsChanged);
      window.removeEventListener('storage', handleAddonsChanged);
    };
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 1-Click Course / Syllabus Template Engine (Scenario C+ Hyperedge Seeding)
  const handleApplyTemplate = (template: CourseTemplatePayload) => {
    const { tasks: tplTasks, events: tplEvents } = materializeTemplate(template, new Date());

    const userTasks = tasks.filter(t => !isDefaultItem(t));
    const userEvents = events.filter(e => !isDefaultItem(e));

    const updatedTasks = [...tplTasks, ...userTasks];
    const updatedEvents = [...tplEvents, ...userEvents];

    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    const rebalanced = recalculateSchedule(updatedTasks, updatedEvents, settings, [], new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);

    setIsSampleSchedule(false);
    saveIsSampleSchedule(false);

    setTemplateNotice({
      name: template.name,
      taskCount: tplTasks.length,
    });

    setActiveTab('today');

    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      window.location.hash = '';
    }
  };

  useEffect(() => {
    document.title = 'cadence. — daylight focus & squad rhythm';

    // Check for #template=, #squad=, or #pair= on mount or on hash changes
    const handleCheckHash = () => {
      // Check for #pair= first (Pro Mobile Pairing & Schedule Sync)
      const parsedPair = parsePairFromUrl();
      if (parsedPair) {
        if (parsedPair.pro) {
          localStorage.setItem('cadence_addon_importer', 'true');
          setAddons({ importer: true });
          window.dispatchEvent(new Event('cadence_addons_changed'));
        }
        let updatedTasks = tasks;
        if (parsedPair.tasks && parsedPair.tasks.length > 0) {
          updatedTasks = parsedPair.tasks as WorkTask[];
          setTasks(updatedTasks);
          saveTasks(updatedTasks);
        }
        let updatedEvents = events;
        if (parsedPair.events && parsedPair.events.length > 0) {
          updatedEvents = parsedPair.events as LifeEvent[];
          setEvents(updatedEvents);
          saveEvents(updatedEvents);
        }
        let updatedSettings = settings;
        if (parsedPair.settings) {
          updatedSettings = { ...settings, ...parsedPair.settings };
          setSettings(updatedSettings);
          saveSettings(updatedSettings);
        }

        const rebalanced = recalculateSchedule(updatedTasks, updatedEvents, updatedSettings, [], new Date());
        setSlots(rebalanced);
        saveSlots(rebalanced);
        setIsSampleSchedule(false);
        saveIsSampleSchedule(false);
        setActiveTab('today');

        setToastMessage("📱 Paired with Desktop! Active cadence synced. Tap Share → 'Add to Home Screen' to install PWA.");

        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          window.location.hash = '';
        }
        return;
      }

      // Check for #template=
      const parsedTemplate = parseTemplateFromUrl();
      if (parsedTemplate) {
        handleApplyTemplate(parsedTemplate);
        return;
      }

      // Check for #squad=
      const parsedSquad = parseSquadFromUrl();
      if (parsedSquad) {
        setInboundSquad(parsedSquad);
        setActiveTab('today');
        setIsSampleSchedule(false);
        saveIsSampleSchedule(false);
      }
    };

    handleCheckHash();
    window.addEventListener('hashchange', handleCheckHash);
    return () => window.removeEventListener('hashchange', handleCheckHash);
  }, [tasks, events, settings]);

  // Toggle slot completion
  const handleToggleSlotComplete = (slotId: string) => {
    const updatedSlots = slots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          isCompleted: !s.isCompleted,
          completedAt: !s.isCompleted ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });

    setSlots(updatedSlots);
    saveSlots(updatedSlots);

    // Update tasks progress
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      const task = tasks.find(t => t.id === slot.workTaskId);
      if (task) {
        const delta = !slot.isCompleted ? slot.durationMinutes : -slot.durationMinutes;
        const newCompleted = Math.max(0, task.completedMinutes + delta);
        const updatedTasks = tasks.map(t => 
          t.id === task.id ? { ...t, completedMinutes: newCompleted } : t
        );
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
      }
    }
  };

  // Push single chunk forward when user needs rest
  const handleRescheduleSlot = (slotId: string) => {
    const slotToMove = slots.find(s => s.id === slotId);
    if (!slotToMove) return;

    // Filter out this uncompleted slot and recalculate starting tomorrow
    const remainingSlots = slots.filter(s => s.id !== slotId);
    const recalculated = recalculateSchedule(
      tasks, 
      events, 
      settings, 
      remainingSlots.filter(s => s.isCompleted),
      new Date()
    );

    setSlots(recalculated);
    saveSlots(recalculated);
  };

  // Full re-balance across available horizon
  const handleRebalance = () => {
    const rebalanced = recalculateSchedule(tasks, events, settings, slots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Cognitive Triage & Schedule Reflow Execution
  const handleApplyTriage = (
    updatedTasks: WorkTask[],
    rebalancedSlots: ScheduledSlot[],
    toast: string
  ) => {
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setSlots(rebalancedSlots);
    saveSlots(rebalancedSlots);
    setToastMessage(toast);
  };

  // Helper to vanish ONLY default/sample items when user begins using Cadence
  const vanishDefaults = () => {
    const userTasks = tasks.filter(t => !isDefaultItem(t));
    const userEvents = events.filter(e => !isDefaultItem(e));
    const userSlots = slots.filter(s => !isDefaultItem(s) && userTasks.some(ut => ut.id === s.workTaskId));
    
    setIsSampleSchedule(false);
    saveIsSampleSchedule(false);

    return { userTasks, userEvents, userSlots };
  };

  // 1-Click Clear Sample Schedule & Start Mine
  const handleClearSampleSchedule = () => {
    const clean = clearSampleData(tasks, events, slots);
    setTasks(clean.tasks);
    setEvents(clean.events);
    setSlots(clean.slots);
    setIsSampleSchedule(false);
    setIsAddOpen(true); // immediately open the unified + add. modal!
  };

  // 1-Tap Daylight Match (Zero Typing):
  // Automatically generates a matching focus block in visitor's schedule during that open window,
  // saves instantly to localStorage, and highlights overlapping hours in warm amber.
  const handleMatchDaylight = (friendBlock: SquadFocusBlock) => {
    const { userTasks, userEvents, userSlots } = vanishDefaults();

    const cleanFriendTitle = cleanTaskTitle(friendBlock.title || 'Daylight Overlap');
    const matchedTitle = `⚡ Squad Co-Focus Sprint (${cleanFriendTitle})`;
    const sprintDuration = friendBlock.durationMinutes || 45;

    const newTaskId = `task-squad-${Date.now()}`;
    const newSlotId = `slot-squad-${Date.now()}`;

    const newTask: WorkTask = {
      id: newTaskId,
      title: matchedTitle,
      estimatedMinutes: sprintDuration,
      completedMinutes: 0,
      deadlineDate: todayKey,
      category: 'co-working',
      color: '#d97706',
      priority: 'high',
      status: 'active',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    const newSlot: ScheduledSlot = {
      id: newSlotId,
      workTaskId: newTaskId,
      workTitle: matchedTitle,
      category: 'co-working',
      color: '#d97706',
      date: todayKey,
      startTime: friendBlock.startTime,
      endTime: friendBlock.endTime,
      durationMinutes: sprintDuration,
      isCompleted: false,
      chunkNumber: 1,
      totalChunks: 1,
      isDefault: false,
    };

    // Filter out any duplicate slots starting at the exact same minute on today
    const remainingSlots = userSlots.filter(s => !(s.date === todayKey && s.startTime === friendBlock.startTime));
    const updatedSlots = [...remainingSlots, newSlot].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    const updatedTasks = [newTask, ...userTasks];

    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    setEvents(userEvents);
    saveEvents(userEvents);

    setSlots(updatedSlots);
    saveSlots(updatedSlots);

    setMatchedSlotId(newSlotId);

    // Update inbound squad payload with matched state and URL hash without reload
    if (inboundSquad) {
      const updatedSquad: SquadSharePayload = {
        ...inboundSquad,
        matched: true,
        matchedTime: `${friendBlock.startTime}–${friendBlock.endTime}`,
      };
      setInboundSquad(updatedSquad);
      const updatedHash = `#squad=${encodeSquadPayload(updatedSquad)}`;
      try {
        window.history.replaceState(null, '', updatedHash);
      } catch {
        window.location.hash = updatedHash;
      }
    }
  };

  const handleDismissInboundSquad = () => {
    setInboundSquad(null);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      window.location.hash = '';
    }
  };

  // Add work task - when user starts to use, all default tasks/slots vanish (ONLY the default ones)
  const handleAddWork = (taskData: Omit<WorkTask, 'id' | 'completedMinutes' | 'createdAt' | 'status'>) => {
    const { userTasks, userEvents, userSlots } = vanishDefaults();

    const newTask: WorkTask = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      completedMinutes: 0,
      status: 'active',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [newTask, ...userTasks];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    setEvents(userEvents);
    saveEvents(userEvents);

    // Immediately auto-spread and interleave new chunks strictly for user tasks!
    const rebalanced = recalculateSchedule(updatedTasks, userEvents, settings, userSlots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Delete work task
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    // Keep completed slots from other tasks, recalculate
    const filteredSlots = slots.filter(s => s.workTaskId !== taskId);
    const rebalanced = recalculateSchedule(updatedTasks, events, settings, filteredSlots.filter(s => s.isCompleted), new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Add life event - when user adds their own event, all default items vanish (ONLY the default ones)
  const handleAddEvent = (eventData: Omit<LifeEvent, 'id'>) => {
    const { userTasks, userEvents, userSlots } = vanishDefaults();

    const newEvent: LifeEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isDefault: false,
    };

    const updatedEvents = [newEvent, ...userEvents];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    setTasks(userTasks);
    saveTasks(userTasks);

    // Recalculate schedule taking event blackout window into account
    const rebalanced = recalculateSchedule(userTasks, updatedEvents, settings, userSlots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Delete life event
  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter(e => e.id !== eventId);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    // Unlink any tasks linked to this event
    const updatedTasks = tasks.map(t => 
      t.linkedEventId === eventId ? { ...t, linkedEventId: undefined } : t
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    const rebalanced = recalculateSchedule(updatedTasks, updatedEvents, settings, slots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Toggle What To Bring item
  const handleToggleWhatToBring = (eventId: string, itemId: string) => {
    const updatedEvents = events.map(ev => {
      if (ev.id === eventId) {
        const updatedItems = ev.whatToBring.map(item => 
          item.id === itemId ? { ...item, packed: !item.packed } : item
        );
        return { ...ev, whatToBring: updatedItems };
      }
      return ev;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  // Add What To Bring item
  const handleAddWhatToBringItem = (eventId: string, text: string) => {
    const updatedEvents = events.map(ev => {
      if (ev.id === eventId) {
        const newItem = {
          id: `bring-${Date.now()}`,
          text,
          packed: false,
        };
        return { ...ev, whatToBring: [...ev.whatToBring, newItem] };
      }
      return ev;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  // Delete What To Bring item
  const handleDeleteWhatToBringItem = (eventId: string, itemId: string) => {
    const updatedEvents = events.map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          whatToBring: ev.whatToBring.filter(item => item.id !== itemId),
        };
      }
      return ev;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  // Set date-specific day mode override (e.g. user marks specific calendar date as Full Free or Home)
  const handleSetDateSpecificMode = (dateKey: string, mode: DayMode | null) => {
    const currentOverrides = { ...(settings.dateSpecificModes || {}) };
    if (mode === null) {
      delete currentOverrides[dateKey];
    } else {
      currentOverrides[dateKey] = mode;
    }

    const updatedSettings: ScheduleSettings = {
      ...settings,
      dateSpecificModes: currentOverrides,
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    // Immediately recalculate schedule so tasks move off rest days or expand into home days!
    const rebalanced = recalculateSchedule(tasks, events, updatedSettings, slots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Save Settings
  const handleSaveSettings = (newSettings: ScheduleSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    const rebalanced = recalculateSchedule(tasks, events, newSettings, slots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);
  };

  // Import Outline / Course notes callback
  const handleImportOutlineTasks = (newTasks: WorkTask[], message: string) => {
    const updatedTasks = [...newTasks, ...tasks];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    const rebalanced = recalculateSchedule(updatedTasks, events, settings, slots, new Date());
    setSlots(rebalanced);
    saveSlots(rebalanced);

    setIsSampleSchedule(false);
    saveIsSampleSchedule(false);

    setToastMessage(message);
    setActiveTab('today');
  };

  // Smooth Peek at Tomorrow's Cadence Bridge
  const handlePeekTomorrow = () => {
    setActiveTab('schedule');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-[#FAF8F5]">
      {/* Top Navigation Bar with Single Clean + Add Action & Squad Radar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setIsAddOpen(true)}
        onOpenSquadRadar={() => setIsSquadRadarOpen(true)}
        onOpenCourseTemplate={() => setIsCourseTemplateOpen(true)}
        onOpenAddOns={() => setIsAddOnsOpen(true)}
        onOpenImportOutline={() => setIsImportOutlineOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-16">
        {/* Subtle, Non-Intrusive PWA Install Banner */}
        <InstallPromptBanner />

        {/* Course / Syllabus Template Loaded Banner */}
        {templateNotice && (
          <div className="mb-4 bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-serif text-emerald-950 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 text-base">
                📚
              </span>
              <div>
                <div className="font-semibold text-emerald-900 text-sm">
                  Loaded Course Template: {templateNotice.name}
                </div>
                <div className="text-emerald-700">
                  {templateNotice.taskCount} assignments & relative deadlines automatically populated into your daylight rhythm!
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTemplateNotice(null)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition-colors font-medium cursor-pointer shadow-2xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {activeTab === 'today' && (
          <TodayView
            todayKey={todayKey}
            slots={slots}
            tasks={tasks}
            events={events}
            settings={settings}
            isSampleSchedule={isSampleSchedule}
            inboundSquad={inboundSquad}
            matchedSlotId={matchedSlotId}
            onClearSample={handleClearSampleSchedule}
            onToggleSlotComplete={handleToggleSlotComplete}
            onStartFocus={(slot, mode = 'focus') => {
              setActiveFocusSlot(slot);
              setFocusTimerMode(mode);
            }}
            onRescheduleSlot={handleRescheduleSlot}
            onOpenAdd={() => setIsAddOpen(true)}
            onOpenSquadRadar={() => setIsSquadRadarOpen(true)}
            onPeekTomorrow={handlePeekTomorrow}
            onToggleWhatToBring={handleToggleWhatToBring}
            onRebalance={handleRebalance}
            onApplyTriage={handleApplyTriage}
            onMatchDaylight={handleMatchDaylight}
            onDismissInboundSquad={handleDismissInboundSquad}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            todayKey={todayKey}
            slots={slots}
            tasks={tasks}
            events={events}
            settings={settings}
            isSampleSchedule={isSampleSchedule}
            onClearSample={handleClearSampleSchedule}
            onToggleSlotComplete={handleToggleSlotComplete}
            onStartFocus={slot => {
              setActiveFocusSlot(slot);
              setFocusTimerMode('focus');
            }}
            onToggleWhatToBring={handleToggleWhatToBring}
            onRebalance={handleRebalance}
            onApplyTriage={handleApplyTriage}
            onSetDateSpecificMode={handleSetDateSpecificMode}
            onOpenCourseTemplate={() => setIsCourseTemplateOpen(true)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksEventsView
            tasks={tasks}
            events={events}
            slots={slots}
            isSampleSchedule={isSampleSchedule}
            onClearSample={handleClearSampleSchedule}
            onOpenAddWork={() => setIsAddOpen(true)}
            onOpenAddEvent={() => setIsAddOpen(true)}
            onOpenCourseTemplate={() => setIsCourseTemplateOpen(true)}
            onDeleteTask={handleDeleteTask}
            onDeleteEvent={handleDeleteEvent}
            onToggleWhatToBring={handleToggleWhatToBring}
            onAddWhatToBringItem={handleAddWhatToBringItem}
            onDeleteWhatToBringItem={handleDeleteWhatToBringItem}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onOpenLegal={() => setIsLegalModalOpen(true)}
          />
        )}
      </main>

      {/* Sanctuary Footer with Legal & MIT License */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-xs font-serif text-stone-400 flex flex-wrap items-center justify-center gap-2 sm:gap-3 border-t border-stone-200/50 mt-12 mb-16 sm:mb-6">
        <span>cadence. sanctuary — zero spam, gentle human coordination</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setIsLegalModalOpen(true)}
          className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 underline decoration-stone-300 underline-offset-2 transition-colors cursor-pointer not-italic font-sans"
        >
          ⚖️ Legal & MIT License
        </button>
      </footer>

      {/* Mobile Ergonomic Bottom Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Unified Add Modal (Consolidated + Work and + Event) */}
      {isAddOpen && (
        <UnifiedAddModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAddWork={handleAddWork}
          onAddEvent={handleAddEvent}
          events={events}
          settings={settings}
          isSampleSchedule={isSampleSchedule}
        />
      )}

      {/* Squad Overlap Radar & Mobile Pair (1-Tap WhatsApp/Telegram/QR Sharing Loop) */}
      {isSquadRadarOpen && (
        <SquadRadarModal
          isOpen={isSquadRadarOpen}
          onClose={() => setIsSquadRadarOpen(false)}
          slots={slots}
          events={events}
          settings={settings}
          todayKey={todayKey}
          tasks={tasks}
          isPro={addons.importer}
          onOpenAddOns={() => setIsAddOnsOpen(true)}
          onOpenLegal={() => setIsLegalModalOpen(true)}
        />
      )}

      {/* Legal & MIT License Modal */}
      {isLegalModalOpen && (
        <React.Suspense fallback={null}>
          <LegalLicenseModal
            isOpen={isLegalModalOpen}
            onClose={() => setIsLegalModalOpen(false)}
          />
        </React.Suspense>
      )}

      {/* Course / Syllabus Template Modal */}
      {isCourseTemplateOpen && (
        <CourseTemplateModal
          isOpen={isCourseTemplateOpen}
          onClose={() => setIsCourseTemplateOpen(false)}
          tasks={tasks}
          events={events}
          todayKey={todayKey}
        />
      )}

      {/* Serene Focus Timer */}
      {activeFocusSlot && (
        <FocusTimerModal
          slot={activeFocusSlot}
          initialMode={focusTimerMode}
          onClose={() => setActiveFocusSlot(null)}
          onCompleteSlot={slotId => {
            handleToggleSlotComplete(slotId);
            setActiveFocusSlot(null);
          }}
          breakDurationMinutes={settings.breakIntervalMinutes}
        />
      )}

      {/* Cadence Pro Modal */}
      <AddOnsModal
        isOpen={isAddOnsOpen}
        onClose={() => setIsAddOnsOpen(false)}
        onStatusChange={(newStatus) => setAddons(newStatus)}
      />

      {/* Fast Course Notes / Outline Importer */}
      <ImportOutlineModal
        isOpen={isImportOutlineOpen}
        onClose={() => setIsImportOutlineOpen(false)}
        isImporterUnlocked={addons.importer}
        onOpenAddOns={() => setIsAddOnsOpen(true)}
        onImportTasks={handleImportOutlineTasks}
        todayKey={todayKey}
      />

      {/* Clean Re-alignment & Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-4.5 py-3 rounded-2xl bg-stone-900/95 text-white text-xs sm:text-sm font-serif shadow-2xl border border-stone-800 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="tracking-tight">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="ml-2 text-stone-400 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
