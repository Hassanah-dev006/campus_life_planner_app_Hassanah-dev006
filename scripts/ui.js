/**
 * ui.js — DOM rendering & event handling
 * Manages all UI updates: records table/cards, dashboard stats, form, settings, navigation
 */

import state from './state.js';
import { validateField, validateForm } from './validators.js';
import { filterTasks, highlight, escapeHTML } from './search.js';
import { validateImport, exportJSON, loadTheme, saveTheme } from './storage.js';

// ===== DOM References =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Pages
const pages = {
  about: $('#about'),
  dashboard: $('#dashboard'),
  records: $('#records'),
  add: $('#add'),
  settings: $('#settings')
};

// Status regions
const statusPolite = $('#status-polite');
const statusAssertive = $('#status-assertive');

// State
let currentSort = { field: 'date', dir: 'desc' };
let currentSearch = '';
let caseSensitive = false;
let editingTaskId = null;   // tracks which row is being inline-edited (null = none)

// ===== Announce (A11y) =====
export function announce(message, priority = 'polite') {
  const el = priority === 'assertive' ? statusAssertive : statusPolite;
  el.textContent = '';
  // Force reannounce by clearing first
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

// ===== Duration conversion =====
function formatDuration(minutes) {
  const unit = state.settings.durationUnit;
  if (unit === 'hours') {
    const hours = (minutes / 60).toFixed(1);
    return `${hours} hr`;
  }
  return `${minutes} min`;
}

function getUnitLabel() {
  return state.settings.durationUnit === 'hours' ? 'hr' : 'min';
}

// ===== Navigation =====
export function initNav() {
  const navLinks = $$('.nav-link');
  const menuBtn = $('.mobile-menu-btn');
  const nav = $('#main-nav');

  // Nav click
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      // Close mobile menu
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Mobile menu toggle
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  // Handle click on data-page links elsewhere (like empty state)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (link && !link.classList.contains('nav-link')) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    }
  });

  // Keyboard nav — Escape closes mobile menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.focus();
    }
  });
}

