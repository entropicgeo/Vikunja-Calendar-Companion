// DOM Elements
const elements = {
    taskFilter: document.getElementById('task-filter'),
    parentFilter: document.getElementById('parent-filter'),
    projectFilter: document.getElementById('project-filter'),
    parentProjectFilter: document.getElementById('parent-project-filter'),
    tasksContainer: document.getElementById('tasks-container'),
    parentContainer: document.getElementById('parent-container'),
    selectAllBtn: document.getElementById('select-all'),
    selectNoneBtn: document.getElementById('select-none'),
    markSubtasksBtn: document.getElementById('mark-subtasks'),
    statusBar: document.getElementById('status-bar')
};

// State
let allTasks = [];
let selectedTaskIds = new Set();
let selectedParentId = null;
let serverConfig = {};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await fetchServerConfig();
        await loadAllTasks();
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
        renderParentTasks(allTasks);
        setStatus(`Loaded ${allTasks.length} tasks`);
    } catch (error) {
        setStatus(`Error loading tasks: ${error.message}`, 'error');
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

async function markAsSubtask(subtaskId, parentTask) {
    setStatus(`Marking task ${subtaskId} as subtask of ${parentTask.id}...`);
    
    try {
        // Create the relation payload according to Vikunja API requirements
        const relationPayload = {
            task_id: parentTask.id,
            relation_kind: "subtask",
            other_task_id: subtaskId
        };
        
        // Call the relations endpoint
        const url = new URL(`/api/tasks/${subtaskId}/relations`, window.location.origin);
        console.debug(`Creating relation at: ${url.toString()}`);
        console.debug(`Relation payload:`, relationPayload);
        
        const response = await fetch(url.toString(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(relationPayload)
        });
        
        console.debug(`Relation response status: ${response.status}`);
        
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                console.error(`Error text: ${errorText}`);
            } catch (e) {
                errorText = 'No error details available';
                console.error(`Error getting error text: ${e}`);
            }
            throw new Error(`Failed to create relation for task ${subtaskId} (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.debug(`Relation created successfully:`, result);
        return result;
    } catch (error) {
        throw new Error(`Error marking task ${subtaskId} as subtask: ${error.message}`);
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

function renderParentTasks(tasks) {
    elements.parentContainer.innerHTML = '';
    
    if (!tasks.length) {
        elements.parentContainer.innerHTML = '<div class="loading">No tasks found</div>';
        return;
    }
    
    // Sort tasks by title
    const sortedTasks = [...tasks].sort((a, b) => 
        (a.title || '').localeCompare(b.title || '')
    );
    
    for (const task of sortedTasks) {
        const taskElement = document.createElement('div');
        taskElement.className = 'parent-task-item';
        taskElement.dataset.taskId = task.id;
        
        if (selectedParentId === task.id) {
            taskElement.classList.add('selected');
        }
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'parent-task';
        radio.className = 'parent-task-radio';
        radio.checked = selectedParentId === task.id;
        
        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title || `Task #${task.id}`;
        
        taskElement.appendChild(radio);
        taskElement.appendChild(title);
        
        // Add event listeners
        taskElement.addEventListener('click', (e) => {
            if (e.target !== radio) {
                radio.checked = true;
                selectParentTask(task.id);
            }
        });
        
        radio.addEventListener('change', () => {
            if (radio.checked) {
                selectParentTask(task.id);
            }
        });
        
        elements.parentContainer.appendChild(taskElement);
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

function selectParentTask(taskId) {
    selectedParentId = taskId;
    
    // Update UI - deselect all other parent tasks
    elements.parentContainer.querySelectorAll('.parent-task-item').forEach(el => {
        const isSelected = el.dataset.taskId == taskId;
        el.classList.toggle('selected', isSelected);
        el.querySelector('.parent-task-radio').checked = isSelected;
    });
    
    updateActionButtonsState();
}

function updateActionButtonsState() {
    const hasSelectedTasks = selectedTaskIds.size > 0;
    const hasSelectedParent = selectedParentId !== null;
    
    elements.markSubtasksBtn.disabled = !(hasSelectedTasks && hasSelectedParent);
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
    const projectId = elements.projectFilter.value ? parseInt(elements.projectFilter.value, 10) : null;
    
    let filtered = [...allTasks];
    
    // Filter by text
    if (filterText) {
        filtered = filtered.filter(task => 
            (task.title || '').toLowerCase().includes(filterText)
        );
    }
    
    // Filter by project ID
    if (projectId) {
        filtered = filtered.filter(task => task.project_id === projectId);
    }
    
    renderTasks(filtered);
}

function filterParentTasks() {
    const filterText = elements.parentFilter.value.toLowerCase();
    const projectId = elements.parentProjectFilter.value ? parseInt(elements.parentProjectFilter.value, 10) : null;
    
    let filtered = [...allTasks];
    
    // Filter by text
    if (filterText) {
        filtered = filtered.filter(task => 
            (task.title || '').toLowerCase().includes(filterText)
        );
    }
    
    // Filter by project ID
    if (projectId) {
        filtered = filtered.filter(task => task.project_id === projectId);
    }
    
    renderParentTasks(filtered);
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
    elements.parentFilter.addEventListener('input', filterParentTasks);
    elements.projectFilter.addEventListener('input', filterTasks);
    elements.parentProjectFilter.addEventListener('input', filterParentTasks);
    
    // Action button
    elements.markSubtasksBtn.addEventListener('click', async () => {
        if (selectedTaskIds.size === 0 || selectedParentId === null) {
            setStatus('Please select both subtasks and a parent task', 'error');
            return;
        }
        
        const subtaskIds = Array.from(selectedTaskIds);
        const parentTask = allTasks.find(task => task.id === selectedParentId);
        
        if (!parentTask) {
            setStatus('Parent task not found', 'error');
            return;
        }
        
        setStatus(`Marking ${subtaskIds.length} tasks as subtasks of "${parentTask.title}"...`);
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const subtaskId of subtaskIds) {
                try {
                    await markAsSubtask(subtaskId, parentTask);
                    successCount++;
                } catch (error) {
                    console.error(`Error marking task ${subtaskId} as subtask:`, error);
                    errorCount++;
                }
            }
            
            if (errorCount === 0) {
                setStatus(`Successfully marked ${successCount} tasks as subtasks`, 'success');
            } else {
                setStatus(`Marked ${successCount} tasks as subtasks with ${errorCount} errors`, 'error');
            }
            
            // Refresh task data to show updated relationships
            await loadAllTasks();
        } catch (error) {
            setStatus(`Error marking subtasks: ${error.message}`, 'error');
        }
    });
    
    // Initial button state
    updateActionButtonsState();
}
