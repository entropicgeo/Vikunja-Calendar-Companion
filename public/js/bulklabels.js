// DOM Elements
const elements = {
    taskFilter: document.getElementById('task-filter'),
    labelFilter: document.getElementById('label-filter'),
    tasksContainer: document.getElementById('tasks-container'),
    labelsContainer: document.getElementById('labels-container'),
    selectAllBtn: document.getElementById('select-all'),
    selectNoneBtn: document.getElementById('select-none'),
    applyLabelsBtn: document.getElementById('apply-labels'),
    removeLabelsBtn: document.getElementById('remove-labels'),
    statusBar: document.getElementById('status-bar')
};

// State
let allTasks = [];
let allLabels = [];
let selectedTaskIds = new Set();
let selectedLabelIds = new Set();
let serverConfig = {};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await fetchServerConfig();
        await Promise.all([
            loadAllTasks(),
            loadAllLabels()
        ]);
        setupEventListeners();
    } catch (error) {
        setStatus(`Error initializing: ${error.message}`, 'error');
    }
}

// Fetch server configuration
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

// API Functions
async function loadAllTasks() {
    setStatus('Loading tasks...');
    
    try {
        const tasks = await fetchAllTasks();
        allTasks = tasks.filter(task => !task.done); // Only show non-completed tasks
        renderTasks(allTasks);
        setStatus(`Loaded ${allTasks.length} tasks`);
    } catch (error) {
        setStatus(`Error loading tasks: ${error.message}`, 'error');
    }
}

async function loadAllLabels() {
    setStatus('Loading labels...');
    
    try {
        allLabels = await fetchAllLabels();
        renderLabels(allLabels);
        setStatus(`Loaded ${allLabels.length} labels`);
    } catch (error) {
        setStatus(`Error loading labels: ${error.message}`, 'error');
    }
}

async function fetchAllTasks() {
    const tasks = [];
    const perPage = 250;
    let page = 1;
    
    while (true) {
        const url = new URL('/api/tasks', window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', String(perPage));
        
        const response = await fetch(url.toString());
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch tasks (${response.status}): ${text}`);
        }
        
        const data = await response.json();
        if (!data || !data.length) break;
        
        tasks.push(...data);
        if (data.length < perPage) break;
        page++;
    }
    
    return tasks;
}

async function fetchAllLabels() {
    const labels = [];
    const perPage = 250;
    let page = 1;
    
    while (true) {
        const url = new URL('/api/labels', window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', String(perPage));
        
        const response = await fetch(url.toString());
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch labels (${response.status}): ${text}`);
        }
        
        const data = await response.json();
        if (!data || !data.length) break;
        
        labels.push(...data);
        if (data.length < perPage) break;
        page++;
    }
    
    return labels;
}

async function updateTaskLabels(taskId, labelIds, operation) {
    setStatus(`Updating task ${taskId}...`);
    
    try {
        console.log(`Operation: ${operation}, Task ID: ${taskId}, Label IDs:`, labelIds);
        
        // For label operations, we need the full label objects
        let labelsToUpdate = [];
        
       if (operation === 'add') {
          // For adding, fetch current task so we know which labels are already applied
          const url = new URL(`/api/tasks/${taskId}`, window.location.origin);
          console.log(`Fetching task from: ${url.toString()}`);
        
          const response = await fetch(url.toString());
        
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch task ${taskId} (${response.status}): ${text}`);
          }
        
          const task = await response.json();
          console.log('Current task:', task);
        
          // Old label IDs already on the task
          const oldLabelIds = (task.labels || []).map(label => label.id);
        
          // Combine old + new label IDs, removing duplicates
          const combinedLabelIds = [...new Set([...oldLabelIds, ...labelIds])];
          console.log('Old label IDs:', oldLabelIds);
          console.log('New label IDs:', labelIds);
          console.log('Combined label IDs:', combinedLabelIds);
        
          // Build full label objects from allLabels for all matching IDs
          labelsToUpdate = allLabels.filter(label => combinedLabelIds.includes(label.id));
          console.log('Labels to update:', labelsToUpdate);
        } else if (operation === 'remove') {
            // For removing, we need to get the current task first to know which labels to keep
            const url = new URL(`/api/tasks/${taskId}`, window.location.origin);
            console.log(`Fetching task from: ${url.toString()}`);
            
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to fetch task ${taskId} (${response.status}): ${text}`);
            }
            
            const task = await response.json();
            console.log(`Current task:`, task);
            
            // Keep only labels that are not in the removal list
            labelsToUpdate = (task.labels || []).filter(label => !labelIds.includes(label.id));
            console.log(`Labels after removal:`, labelsToUpdate);
        }
        
        // Use the regular task update endpoint for labels
        const updateUrl = new URL(`/api/tasks/${taskId}/labels`, window.location.origin);
        
        console.log(`Sending ${labelsToUpdate.length} labels to: ${updateUrl.toString()}`);
        console.log(`Labels to update:`, labelsToUpdate);
        
        setStatus(`Sending ${labelsToUpdate.length} labels to task ${taskId}...`);
        
        const updateResponse = await fetch(updateUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                labels: labelsToUpdate
            })
        });
        
        console.log(`Update response status: ${updateResponse.status}`);
        
        if (!updateResponse.ok) {
            let errorText = '';
            try {
                errorText = await updateResponse.text();
                console.error(`Error text: ${errorText}`);
            } catch (e) {
                errorText = 'No error details available';
                console.error(`Error getting error text: ${e}`);
            }
            throw new Error(`Failed to update labels for task ${taskId} (${updateResponse.status}): ${errorText}`);
        }
        
        const result = await updateResponse.json();
        console.log(`Update successful:`, result);
        return result;
    } catch (error) {
        throw new Error(`Error updating labels for task ${taskId}: ${error.message}`);
    }
}

