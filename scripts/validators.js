/**
 * validators.js — Regex validation rules
 * 
 * Regex Catalog:
 * 
 * 1. TITLE: /^\S(?:.*\S)?$/
 *    - Forbids leading/trailing spaces, collapses doubles
 *    - Valid: "Study for exam", "A"
 *    - Invalid: " leading", "trailing ", "  double"
 * 
 * 2. DURATION (numeric): /^(0|[1-9]\d*)(\.\d{1,2})?$/
 *    - Whole numbers or decimals with up to 2 places
 *    - Valid: "0", "5", "12.5", "90.25"
 *    - Invalid: "00", "5.", ".5", "12.345"
 * 
 * 3. DATE (YYYY-MM-DD): /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
 *    - Valid: "2025-09-29", "2025-01-01"
 *    - Invalid: "2025-13-01", "2025-00-01", "25-01-01"
 * 
 * 4. TAG (letters, spaces, hyphens): /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/
 *    - Valid: "Study", "Group Work", "Self-Care"
 *    - Invalid: "123", "  ", "tag-", "-tag"
 * 
 * 5. ADVANCED — Duplicate word detection (back-reference):
 *    /\b(\w+)\s+\1\b/i
 *    - Detects repeated words: "the the", "is is"
 *    - Used on notes field to warn about duplicates
 * 
 * 6. ADVANCED — Time token detection (lookahead):
 *    /\b\d{1,2}:\d{2}(?=\s*(am|pm|AM|PM)?)/
 *    - Detects time patterns: "10:30", "2:00 PM"
 *    - Used in search to filter tasks with time references
 * 
 * 7. Tag filter pattern: /^@tag:\w+/
 *    - Special search syntax: "@tag:Study" filters by tag
 */

// ===== Validation patterns =====
const PATTERNS = {
  // Rule 1: Title — no leading/trailing spaces
  title: /^\S(?:.*\S)?$/,

  // Rule 2: Numeric (duration/amount) — integers or up to 2 decimals
  numeric: /^(0|[1-9]\d*)(\.\d{1,2})?$/,

  // Rule 3: Date (YYYY-MM-DD)
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,

  // Rule 4: Tag — letters, spaces, hyphens
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,

  // Rule 5 (Advanced): Duplicate words — back-reference
  duplicateWords: /\b(\w+)\s+\1\b/i,

  // Rule 6 (Advanced): Time tokens — lookahead
  timeToken: /\b\d{1,2}:\d{2}(?=\s*(?:am|pm|AM|PM)?)/,

  // Rule 7: Tag filter syntax
  tagFilter: /^@tag:(\w[\w -]*)$/i
};

// ===== Validation error messages =====
const MESSAGES = {
  title: {
    required: 'Title is required.',
    invalid: 'Title must not start or end with spaces.'
  },
  duration: {
    required: 'Duration is required.',
    invalid: 'Enter a valid number (e.g. 90 or 12.5).'
  },
  date: {
    required: 'Due date is required.',
    invalid: 'Enter a valid date in YYYY-MM-DD format.'
  },
  tag: {
    required: 'Tag is required.',
    invalid: 'Tag must contain only letters, spaces, or hyphens.'
  },
  notes: {
    duplicateWords: 'Warning: Duplicate word detected ("$1 $1"). Did you mean to repeat it?'
  }
};

/**
 * Validate a single field.
 * @returns {{ valid: boolean, error: string|null, warning: string|null }}
 */
export function validateField(field, value) {
  const trimmed = (value || '').toString();

  switch (field) {
    case 'title': {
      if (!trimmed) return { valid: false, error: MESSAGES.title.required, warning: null };
      if (!PATTERNS.title.test(trimmed)) return { valid: false, error: MESSAGES.title.invalid, warning: null };
      return { valid: true, error: null, warning: null };
    }

    case 'duration': {
      if (!trimmed) return { valid: false, error: MESSAGES.duration.required, warning: null };
      if (!PATTERNS.numeric.test(trimmed)) return { valid: false, error: MESSAGES.duration.invalid, warning: null };
      const num = parseFloat(trimmed);
      if (num < 0) return { valid: false, error: 'Duration must be non-negative.', warning: null };
      if (num > 1440) return { valid: true, error: null, warning: 'That\'s over 24 hours — are you sure?' };
      return { valid: true, error: null, warning: null };
    }

    case 'date': {
      if (!trimmed) return { valid: false, error: MESSAGES.date.required, warning: null };
      if (!PATTERNS.date.test(trimmed)) return { valid: false, error: MESSAGES.date.invalid, warning: null };
      // Additional: check that the date is actually valid (e.g. not Feb 30)
      const [y, m, d] = trimmed.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (dateObj.getFullYear() !== y || dateObj.getMonth() !== m - 1 || dateObj.getDate() !== d) {
        return { valid: false, error: 'This date does not exist (e.g. Feb 30).', warning: null };
      }
      return { valid: true, error: null, warning: null };
    }

    case 'tag': {
      if (!trimmed) return { valid: false, error: MESSAGES.tag.required, warning: null };
      if (!PATTERNS.tag.test(trimmed)) return { valid: false, error: MESSAGES.tag.invalid, warning: null };
      return { valid: true, error: null, warning: null };
    }

    case 'notes': {
      // Notes are optional, so always valid, but may have warnings
      let warning = null;
      if (trimmed && PATTERNS.duplicateWords.test(trimmed)) {
        const match = trimmed.match(PATTERNS.duplicateWords);
        warning = `Duplicate word detected: "${match[1]} ${match[1]}". Did you mean to repeat it?`;
      }
      return { valid: true, error: null, warning };
    }

    default:
      return { valid: true, error: null, warning: null };
  }
}

/**
 * Validate all form fields at once.
 * @returns {{ valid: boolean, errors: Record<string, string>, warnings: Record<string, string> }}
 */
export function validateForm(data) {
  const fields = ['title', 'duration', 'date', 'tag', 'notes'];
  const errors = {};
  const warnings = {};
  let valid = true;

  for (const field of fields) {
    const value = data[field] || '';
    const result = validateField(field, value);
    if (!result.valid) {
      valid = false;
      errors[field] = result.error;
    }
    if (result.warning) {
      warnings[field] = result.warning;
    }
  }

  return { valid, errors, warnings };
}

// Export patterns for tests and search
export { PATTERNS };