
let calendar;
let tasksById = new Map();         // taskId -> task
let draggable;                     // FullCalendar Draggable for unscheduled list
let lastLoadedConfigHash = null;
let labelsById = new Map();            // id -> {id,title,hex_color,...}
let labelSelectionById = {};           // id -> boolean (true=include)
let suspendConfigSave = false;
let selectedEvents = new Set();    // Set of event IDs that are currently selected
let selectedUnscheduledTasks = new Set(); // Set of task IDs for selected unscheduled tasks

const els = {
  dateField: document.getElementById('dateField'),
  loadBtn: document.getElementById('loadBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  unscheduledList: document.getElementById('unscheduledList'),
  unscheduledCount: document.getElementById('unscheduledCount'),
  unscheduledDrop: document.getElementById('unscheduledDrop'),
  uiUrl: document.getElementById('uiUrl'),
  labelsPicker: document.getElementById('labelsPicker'),
  labelsSelectAllBtn: document.getElementById('labelsSelectAllBtn'),
  labelsSelectNoneBtn: document.getElementById('labelsSelectNoneBtn'),
  loadLabelsBtn: document.getElementById('loadLabelsBtn'),
  clearBrowserBtn: document.getElementById('clearBrowserBtn'),
  showRecurring: document.getElementById('showRecurring'),
  projectionWeeks: document.getElementById('projectionWeeks'),
  clearSelectionBtn: document.getElementById('clearSelectionBtn'),
  selectedCount: document.getElementById('selectedCount'),
};
els.labelsPicker.innerHTML = '<div class="small">Press “Load labels” to populate.</div>';

const STORAGE_KEY = 'vikunja_calendar_config_v1';

function saveConfigToStorage() {
  if (suspendConfigSave) return;
  
  const cfg = config();
  // store raw inputs too (especially labels textarea)
  const payload = {
    dateField: cfg.dateField,
    labelSelectionById: labelSelectionById,
    showRecurring: cfg.showRecurring,
    projectionWeeks: cfg.projectionWeeks,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadConfigFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);

    if (payload.labelSelectionById && typeof payload.labelSelectionById === 'object') {
      labelSelectionById = payload.labelSelectionById;
    }

    if (payload.dateField) els.dateField.value = payload.dateField;
    
    // Load recurring event settings
    if (payload.showRecurring !== undefined) {
      els.showRecurring.checked = payload.showRecurring;
    }
    
    if (payload.projectionWeeks) {
      els.projectionWeeks.value = payload.projectionWeeks;
    }

    return true;
  } catch {
    return false;
  }
}

els.clearBtn.addEventListener('click', () => {
  tasksById.clear();
  setStatus('');
  clearUnscheduled();
  if (calendar) calendar.removeAllEvents();
  clearEventSelection();
});

els.loadBtn.addEventListener('click', async () => {
  await loadEverything();
});

function setStatus(msg) {
  els.status.textContent = msg || '';
}

// Server-provided config
let serverConfig = {
  baseUrl: null
};

// Day colors
let dayColors = {};
let selectedDate = null;

// Color labels
let colorLabels = {
  red: "Red",
  green: "Green",
  blue: "Blue",
  yellow: "Yellow",
  purple: "Purple"
};

// Fetch server config on startup
async function fetchServerConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      serverConfig = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch server config:', error);
  }
}

// Fetch day colors from the server
async function fetchDayColors() {
  try {
    const response = await fetch('/api/daycolors');
    if (response.ok) {
      const data = await response.json();
      // Ensure we have a valid object
      dayColors = data && typeof data === 'object' ? data : {};
      return dayColors;
    }
  } catch (error) {
    console.error('Failed to fetch day colors:', error);
  }
  // Return empty object as fallback
  dayColors = {};
  return dayColors;
}

// Fetch color labels from the server
async function fetchColorLabels() {
  try {
    const response = await fetch('/api/colorlabels');
    if (response.ok) {
      const data = await response.json();
      // Ensure we have a valid object
      colorLabels = data && typeof data === 'object' ? data : {
        red: "Red",
        green: "Green",
        blue: "Blue",
        yellow: "Yellow",
        purple: "Purple"
      };
      return colorLabels;
    }
  } catch (error) {
    console.error('Failed to fetch color labels:', error);
  }
  // Return default labels as fallback
  colorLabels = {
    red: "Red",
    green: "Green",
    blue: "Blue",
    yellow: "Yellow",
    purple: "Purple"
  };
  return colorLabels;
}

// Save a day color to the server
async function saveDayColor(date, color) {
  try {
    const response = await fetch('/api/daycolors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date, color }),
    });
    
    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch (error) {
    console.error('Failed to save day color:', error);
    setStatus(`Error saving day color: ${error.message}`);
  }
  return null;
}

// Save a color label to the server
async function saveColorLabel(colorKey, label) {
  try {
    const response = await fetch('/api/colorlabels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ colorKey, label }),
    });
    
    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch (error) {
    console.error('Failed to save color label:', error);
    setStatus(`Error saving color label: ${error.message}`);
  }
  return null;
}

function config() {
  const dateField = els.dateField.value;
  const showRecurring = els.showRecurring.checked;
  const projectionWeeks = parseInt(els.projectionWeeks.value, 10) || 4;

  const labelSelectionCopy = { ...(labelSelectionById || {}) };
  const selectedLabelIds = new Set(
    Object.entries(labelSelectionCopy)
      .filter(([, v]) => v !== false)     // default true
      .map(([k]) => String(k))
  );

  return { 
    dateField, 
    labelSelectionById: labelSelectionCopy, 
    selectedLabelIds,
    showRecurring,
    projectionWeeks
  };
}

function configHash(cfg) {
  // minimal hash to detect config drift
  return JSON.stringify({ 
    d: cfg.dateField, 
    l: cfg.labelSelectionById,
    r: cfg.showRecurring,
    p: cfg.projectionWeeks
  });
}

// No longer needed as headers are handled by the server
function apiHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function taskUiLink(taskId) {
  // Use the server-provided base URL for Vikunja UI links
  if (serverConfig.baseUrl) {
    // Convert API URL to UI URL by removing /api/v1 if present
    const uiBaseUrl = serverConfig.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${uiBaseUrl}/tasks/${taskId}`;
  }
  // Fall back to relative URL if no base URL is available
  return `/tasks/${taskId}`;
}

function projectUiLink(projectId) {
  // Use the server-provided base URL for Vikunja UI links
  if (serverConfig.baseUrl) {
    // Convert API URL to UI URL by removing /api/v1 if present
    const uiBaseUrl = serverConfig.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${uiBaseUrl}/projects/${projectId}`;
  }
  // Fall back to relative URL if no base URL is available
  return `/projects/${projectId}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function tzOffsetRFC3339(d) {
  // getTimezoneOffset() is minutes *behind* UTC (e.g. New York winter = 300)
  const mins = -d.getTimezoneOffset();
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const hh = pad2(Math.floor(abs / 60));
  const mm = pad2(abs % 60);
  return `${sign}${hh}:${mm}`;
}

function toLocalRFC3339(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
         `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
         `${tzOffsetRFC3339(d)}`;
}

function toLocalRFC3339WithTime(d, useTime = false) {
  // If useTime is false, set to 18:00 (default end of workday)
  // If useTime is true, keep the actual time from the date object
  const m = useTime 
    ? new Date(d) 
    : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
  return toLocalRFC3339(m);
}
function parseISO(iso) {
  if (!iso) return null;

  // Vikunja/Go zero-time often used to mean "unset"
  // Examples: "0001-01-01T00:00:00Z", "0001-01-01T00:00:00+00:00"
  if (typeof iso === 'string' && iso.startsWith('0001-01-01')) return null;

  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;

  // Extra safety: treat year <= 1 as unset
  if (d.getUTCFullYear() <= 1) return null;

  return d;
}