// UI Functions
function renderTasks(tasks) {
    elements.tasksContainer.innerHTML = '';
    
    if (!tasks.length) {
        elements.tasksContainer.innerHTML = '<div class="loading">No tasks found</div>';
        return;
    }
    
    // Sort tasks by title
    const sortedTasks = [...tasks].sort((a, b) => 
        (a.title || '').localeCompare(b.title || '')
    );
    
    for (const task of sortedTasks) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.dataset.taskId = task.id;
        
        if (selectedTaskIds.has(task.id)) {
            taskElement.classList.add('selected');
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = selectedTaskIds.has(task.id);
        
        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title || `Task #${task.id}`;
        
        taskElement.appendChild(checkbox);
        taskElement.appendChild(title);
        
        // Add event listeners
        taskElement.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleTaskSelection(task.id, checkbox.checked);
            }
        });
        
        checkbox.addEventListener('change', () => {
            toggleTaskSelection(task.id, checkbox.checked);
        });
        
        elements.tasksContainer.appendChild(taskElement);
    }
}

function renderLabels(labels) {
    elements.labelsContainer.innerHTML = '';
    
    if (!labels.length) {
        elements.labelsContainer.innerHTML = '<div class="loading">No labels found</div>';
        return;
    }
    
    // Sort labels by title
    const sortedLabels = [...labels].sort((a, b) => 
        (a.title || '').localeCompare(b.title || '')
    );
    
    for (const label of sortedLabels) {
        const labelElement = document.createElement('div');
        labelElement.className = 'label-item';
        labelElement.dataset.labelId = label.id;
        
        if (selectedLabelIds.has(label.id)) {
            labelElement.classList.add('selected');
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'label-checkbox';
        checkbox.checked = selectedLabelIds.has(label.id);
        
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'label-color';
        const color = normalizeHexColor(label.hex_color || label.color);
        if (color) {
            colorSwatch.style.backgroundColor = color;
        }
        
        const title = document.createElement('div');
        title.className = 'label-title';
        title.textContent = label.title || `Label #${label.id}`;
        
        labelElement.appendChild(checkbox);
        labelElement.appendChild(colorSwatch);
        labelElement.appendChild(title);
        
        // Add event listeners
        labelElement.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleLabelSelection(label.id, checkbox.checked);
            }
        });
        
        checkbox.addEventListener('change', () => {
            toggleLabelSelection(label.id, checkbox.checked);
        });
        
        elements.labelsContainer.appendChild(labelElement);
    }
}

function toggleTaskSelection(taskId, selected) {
    if (selected) {
        selectedTaskIds.add(taskId);
    } else {
        selectedTaskIds.delete(taskId);
    }
    
    // Update UI
    const taskElement = elements.tasksContainer.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
        taskElement.classList.toggle('selected', selected);
        taskElement.querySelector('.task-checkbox').checked = selected;
    }
    
    updateActionButtonsState();
}

function toggleLabelSelection(labelId, selected) {
    if (selected) {
        selectedLabelIds.add(labelId);
    } else {
        selectedLabelIds.delete(labelId);
    }
    
    // Update UI
    const labelElement = elements.labelsContainer.querySelector(`[data-label-id="${labelId}"]`);
    if (labelElement) {
        labelElement.classList.toggle('selected', selected);
        labelElement.querySelector('.label-checkbox').checked = selected;
    }
    
    updateActionButtonsState();
}

