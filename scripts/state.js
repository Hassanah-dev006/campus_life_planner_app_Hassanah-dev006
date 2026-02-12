/**
 * state.js — Centralized state management
 * Manages tasks, settings, tags with auto-save to localStorage
 */

import { loadTasks, saveTasks, loadSettings, saveSettings, loadTags, saveTags } from './storage.js';

class AppState {
  constructor() {
    this.tasks = loadTasks();
    this.settings = loadSettings();
    this.tags = loadTags();
    this._listeners = [];
  }

  // ===== Event system =====
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _notify(event, data) {
    this._listeners.forEach(fn => fn(event, data));
  }

  // ===== Tasks CRUD =====
  addTask(task) {
    const now = new Date().toISOString();
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: task.title.trim(),
      dueDate: task.date,
      duration: parseFloat(task.duration),
      tag: task.tag.trim(),
      notes: (task.notes || '').trim(),
      createdAt: now,
      updatedAt: now
    };
    this.tasks.unshift(newTask);
    saveTasks(this.tasks);
    this._notify('taskAdded', newTask);
    return newTask;
  }

  updateTask(id, updates) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    this.tasks[idx] = {
      ...this.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveTasks(this.tasks);
    this._notify('taskUpdated', this.tasks[idx]);
    return this.tasks[idx];
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    const removed = this.tasks.splice(idx, 1)[0];
    saveTasks(this.tasks);
    this._notify('taskDeleted', removed);
    return true;
  }

  getTask(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  replaceTasks(tasks) {
    this.tasks = tasks;
    saveTasks(this.tasks);
    this._notify('tasksReplaced', tasks);
  }

  // ===== Sorting =====
  sortTasks(field, direction = 'asc') {
    const dir = direction === 'asc' ? 1 : -1;
    const sorted = [...this.tasks].sort((a, b) => {
      let valA, valB;
      switch (field) {
        case 'date':
          valA = a.dueDate;
          valB = b.dueDate;
          break;
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'duration':
          valA = a.duration;
          valB = b.duration;
          break;
        default:
          return 0;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
    return sorted;
  }

  // ===== Stats =====
  getStats() {
    const total = this.tasks.length;
    const totalDuration = this.tasks.reduce((sum, t) => sum + t.duration, 0);

    // Top tag
    const tagCounts = {};
    this.tasks.forEach(t => {
      tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1;
    });
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

    // Tag durations for breakdown
    const tagDurations = {};
    this.tasks.forEach(t => {
      tagDurations[t.tag] = (tagDurations[t.tag] || 0) + t.duration;
    });

    // Last 7 days trend
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = this.tasks.filter(t => t.dueDate === dateStr);
      const dayDuration = dayTasks.reduce((sum, t) => sum + t.duration, 0);
      last7.push({
        date: dateStr,
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        duration: dayDuration,
        count: dayTasks.length
      });
    }

    // Weekly total for cap
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().split('T')[0];
    const weeklyDuration = this.tasks
      .filter(t => t.dueDate >= weekStr)
      .reduce((sum, t) => sum + t.duration, 0);

    return {
      total,
      totalDuration,
      topTag: topTag ? topTag[0] : '—',
      tagCounts,
      tagDurations,
      last7,
      weeklyDuration,
      weeklyCap: this.settings.weeklyCap
    };
  }

  // ===== Settings =====
  updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };
    saveSettings(this.settings);
    this._notify('settingsUpdated', this.settings);
  }

  // ===== Tags =====
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      saveTags(this.tags);
      this._notify('tagsUpdated', this.tags);
    }
  }

  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    saveTags(this.tags);
    this._notify('tagsUpdated', this.tags);
  }

  // ===== Clear =====
  clearAll() {
    this.tasks = [];
    this.settings = { durationUnit: 'minutes', weeklyCap: 0 };
    this.tags = ['Study', 'Assignment', 'Club', 'Sports', 'Social', 'Errands', 'Other'];
    saveTasks(this.tasks);
    saveSettings(this.settings);
    saveTags(this.tags);
    this._notify('cleared', null);
  }
}

// Singleton
const state = new AppState();
export default state;