function normalizeLabel(label) {
  // Vikunja label fields might be: title + hex_color
  const title = label?.title ?? label?.name ?? '';
  const color = label?.hex_color ?? label?.color ?? null;
  return { title, color };
}

function taskMatchesLabelFilter(task, cfg) {
  const labels = Array.isArray(task.labels) ? task.labels : [];

  // If task has no labels, exclude it by default
  if (labels.length === 0) return false;

  // Include task if ANY of its labels are selected
  for (const l of labels) {
    const id = l?.id;
    if (id == null) continue;
    if (cfg.selectedLabelIds.has(String(id))) return true;
  }
  return false;
}

function pickEventColor(task) {
  // If multiple labels, choose the first with a color; otherwise default.
  const labels = Array.isArray(task.labels) ? task.labels : [];
  for (const l of labels) {
    const { color } = normalizeLabel(l);
    if (color && typeof color === 'string') return color.startsWith('#') ? color : `#${color}`;
  }
  return null;
}

function normalizeHexColor(c) {
  if (!c || typeof c !== 'string') return null;
  return c.startsWith('#') ? c : `#${c}`;
}

function ensureLabelSelectionDefaults(allLabels) {
  // Any new label IDs not in the selection map default to true (included)
  for (const l of allLabels) {
    const id = String(l.id);
    if (!(id in labelSelectionById)) labelSelectionById[id] = true;
  }
}

function renderLabelsPicker(allLabels) {
  els.labelsPicker.innerHTML = '';

  // Sort by title
  const sorted = [...allLabels].sort((a, b) => String(a.title||'').localeCompare(String(b.title||'')));

  for (const l of sorted) {
    const idStr = String(l.id);
    const row = document.createElement('label');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.padding = '6px 6px';
    row.style.borderRadius = '10px';
    row.style.cursor = 'pointer';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = labelSelectionById[idStr] !== false; // default true
    cb.addEventListener('change', async () => {
      labelSelectionById[idStr] = cb.checked;
      saveConfigToStorage();
      if (calendar) await refreshUIFromCache(config());
    });

    const swatch = document.createElement('span');
    swatch.style.width = '10px';
    swatch.style.height = '10px';
    swatch.style.borderRadius = '999px';
    swatch.style.border = '1px solid var(--border)';
    const col = normalizeHexColor(l.hex_color ?? l.color);
    if (col) swatch.style.background = col;

    const name = document.createElement('span');
    name.textContent = l.title || `(label ${l.id})`;
    name.style.flex = '1';

    row.appendChild(cb);
    row.appendChild(swatch);
    row.appendChild(name);

    els.labelsPicker.appendChild(row);
  }
}

els.labelsSelectAllBtn.addEventListener('click', async () => {
  for (const id of Object.keys(labelSelectionById)) labelSelectionById[id] = true;
  saveConfigToStorage();
  if (calendar) await refreshUIFromCache(config());
  // re-render checkboxes
  renderLabelsPicker([...labelsById.values()]);
});

els.labelsSelectNoneBtn.addEventListener('click', async () => {
  for (const id of Object.keys(labelSelectionById)) labelSelectionById[id] = false;
  saveConfigToStorage();
  if (calendar) await refreshUIFromCache(config());
  renderLabelsPicker([...labelsById.values()]);
});

function taskMetaPills(task) {
  const pills = [];
  const labels = Array.isArray(task.labels) ? task.labels : [];
  for (const l of labels) {
    const { title } = normalizeLabel(l);
    if (title) pills.push(title);
  }
  if (task.project_id) pills.push(`project:${task.project_id}`);
  if (task.list_id) pills.push(`list:${task.list_id}`);
  return pills;
}

function clearUnscheduled() {
  els.unscheduledList.innerHTML = '';
  els.unscheduledCount.textContent = '0';
}

function renderUnscheduled(tasks) {
  els.unscheduledList.innerHTML = '';
  els.unscheduledCount.textContent = String(tasks.length);

  for (const task of tasks) {
    const div = document.createElement('div');
    div.className = 'task';
    div.setAttribute('data-task-id', String(task.id));
    
    // Add selected class if this task is in the selected set
    if (selectedUnscheduledTasks.has(task.id)) {
      div.classList.add('task-selected');
    }

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = task.title || `(task ${task.id})`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    for (const t of taskMetaPills(task).slice(0, 8)) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = t;
      meta.appendChild(pill);
    }

    // subtle left border in label color
    const c = pickEventColor(task);
    if (c) div.style.borderLeft = `6px solid ${c}`;

    div.appendChild(title);
    div.appendChild(meta);

    els.unscheduledList.appendChild(div);
  }

  setupExternalDraggable();
}

function setupExternalDraggable() {
  if (draggable) return;

  draggable = new FullCalendar.Draggable(els.unscheduledList, {
    itemSelector: '.task',
    eventData: function(eventEl) {
      const id = Number(eventEl.getAttribute('data-task-id'));
      const task = tasksById.get(id);
      const color = task ? pickEventColor(task) : null;
      return {
        title: task?.title ?? `(task ${id})`,
        extendedProps: { taskId: id },
        backgroundColor: color || undefined,
        borderColor: color || undefined,
        allDay: true,
      };
    }
  });
}

