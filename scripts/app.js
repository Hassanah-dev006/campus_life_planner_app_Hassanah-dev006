/**
 * app.js — Main entry point
 * Initializes all modules and wires up the application
 */

import state from './state.js';
import {
  initNav,
  initSearch,
  initSort,
  initForm,
  initSettings,
  initConfirm,
  renderRecords,
  renderDashboard,
  updateTagSuggestions,
  announce
} from './ui.js';

// ===== Initialize App =====
function init() {
  // Initialize UI modules
  initNav();
  initSearch();
  initSort();
  initForm();
  initSettings();
  initConfirm();

  // Initial render
  updateTagSuggestions();

  // Listen for state changes to re-render as needed
  state.onChange((event) => {
    if (['taskAdded', 'taskUpdated', 'taskDeleted', 'tasksReplaced', 'cleared'].includes(event)) {
      // Records and dashboard will be re-rendered when navigated to
    }
    if (event === 'settingsUpdated') {
      // Re-render dashboard if visible
      const dashPage = document.querySelector('#dashboard');
      if (dashPage && dashPage.classList.contains('active')) {
        renderDashboard();
      }
    }
  });

  // Log ready
  console.log('🎓 Campus Life Planner initialized');
  console.log(`📋 ${state.tasks.length} tasks loaded`);
}

// ===== Start =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}