export function navigateTo(page) {
  // Hide all pages
  Object.values(pages).forEach(p => {
    p.classList.remove('active');
    p.hidden = true;
  });

  // Show target
  if (pages[page]) {
    pages[page].classList.add('active');
    pages[page].hidden = false;
  }

  // Update nav active state
  $$('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Refresh content on page switch
  if (page === 'dashboard') renderDashboard();
  if (page === 'records') renderRecords();
  if (page === 'settings') renderSettings();
  if (page === 'add') resetForm();
}

// =============================================================================
//  RECORDS RENDERING — Table (desktop) + Cards (mobile)
// =============================================================================
export function renderRecords() {
  const sorted = state.sortTasks(currentSort.field, currentSort.dir);
  const { filtered, regex, error } = filterTasks(sorted, currentSearch, caseSensitive);

  // Search error
  const searchError = $('#search-error');
  if (error) {
    searchError.textContent = error;
    searchError.hidden = false;
  } else {
    searchError.hidden = true;
  }

  const tbody = $('#records-tbody');
  const cards = $('#records-cards');
  const empty = $('#empty-state');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    cards.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  // ---- Build table rows ----
  tbody.innerHTML = filtered.map(task =>
    editingTaskId === task.id
      ? renderTableRowEditing(task)
      : renderTableRow(task, regex)
  ).join('');

  // ---- Build mobile cards ----
  cards.innerHTML = filtered.map(task =>
    editingTaskId === task.id
      ? renderCardEditing(task)
      : renderCard(task, regex)
  ).join('');

  // Bind events
  bindRecordEvents();
}

// --------------- Normal display row ---------------
function renderTableRow(task, regex) {
  const title = highlight(task.title, regex);
  const tag = highlight(task.tag, regex);
  const notes = task.notes ? highlight(task.notes, regex) : '';
  const dur = formatDuration(task.duration);

  return `
    <tr data-id="${task.id}">
      <td>
        <span class="record-title">${title}</span>
        ${notes ? `<br><small style="color:var(--clr-text-muted)">${notes}</small>` : ''}
      </td>
      <td>${escapeHTML(task.dueDate)}</td>
      <td>${dur}</td>
      <td><span class="record-card-tag">${tag}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" aria-label="Edit ${escapeHTML(task.title)}" title="Edit">✏️</button>
          <button class="btn-icon btn-icon--danger btn-delete" aria-label="Delete ${escapeHTML(task.title)}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

// --------------- Inline-editing row (table) ---------------
function renderTableRowEditing(task) {
  return `
    <tr data-id="${task.id}" class="editing">
      <td>
        <input class="edit-input" data-field="title" value="${escapeHTML(task.title)}"
               aria-label="Edit title" placeholder="Title">
        <input class="edit-input" data-field="notes" value="${escapeHTML(task.notes || '')}"
               aria-label="Edit notes" placeholder="Notes (optional)" style="margin-top:4px;font-size:0.85rem">
      </td>
      <td>
        <input class="edit-input" data-field="dueDate" value="${escapeHTML(task.dueDate)}"
               aria-label="Edit due date" placeholder="YYYY-MM-DD">
      </td>
      <td>
        <input class="edit-input" data-field="duration" value="${task.duration}"
               aria-label="Edit duration" placeholder="Minutes" style="width:70px">
      </td>
      <td>
        <input class="edit-input" data-field="tag" value="${escapeHTML(task.tag)}"
               aria-label="Edit tag" placeholder="Tag" list="tag-suggestions">
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-icon--save btn-save" aria-label="Save changes" title="Save">💾</button>
          <button class="btn-icon btn-cancel-edit" aria-label="Cancel edit" title="Cancel">✖️</button>
        </div>
        <span class="inline-edit-error" role="alert" style="color:var(--clr-danger);font-size:0.78rem;display:block;margin-top:4px"></span>
      </td>
    </tr>
  `;
}

// --------------- Normal display card (mobile) ---------------
function renderCard(task, regex) {
  const title = highlight(task.title, regex);
  const tag = highlight(task.tag, regex);
  const dur = formatDuration(task.duration);

  return `
    <div class="record-card" data-id="${task.id}">
      <div class="record-card-header">
        <span class="record-card-title">${title}</span>
        <span class="record-card-tag">${tag}</span>
      </div>
      <div class="record-card-meta">
        <span>📅 ${escapeHTML(task.dueDate)}</span>
        <span>⏱️ ${dur}</span>
      </div>
      ${task.notes ? `<p style="font-size:0.85rem;color:var(--clr-text-muted);margin-bottom:var(--space-sm)">${highlight(task.notes, regex)}</p>` : ''}
      <div class="record-card-actions">
        <button class="btn-icon btn-edit" aria-label="Edit ${escapeHTML(task.title)}">✏️ Edit</button>
        <button class="btn-icon btn-icon--danger btn-delete" aria-label="Delete ${escapeHTML(task.title)}">🗑️ Delete</button>
      </div>
    </div>
  `;
}

// --------------- Inline-editing card (mobile) ---------------
function renderCardEditing(task) {
  return `
    <div class="record-card record-card--editing" data-id="${task.id}" style="border-color:var(--clr-primary);background:var(--clr-primary-light)">
      <div class="form-group" style="margin-bottom:var(--space-sm)">
        <label class="form-label" style="font-size:0.8rem">Title</label>
        <input class="edit-input form-input" data-field="title" value="${escapeHTML(task.title)}" aria-label="Edit title">
      </div>
      <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-sm)">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label" style="font-size:0.8rem">Due Date</label>
          <input class="edit-input form-input" data-field="dueDate" value="${escapeHTML(task.dueDate)}" aria-label="Edit due date" placeholder="YYYY-MM-DD">
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label" style="font-size:0.8rem">Duration (min)</label>
          <input class="edit-input form-input" data-field="duration" value="${task.duration}" aria-label="Edit duration">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:var(--space-sm)">
        <label class="form-label" style="font-size:0.8rem">Tag</label>
        <input class="edit-input form-input" data-field="tag" value="${escapeHTML(task.tag)}" aria-label="Edit tag" list="tag-suggestions">
      </div>
      <div class="form-group" style="margin-bottom:var(--space-sm)">
        <label class="form-label" style="font-size:0.8rem">Notes</label>
        <input class="edit-input form-input" data-field="notes" value="${escapeHTML(task.notes || '')}" aria-label="Edit notes">
      </div>
      <span class="inline-edit-error" role="alert" style="color:var(--clr-danger);font-size:0.78rem;display:block;margin-bottom:var(--space-sm)"></span>
      <div class="record-card-actions">
        <button class="btn-icon btn-icon--save btn-save" aria-label="Save changes">💾 Save</button>
        <button class="btn-icon btn-cancel-edit" aria-label="Cancel edit">✖️ Cancel</button>
      </div>
    </div>
  `;
}

// ===== Bind events on record rows/cards =====
function bindRecordEvents() {
  // Edit buttons — start inline editing
  $$('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      editingTaskId = id;
      renderRecords();
      // Focus first edit input in the editing row
      const firstInput = document.querySelector(`[data-id="${id}"] .edit-input`);
      if (firstInput) firstInput.focus();
      announce('Editing task inline. Press Enter to save or Escape to cancel.');
    });
  });

  // Save buttons — validate and commit inline edit
  $$('.btn-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      saveInlineEdit(e.target.closest('[data-id]'));
    });
  });

  // Cancel buttons — discard inline edit
  $$('.btn-cancel-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      editingTaskId = null;
      renderRecords();
      announce('Edit cancelled.');
    });
  });

  // Keyboard: Enter to save, Escape to cancel in editing rows
  document.querySelectorAll('.editing .edit-input, .record-card--editing .edit-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveInlineEdit(e.target.closest('[data-id]'));
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        editingTaskId = null;
        renderRecords();
        announce('Edit cancelled.');
      }
    });
  });

  // Delete buttons
  $$('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      const task = state.getTask(id);
      showConfirm(
        'Delete Task',
        `Are you sure you want to delete "${task?.title || 'this task'}"?`,
        () => {
          state.deleteTask(id);
          if (editingTaskId === id) editingTaskId = null;
          renderRecords();
          announce('Task deleted.', 'polite');
        }
      );
    });
  });
}

/**
 * Read values from inline edit inputs, validate, and save.
 */
function saveInlineEdit(rowEl) {
  if (!rowEl) return;
  const id = rowEl.dataset.id;

  // Gather values from edit inputs
  const getValue = (field) => {
    const input = rowEl.querySelector(`.edit-input[data-field="${field}"]`);
    return input ? input.value : '';
  };

  const data = {
    title: getValue('title'),
    date: getValue('dueDate'),
    duration: getValue('duration'),
    tag: getValue('tag'),
    notes: getValue('notes')
  };

  // Validate
  const { valid, errors } = validateForm(data);
  const errorEl = rowEl.querySelector('.inline-edit-error');

  if (!valid) {
    const msgs = Object.values(errors).filter(Boolean);
    if (errorEl) errorEl.textContent = msgs.join(' · ');
    announce('Fix errors: ' + msgs.join('. '), 'assertive');
    return;
  }

  // Commit update — this also sets updatedAt
  state.updateTask(id, {
    title: data.title.trim(),
    dueDate: data.date,
    duration: parseFloat(data.duration),
    tag: data.tag.trim(),
    notes: (data.notes || '').trim()
  });

  editingTaskId = null;
  renderRecords();
  announce(`Task "${data.title}" updated successfully.`);
}

// =============================================================================
//  SEARCH & SORT
// =============================================================================
export function initSearch() {
  const input = $('#search-input');
  const caseToggle = $('#search-case');

  input.addEventListener('input', () => {
    currentSearch = input.value;
    renderRecords();
  });

  caseToggle.addEventListener('change', () => {
    caseSensitive = caseToggle.checked;
    renderRecords();
  });
}

export function initSort() {
  $$('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      let dir = btn.dataset.dir;

      // Toggle direction if same field
      if (currentSort.field === field) {
        dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      }

      currentSort = { field, dir };
      btn.dataset.dir = dir;

      // Update active state
      $$('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update arrow
      btn.querySelector('.sort-arrow').textContent = dir === 'asc' ? '↑' : '↓';
      btn.setAttribute('aria-label', `Sort by ${field}, ${dir === 'asc' ? 'ascending' : 'descending'}`);

      renderRecords();
      announce(`Sorted by ${field}, ${dir === 'asc' ? 'ascending' : 'descending'}.`);
    });
  });
}

// =============================================================================
//  DASHBOARD
// =============================================================================
export function renderDashboard() {
  const stats = state.getStats();
  const unit = getUnitLabel();

  // Stats cards
  $('#stat-total').textContent = stats.total;

  const durationDisplay = state.settings.durationUnit === 'hours'
    ? (stats.totalDuration / 60).toFixed(1)
    : stats.totalDuration;
  $('#stat-duration').innerHTML = `${durationDisplay} <small>${unit}</small>`;
  $('#stat-top-tag').textContent = stats.topTag;

  // Cap status
  renderCapStatus(stats);

  // 7-day trend chart
  renderTrendChart(stats.last7);

  // Tag breakdown
  renderTagBreakdown(stats.tagDurations);
}

function renderCapStatus(stats) {
  const capEl = $('#stat-cap');
  const barFill = $('#cap-bar-fill');
  const barContainer = $('#cap-bar-container');

  if (!stats.weeklyCap || stats.weeklyCap <= 0) {
    capEl.textContent = 'No cap set';
    capEl.style.color = '';
    barFill.style.width = '0%';
    barFill.classList.remove('over');
    return;
  }

  const remaining = stats.weeklyCap - stats.weeklyDuration;
  const pct = Math.min((stats.weeklyDuration / stats.weeklyCap) * 100, 100);

  barContainer.setAttribute('aria-valuenow', Math.round(pct));
  barFill.style.width = `${pct}%`;

  if (remaining >= 0) {
    const dispRemaining = state.settings.durationUnit === 'hours'
      ? (remaining / 60).toFixed(1) + ' hr'
      : remaining + ' min';
    capEl.textContent = `${dispRemaining} left`;
    capEl.style.color = '';
    barFill.classList.remove('over');
    announce(`Duration cap: ${dispRemaining} remaining this week.`, 'polite');
  } else {
    const dispOver = state.settings.durationUnit === 'hours'
      ? (Math.abs(remaining) / 60).toFixed(1) + ' hr'
      : Math.abs(remaining) + ' min';
    capEl.textContent = `${dispOver} over!`;
    capEl.style.color = 'var(--clr-danger)';
    barFill.classList.add('over');
    announce(`Warning: You are ${dispOver} over your weekly cap!`, 'assertive');
  }
}

function renderTrendChart(last7) {
  const container = $('#trend-chart');
  const maxDur = Math.max(...last7.map(d => d.duration), 1);

  container.innerHTML = last7.map(day => {
    const heightPct = (day.duration / maxDur) * 100;
    const displayVal = state.settings.durationUnit === 'hours'
      ? (day.duration / 60).toFixed(1)
      : day.duration;

    return `
      <div class="chart-bar-wrap">
        <span class="chart-bar-value">${displayVal}</span>
        <div class="chart-bar" style="height:${Math.max(heightPct, 2)}%" title="${day.date}: ${displayVal} ${getUnitLabel()}"></div>
        <span class="chart-bar-label">${day.label}</span>
      </div>
    `;
  }).join('');
}

function renderTagBreakdown(tagDurations) {
  const container = $('#tag-breakdown');
  const entries = Object.entries(tagDurations).sort((a, b) => b[1] - a[1]);
  const maxDur = entries.length > 0 ? entries[0][1] : 1;

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:var(--clr-text-muted)">No data yet.</p>';
    return;
  }

  container.innerHTML = entries.map(([tag, dur]) => {
    const pct = (dur / maxDur) * 100;
    const displayVal = state.settings.durationUnit === 'hours'
      ? (dur / 60).toFixed(1) + ' hr'
      : dur + ' min';

    return `
      <div class="tag-row">
        <span class="tag-row-name">${escapeHTML(tag)}</span>
        <div class="tag-row-bar-bg">
          <div class="tag-row-bar" style="width:${pct}%"></div>
        </div>
        <span class="tag-row-value">${displayVal}</span>
      </div>
    `;
  }).join('');
}

// =============================================================================
//  ADD FORM (for the "Add New" page — new task creation only)
// =============================================================================
export function initForm() {
  const form = $('#task-form');
  const fields = ['title', 'date', 'duration', 'tag', 'notes'];

  // Live validation on blur
  fields.forEach(field => {
    const input = $(`#form-${field}`);
    if (!input) return;

    input.addEventListener('blur', () => {
      const result = validateField(field, input.value);
      showFieldStatus(field, result);
    });

    // Clear error on input
    input.addEventListener('input', () => {
      const errorEl = $(`#form-${field}-error`);
      if (errorEl) {
        errorEl.hidden = true;
        input.classList.remove('invalid');
      }
    });
  });

  // Submit — always creates a new task
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      title: $('#form-title').value,
      date: $('#form-date').value,
      duration: $('#form-duration').value,
      tag: $('#form-tag').value,
      notes: $('#form-notes').value
    };

    const { valid, errors, warnings } = validateForm(data);

    // Show all errors
    fields.forEach(f => {
      showFieldStatus(f, {
        valid: !errors[f],
        error: errors[f] || null,
        warning: warnings[f] || null
      });
    });

    if (!valid) {
      const firstError = fields.find(f => errors[f]);
      if (firstError) $(`#form-${firstError}`).focus();
      announce('Please fix the form errors before submitting.', 'assertive');
      return;
    }

    state.addTask(data);
    announce(`Task "${data.title}" added successfully.`, 'polite');

    resetForm();
    navigateTo('records');
  });

  // Cancel
  $('#form-cancel-btn').addEventListener('click', () => {
    resetForm();
    navigateTo('records');
  });

  // Populate tag suggestions
  updateTagSuggestions();
}