async function vikunjaFetchAllLabels(cfg) {
  const out = [];
  const perPage = 50;
  let page = 1;

  while (true) {
    const url = new URL('/api/labels', window.location.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`GET /labels failed (${res.status}): ${txt || res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    out.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  return out;
}

async function loadLabelsOnly() {
  const cfg = config();
  
  try {
    setStatus('Loading labels from Vikunja...');
    const labels = await vikunjaFetchAllLabels(cfg);

    labelsById = new Map(labels.map(l => [l.id, l]));
    ensureLabelSelectionDefaults(labels); // new labels default selected=true
    saveConfigToStorage();
    renderLabelsPicker(labels);

    setStatus(`Loaded ${labels.length} labels.`);
    // Optional: if tasks are already loaded, re-filter immediately
    if (tasksById.size) await refreshUIFromCache(config());
  } catch (e) {
    console.error(e);
    setStatus(String(e.message || e));
  }
}

async function vikunjaFetchAllTasks(cfg) {
  // The public docs show GET /tasks; it is commonly paginated.
  // We'll page until we get an empty array.
  const out = [];
  const perPage = 50; // tune as you like
  let page = 1;

  while (true) {
    const url = new URL('/api/tasks', window.location.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('filter', 'done=false');

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`GET /tasks failed (${res.status}): ${txt || res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    out.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  return out;
}

async function vikunjaGetTaskById(cfg, taskId) {
  const url = new URL(`/api/tasks/${encodeURIComponent(taskId)}`, window.location.origin);
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GET /tasks/${taskId} failed (${res.status}): ${txt || res.statusText}`);
  }
  return await res.json();
}

async function vikunjaUpdateTaskFull(cfg, taskId, patch) {
  // 1) Get full task from API (source of truth)
  const full = await vikunjaGetTaskById(cfg, taskId);

  // 2) Apply patch
  const payload = { ...full, ...patch };

  // 3) Post full payload back (frontend-style)
  const url = new URL(`/api/tasks/${encodeURIComponent(taskId)}`, window.location.origin);
  
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`POST /tasks/${taskId} failed (${res.status}): ${txt || res.statusText}`);
  }

  const updated = await res.json().catch(() => ({}));

  // 4) Cache update: preserve labels if response omits them
  const old = tasksById.get(taskId);
  const merged = mergeTaskPreserveLabels(old, updated || {});
  tasksById.set(taskId, merged);

  return merged;
}

// Function to mark a task as done
async function markTaskAsDone(taskId) {
  const cfg = config();
  setStatus(`Marking task ${taskId} as done...`);
  
  try {
    // Update the task with done=true
    await vikunjaUpdateTaskFull(cfg, taskId, { done: true });
    
    // Remove the task from our local cache since it's now done
    // (we only show undone tasks in the calendar)
    tasksById.delete(taskId);
    
    setStatus(`Task ${taskId} marked as done.`);
  } catch (e) {
    console.error(e);
    setStatus(`Error marking task ${taskId} as done: ${e.message || String(e)}`);
    throw e; // Re-throw to handle in the caller
  }
}

function mergeTaskPreserveLabels(oldTask, updatedTask) {
  if (!oldTask) return updatedTask || null;
  if (!updatedTask) return oldTask;

  const merged = { ...oldTask, ...updatedTask };

  // Preserve labels if the update response doesn't include them (common)
  if (!Array.isArray(updatedTask.labels) && Array.isArray(oldTask.labels)) {
    merged.labels = oldTask.labels;
  }

  return merged;
}

// Function to handle event selection
function toggleEventSelection(event, ctrlKey = false) {
  const eventId = event.id;
  
  console.log(`toggleEventSelection: eventId=${eventId}, ctrlKey=${ctrlKey}, currentlySelected=${selectedEvents.has(eventId)}`);
  console.log(`Current selections before: ${Array.from(selectedEvents).join(', ')}`);
  
  // If not holding Ctrl/Cmd and clicking on any event, clear other selections first
  if (!ctrlKey) {
    console.log('Not using Ctrl key, clearing all other selections');
    // Clear all selections except the current one if it's selected
    const wasSelected = selectedEvents.has(eventId);
    clearEventSelection();
    // If it was selected, we'll toggle it off in the next step
    if (wasSelected) {
      console.log(`Event ${eventId} was already selected, will be toggled off`);
    }
  }
  
  // Toggle the clicked event's selection state
  if (selectedEvents.has(eventId)) {
    console.log(`Removing selection for ${eventId}`);
    selectedEvents.delete(eventId);
    updateEventSelectionStyle(event, false);
  } else {
    console.log(`Adding selection for ${eventId}`);
    selectedEvents.add(eventId);
    updateEventSelectionStyle(event, true);
  }
  
  console.log(`Current selections after: ${Array.from(selectedEvents).join(', ')}`);
  
  // Update selection count and refresh selection styling
  updateSelectionCount();
  
  // Ensure all selected events have proper styling
  refreshAllSelectionStyles();
}

// Function to refresh all selection styles
function refreshAllSelectionStyles() {
  console.log(`Refreshing styles for all ${selectedEvents.size} selected events`);
  
  // First attempt immediate refresh
  selectedEvents.forEach(eventId => {
    const event = calendar.getEventById(eventId);
    if (event) {
      updateEventSelectionStyle(event, true);
    } else {
      console.log(`Could not find event object with ID ${eventId}`);
      // Try to find and style the element directly
      const eventElements = document.querySelectorAll('.fc-event');
      let found = false;
      
      for (const el of eventElements) {
        if ((el.fcSeg && el.fcSeg.eventRange && el.fcSeg.eventRange.def.publicId === eventId) ||
            el.getAttribute('data-event-id') === eventId) {
          el.classList.add('event-selected');
          if (!el.querySelector('.event-selected-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'event-selected-indicator';
            indicator.innerHTML = '✓';
            el.appendChild(indicator);
            el.setAttribute('data-event-id', eventId);
          }
          found = true;
          console.log(`Applied styling directly to DOM element for event ${eventId}`);
          break;
        }
      }
      
      if (!found) {
        console.log(`Could not find DOM element for event ${eventId}`);
      }
    }
  });
  
  // Then schedule multiple refresh attempts with increasing delays
  [50, 200, 500].forEach(delay => {
    setTimeout(() => {
      if (selectedEvents.size > 0) {
        console.log(`Delayed refresh attempt after ${delay}ms`);
        selectedEvents.forEach(eventId => {
          const event = calendar.getEventById(eventId);
          if (event && event.el) {
            updateEventSelectionStyle(event, true);
            console.log(`Refreshed selection styling for event ${eventId} after ${delay}ms`);
          }
        });
      }
    }, delay);
  });
}

// Update the visual style of selected events
function updateEventSelectionStyle(event, isSelected) {
  // Find the event element by querying the DOM directly if needed
  let eventEl = null;
  
  // Try different methods to find the element
  if (event.el) {
    eventEl = event.el;
  } else if (calendar.getEventById(event.id)?.el) {
    eventEl = calendar.getEventById(event.id).el;
  } else {
    // Try to find by DOM query if the element isn't directly accessible
    const eventElements = document.querySelectorAll('.fc-event');
    for (const el of eventElements) {
      if (el.fcSeg && el.fcSeg.eventRange && el.fcSeg.eventRange.def.publicId === event.id) {
        eventEl = el;
        break;
      }
    }
    
    // If still not found, try by data attribute that might be set
    if (!eventEl) {
      eventEl = document.querySelector(`[data-event-id="${event.id}"]`);
    }
  }
  
  if (!eventEl) {
    console.log(`Cannot find element for event ${event.id}, will try again later`);
    // Schedule a retry after a short delay
    setTimeout(() => {
      const updatedEvent = calendar.getEventById(event.id);
      if (updatedEvent && updatedEvent.el) {
        updateEventSelectionStyle(updatedEvent, isSelected);
      }
    }, 50);
    return;
  }
  
  if (isSelected) {
    // Add selection styling
    eventEl.classList.add('event-selected');
    // Add a checkmark or selection indicator
    if (!eventEl.querySelector('.event-selected-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'event-selected-indicator';
      indicator.innerHTML = '✓';
      eventEl.appendChild(indicator);
      
      // Also add a data attribute for easier selection later
      eventEl.setAttribute('data-event-id', event.id);
    }
    console.log(`Applied selection styling to event ${event.id}`);
  } else {
    // Remove selection styling
    eventEl.classList.remove('event-selected');
    // Remove the selection indicator
    const indicator = eventEl.querySelector('.event-selected-indicator');
    if (indicator) indicator.remove();
    console.log(`Removed selection styling from event ${event.id}`);
  }
}

// Clear all selections (both calendar events and unscheduled tasks)
function clearAllSelections() {
  console.log('Clearing all selections');
  console.log(`Calendar selections before clear: ${Array.from(selectedEvents).join(', ')}`);
  console.log(`Unscheduled selections before clear: ${Array.from(selectedUnscheduledTasks).join(', ')}`);
  
  // Remove styling from all selected calendar events
  selectedEvents.forEach(eventId => {
    const event = calendar.getEventById(eventId);
    if (event) updateEventSelectionStyle(event, false);
  });
  
  // Remove styling from all selected unscheduled tasks
  selectedUnscheduledTasks.forEach(taskId => {
    const taskEl = document.querySelector(`.task[data-task-id="${taskId}"]`);
    if (taskEl) taskEl.classList.remove('task-selected');
  });
  
  // Clear both selection sets
  selectedEvents.clear();
  selectedUnscheduledTasks.clear();
  updateSelectionCount();
  
  console.log('All selections cleared');
}

// Alias for backward compatibility
function clearEventSelection() {
  clearAllSelections();
}

// Update the selection count display
function updateSelectionCount() {
  const totalSelected = selectedEvents.size + selectedUnscheduledTasks.size;
  
  if (els.selectedCount) {
    els.selectedCount.textContent = totalSelected;
    els.selectedCount.parentElement.style.display = totalSelected > 0 ? 'flex' : 'none';
  }
  
  // Debug: log current selections whenever count changes
  console.log(`Selection count updated: ${totalSelected} items selected`);
  console.log(`Calendar events selected: ${selectedEvents.size}`);
  console.log(`Unscheduled tasks selected: ${selectedUnscheduledTasks.size}`);
  console.log(`Calendar selections: ${Array.from(selectedEvents).join(', ')}`);
  console.log(`Unscheduled selections: ${Array.from(selectedUnscheduledTasks).join(', ')}`);
}

function ensureCalendar() {
  if (calendar) return;

  const calEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calEl, {
    // plugins: [ FullCalendarInteraction ],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    dateClick: handleDateClick,
    dayCellDidMount: function(info) {
      // Apply day colors when cells are mounted
      const dateStr = info.date.toISOString().split('T')[0];
      const color = dayColors[dateStr];
      if (color) {
        applyDayColor(info.el, color);
      }
    },
    editable: true,
    droppable: true, // accept external drags
    selectable: false,
    eventStartEditable: true,
    eventDurationEditable: false,
    eventResizableFromStart: false,
    slotDuration: '00:30:00', // 30-minute slots in time grid
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    // Show full 24-hour range for day/week views
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    
    // Custom event rendering for recurring projections
    eventDidMount: (arg) => {
      // Make label colors visible (background + border)
      const c = arg.event.backgroundColor || arg.event.borderColor;
      if (c) {
        arg.el.style.backgroundColor = c;
        arg.el.style.borderColor = c;
      }
      arg.el.style.borderRadius = '10px';
      arg.el.style.borderWidth = '1px';
      
      // Add data attribute for easier selection
      arg.el.setAttribute('data-event-id', arg.event.id);
      
      // Special styling for recurring projections
      if (arg.event.extendedProps?.isProjection) {
        // Add dashed border
        arg.el.style.borderStyle = 'dashed';
        
        // Add a small recurring icon
        const titleEl = arg.el.querySelector('.fc-event-title');
        if (titleEl) {
          const iconSpan = document.createElement('span');
          iconSpan.innerHTML = ' ↻';
          iconSpan.style.fontSize = '0.85em';
          iconSpan.title = 'Recurring event projection';
          titleEl.appendChild(iconSpan);
        }
      }
      
      // Restore selection state if this event was previously selected
      if (selectedEvents.has(arg.event.id)) {
        console.log(`Event ${arg.event.id} mounted and is selected, applying styling`);
        // Use setTimeout to ensure the element is fully in the DOM
        setTimeout(() => {
          updateEventSelectionStyle(arg.event, true);
        }, 0);
      }
    },

    drop: async (info) => {
      // external drop from unscheduled list into calendar
      const cfg = config();
      const taskId = info.draggedEl ? Number(info.draggedEl.getAttribute('data-task-id')) : null;
      if (!taskId) return;

      try {
        // Check if this is part of a multi-selection of unscheduled tasks
        const isMultiSelection = selectedUnscheduledTasks.size > 1 && selectedUnscheduledTasks.has(taskId);
        
        // Check if we're in day view to use specific time
        const isTimeSpecific = calendar.view.type === 'timeGridDay' || calendar.view.type === 'timeGridWeek';
        
        // Use the date and time you dropped on
        const iso = toLocalRFC3339WithTime(info.date, isTimeSpecific);
        
        if (isMultiSelection) {
          // Handle multi-selection drop
          setStatus(`Scheduling ${selectedUnscheduledTasks.size} selected tasks...`);
          
          // Process tasks sequentially to avoid overwhelming the API
          let updatedCount = 0;
          
          for (const selectedTaskId of selectedUnscheduledTasks) {
            try {
              // Update the task one at a time
              await vikunjaUpdateTaskFull(cfg, selectedTaskId, { [cfg.dateField]: iso });
              
              // Update cache
              const t = tasksById.get(selectedTaskId);
              if (t) t[cfg.dateField] = iso;
              updatedCount++;
              
              // Small delay between requests to reduce server load
              if (selectedUnscheduledTasks.size > 5) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (e) {
              console.error(`Failed to schedule task ${selectedTaskId}:`, e);
            }
          }
          
          // Clear selections after scheduling
          clearAllSelections();
          
          // Refresh UI
          await refreshUIFromCache(cfg);
          
          const timeStr = isTimeSpecific ? 
            ` at ${info.date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}` : '';
          setStatus(`Scheduled ${updatedCount} tasks on ${info.date.toDateString()}${timeStr}.`);
        } else {
          // Handle single task drop
          setStatus(`Scheduling task ${taskId}...`);
          
          await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: iso });

          // Ensure cache reflects intended field even if server echoes oddly
          const t = tasksById.get(taskId);
          if (t) t[cfg.dateField] = iso;

          // Clear selections
          clearAllSelections();
          
          await refreshUIFromCache(cfg);

          const timeStr = isTimeSpecific ? 
            ` at ${info.date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}` : '';
          setStatus(`Scheduled task ${taskId} on ${info.date.toDateString()}${timeStr}.`);
        }
      } catch (e) {
        console.error(e);
        setStatus(String(e.message || e));
        // prevent the drop from sticking visually
        // FullCalendar will already place it; we just rebuild UI next load/refresh.
        await refreshUIFromCache(cfg);
      }
    },

    eventDrop: async (info) => {
      // move an existing scheduled item to another date/time
      const cfg = config();
      const taskId = info.event.extendedProps?.taskId;
      if (!taskId) return;

      try {
        // Check if this is part of a multi-selection
        const isMultiSelection = selectedEvents.size > 1 && selectedEvents.has(info.event.id);
        
        if (isMultiSelection) {
          // Handle multi-selection drop
          setStatus(`Updating ${selectedEvents.size} selected tasks...`);
          
          // Check if the event is time-specific or all-day
          const isTimeSpecific = !info.event.allDay;
          const iso = toLocalRFC3339WithTime(info.event.start, isTimeSpecific);
          
          // Process events sequentially to avoid overwhelming the API
          let updatedCount = 0;
          
          for (const eventId of selectedEvents) {
            const event = calendar.getEventById(eventId);
            if (!event) continue;
            
            const eventTaskId = event.extendedProps?.taskId;
            if (!eventTaskId) continue;
            
            // Skip recurring projections
            if (event.extendedProps?.isProjection) continue;
            
            try {
              // Update the task one at a time
              await vikunjaUpdateTaskFull(cfg, eventTaskId, { [cfg.dateField]: iso });
              
              // Update cache
              const t = tasksById.get(eventTaskId);
              if (t) t[cfg.dateField] = iso;
              updatedCount++;
              
              // Small delay between requests to reduce server load
              if (selectedEvents.size > 5) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (e) {
              console.error(`Failed to update task ${eventTaskId}:`, e);
            }
          }
          
          // Clear selections after moving
          clearEventSelection();
          
          // Refresh UI
          await refreshUIFromCache(cfg);
          
          const timeStr = isTimeSpecific ? 
            ` at ${info.event.start.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}` : '';
          setStatus(`Updated ${updatedCount} tasks to ${info.event.start.toDateString()}${timeStr}.`);
        } else {
          // Handle single event drop
          setStatus(`Updating task ${taskId}...`);
          
          // Check if the event is time-specific or all-day
          const isTimeSpecific = !info.event.allDay;
          const iso = toLocalRFC3339WithTime(info.event.start, isTimeSpecific);
          
          await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: iso });

          // Ensure cache reflects intended field even if server echoes oddly
          const t = tasksById.get(taskId);
          if (t) t[cfg.dateField] = iso;
          
          // Clear selections after moving
          clearEventSelection();

          await refreshUIFromCache(cfg);
          
          const timeStr = isTimeSpecific ? 
            ` at ${info.event.start.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}` : '';
          setStatus(`Updated task ${taskId} to ${info.event.start.toDateString()}${timeStr}.`);
        }
      } catch (e) {
        console.error(e);
        setStatus(String(e.message || e));
        info.revert();
      }
    },

    eventDragStart: (info) => {
      els.unscheduledDrop.classList.add('active');
      
      // If dragging an event that's not selected but there are other selected events,
      // clear the other selections and select only this one
      if (!selectedEvents.has(info.event.id) && selectedEvents.size > 0) {
        console.log('Dragging unselected event while others are selected - selecting only this one');
        clearEventSelection();
        toggleEventSelection(info.event, false);
      }
      
      console.log(`Starting drag of event ${info.event.id}`);
      console.log(`Current selections during drag: ${Array.from(selectedEvents).join(', ')}`);
    },
    
    // Add double-click handler for showing task details
    eventDidMount: (arg) => {
      // Make label colors visible (background + border)
      const c = arg.event.backgroundColor || arg.event.borderColor;
      if (c) {
        arg.el.style.backgroundColor = c;
        arg.el.style.borderColor = c;
      }
      arg.el.style.borderRadius = '10px';
      arg.el.style.borderWidth = '1px';
      
      // Add data attribute for easier selection
      arg.el.setAttribute('data-event-id', arg.event.id);
      
      // Special styling for recurring projections
      if (arg.event.extendedProps?.isProjection) {
        // Add dashed border
        arg.el.style.borderStyle = 'dashed';
        
        // Add a small recurring icon
        const titleEl = arg.el.querySelector('.fc-event-title');
        if (titleEl) {
          const iconSpan = document.createElement('span');
          iconSpan.innerHTML = ' ↻';
          iconSpan.style.fontSize = '0.85em';
          iconSpan.title = 'Recurring event projection';
          titleEl.appendChild(iconSpan);
        }
      }
      
      // Restore selection state if this event was previously selected
      if (selectedEvents.has(arg.event.id)) {
        console.log(`Event ${arg.event.id} mounted and is selected, applying styling`);
        // Use setTimeout to ensure the element is fully in the DOM
        setTimeout(() => {
          updateEventSelectionStyle(arg.event, true);
        }, 0);
      }
      
      // Add double-click handler for showing task details
      if (arg.el) {
        arg.el.addEventListener('dblclick', () => {
          const taskId = arg.event.extendedProps?.taskId;
          if (taskId) {
            console.log(`Double-clicked event ${arg.event.id}, showing task details`);
            showTaskDetails(taskId);
          }
        });
      }
    },
    eventDragStop: async (info) => {
      els.unscheduledDrop.classList.remove('active');

      // If dropped over the unscheduled dropzone, clear the date field.
      const cfg = config();
      const taskId = info.event.extendedProps?.taskId;
      if (!taskId) return;

      const { clientX, clientY } = info.jsEvent;
      const target = document.elementFromPoint(clientX, clientY);
      const overDropzone = target && target.closest('#unscheduledDrop');
      if (!overDropzone) return;

      try {
        // Check if this is part of a multi-selection
        const isMultiSelection = selectedEvents.size > 1 && selectedEvents.has(info.event.id);
        
        if (isMultiSelection) {
          // Handle multi-selection unscheduling
          setStatus(`Unscheduling ${selectedEvents.size} selected tasks...`);
          
          // Process events sequentially to avoid overwhelming the API
          let updatedCount = 0;
          
          for (const eventId of selectedEvents) {
            const event = calendar.getEventById(eventId);
            if (!event) continue;
            
            const eventTaskId = event.extendedProps?.taskId;
            if (!eventTaskId) continue;
            
            // Skip recurring projections
            if (event.extendedProps?.isProjection) continue;
            
            try {
              // Update the task one at a time
              await vikunjaUpdateTaskFull(cfg, eventTaskId, { [cfg.dateField]: null });
              
              // Update cache
              const t = tasksById.get(eventTaskId);
              if (t) t[cfg.dateField] = null;
              updatedCount++;
              
              // Small delay between requests to reduce server load
              if (selectedEvents.size > 5) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (e) {
              console.error(`Failed to unschedule task ${eventTaskId}:`, e);
            }
          }
          
          // Clear selections after unscheduling
          clearEventSelection();
          
          // Refresh UI
          await refreshUIFromCache(cfg);
          setStatus(`Unscheduled ${updatedCount} tasks.`);
        } else {
          // Handle single event unscheduling
          setStatus(`Unscheduling task ${taskId}...`);
          await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: null });

          const t = tasksById.get(taskId);
          if (t) t[cfg.dateField] = null;
          
          // Clear selections after unscheduling
          clearEventSelection();

          await refreshUIFromCache(cfg);
          setStatus(`Unscheduled task ${taskId}.`);
        }
      } catch (e) {
        console.error(e);
        setStatus(String(e.message || e));
        await refreshUIFromCache(cfg);
      }
    },

    
    eventReceive: (info) => {
      // Remove the auto-created event immediately; we render from our cache instead.
      info.event.remove();
    },
    
    eventClick: (info) => {
      // Assign a unique ID to the event if it doesn't have one
      if (!info.event.id) {
        const taskId = info.event.extendedProps?.taskId;
        if (taskId) {
          info.event.setProp('id', `event-${taskId}`);
        }
      }
      
      console.log(`eventClick: id=${info.event.id}, ctrl=${info.jsEvent.ctrlKey}, meta=${info.jsEvent.metaKey}`);
      console.log(`Current selections: ${Array.from(selectedEvents).join(', ')}`);
      
      // Check if Ctrl/Cmd key is pressed for multi-select
      if (info.jsEvent.ctrlKey || info.jsEvent.metaKey) {
        console.log('Using Ctrl/Cmd key for multi-select');
        // Toggle selection with Ctrl key
        toggleEventSelection(info.event, true);
        return; // Exit early to prevent showing task details
      } 
      
      // If clicking on an already selected event
      if (selectedEvents.has(info.event.id)) {
        // If this is the only selected event or there are multiple events selected
        if (selectedEvents.size === 1) {
          console.log('Only one event selected, showing task details');
          // If only this event is selected, show task details
          const taskId = info.event.extendedProps?.taskId;
          if (taskId) showTaskDetails(taskId);
        } else {
          console.log('Clicking on already selected event, selecting only this one');
          // If multiple events are selected, select only this one
          toggleEventSelection(info.event, false);
        }
      } else {
        console.log('Regular click - showing task details');
        // Regular click - clear all selections and show task details
        clearEventSelection();
        
        const taskId = info.event.extendedProps?.taskId;
        if (taskId) showTaskDetails(taskId);
      }
    },
  });

  calendar.render();
}

// Generate recurring event projections for a given task
function generateRecurringProjections(task, baseDate, cfg) {
  const projections = [];
  
  // Only process tasks with repeat_after > 0
  if (!task.repeat_after || task.repeat_after <= 0) {
    return projections;
  }
  
  // If recurring events are disabled, return empty array
  if (!cfg.showRecurring) {
    return projections;
  }
  
  const color = pickEventColor(task);
  
  // Check if the base date has a specific time
  const hasSpecificTime = baseDate.getHours() !== 0 || baseDate.getMinutes() !== 0;
  
  // Calculate end date based on projection weeks setting
  const today = new Date();
  const projectionEndDate = new Date(today);
  projectionEndDate.setDate(today.getDate() + (cfg.projectionWeeks * 7));
  
  // Start with the base date
  let currentDate = new Date(baseDate);
  
  // Generate up to 50 projections (safety limit)
  for (let i = 0; i < 50; i++) {
    // Add repeat_after seconds to the current date
    const nextDate = new Date(currentDate.getTime() + (task.repeat_after * 1000));
    
    // Stop if we've gone beyond our projection window
    if (nextDate > projectionEndDate) break;
    
    projections.push({
      title: `${task.title || `(task ${task.id})`} (recurring)`,
      start: nextDate,
      allDay: !hasSpecificTime, // Only all-day if original task has no specific time
      backgroundColor: color ? `${color}80` : undefined, // 50% opacity
      borderColor: color || undefined,
      borderDashed: true,
      classNames: ['recurring-projection'],
      extendedProps: { 
        taskId: task.id,
        isProjection: true
      }
    });
    
    // Move to the next date
    currentDate = nextDate;
  }
  
  return projections;
}

async function refreshUIFromCache(cfg) {
  ensureCalendar();

  console.log(`Refreshing UI from cache. Current selections: ${Array.from(selectedEvents).join(', ')}`);
  
  // Save current selections before removing events
  const previouslySelected = new Set(selectedEvents);
  selectedEvents.clear();

  // Filter by labels and split into scheduled/unscheduled based on chosen field
  const all = Array.from(tasksById.values()).filter(t => taskMatchesLabelFilter(t, cfg));
  const scheduled = [];
  const unscheduled = [];

  for (const t of all) {
    const v = t?.[cfg.dateField] ?? null;
    const dt = parseISO(v);
    if (dt) scheduled.push(t);
    else unscheduled.push(t);
  }

  // Build calendar events
  calendar.removeAllEvents();
  for (const t of scheduled) {
    const dt = parseISO(t[cfg.dateField]);
    if (!dt) continue;

    const color = pickEventColor(t);
    
    // Check if this has a non-midnight time
    const hasSpecificTime = dt.getHours() !== 0 || dt.getMinutes() !== 0;
    
    // Create a unique ID for the event
    const eventId = `event-${t.id}`;
    
    // Add the actual scheduled event
    calendar.addEvent({
      id: eventId,
      title: t.title || `(task ${t.id})`,
      start: dt,
      allDay: !hasSpecificTime, // Only all-day if no specific time
      backgroundColor: color || undefined,
      borderColor: color || undefined,
      extendedProps: { taskId: t.id }
    });
    
    // Restore selection if this event was previously selected
    if (previouslySelected.has(eventId)) {
      selectedEvents.add(eventId);
      // Make sure to apply the selection styling to the newly created event
      const newEvent = calendar.getEventById(eventId);
      if (newEvent) {
        setTimeout(() => {
          updateEventSelectionStyle(newEvent, true);
          console.log(`Restored selection styling for event ${eventId}`);
        }, 0);
      }
    }
    
    // Generate and add recurring projections if applicable
    if (t.repeat_after && t.repeat_after > 0) {
      const projections = generateRecurringProjections(t, dt, cfg);
      projections.forEach(projection => {
        const projEventId = `projection-${t.id}-${projection.start.getTime()}`;
        projection.id = projEventId;
        calendar.addEvent(projection);
      });
    }
  }
  
  // Update selection count
  updateSelectionCount();
  
  // Refresh all selection styles after a delay to ensure rendering is complete
  setTimeout(() => {
    console.log(`After UI refresh, restoring ${selectedEvents.size} selections`);
    refreshAllSelectionStyles();
  }, 200);

  // Render unscheduled list
  // Sort: label count desc, then title
  unscheduled.sort((a,b) => {
    const la = Array.isArray(a.labels) ? a.labels.length : 0;
    const lb = Array.isArray(b.labels) ? b.labels.length : 0;
    if (lb !== la) return lb - la;
    return String(a.title||'').localeCompare(String(b.title||''));
  });
  renderUnscheduled(unscheduled);
}

// Handle date click in the calendar
function handleDateClick(info) {
  // Store the selected date
  selectedDate = info.dateStr;
  
  // Update the display
  const displayEl = document.getElementById('selectedDateDisplay');
  if (displayEl) {
    displayEl.textContent = `Selected: ${selectedDate}`;
  }
  
  // Highlight the selected date
  const allDayCells = document.querySelectorAll('.fc-daygrid-day');
  allDayCells.forEach(cell => {
    cell.classList.remove('day-selected');
  });
  
  info.dayEl.classList.add('day-selected');
  
  // Update color button states
  updateColorButtonStates(selectedDate);
}

// Apply color to a day cell
function applyDayColor(dayEl, color) {
  if (!dayEl) return;
  
  // Remove any existing color classes
  dayEl.classList.remove('day-color-red', 'day-color-green', 'day-color-blue', 'day-color-yellow', 'day-color-purple');
  
  // Apply the new color class if not "none" and is a valid color
  if (color && color !== 'none' && ['red', 'green', 'blue', 'yellow', 'purple'].includes(color)) {
    dayEl.classList.add(`day-color-${color}`);
  }
}

// Update color button states based on selected date
function updateColorButtonStates(dateStr) {
  const buttons = document.querySelectorAll('.color-btn');
  // Safely access dayColors with fallback to 'none'
  const currentColor = dayColors && dateStr in dayColors ? dayColors[dateStr] : 'none';
  
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.color === currentColor) {
      btn.classList.add('active');
    }
  });
}

async function loadEverything() {
  const cfg = config();
  
  // Ensure labels are loaded so filtering is correct
  if (!labelsById || labelsById.size === 0) {
    await loadLabelsOnly();
  }

  // Load day colors and color labels
  await Promise.all([
    fetchDayColors(),
    fetchColorLabels()
  ]);
  
  // Update UI with custom color labels
  updateColorButtonLabels();

  // warn if config changed since last load (dateField affects split)
  const h = configHash(cfg);
  lastLoadedConfigHash = h;

  try {
    setStatus('Loading labels...');
    const labels = await vikunjaFetchAllLabels(cfg);
    labelsById = new Map(labels.map(l => [l.id, l]));
    ensureLabelSelectionDefaults(labels);
    saveConfigToStorage();          // persist any new labels defaulted to true
    renderLabelsPicker(labels);
  
    setStatus('Loading tasks from Vikunja...');
    const tasks = await vikunjaFetchAllTasks(cfg);

    tasksById.clear();
    for (const t of tasks) {
      if (t && t.id != null) tasksById.set(t.id, t);
    }

    await refreshUIFromCache(cfg);
    setStatus(`Loaded ${tasks.length} tasks. Showing those matching label filter; scheduled by "${cfg.dateField}".`);
  } catch (e) {
    console.error(e);
    setStatus(String(e.message || e));
  }
}

const modal = {
  root: document.getElementById('taskModal'),
  title: document.getElementById('modalTitle'),
  meta: document.getElementById('modalMeta'),
  desc: document.getElementById('modalDescription'),
  json: document.getElementById('modalJson'),
  open: document.getElementById('modalOpenLink'),
  openProject: document.getElementById('modalOpenProjectLink'),
  markDone: document.getElementById('modalMarkDoneBtn'),
  close: document.getElementById('modalCloseBtn'),
  detailsGrid: document.getElementById('modalDetailsGrid'),
  commentsWrap: document.getElementById('modalCommentsWrap'),
  comments: document.getElementById('modalComments'),
  commentsStatus: document.getElementById('modalCommentsStatus'),
};

modal.close.addEventListener('click', () => modal.root.style.display = 'none');
modal.root.addEventListener('click', (e) => { if (e.target === modal.root) modal.root.style.display = 'none'; });

// Add event listener for the Mark Done button
let currentTaskId = null; // Track the currently displayed task ID
modal.markDone.addEventListener('click', async () => {
  if (currentTaskId) {
    try {
      await markTaskAsDone(currentTaskId);
      modal.root.style.display = 'none'; // Close the modal
      await loadEverything(); // Reload all tasks
    } catch (e) {
      console.error(e);
      setStatus(`Error marking task ${currentTaskId} as done: ${e.message || String(e)}`);
    }
  }
});

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// very small sanitizer: strips scripts/styles and inline event handlers.
// Allows basic formatting tags.
// If you prefer, we can swap to DOMPurify CDN later.
function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');

  // remove script/style/iframe/object/embed
  tpl.content.querySelectorAll('script,style,iframe,object,embed').forEach(n => n.remove());

  // remove on* handlers + javascript: urls
  tpl.content.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const val = (attr.value || '').trim().toLowerCase();

      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && val.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return tpl.innerHTML;
}

function fmtDateTime(iso) {
  const d = parseISO(iso);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function truthyAttachmentFlag(task) {
  // Vikunja may expose attachments in different ways depending on endpoint.
  // We'll treat "attachments" array OR "attachment_count" > 0 as true.
  if (Array.isArray(task.attachments)) return task.attachments.length > 0;
  if (typeof task.attachment_count === 'number') return task.attachment_count > 0;
  return false;
}

function taskColorHex(task) {
  // Task-level color (NOT label colors). This is just for modal.
  const c = task?.hex_color ?? task?.color ?? null;
  if (!c || typeof c !== 'string') return null;
  return c.startsWith('#') ? c : `#${c}`;
}

function renderDetailsGrid(task) {
  const rows = [
    ['Priority', (task?.priority ?? '—')],
    ['Task color', taskColorHex(task) ? `<span style="display:inline-flex; align-items:center; gap:8px;">
        <span style="width:12px; height:12px; border-radius:999px; border:1px solid #2a3140; background:${taskColorHex(task)};"></span>
        <span>${escapeHtml(taskColorHex(task))}</span>
      </span>` : '—'],
    ['Created', fmtDateTime(task?.created)],
    ['Updated', fmtDateTime(task?.updated)],
    ['Attachments?', truthyAttachmentFlag(task) ? 'true' : 'false'],
  ];

  modal.detailsGrid.innerHTML = rows.map(([k, v]) => {
    return `
      <div style="color:#aab4c5; font-size:12px;">${escapeHtml(k)}</div>
      <div style="font-size:13px;">${typeof v === 'string' ? v : escapeHtml(String(v))}</div>
    `;
  }).join('');
}

async function vikunjaFetchComments(cfg, taskId) {
  // This is the common pattern in Vikunja API:
  // GET /api/v1/tasks/{id}/comments
  // If your instance differs, adjust this path.
  const url = new URL(`/api/tasks/${encodeURIComponent(taskId)}/comments`, window.location.origin);
  
  const res = await fetch(url.toString());

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error(`GET /tasks/${taskId}/comments failed (${res.status}): ${txt || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function renderComments(comments) {
  modal.comments.innerHTML = '';

  if (!comments || comments.length === 0) {
    modal.comments.innerHTML = `<div style="color:#aab4c5; font-size:12px;">No comments.</div>`;
    return;
  }

  for (const c of comments) {
    const author =
      c?.author?.username ??
      c?.user?.username ??
      c?.created_by?.username ??
      'unknown';

    const created = fmtDateTime(c?.created);

    const text = c?.comment ?? c?.text ?? c?.content ?? '';

    const card = document.createElement('div');
    card.style.border = '1px solid #2a3140';
    card.style.borderRadius = '12px';
    card.style.padding = '8px 10px';
    card.style.background = 'rgba(255,255,255,0.02)';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline;">
        <div style="font-weight:650; font-size:13px;">${escapeHtml(author)}</div>
        <div style="font-size:12px; color:#aab4c5;">${escapeHtml(created)}</div>
      </div>
      <div style="margin-top:6px; white-space:pre-wrap; line-height:1.35; font-size:13px;">
        ${escapeHtml(text || '')}
      </div>
    `;

    modal.comments.appendChild(card);
  }
}

async function showTaskDetails(taskId) {
  const cfg = config();
  setStatus(`Loading task ${taskId}...`);
  
  // Store the current task ID for the Mark Done button
  currentTaskId = taskId;

  let t = null;
  try {
    t = await vikunjaGetTaskById(cfg, taskId);
    const old = tasksById.get(taskId);
    tasksById.set(taskId, mergeTaskPreserveLabels(old, t));
  } catch (e) {
    t = tasksById.get(taskId);
  }

  if (!t) {
    setStatus(`Could not load task ${taskId}.`);
    return;
  }

  modal.title.textContent = t.title || `(task ${taskId})`;
  modal.meta.textContent = `#${taskId} • project_id=${t.project_id ?? '—'} • list_id=${t.list_id ?? '—'}`;
  modal.open.href = taskUiLink(taskId);
  
  // Set project link if project_id exists
  if (t.project_id) {
    modal.openProject.href = projectUiLink(t.project_id);
    modal.openProject.style.display = '';
  } else {
    modal.openProject.style.display = 'none';
  }

  // Details grid
  renderDetailsGrid(t);

  // Description as HTML (sanitized). If empty, show placeholder.
  const desc = (t.description && String(t.description).trim().length) ? String(t.description) : '';
  if (desc) {
    modal.desc.innerHTML = sanitizeHtml(desc);
  } else {
    modal.desc.innerHTML = `<span style="color:#aab4c5;">(no description)</span>`;
  }

  // Raw JSON
  modal.json.textContent = JSON.stringify(t, null, 2);

  // Comments (graceful)
  modal.commentsStatus.textContent = '';
  modal.comments.innerHTML = `<div style="color:#aab4c5; font-size:12px;">Loading comments…</div>`;
  modal.commentsWrap.style.display = 'block';

  try {
    const comments = await vikunjaFetchComments(cfg, taskId);
    modal.commentsStatus.textContent = `${comments.length}`;
    renderComments(comments);
  } catch (e) {
    const status = e?.status;
    // Permission missing: hide list but keep UI functional
    if (status === 401 || status === 403) {
      modal.commentsStatus.textContent = '—';
      modal.comments.innerHTML = `<div style="color:#aab4c5; font-size:12px;">Comments not available (token lacks permission).</div>`;
    } else {
      modal.commentsStatus.textContent = 'error';
      modal.comments.innerHTML = `<div style="color:#aab4c5; font-size:12px;">Failed to load comments: ${escapeHtml(e.message || String(e))}</div>`;
    }
  }

  modal.root.style.display = 'block';
  setStatus('');
}

els.loadLabelsBtn.addEventListener('click', loadLabelsOnly);
els.dateField.addEventListener('change', async () => {
  if (!calendar) return;
  const cfg = config();
  await refreshUIFromCache(cfg);
});

// Dropzone highlighting for external drags (unscheduled -> calendar doesn't need this; calendar -> unscheduled handled above)
els.unscheduledDrop.addEventListener('dragenter', () => els.unscheduledDrop.classList.add('active'));
els.unscheduledDrop.addEventListener('dragleave', () => els.unscheduledDrop.classList.remove('active'));
// Function to toggle selection of an unscheduled task
function toggleUnscheduledTaskSelection(taskEl, ctrlKey = false) {
  if (!taskEl) return;
  
  const taskId = Number(taskEl.getAttribute('data-task-id'));
  if (!taskId) return;
  
  console.log(`Toggling unscheduled task selection: taskId=${taskId}, ctrlKey=${ctrlKey}`);
  
  // If not using Ctrl key and clicking on an unselected task, clear other selections
  if (!ctrlKey) {
    console.log('Not using Ctrl key, clearing all other selections');
    // Remember if this task was already selected
    const wasSelected = selectedUnscheduledTasks.has(taskId);
    clearAllSelections();
    // If it was already selected, we'll toggle it off in the next step
    if (wasSelected) {
      console.log(`Task ${taskId} was already selected, will be toggled off`);
    }
  }
  
  // Toggle selection for this task
  if (selectedUnscheduledTasks.has(taskId)) {
    console.log(`Removing selection for task ${taskId}`);
    selectedUnscheduledTasks.delete(taskId);
    taskEl.classList.remove('task-selected');
  } else {
    console.log(`Adding selection for task ${taskId}`);
    selectedUnscheduledTasks.add(taskId);
    taskEl.classList.add('task-selected');
  }
  
  updateSelectionCount();
}

els.unscheduledList.addEventListener('click', (e) => {
  const taskEl = e.target.closest('.task');
  if (!taskEl) return;
  
  // Check if Ctrl/Cmd key is pressed for multi-select
  if (e.ctrlKey || e.metaKey) {
    toggleUnscheduledTaskSelection(taskEl, true);
  } else {
    const taskId = Number(taskEl.getAttribute('data-task-id'));
    if (taskId) showTaskDetails(taskId);
  }
});
// Auto-load labels and server config on page load
window.addEventListener('DOMContentLoaded', async () => {
  // First fetch server config
  await fetchServerConfig();
  // Then restore saved settings
  loadConfigFromStorage();
  // Then load labels
  await loadLabelsOnly();
  // Load day colors
  await fetchDayColors();
  // Load color labels
  await fetchColorLabels();
  
  // Set up color picker buttons
  setupColorPickerButtons();
  
  // Set up color label customization
  setupColorLabelCustomization();
});

// Set up color picker buttons
function setupColorPickerButtons() {
  const colorButtons = document.querySelectorAll('.color-btn');
  
  colorButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!selectedDate) {
        setStatus('Please select a date first');
        return;
      }
      
      const color = btn.dataset.color;
      const colorToSave = color === 'none' ? null : color;
      
      // Update UI immediately
      const dateCell = document.querySelector(`.fc-day[data-date="${selectedDate}"], .fc-daygrid-day[data-date="${selectedDate}"]`);
      if (dateCell) {
        applyDayColor(dateCell, colorToSave);
      }
      
      // Update button states
      colorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Save to server
      await saveDayColor(selectedDate, colorToSave);
      
      // Update local cache
      if (colorToSave === null) {
        delete dayColors[selectedDate];
      } else {
        dayColors[selectedDate] = color;
      }
      
      setStatus(`Updated color for ${selectedDate} to ${colorLabels[color] || color}`);
    });
  });
  
  // Update button labels with custom labels
  updateColorButtonLabels();
}