function updateActionButtonsState() {
    const hasSelectedTasks = selectedTaskIds.size > 0;
    const hasSelectedLabels = selectedLabelIds.size > 0;
    
    elements.applyLabelsBtn.disabled = !(hasSelectedTasks && hasSelectedLabels);
    elements.removeLabelsBtn.disabled = !(hasSelectedTasks && hasSelectedLabels);
}

function setStatus(message, type = '') {
    elements.statusBar.textContent = message || '';
    elements.statusBar.className = 'status-bar';
    
    if (type) {
        elements.statusBar.classList.add(type);
    }
}

function normalizeHexColor(color) {
    if (!color || typeof color !== 'string') return null;
    return color.startsWith('#') ? color : `#${color}`;
}

function filterTasks() {
    const filterText = elements.taskFilter.value.toLowerCase();
    
    if (!filterText) {
        renderTasks(allTasks);
        return;
    }
    
    const filtered = allTasks.filter(task => 
        (task.title || '').toLowerCase().includes(filterText)
    );
    
    renderTasks(filtered);
}

function filterLabels() {
    const filterText = elements.labelFilter.value.toLowerCase();
    
    if (!filterText) {
        renderLabels(allLabels);
        return;
    }
    
    const filtered = allLabels.filter(label => 
        (label.title || '').toLowerCase().includes(filterText)
    );
    
    renderLabels(filtered);
}

// Event Handlers
function setupEventListeners() {
    // Task selection buttons
    elements.selectAllBtn.addEventListener('click', () => {
        const visibleTaskIds = Array.from(elements.tasksContainer.querySelectorAll('.task-item'))
            .map(el => Number(el.dataset.taskId));
            
        visibleTaskIds.forEach(id => toggleTaskSelection(id, true));
    });
    
    elements.selectNoneBtn.addEventListener('click', () => {
        selectedTaskIds.clear();
        elements.tasksContainer.querySelectorAll('.task-item').forEach(el => {
            el.classList.remove('selected');
            el.querySelector('.task-checkbox').checked = false;
        });
        updateActionButtonsState();
    });
    
    // Filters
    elements.taskFilter.addEventListener('input', filterTasks);
    elements.labelFilter.addEventListener('input', filterLabels);
    
    // Action buttons
    elements.applyLabelsBtn.addEventListener('click', async () => {
        if (selectedTaskIds.size === 0 || selectedLabelIds.size === 0) {
            setStatus('Please select both tasks and labels', 'error');
            return;
        }
        
        const taskIds = Array.from(selectedTaskIds);
        const labelIds = Array.from(selectedLabelIds);
        
        setStatus(`Applying ${labelIds.length} labels to ${taskIds.length} tasks...`);
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const taskId of taskIds) {
                try {
                    await updateTaskLabels(taskId, labelIds, 'add');
                    successCount++;
                } catch (error) {
                    console.error(`Error updating labels for task ${taskId}:`, error);
                    errorCount++;
                }
            }
            
            if (errorCount === 0) {
                setStatus(`Successfully applied labels to ${successCount} tasks`, 'success');
            } else {
                setStatus(`Applied labels to ${successCount} tasks with ${errorCount} errors`, 'error');
            }
            
            // Refresh task data to show updated labels
            await loadAllTasks();
        } catch (error) {
            setStatus(`Error applying labels: ${error.message}`, 'error');
        }
    });
    
    elements.removeLabelsBtn.addEventListener('click', async () => {
        if (selectedTaskIds.size === 0 || selectedLabelIds.size === 0) {
            setStatus('Please select both tasks and labels', 'error');
            return;
        }
        
        const taskIds = Array.from(selectedTaskIds);
        const labelIds = Array.from(selectedLabelIds);
        
        setStatus(`Removing ${labelIds.length} labels from ${taskIds.length} tasks...`);
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const taskId of taskIds) {
                try {
                    await updateTaskLabels(taskId, labelIds, 'remove');
                    successCount++;
                } catch (error) {
                    console.error(`Error updating labels for task ${taskId}:`, error);
                    errorCount++;
                }
            }
            
            if (errorCount === 0) {
                setStatus(`Successfully removed labels from ${successCount} tasks`, 'success');
            } else {
                setStatus(`Removed labels from ${successCount} tasks with ${errorCount} errors`, 'error');
            }
            
            // Refresh task data to show updated labels
            await loadAllTasks();
        } catch (error) {
            setStatus(`Error removing labels: ${error.message}`, 'error');
        }
    });
    
    // Initial button state
    updateActionButtonsState();
}