function showFieldStatus(field, result) {
  const input = $(`#form-${field}`);
  const errorEl = $(`#form-${field}-error`);
  if (!input || !errorEl) return;

  if (!result.valid && result.error) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    errorEl.textContent = result.error;
    errorEl.hidden = false;
    errorEl.style.color = '';
  } else if (result.warning) {
    input.classList.remove('invalid');
    input.classList.add('valid');
    errorEl.textContent = result.warning;
    errorEl.style.color = 'var(--clr-warning)';
    errorEl.hidden = false;
  } else {
    input.classList.remove('invalid');
    if (input.value) input.classList.add('valid');
    errorEl.hidden = true;
    errorEl.style.color = '';
  }
}

function resetForm() {
  const form = $('#task-form');
  form.reset();
  $('#form-id').value = '';
  $('#add-heading').textContent = 'Add New Task';
  $('#form-submit-btn').textContent = 'Add Task';

  // Clear validation states
  ['title', 'date', 'duration', 'tag', 'notes'].forEach(f => {
    const input = $(`#form-${f}`);
    const errorEl = $(`#form-${f}-error`);
    if (input) input.classList.remove('invalid', 'valid');
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.style.color = '';
    }
  });
}

export function updateTagSuggestions() {
  const datalist = $('#tag-suggestions');
  if (!datalist) return;
  datalist.innerHTML = state.tags.map(t => `<option value="${escapeHTML(t)}">`).join('');
}