// Update color button labels based on custom labels
function updateColorButtonLabels() {
  const colorButtons = document.querySelectorAll('.color-btn');
  
  colorButtons.forEach(btn => {
    const color = btn.dataset.color;
    if (color && color !== 'none' && colorLabels[color]) {
      btn.textContent = colorLabels[color];
    }
  });
}

// Set up color label customization
function setupColorLabelCustomization() {
  const editButtons = document.querySelectorAll('.edit-color-label');
  
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const colorKey = btn.dataset.color;
      const currentLabel = colorLabels[colorKey] || colorKey;
      
      // Prompt for new label
      const newLabel = prompt(`Enter new name for ${colorKey} color:`, currentLabel);
      
      if (newLabel !== null && newLabel.trim() !== '') {
        // Save to server
        saveColorLabel(colorKey, newLabel.trim());
        
        // Update local cache
        colorLabels[colorKey] = newLabel.trim();
        
        // Update UI
        updateColorButtonLabels();
        
        // Update the edit button's label display
        const labelDisplay = btn.previousElementSibling;
        if (labelDisplay && labelDisplay.classList.contains('color-label-display')) {
          labelDisplay.textContent = newLabel.trim();
        }
        
        setStatus(`Updated label for ${colorKey} color to "${newLabel.trim()}"`);
      }
    });
  });
}

