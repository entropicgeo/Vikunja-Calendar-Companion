
let calendar;
let tasksById = new Map();         // taskId -> task
let draggable;                     // FullCalendar Draggable for unscheduled list
let lastLoadedConfigHash = null;
let labelsById = new Map();            // id -> {id,title,hex_color,...}
let labelSelectionById = {};           // id -> boolean (true=include)
let suspendConfigSave = false;

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

function toLocalRFC3339Midnight(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
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
  const perPage = 250;
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
  const perPage = 250; // tune as you like
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
    editable: true,
    droppable: true, // accept external drags
    selectable: false,
    eventStartEditable: true,
    eventDurationEditable: false,
    eventResizableFromStart: false,
    
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
    },

    drop: async (info) => {
      // external drop from unscheduled list into calendar
      const cfg = config();
      const taskId = info.draggedEl ? Number(info.draggedEl.getAttribute('data-task-id')) : null;
      if (!taskId) return;

      try {
        setStatus(`Scheduling task ${taskId}...`);
        // Use the date you dropped on, as all-day start.
        const iso = toLocalRFC3339Midnight(info.date);
        
        await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: iso });

        // Ensure cache reflects intended field even if server echoes oddly
        const t = tasksById.get(taskId);
        if (t) t[cfg.dateField] = iso;

        await refreshUIFromCache(cfg);

        setStatus(`Scheduled task ${taskId} on ${info.date.toDateString()}.`);
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
        setStatus(`Updating task ${taskId}...`);
        const iso = toLocalRFC3339Midnight(info.event.start);
        
        await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: iso });

        // Ensure cache reflects intended field even if server echoes oddly
        const t = tasksById.get(taskId);
        if (t) t[cfg.dateField] = iso;

        await refreshUIFromCache(cfg);setStatus(`Updated task ${taskId}.`);
      } catch (e) {
        console.error(e);
        setStatus(String(e.message || e));
        info.revert();
      }
    },

    eventDragStart: () => {
      els.unscheduledDrop.classList.add('active');
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
        setStatus(`Unscheduling task ${taskId}...`);
        await vikunjaUpdateTaskFull(cfg, taskId, { [cfg.dateField]: null });

        const t = tasksById.get(taskId);
        if (t) t[cfg.dateField] = null;

        await refreshUIFromCache(cfg);
        setStatus(`Unscheduled task ${taskId}.`);
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
      const taskId = info.event.extendedProps?.taskId;
      if (taskId) showTaskDetails(taskId);
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
  const secondsInDay = 86400; // 24 * 60 * 60
  
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
      allDay: true,
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
    
    // Add the actual scheduled event
    calendar.addEvent({
      title: t.title || `(task ${t.id})`,
      start: dt,
      allDay: true,
      backgroundColor: color || undefined,
      borderColor: color || undefined,
      extendedProps: { taskId: t.id }
    });
    
    // Generate and add recurring projections if applicable
    if (t.repeat_after && t.repeat_after > 0) {
      const projections = generateRecurringProjections(t, dt, cfg);
      projections.forEach(projection => calendar.addEvent(projection));
    }
  }

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

async function loadEverything() {
  const cfg = config();
  
  // Ensure labels are loaded so filtering is correct
  if (!labelsById || labelsById.size === 0) {
    await loadLabelsOnly();
  }

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
  close: document.getElementById('modalCloseBtn'),
  detailsGrid: document.getElementById('modalDetailsGrid'),
  commentsWrap: document.getElementById('modalCommentsWrap'),
  comments: document.getElementById('modalComments'),
  commentsStatus: document.getElementById('modalCommentsStatus'),
};

modal.close.addEventListener('click', () => modal.root.style.display = 'none');
modal.root.addEventListener('click', (e) => { if (e.target === modal.root) modal.root.style.display = 'none'; });

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
els.unscheduledList.addEventListener('click', (e) => {
  const taskEl = e.target.closest('.task');
  if (!taskEl) return;
  const taskId = Number(taskEl.getAttribute('data-task-id'));
  if (taskId) showTaskDetails(taskId);
});
// Auto-load labels and server config on page load
window.addEventListener('DOMContentLoaded', async () => {
  // First fetch server config
  await fetchServerConfig();
  // Then restore saved settings
  loadConfigFromStorage();
  // Then load labels
  await loadLabelsOnly();
});

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

// Add CSS for recurring projections
const recurringStyle = document.createElement('style');
recurringStyle.textContent = `
  .recurring-projection {
    opacity: 0.8;
  }
  .recurring-projection:hover {
    opacity: 1;
  }
`;
document.head.appendChild(recurringStyle);