// =============================================================================
//  SETTINGS
// =============================================================================
export function initSettings() {
  // Duration unit
  $$('input[name="duration-unit"]').forEach(radio => {
    radio.checked = radio.value === state.settings.durationUnit;
    radio.addEventListener('change', () => {
      state.updateSettings({ durationUnit: radio.value });
      announce(`Duration unit set to ${radio.value}.`);
    });
  });

  // Weekly cap
  const capInput = $('#settings-cap');
  capInput.value = state.settings.weeklyCap || '';
  $('#save-cap-btn').addEventListener('click', () => {
    const val = parseInt(capInput.value) || 0;
    state.updateSettings({ weeklyCap: val });
    announce(val > 0 ? `Weekly cap set to ${val} minutes.` : 'Weekly cap disabled.');
  });

  // Tags management
  renderTagsList();
  $('#add-tag-btn').addEventListener('click', () => {
    const input = $('#new-tag-input');
    const tag = input.value.trim();
    if (tag && /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(tag)) {
      state.addTag(tag);
      renderTagsList();
      updateTagSuggestions();
      input.value = '';
      announce(`Tag "${tag}" added.`);
    } else {
      announce('Invalid tag. Use only letters, spaces, or hyphens.', 'assertive');
    }
  });

  // Import/Export
  $('#export-btn').addEventListener('click', handleExport);
  $('#import-input').addEventListener('change', handleImport);

  // Import label keyboard support
  const importLabel = $('.import-label');
  if (importLabel) {
    importLabel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('#import-input').click();
      }
    });
  }

  // Theme toggle
  initTheme();

  // Clear data
  $('#clear-data-btn').addEventListener('click', () => {
    showConfirm(
      'Clear All Data',
      'This will permanently delete all tasks and reset settings. This cannot be undone.',
      () => {
        state.clearAll();
        renderRecords();
        renderDashboard();
        renderSettings();
        renderTagsList();
        updateTagSuggestions();
        announce('All data cleared.', 'polite');
      }
    );
  });
}

