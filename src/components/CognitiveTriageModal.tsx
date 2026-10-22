import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, Check, AlertTriangle, ArrowRight, Sparkles, Shield, RotateCcw } from 'lucide-react';
import { WorkTask, LifeEvent, ScheduledSlot, ScheduleSettings } from '../types';
import { 
  formatDateKey, 
  parseDateKey, 
  addDays, 
  calculateTodayCapacity, 
  recalculateSchedule,
  TodayCapacityMetrics 
} from '../utils/scheduler';
import { cleanTaskTitle } from '../utils/format';

interface CognitiveTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: WorkTask[];
  events: LifeEvent[];
  slots: ScheduledSlot[];
  settings: ScheduleSettings;
  onApplyTriage: (updatedTasks: WorkTask[], rebalancedSlots: ScheduledSlot[], toastMessage: string) => void;
}

type DeferralAction = 'keep' | 'tomorrow' | 'plus2' | 'custom';

interface TaskTriageState {
  taskId: string;
  action: DeferralAction;
  customDate: string;
}

export const CognitiveTriageModal: React.FC<CognitiveTriageModalProps> = ({
  isOpen,
  onClose,
  tasks,
  events,
  slots,
  settings,
  onApplyTriage,
}) => {
  const today = useMemo(() => new Date(), [isOpen]);
  const todayKey = formatDateKey(today);
  const tomorrowKey = formatDateKey(addDays(today, 1));
  const plus2Key = formatDateKey(addDays(today, 2));

  // 1. Capacity & Reality Calculation
  const capacityMetrics: TodayCapacityMetrics = useMemo(() => {
    return calculateTodayCapacity(settings, events, slots, today);
  }, [settings, events, slots, today]);

  // Tasks queued for today with pending chunks
  const tasksForToday = useMemo(() => {
    const todayPendingSlots = slots.filter(s => s.date === todayKey && !s.isCompleted && !s.isUnscheduled);
    
    // Group chunk counts by workTaskId
    const chunkCounts: Record<string, number> = {};
    for (const slot of todayPendingSlots) {
      chunkCounts[slot.workTaskId] = (chunkCounts[slot.workTaskId] || 0) + 1;
    }

    return tasks
      .filter(t => t.status === 'active' && chunkCounts[t.id] && chunkCounts[t.id] > 0)
      .map(task => {
        const pendingCount = chunkCounts[task.id] || 0;
        const chunkSize = settings.focusBlockMinutes;
        const totalChunksNeeded = Math.ceil((task.estimatedMinutes - task.completedMinutes) / chunkSize);
        return {
          task,
          pendingTodayChunks: pendingCount,
          totalRemainingChunks: Math.max(pendingCount, totalChunksNeeded),
        };
      });
  }, [tasks, slots, todayKey, settings.focusBlockMinutes]);

  // Local deferral selections
  const [triageStates, setTriageStates] = useState<Record<string, TaskTriageState>>({});

  // Reset triage states when modal opens or tasksForToday change
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, TaskTriageState> = {};
      for (const item of tasksForToday) {
        initial[item.task.id] = {
          taskId: item.task.id,
          action: 'keep',
          customDate: tomorrowKey,
        };
      }
      setTriageStates(initial);
    }
  }, [isOpen, tasksForToday, tomorrowKey]);

  if (!isOpen) return null;

  const setTaskAction = (taskId: string, action: DeferralAction) => {
    setTriageStates(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || { taskId, customDate: tomorrowKey }),
        action,
      },
    }));
  };

  const setTaskCustomDate = (taskId: string, customDate: string) => {
    setTriageStates(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || { taskId, action: 'custom' }),
        action: 'custom',
        customDate,
      },
    }));
  };

  // Live calculation of chunks kept for today
  const keptChunksCount = tasksForToday.reduce((sum, item) => {
    const state = triageStates[item.task.id];
    if (!state || state.action === 'keep') {
      return sum + item.pendingTodayChunks;
    }
    return sum;
  }, 0);

  const deferredCount = tasksForToday.reduce((sum, item) => {
    const state = triageStates[item.task.id];
    if (state && state.action !== 'keep') {
      return sum + item.pendingTodayChunks;
    }
    return sum;
  }, 0);

  const openCapacity = capacityMetrics.remainingOpenSlotsCount;
  const isOverCapacity = keptChunksCount > openCapacity;
  const isPerfectMatch = keptChunksCount === openCapacity && openCapacity > 0;
  const hasBreathingRoom = keptChunksCount < openCapacity;

  // Execute Schedule Reflow
  const handleApplyRebalance = () => {
    const updatedTasks: WorkTask[] = tasks.map(task => {
      const state = triageStates[task.id];
      if (!state || state.action === 'keep') {
        return task;
      }

      let deferredTargetDate = tomorrowKey;
      if (state.action === 'tomorrow') {
        deferredTargetDate = tomorrowKey;
      } else if (state.action === 'plus2') {
        deferredTargetDate = plus2Key;
      } else if (state.action === 'custom' && state.customDate) {
        deferredTargetDate = state.customDate;
      }

      // Update deadline if target is on or past deadline
      let newDeadline = task.deadlineDate;
      const minDeadline = settings.finishDayBeforeDeadline
        ? formatDateKey(addDays(parseDateKey(deferredTargetDate), 1))
        : deferredTargetDate;
      if (newDeadline < minDeadline) {
        newDeadline = minDeadline;
      }

      return {
        ...task,
        deferredUntilDate: deferredTargetDate,
        deadlineDate: newDeadline,
      };
    });

    // Run autonomous scheduler with EDF priority across remaining open daylight slots
    const rebalancedSlots = recalculateSchedule(
      updatedTasks,
      events,
      settings,
      slots.filter(s => s.isCompleted), // preserve completed slots
      today
    );

    onApplyTriage(
      updatedTasks,
      rebalancedSlots,
      'Cadence re-aligned. Focus on what truly matters today.'
    );

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full p-4.5 sm:p-7 shadow-2xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>Cognitive Triage & Daylight Reality Check</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              Re-align Today's Cadence
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Capacity & Reality Calculation Card */}
        <div className="space-y-3 p-4 rounded-2xl bg-white/80 border border-stone-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 text-xs font-serif font-semibold">
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                <span>Clock: {capacityMetrics.currentClockTimeStr}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-serif font-medium">
                <Shield className="w-3 h-3 text-amber-700" />
                <span>Daylight Reality</span>
              </span>
            </div>

            {/* Capacity Badge */}
            <div className="text-xs font-serif font-medium text-stone-700">
              Remaining Capacity: <strong className="text-stone-900 font-mono">{openCapacity} slots</strong> ({capacityMetrics.remainingMinutesAvailable}m available)
            </div>
          </div>

          {/* Live Capacity Meter */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-serif">
              <span className="text-stone-600">Today's workload vs reality:</span>
              <span className={`font-mono font-semibold ${
                isOverCapacity ? 'text-amber-800' : isPerfectMatch ? 'text-emerald-700' : 'text-stone-700'
              }`}>
                {keptChunksCount} chunks planned / {openCapacity} open slots
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-stone-200/70 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  isOverCapacity 
                    ? 'bg-amber-600' 
                    : isPerfectMatch 
                    ? 'bg-emerald-600' 
                    : 'bg-stone-800'
                }`}
                style={{ 
                  width: `${openCapacity > 0 ? Math.min(100, (keptChunksCount / openCapacity) * 100) : (keptChunksCount > 0 ? 100 : 0)}%` 
                }}
              />
            </div>

            {/* Dynamic Status Callout */}
            <div className={`p-2.5 rounded-xl text-xs font-serif flex items-start gap-2 ${
              isOverCapacity 
                ? 'bg-amber-50 border border-amber-200/80 text-amber-900' 
                : isPerfectMatch 
                ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-900' 
                : 'bg-stone-50 border border-stone-200/70 text-stone-700'
            }`}>
              {isOverCapacity ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Over capacity by {keptChunksCount - openCapacity} chunk{keptChunksCount - openCapacity > 1 ? 's' : ''}.</strong> Defer non-critical tasks to tomorrow or later to make your day completely calm and achievable.
                  </div>
                </>
              ) : isPerfectMatch ? (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>{keptChunksCount} of {openCapacity} slots filled — perfectly balanced!</strong> Every focus chunk will fit inside your available daylight without stress.
                  </div>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>{keptChunksCount} of {openCapacity} slots filled.</strong> You have {openCapacity - keptChunksCount} open buffer slot{openCapacity - keptChunksCount > 1 ? 's' : ''} for rest, spontaneous breaks, or overruns.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Interactive Task Triage List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-semibold text-stone-700 uppercase tracking-wider">
              Pending Focus Tasks for Today ({tasksForToday.length})
            </h3>
            {deferredCount > 0 && (
              <span className="text-xs font-serif text-stone-500">
                {deferredCount} chunk{deferredCount > 1 ? 's' : ''} deferred
              </span>
            )}
          </div>

          {tasksForToday.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-stone-100/70 border border-stone-200/80 text-xs font-serif text-stone-600">
              No pending focus blocks queued for today. You are completely on track!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
              {tasksForToday.map(({ task, pendingTodayChunks, totalRemainingChunks }) => {
                const state = triageStates[task.id] || { taskId: task.id, action: 'keep', customDate: tomorrowKey };
                const isDeferred = state.action !== 'keep';

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDeferred
                        ? 'bg-stone-100/60 border-stone-200/70 opacity-80'
                        : 'bg-white border-stone-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-medium text-sm text-stone-900">
                            {cleanTaskTitle(task.title)}
                          </span>
                          <span className="text-[10px] font-serif uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                            {task.category || 'work'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-serif text-stone-500 flex-wrap">
                          <span>
                            Today: <strong className="text-stone-800 font-mono">{pendingTodayChunks} block{pendingTodayChunks > 1 ? 's' : ''}</strong> ({pendingTodayChunks * settings.focusBlockMinutes}m)
                          </span>
                          <span>·</span>
                          <span>Deadline: <span className="font-mono text-stone-700">{task.deadlineDate}</span></span>
                          {totalRemainingChunks > pendingTodayChunks && (
                            <>
                              <span>·</span>
                              <span>Total: {totalRemainingChunks} blocks</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Deferral Status Tag */}
                      {isDeferred && (
                        <span className="self-start text-[11px] font-serif px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 font-medium">
                          {state.action === 'tomorrow' && 'Deferred to Tomorrow'}
                          {state.action === 'plus2' && 'Deferred +2 Days'}
                          {state.action === 'custom' && `Deferred to ${state.customDate}`}
                        </span>
                      )}
                    </div>

                    {/* Quick 1-Tap Deferral Button Strip */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTaskAction(task.id, 'keep')}
                        className={`px-3 py-1.5 text-xs font-serif rounded-xl border transition-all cursor-pointer ${
                          state.action === 'keep'
                            ? 'bg-stone-900 text-white font-medium border-stone-900 shadow-2xs'
                            : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 border-stone-200'
                        }`}
                      >
                        Keep Today
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskAction(task.id, 'tomorrow')}
                        className={`px-3 py-1.5 text-xs font-serif rounded-xl border transition-all cursor-pointer ${
                          state.action === 'tomorrow'
                            ? 'bg-amber-900 text-white font-medium border-amber-900 shadow-2xs'
                            : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 border-stone-200'
                        }`}
                      >
                        ⏳ Defer to Tomorrow
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskAction(task.id, 'plus2')}
                        className={`px-3 py-1.5 text-xs font-serif rounded-xl border transition-all cursor-pointer ${
                          state.action === 'plus2'
                            ? 'bg-amber-900 text-white font-medium border-amber-900 shadow-2xs'
                            : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 border-stone-200'
                        }`}
                      >
                        ⏳ Defer +2 Days
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskAction(task.id, 'custom')}
                        className={`px-3 py-1.5 text-xs font-serif rounded-xl border transition-all cursor-pointer ${
                          state.action === 'custom'
                            ? 'bg-stone-900 text-white font-medium border-stone-900 shadow-2xs'
                            : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80 border-stone-200'
                        }`}
                      >
                        Custom Date
                      </button>

                      {/* Custom Date Input */}
                      {state.action === 'custom' && (
                        <input
                          type="date"
                          min={tomorrowKey}
                          value={state.customDate || tomorrowKey}
                          onChange={e => setTaskCustomDate(task.id, e.target.value)}
                          className="px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded-lg text-stone-800"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs font-serif text-stone-500">
            Earliest Deadline First (EDF) protects upcoming commitments.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-serif text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyRebalance}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[42px]"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply Re-alignment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
