/**
 * storage.js — Persistence layer
 * Handles localStorage save/load and JSON import/export with validation
 */

const DATA_KEY = 'clp:tasks';
const SETTINGS_KEY = 'clp:settings';
const TAGS_KEY = 'clp:tags';
const THEME_KEY = 'clp:theme';

// ===== Default tags =====
const DEFAULT_TAGS = ['Study', 'Assignment', 'Club', 'Sports', 'Social', 'Errands', 'Other'];

// ===== Task data =====
export function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
  } catch {
    console.warn('Failed to parse tasks from localStorage');
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(DATA_KEY, JSON.stringify(tasks));
}

// ===== Settings =====
export function loadSettings() {
  try {
    const defaults = { durationUnit: 'minutes', weeklyCap: 0 };
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...defaults, ...stored };
  } catch {
    return { durationUnit: 'minutes', weeklyCap: 0 };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ===== Tags =====
export function loadTags() {
  try {
    const stored = JSON.parse(localStorage.getItem(TAGS_KEY));
    return Array.isArray(stored) && stored.length > 0 ? stored : [...DEFAULT_TAGS];
  } catch {
    return [...DEFAULT_TAGS];
  }
}

export function saveTags(tags) {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

// ===== Theme =====
export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

// ===== JSON Import Validation =====
/**
 * Validates an imported JSON array of tasks.
 * Returns { valid: boolean, data: [], errors: [] }
 */
export function validateImport(json) {
  const errors = [];

  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    return { valid: false, data: [], errors: ['Invalid JSON: ' + e.message] };
  }

  if (!Array.isArray(data)) {
    return { valid: false, data: [], errors: ['Data must be an array of task objects.'] };
  }

  const validTasks = [];

  data.forEach((item, i) => {
    const issues = [];

    if (!item || typeof item !== 'object') {
      errors.push(`Item ${i}: Not a valid object.`);
      return;
    }

    // Required fields
    if (typeof item.id !== 'string' || !item.id.trim()) {
      issues.push('missing or invalid id');
    }
    if (typeof item.title !== 'string' || !item.title.trim()) {
      issues.push('missing or invalid title');
    }
    if (typeof item.duration !== 'number' || item.duration < 0) {
      issues.push('missing or invalid duration (must be non-negative number)');
    }
    if (typeof item.tag !== 'string' || !item.tag.trim()) {
      issues.push('missing or invalid tag');
    }
    if (typeof item.dueDate !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.dueDate)) {
      issues.push('missing or invalid dueDate (YYYY-MM-DD)');
    }

    if (issues.length > 0) {
      errors.push(`Item ${i} (${item.id || 'no-id'}): ${issues.join(', ')}`);
    } else {
      // Normalize: ensure timestamps
      validTasks.push({
        id: item.id,
        title: item.title.trim(),
        dueDate: item.dueDate,
        duration: Number(item.duration),
        tag: item.tag.trim(),
        notes: (item.notes || '').trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      });
    }
  });

  return {
    valid: errors.length === 0,
    data: validTasks,
    errors
  };
}

// ===== JSON Export =====
export function exportJSON(tasks) {
  return JSON.stringify(tasks, null, 2);
}

// ===== Clear all data =====
export function clearAllData() {
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(TAGS_KEY);
}