/**
 * search.js — Regex search & highlight
 * Safe regex compilation with try/catch, case-insensitive toggle, match highlighting
 */

import { PATTERNS } from './validators.js';

/**
 * Safely compile a regex from user input.
 * @param {string} input - The user's search string
 * @param {string} flags - Regex flags (default: 'i' for case-insensitive)
 * @returns {{ regex: RegExp|null, error: string|null }}
 */
export function compileRegex(input, flags = 'i') {
  if (!input || !input.trim()) {
    return { regex: null, error: null };
  }
  try {
    const regex = new RegExp(input, flags);
    return { regex, error: null };
  } catch (e) {
    return { regex: null, error: `Invalid regex: ${e.message}` };
  }
}

/**
 * Highlight regex matches in text using <mark> tags.
 * Escapes HTML first to prevent XSS.
 * @param {string} text - The text to search in
 * @param {RegExp|null} regex - Compiled regex
 * @returns {string} HTML with <mark> tags around matches
 */
export function highlight(text, regex) {
  if (!regex || !text) return escapeHTML(text || '');

  const escaped = escapeHTML(text);
  // Use 'g' flag for highlighting all matches
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

  return escaped.replace(globalRegex, match => `<mark>${match}</mark>`);
}

/**
 * Escape HTML entities to prevent XSS.
 */
export function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

/**
 * Filter tasks based on search input.
 * Supports special syntax: @tag:TagName to filter by tag.
 * @param {Array} tasks - Array of task objects
 * @param {string} searchInput - User's search string
 * @param {boolean} caseSensitive - Whether search is case-sensitive
 * @returns {{ filtered: Array, regex: RegExp|null, error: string|null }}
 */
export function filterTasks(tasks, searchInput, caseSensitive = false) {
  if (!searchInput || !searchInput.trim()) {
    return { filtered: tasks, regex: null, error: null };
  }

  const input = searchInput.trim();

  // Check for special @tag: syntax
  const tagMatch = input.match(PATTERNS.tagFilter);
  if (tagMatch) {
    const tagSearch = tagMatch[1].toLowerCase();
    const filtered = tasks.filter(t =>
      t.tag.toLowerCase().includes(tagSearch)
    );
    return { filtered, regex: null, error: null };
  }

  // Regular regex search
  const flags = caseSensitive ? 'g' : 'gi';
  const { regex, error } = compileRegex(input, flags);

  if (error) {
    return { filtered: tasks, regex: null, error };
  }

  if (!regex) {
    return { filtered: tasks, regex: null, error: null };
  }

  const filtered = tasks.filter(task => {
    // Search across title, tag, notes, date, duration
    const searchable = [
      task.title,
      task.tag,
      task.notes || '',
      task.dueDate,
      String(task.duration)
    ].join(' ');

    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    return regex.test(searchable);
  });

  // Reset lastIndex
  regex.lastIndex = 0;

  return { filtered, regex, error: null };
}