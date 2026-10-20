import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Link as LinkIcon, 
  Package, 
  MapPin, 
  X,
  AlertCircle,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { WorkTask, LifeEvent, ScheduledSlot, WhatToBringItem } from '../types';

interface TasksEventsViewProps {
  tasks: WorkTask[];
  events: LifeEvent[];
  slots: ScheduledSlot[];
  isSampleSchedule?: boolean;
  onClearSample?: () => void;
  onOpenAddWork: () => void;
  onOpenAddEvent: () => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onToggleWhatToBring: (eventId: string, itemId: string) => void;
  onAddWhatToBringItem: (eventId: string, text: string) => void;
  onDeleteWhatToBringItem: (eventId: string, itemId: string) => void;
}

export const TasksEventsView: React.FC<TasksEventsViewProps> = ({
  tasks,
  events,
  slots,
  isSampleSchedule,
  onClearSample,
  onOpenAddWork,
  onOpenAddEvent,
  onDeleteTask,
  onDeleteEvent,
  onToggleWhatToBring,
  onAddWhatToBringItem,
  onDeleteWhatToBringItem,
}) => {
  const [subTab, setSubTab] = useState<'works' | 'events'>('works');
  const [newBringItemText, setNewBringItemText] = useState<{ [eventId: string]: string }>({});

  const handleAddBringItem = (eventId: string) => {
    const text = (newBringItemText[eventId] || '').trim();
    if (!text) return;
    onAddWhatToBringItem(eventId, text);
    setNewBringItemText(prev => ({ ...prev, [eventId]: '' }));
  };

  return (
    <div className="space-y-8 pb-12 text-stone-900">
      {/* 1-Tap Sample Rhythm Handover Banner */}
      {isSampleSchedule && (
        <div className="bg-[#f4f1ea] border border-stone-200/90 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-serif text-stone-700 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>🌱</span>
            <span>default sanctuary cadence • everyday has sample work • vanishes automatically as you start adding your own</span>
          </div>
          {onClearSample && (
            <button
              onClick={onClearSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>start mine (vanish defaults)</span>
            </button>
          )}
        </div>
      )}

      {/* Header and Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-serif text-stone-500">
            locked cadence directory.
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-stone-900 mt-1">
            cadence list.
          </h1>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSubTab('works')}
            className={`px-4 py-2 text-xs font-serif rounded-lg transition-colors cursor-pointer min-h-[38px] ${
              subTab === 'works'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            works. ({tasks.length})
          </button>
          <button
            onClick={() => setSubTab('events')}
            className={`px-4 py-2 text-xs font-serif rounded-lg transition-colors cursor-pointer min-h-[38px] ${
              subTab === 'events'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            events & packing. ({events.length})
          </button>
        </div>
      </div>

      {/* WORKS SUB-TAB */}
      {subTab === 'works' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Each task is automatically broken down and spread across your available evening/home slots before its deadline.
            </p>
            <button
              onClick={onOpenAddWork}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shrink-0 min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Work</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3">
              <div className="text-stone-400">No active work tasks found.</div>
              <button
                onClick={onOpenAddWork}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
              >
                + Add Your First Work
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map(task => {
                const taskSlots = slots.filter(s => s.workTaskId === task.id);
                const completedSlots = taskSlots.filter(s => s.isCompleted);
                const doneMin = completedSlots.reduce((a, b) => a + b.durationMinutes, 0);
                const percent = Math.min(100, Math.round((doneMin / task.estimatedMinutes) * 100));
                const linkedEvent = events.find(e => e.id === task.linkedEventId);

                return (
                  <div
                    key={task.id}
                    className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="font-medium text-stone-700">{task.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{task.estimatedMinutes} min estimated</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{task.priority} priority</span>
                          </div>
                          <h3 className="text-base font-bold text-stone-900 mt-1">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-stone-600 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="text-stone-300 hover:text-rose-600 transition-colors p-1"
                          title="Delete work"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Linked event notification */}
                      {linkedEvent && (
                        <div className="bg-stone-50 rounded-xl p-2.5 flex items-center gap-2 text-xs text-stone-700">
                          <LinkIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>
                            Linked Event:{' '}
                            <span className="font-semibold text-stone-900">{linkedEvent.title}</span> (
                            {linkedEvent.date})
                          </span>
                        </div>
                      )}

                      {/* Deadline & Target finish */}
                      <div className="text-xs text-stone-500 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>Deadline: <span className="font-semibold text-stone-800">{task.deadlineDate}</span></span>
                          <span className="text-emerald-700 font-medium">Auto-finishes before day</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Slots summary */}
                    <div className="pt-3 border-t border-stone-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-stone-800">{percent}% complete</span>
                        <span className="text-stone-500">
                          {completedSlots.length} of {taskSlots.length} chunks done
                        </span>
                      </div>
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-900 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EVENTS SUB-TAB */}
      {subTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Add your upcoming lectures, meetings, outings, or exams. Prepare "what to bring" so nothing is forgotten.
            </p>
            <button
              onClick={onOpenAddEvent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shrink-0 min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3">
              <div className="text-stone-400">No upcoming events scheduled.</div>
              <button
                onClick={onOpenAddEvent}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
              >
                + Add Your First Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(event => {
                const linkedTasks = tasks.filter(t => t.linkedEventId === event.id);
                const packedCount = event.whatToBring.filter(i => i.packed).length;

                return (
                  <div
                    key={event.id}
                    className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="font-semibold text-stone-900">{event.date}</span>
                            <span aria-hidden="true">·</span>
                            <span>{event.time}</span>
                            <span aria-hidden="true">·</span>
                            <span>{event.durationMinutes} min</span>
                          </div>
                          <h3 className="text-base font-bold text-stone-900 mt-1">{event.title}</h3>
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.notes && (
                            <p className="text-xs text-stone-500 mt-1">{event.notes}</p>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteEvent(event.id)}
                          className="text-stone-300 hover:text-rose-600 transition-colors p-1"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Linked Tasks */}
                      {linkedTasks.length > 0 && (
                        <div className="bg-stone-50 rounded-xl p-2.5 text-xs text-stone-700 space-y-1">
                          <span className="font-semibold text-stone-900">
                            Work preparing for this event ({linkedTasks.length}):
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                            {linkedTasks.map(t => (
                              <li key={t.id}>{t.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* What To Bring Checklist */}
                      <div className="pt-3 border-t border-stone-100 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-stone-600" />
                            <span>What To Bring Checklist</span>
                          </div>
                          <span className="text-stone-500 font-normal">
                            {packedCount}/{event.whatToBring.length} packed
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {event.whatToBring.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-stone-50 text-xs text-stone-800 transition-colors group"
                            >
                              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={item.packed}
                                  onChange={() => onToggleWhatToBring(event.id, item.id)}
                                  className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
                                />
                                <span className={item.packed ? 'line-through text-stone-400' : ''}>
                                  {item.text}
                                </span>
                              </label>

                              <button
                                onClick={() => onDeleteWhatToBringItem(event.id, item.id)}
                                className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 transition-opacity p-1"
                                title="Remove item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add new bring item input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add item to bring..."
                            value={newBringItemText[event.id] || ''}
                            onChange={e => setNewBringItemText({ ...newBringItemText, [event.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddBringItem(event.id);
                              }
                            }}
                            className="flex-1 px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
                          />
                          <button
                            onClick={() => handleAddBringItem(event.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
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
};
