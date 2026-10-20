import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TodayView } from './components/TodayView';
import { ScheduleView } from './components/ScheduleView';
import { TasksEventsView } from './components/TasksEventsView';
import { SettingsView } from './components/SettingsView';
import { UnifiedAddModal } from './components/UnifiedAddModal';
import { SquadRadarModal } from './components/SquadRadarModal';
import { FocusTimerModal } from './components/FocusTimerModal';
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
import { parseSquadFromUrl, encodeSquadPayload } from './utils/squad';

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
  const [activeFocusSlot, setActiveFocusSlot] = useState<ScheduledSlot | null>(null);
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    document.title = 'cadence. — sanctuary workload scheduler';

    // Check for #squad= on mount or on hash changes
    const handleCheckHash = () => {
      const parsed = parseSquadFromUrl();
      if (parsed) {
        setInboundSquad(parsed);
        // Requirement 1: strictly keep visitor on "today." view and skip sample schedule
        setActiveTab('today');
        setIsSampleSchedule(false);
        saveIsSampleSchedule(false);
      }
    };

    handleCheckHash();
    window.addEventListener('hashchange', handleCheckHash);
    return () => window.removeEventListener('hashchange', handleCheckHash);
  }, []);

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

    const cleanFriendTitle = (friendBlock.title || 'Daylight Overlap')
      .replace(/\s*—\s*\d+h(\s*\d+m)?|\s*—\s*\d+m/gi, '')
      .trim();
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

  // Smooth Peek at Tomorrow's Cadence Bridge
  const handlePeekTomorrow = () => {
    setActiveTab('schedule');
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-[#faf7f2]">
      {/* Top Navigation Bar with Single Clean + Add Action & Squad Radar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setIsAddOpen(true)}
        onOpenSquadRadar={() => setIsSquadRadarOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-16">
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
            onStartFocus={slot => setActiveFocusSlot(slot)}
            onRescheduleSlot={handleRescheduleSlot}
            onOpenAdd={() => setIsAddOpen(true)}
            onOpenSquadRadar={() => setIsSquadRadarOpen(true)}
            onPeekTomorrow={handlePeekTomorrow}
            onToggleWhatToBring={handleToggleWhatToBring}
            onRebalance={handleRebalance}
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
            onStartFocus={slot => setActiveFocusSlot(slot)}
            onToggleWhatToBring={handleToggleWhatToBring}
            onRebalance={handleRebalance}
            onSetDateSpecificMode={handleSetDateSpecificMode}
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
          />
        )}
      </main>

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

      {/* Squad Overlap Radar (1-Tap WhatsApp/Telegram Sharing Loop) */}
      {isSquadRadarOpen && (
        <SquadRadarModal
          isOpen={isSquadRadarOpen}
          onClose={() => setIsSquadRadarOpen(false)}
          slots={slots}
          events={events}
          settings={settings}
          todayKey={todayKey}
        />
      )}

      {/* Serene Focus Timer */}
      {activeFocusSlot && (
        <FocusTimerModal
          slot={activeFocusSlot}
          onClose={() => setActiveFocusSlot(null)}
          onCompleteSlot={slotId => {
            handleToggleSlotComplete(slotId);
            setActiveFocusSlot(null);
          }}
          breakDurationMinutes={settings.breakIntervalMinutes}
        />
      )}
    </div>
  );
}