// Persist settings as you type/change
['input', 'change'].forEach(evt => {
  els.dateField.addEventListener(evt, saveConfigToStorage);
  els.showRecurring.addEventListener(evt, () => {
    saveConfigToStorage();
    refreshUIFromCache(config());
  });
  els.projectionWeeks.addEventListener(evt, () => {
    saveConfigToStorage();
    refreshUIFromCache(config());
  });
});

els.clearBrowserBtn.addEventListener('click', () => {
  const ok = confirm(
    'Clear browser data for this app?\n\n' +
    'This removes saved UI URL, label selections, and UI preferences.'
  );
  if (!ok) return;

  suspendConfigSave = true;

  // Remove persisted data
  localStorage.removeItem(STORAGE_KEY);

  // Clear input fields
  els.dateField.value = 'due_date';
  
  // Reset recurring event settings
  els.showRecurring.checked = true;
  els.projectionWeeks.value = '4';

  // Reset label UI
  if (els.labelsPicker) els.labelsPicker.innerHTML = '';
  labelSelectionById = {};
  if (labelsById?.clear) labelsById.clear();

  // Clear tasks
  tasksById.clear();
  if (calendar) calendar.removeAllEvents();
  clearUnscheduled();

  setStatus('Browser data cleared.');

  // Reset config panel state
  const d = document.getElementById('configDetails');
  if (d) d.open = true;

  suspendConfigSave = false;
});

