# 📋 Campus Life Planner

A fully accessible, responsive, vanilla HTML/CSS/JavaScript application for managing campus tasks, events, and deadlines. Built for the Frontend Web Development course at African Leadership University.

**Theme:** Campus Life Planner  
**Live Demo:** [GitHub Pages URL](https://yourusername.github.io/campus-life-planner/)

---

## Features

### Core
- **Task Management** — Add, edit, and delete tasks with title, due date, duration, tag, and notes
- **Dashboard & Stats** — Total tasks, total duration, top tag, 7-day trend chart, tag breakdown
- **Weekly Cap/Target** — Set a duration cap; get polite/assertive ARIA alerts when under/over
- **Regex Search** — Live regex-powered search with case-sensitivity toggle and match highlighting
- **Sorting** — Sort tasks by date, title, or duration (ascending/descending)
- **Data Persistence** — Auto-saves to `localStorage`; JSON import/export with validation
- **Unit Conversion** — Switch between minutes and hours display
- **Accessible** — Full keyboard navigation, ARIA live regions, visible focus, skip-to-content link
- **Responsive** — Mobile-first design with 3 breakpoints (360px, 768px, 1024px)

### Stretch
- **Dark Mode** — Persistent light/dark theme toggle
- **Custom Tags** — Add and remove custom tags from Settings

---

## Regex Catalog

| # | Pattern | Purpose | Valid Examples | Invalid Examples |
|---|---------|---------|---------------|------------------|
| 1 | `/^\S(?:.*\S)?$/` | Title — no leading/trailing spaces | `"Study"`, `"A B"` | `" lead"`, `"trail "` |
| 2 | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Numeric — integer or max 2 decimals | `"0"`, `"12.5"`, `"90"` | `"00"`, `".5"`, `"12.345"` |
| 3 | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Date — YYYY-MM-DD format | `"2025-02-12"` | `"2025-13-01"`, `"25-1-1"` |
| 4 | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Tag — letters, spaces, hyphens | `"Study"`, `"Self-Care"` | `"123"`, `"-tag"`, `"tag-"` |
| 5 | `/\b(\w+)\s+\1\b/i` | **Advanced (back-reference)** — duplicate word detection | `"the the"`, `"and and"` | `"the cat"` |
| 6 | `/\b\d{1,2}:\d{2}(?=\s*(?:am\|pm\|AM\|PM)?)/` | **Advanced (lookahead)** — time token detection | `"10:30"`, `"4:00 PM"` | `"1234"` |
| 7 | `/^@tag:(\w[\w -]*)$/i` | Special search syntax — filter by tag | `"@tag:Study"` | `"tag:Study"` |

---

## Keyboard Map

| Key / Combo | Action |
|------------|--------|
| `Tab` / `Shift+Tab` | Navigate between focusable elements |
| `Enter` | Activate buttons, links, submit form |
| `Space` | Toggle checkboxes, activate buttons |
| `Escape` | Close mobile menu, close confirm dialog |
| Skip link (first Tab) | Jump directly to main content |

All interactive elements have visible focus outlines (`outline: 3px solid`). The confirm dialog traps focus within itself when open.

---

## Accessibility (a11y) Notes

- **Semantic HTML**: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` landmarks with proper `<h1>`–`<h3>` heading hierarchy
- **ARIA Live Regions**: `role="status"` (polite) for confirmations; `role="alert"` (assertive) for cap overage warnings and form errors
- **Labels**: All form inputs have associated `<label>` elements; error messages linked via `aria-describedby`
- **Focus Management**: Visible `:focus-visible` styles; skip-to-content link; focus trap in modal dialog
- **Color Contrast**: All text meets WCAG AA contrast ratios (tested in both light and dark modes)
- **Responsive**: Table view on desktop, card view on mobile — both with accessible action buttons
- **Screen Reader**: Search highlights use `<mark>` which is announced; sort changes are announced via live region

---

## Project Structure

```
campus-life-planner/
├── index.html              # Main HTML — all 5 sections/pages
├── tests.html              # Test suite with assertions
├── seed.json               # 12 diverse sample records
├── README.md               # This file
├── styles/
│   └── main.css            # Mobile-first responsive CSS with dark mode
├── scripts/
│   ├── app.js              # Entry point — initializes all modules
│   ├── state.js            # Centralized state management
│   ├── storage.js          # localStorage persistence, import/export, validation
│   ├── validators.js       # Regex validation rules (4 standard + 2 advanced)
│   ├── search.js           # Safe regex compilation, filtering, highlighting
│   └── ui.js               # DOM rendering, events, navigation
└── assets/                 # (optional images/icons)
```

---

## How to Run

1. Clone the repository
2. Open `index.html` in a modern browser (or serve via `npx serve .`)
3. The app loads with any previously saved data from `localStorage`

### Load Seed Data
1. Go to **Settings** → **Data Management**
2. Click **Import JSON** and select `seed.json`
3. Tasks will be loaded and visible in the **Tasks** page

### Run Tests
Open `tests.html` in a browser. All assertions run automatically on page load.

---

## Data Model

```json
{
  "id": "task_1738744800000_a3f2",
  "title": "Study for Calculus Exam",
  "dueDate": "2025-02-12",
  "duration": 120,
  "tag": "Study",
  "notes": "Focus on integration by parts",
  "createdAt": "2025-02-05T08:00:00.000Z",
  "updatedAt": "2025-02-05T08:00:00.000Z"
}
```

Default tags: Study, Assignment, Club, Sports, Social, Errands, Other (editable in Settings).

---

## Browser Support

Tested on modern browsers with ES module support (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+).

---

## License

MIT — Built for educational purposes.