export function renderSettings() {
  // Refresh cap input
  $('#settings-cap').value = state.settings.weeklyCap || '';

  // Refresh unit selection
  $$('input[name="duration-unit"]').forEach(radio => {
    radio.checked = radio.value === state.settings.durationUnit;
  });

  renderTagsList();
}

function renderTagsList() {
  const container = $('#tags-list');
  container.innerHTML = state.tags.map(tag => `
    <span class="tag-chip">
      ${escapeHTML(tag)}
      <button class="tag-chip-remove" aria-label="Remove tag ${escapeHTML(tag)}" data-tag="${escapeHTML(tag)}">×</button>
    </span>
  `).join('');

  container.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      state.removeTag(tag);
      renderTagsList();
      updateTagSuggestions();
      announce(`Tag "${tag}" removed.`);
    });
  });
}

// ===== Import / Export =====
function handleExport() {
  const json = exportJSON(state.tasks);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus-planner-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  announce('Data exported successfully.');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = $('#import-status');

  const reader = new FileReader();
  reader.onload = () => {
    const result = validateImport(reader.result);

    if (result.data.length > 0) {
      state.replaceTasks(result.data);
      renderRecords();
      statusEl.className = 'import-status success';
      statusEl.textContent = `Imported ${result.data.length} tasks successfully.`;
      statusEl.hidden = false;
      announce(`Imported ${result.data.length} tasks.`);

      if (result.errors.length > 0) {
        statusEl.textContent += ` ${result.errors.length} items were skipped due to validation errors.`;
      }
    } else {
      statusEl.className = 'import-status error';
      statusEl.textContent = `Import failed: ${result.errors.join('; ')}`;
      statusEl.hidden = false;
      announce('Import failed. Check the file format.', 'assertive');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ===== Theme =====
function initTheme() {
  const theme = loadTheme();
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = $('#theme-toggle');
  toggle.checked = theme === 'dark';

  toggle.addEventListener('change', () => {
    const newTheme = toggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    announce(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled.`);
  });
}

// =============================================================================
//  CONFIRM DIALOG
// =============================================================================
let confirmCallback = null;

export function initConfirm() {
  const overlay = $('#confirm-dialog');
  const yesBtn = $('#confirm-yes');
  const noBtn = $('#confirm-no');

  yesBtn.addEventListener('click', () => {
    overlay.hidden = true;
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  noBtn.addEventListener('click', () => {
    overlay.hidden = true;
    confirmCallback = null;
  });

  // Close on Escape
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlay.hidden = true;
      confirmCallback = null;
    }
  });

  // Trap focus inside modal when open
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusable = overlay.querySelectorAll('button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function showConfirm(title, message, onConfirm) {
  const overlay = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-msg').textContent = message;
  confirmCallback = onConfirm;
  overlay.hidden = false;
  $('#confirm-no').focus();
}