if (els.unscheduledList) {
  els.unscheduledList.style.touchAction = 'pan-y';
}
if (els.unscheduledDrop) {
  els.unscheduledDrop.style.touchAction = 'pan-y';
}

// Add CSS for recurring projections and selected events
const recurringStyle = document.createElement('style');
recurringStyle.textContent = `
  .recurring-projection {
    opacity: 0.8;
  }
  .recurring-projection:hover {
    opacity: 1;
  }
  
  .event-selected {
    box-shadow: 0 0 0 3px #ffcc00 !important;
    position: relative;
    transform: scale(1.05);
    z-index: 10 !important;
    filter: brightness(1.2);
    outline: 2px solid #ffcc00 !important;
  }
  
  .event-selected-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    background-color: #ffcc00;
    color: #000;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    z-index: 20;
    border: 1px solid #000;
    pointer-events: none;
  }
  
  .task-selected {
    box-shadow: 0 0 0 3px #ffcc00 !important;
    position: relative;
    transform: scale(1.02);
    z-index: 5;
    background-color: rgba(255, 204, 0, 0.1) !important;
    outline: 2px solid #ffcc00 !important;
  }
  
  /* Day color styles */
  .day-selected {
    box-shadow: inset 0 0 0 2px #ffcc00 !important;
  }
  
  .color-btn {
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }
  
  .color-btn:hover {
    transform: translateY(-2px);
  }
  
  .color-btn.active {
    box-shadow: 0 0 0 2px #ffcc00;
    font-weight: bold;
  }
  
  /* Day color classes */
  .day-color-red {
    background-color: rgba(255, 99, 71, 0.2) !important;
  }
  
  .day-color-green {
    background-color: rgba(50, 205, 50, 0.2) !important;
  }
  
  .day-color-blue {
    background-color: rgba(30, 144, 255, 0.2) !important;
  }
  
  .day-color-yellow {
    background-color: rgba(255, 215, 0, 0.2) !important;
  }
  
  .day-color-purple {
    background-color: rgba(138, 43, 226, 0.2) !important;
  }
`;
document.head.appendChild(recurringStyle);

// Add event listener for the clear selection button
if (els.clearSelectionBtn) {
  els.clearSelectionBtn.addEventListener('click', clearEventSelection);
}

// Function to manually force refresh of all selection styles
window.forceRefreshSelections = function() {
  console.log("Manually forcing refresh of all selections");
  refreshAllSelectionStyles();
};

// Add a MutationObserver to watch for changes to the calendar and refresh selections
const calendarEl = document.getElementById('calendar');
if (calendarEl) {
  const observer = new MutationObserver((mutations) => {
    if (selectedEvents.size > 0) {
      // Only refresh if we detect relevant changes (new nodes added)
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0);
      
      if (hasRelevantChanges) {
        console.log("Calendar DOM changed, refreshing selections");
        refreshAllSelectionStyles();
      }
    }
  });
  
  observer.observe(calendarEl, { 
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

// Add event listeners to the calendar container to handle view changes
// which often cause events to be rerendered
if (calendarEl) {
  calendarEl.addEventListener('viewDidMount', () => {
    console.log("Calendar view changed, refreshing selections");
    if (selectedEvents.size > 0) {
      setTimeout(refreshAllSelectionStyles, 100);
    }
  });
}

// Add a global function to force selection refresh from the console
window.applySelections = function() {
  console.log("Manually applying selections to all events");
  refreshAllSelectionStyles();
};
