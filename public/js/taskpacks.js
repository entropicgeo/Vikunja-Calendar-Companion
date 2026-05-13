// Task Packs Application
class TaskPacksApp {
    constructor() {
        this.db = null;
        this.config = {
            taskPacksProjectId: null,
            defaultDurationMinutes: 45,
            taskReloadIntervalMinutes: 5,
            breakNotificationsEnabled: true
        };
        this.currentDate = new Date().toISOString().split('T')[0];
        this.activeSession = null;
        this.timer = null;
        this.timerStartTime = null;
        this.timerElapsed = 0;
        this.timerPaused = false;
        this.notificationPermission = 'default';
        this.taskReloadTimer = null;
        this.selectedPackTasks = new Set();
        this.completedSession = null; // Store completed session for rating
        
        this.elements = {
            packDate: document.getElementById('pack-date'),
            todayBtn: document.getElementById('today-btn'),
            statusBar: document.getElementById('status-bar'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Active pack panel
            activePackPanel: document.getElementById('active-pack-panel'),
            activePackTitle: document.getElementById('active-pack-title'),
            activePackMeta: document.getElementById('active-pack-meta'),
            timerDisplay: document.getElementById('timer-display'),
            timerStatus: document.getElementById('timer-status'),
            breakInfo: document.getElementById('break-info'),
            pauseBtn: document.getElementById('pause-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            stopBtn: document.getElementById('stop-btn'),
            breakNowBtn: document.getElementById('break-now-btn'),
            
            // Packs list
            packsList: document.getElementById('packs-list'),
            
            // Create pack form
            createPackForm: document.getElementById('create-pack-form'),
            packTitle: document.getElementById('pack-title'),
            packDescription: document.getElementById('pack-description'),
            taskFilter: document.getElementById('task-filter'),
            projectFilter: document.getElementById('project-filter'),
            availableTasks: document.getElementById('available-tasks'),
            activityContext: document.getElementById('activity-context'),
            breakStrategies: document.getElementById('break-strategies'),
            clearFormBtn: document.getElementById('clear-form-btn'),
            
            // Config
            taskPacksProject: document.getElementById('task-packs-project'),
            defaultDuration: document.getElementById('default-duration'),
            breakNotifications: document.getElementById('break-notifications'),
            saveConfigBtn: document.getElementById('save-config-btn'),
            
            // Context management
            addContextBtn: document.getElementById('add-context-btn'),
            contextsList: document.getElementById('contexts-list'),
            contextModal: document.getElementById('context-modal'),
            contextForm: document.getElementById('context-form'),
            contextModalClose: document.getElementById('context-modal-close'),
            contextCancel: document.getElementById('context-cancel'),
            
            // Strategy management
            addStrategyBtn: document.getElementById('add-strategy-btn'),
            strategiesList: document.getElementById('strategies-list'),
            strategyModal: document.getElementById('strategy-modal'),
            strategyForm: document.getElementById('strategy-form'),
            strategyModalClose: document.getElementById('strategy-modal-close'),
            strategyCancel: document.getElementById('strategy-cancel'),
            
            // Rating modal
            ratingModal: document.getElementById('rating-modal'),
            ratingForm: document.getElementById('rating-form'),
            ratingModalClose: document.getElementById('rating-modal-close'),
            ratingCancel: document.getElementById('rating-cancel'),
            
            // Active pack tasks
            activePackTasks: document.getElementById('active-pack-tasks'),
            packTasksList: document.getElementById('pack-tasks-list'),
            selectAllTasksBtn: document.getElementById('select-all-tasks-btn'),
            clearTaskSelectionBtn: document.getElementById('clear-task-selection-btn'),
            markSelectedDoneBtn: document.getElementById('mark-selected-done-btn'),
            
            // Completion modal
            completionModal: document.getElementById('completion-modal'),
            completionModalClose: document.getElementById('completion-modal-close'),
            completionCancel: document.getElementById('completion-cancel'),
            markPackDone: document.getElementById('mark-pack-done'),
            markAllSubtasksDone: document.getElementById('mark-all-subtasks-done'),
            remainingTasksSection: document.getElementById('remaining-tasks-section'),
            remainingTasksList: document.getElementById('remaining-tasks-list'),
            completeSessionBtn: document.getElementById('complete-session-btn'),
            
            // Task details modal
            taskDetailsModal: document.getElementById('task-details-modal'),
            taskDetailsTitle: document.getElementById('task-details-title'),
            taskDetailsMeta: document.getElementById('task-details-meta'),
            taskDetailsDescription: document.getElementById('task-details-description'),
            taskDetailsGrid: document.getElementById('task-details-grid'),
            taskDetailsOpenLink: document.getElementById('task-details-open-link'),
            taskDetailsProjectLink: document.getElementById('task-details-project-link'),
            taskDetailsClose: document.getElementById('task-details-close'),
            
            // Config
            taskReloadInterval: document.getElementById('task-reload-interval'),
            
            // Reminders
            addReminderBtn: document.getElementById('add-reminder-btn'),
            remindersList: document.getElementById('reminders-list'),
            
            // Review
            reviewFilterType: document.getElementById('review-filter-type'),
            reviewFilterContext: document.getElementById('review-filter-context'),
            reviewViewMode: document.getElementById('review-view-mode'),
            reviewIndividual: document.getElementById('review-individual'),
            reviewAggregated: document.getElementById('review-aggregated'),
            ratingsList: document.getElementById('ratings-list'),
            aggregatedRatings: document.getElementById('aggregated-ratings'),
            reminderModal: document.getElementById('reminder-modal'),
            reminderForm: document.getElementById('reminder-form'),
            reminderModalClose: document.getElementById('reminder-modal-close'),
            reminderCancel: document.getElementById('reminder-cancel'),
            reminderText: document.getElementById('reminder-text'),
            reminderType: document.getElementById('reminder-type'),
            reminderTypeOptions: document.getElementById('reminder-type-options'),
            delayMinutes: document.getElementById('delay-minutes'),
            reminderTime: document.getElementById('reminder-time'),
            reminderDate: document.getElementById('reminder-date'),
            taskSearch: document.getElementById('task-search'),
            taskSearchResults: document.getElementById('task-search-results'),
            selectedTask: document.getElementById('selected-task'),
            taskSearchDelay: document.getElementById('task-search-delay'),
            taskSearchResultsDelay: document.getElementById('task-search-results-delay'),
            selectedTaskDelay: document.getElementById('selected-task-delay'),
            completionDelayMinutes: document.getElementById('completion-delay-minutes')
        };
        
        this.allTasks = [];
        this.allProjects = [];
        this.allLabels = [];
        this.contexts = [];
        this.strategies = [];
        this.packs = [];
        this.sessions = [];
        
        // Filter state
        this.selectedProjects = new Set();
        this.selectedLabels = new Set();
        
        // Reminders state
        this.reminders = [];
        this.reminderTimers = new Map();
        this.selectedTaskForReminder = null;
        this.selectedTaskForReminderDelay = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.initDatabase();
            await this.loadConfig();
            await this.loadServerConfig();
            await this.seedDefaultData();
            this.setupEventListeners();
            this.elements.packDate.value = this.currentDate;
            await this.loadAllData();
            this.checkNotificationPermission();
            this.setStatus('Task Packs loaded successfully');
        } catch (error) {
            console.error('Failed to initialize Task Packs:', error);
            this.setStatus('Failed to initialize Task Packs', 'error');
        }
    }
    
    async loadServerConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                this.serverConfig = await response.json();
            }
        } catch (error) {
            console.error('Failed to load server config:', error);
        }
    }
    
    async initDatabase() {
        try {
            const response = await fetch('/api/db');
            if (response.ok) {
                this.db = await response.json();
            } else {
                this.db = {};
            }
        } catch (error) {
            console.error('Failed to load database:', error);
            this.db = {};
        }
        
        // Ensure required collections exist
        if (!this.db.taskPacks) this.db.taskPacks = [];
        if (!this.db.activitySessions) this.db.activitySessions = [];
        if (!this.db.activityContexts) this.db.activityContexts = [];
        if (!this.db.breakStrategies) this.db.breakStrategies = [];
        if (!this.db.breakEvents) this.db.breakEvents = [];
        if (!this.db.strategyRatings) this.db.strategyRatings = [];
        if (!this.db.taskPacksConfig) this.db.taskPacksConfig = {};
        if (!this.db.reminders) this.db.reminders = [];
    }
    
    async saveDatabase() {
        try {
            const response = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.db)
            });
            if (!response.ok) {
                throw new Error('Failed to save database');
            }
        } catch (error) {
            console.error('Failed to save database:', error);
            this.setStatus('Failed to save data', 'error');
        }
    }
    
    async loadConfig() {
        if (this.db.taskPacksConfig) {
            this.config = { ...this.config, ...this.db.taskPacksConfig };
        }
        
        // Update UI
        if (this.elements.taskPacksProject) {
            this.elements.taskPacksProject.value = this.config.taskPacksProjectId || '';
        }
        if (this.elements.defaultDuration) {
            this.elements.defaultDuration.value = this.config.defaultDurationMinutes || 45;
        }
        if (this.elements.breakNotifications) {
            this.elements.breakNotifications.checked = this.config.breakNotificationsEnabled !== false;
        }
        if (this.elements.taskReloadInterval) {
            this.elements.taskReloadInterval.value = this.config.taskReloadIntervalMinutes || 5;
        }
    }
    
    async saveConfig() {
        this.config.taskPacksProjectId = parseInt(this.elements.taskPacksProject.value) || null;
        this.config.defaultDurationMinutes = parseInt(this.elements.defaultDuration.value) || 45;
        this.config.taskReloadIntervalMinutes = parseInt(this.elements.taskReloadInterval.value) || 5;
        this.config.breakNotificationsEnabled = this.elements.breakNotifications.checked;
        
        // If notifications are being enabled, request permission
        if (this.config.breakNotificationsEnabled && this.notificationPermission !== 'granted') {
            const granted = await this.requestNotificationPermission();
            if (!granted) {
                // If permission denied, disable notifications in config
                this.config.breakNotificationsEnabled = false;
                this.elements.breakNotifications.checked = false;
            }
        }
        
        this.db.taskPacksConfig = this.config;
        await this.saveDatabase();
        this.setStatus('Configuration saved');
    }
    
    async seedDefaultData() {
        // Seed default activity contexts if none exist
        if (this.db.activityContexts.length === 0) {
            const defaultContexts = [
                {
                    id: 'computer_main_desk',
                    name: 'Computer work / main desk',
                    description: 'Working at the main computer desk',
                    activityType: 'computer_work',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'computer_couch_laptop',
                    name: 'Computer work / couch laptop',
                    description: 'Working on laptop while on couch',
                    activityType: 'computer_work',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'driving',
                    name: 'Driving',
                    description: 'Driving or being in a vehicle',
                    activityType: 'driving',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'standing_kitchen',
                    name: 'Standing kitchen work',
                    description: 'Standing work in the kitchen',
                    activityType: 'standing',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            this.db.activityContexts = defaultContexts;
        }
        
        // Seed default break strategies if none exist
        if (this.db.breakStrategies.length === 0) {
            const defaultStrategies = [
                {
                    id: 'scalene_jaw_tongue',
                    name: 'Scalene / jaw / tongue microbreak',
                    description: 'Check and release tension in neck, jaw, and tongue',
                    breakType: 'microbreak',
                    suggestedDurationSeconds: 90,
                    intervalMinutes: 20,
                    prompt: 'Pause. Let the jaw and tongue soften. Notice whether the sides/front of the neck are gripping. Do not force a stretch. Let the breath move gently.',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'inner_thigh_adductor',
                    name: 'Inner thigh / adductor release',
                    description: 'Release tension in inner thighs and pelvic floor',
                    breakType: 'microbreak',
                    suggestedDurationSeconds: 120,
                    intervalMinutes: 30,
                    prompt: 'Check whether the inner thighs are gripping. Let knees, hips, belly, and pelvic floor soften without collapsing posture. Shift position slightly.',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'standing_shift',
                    name: 'Standing shift reset',
                    description: 'Stand up and shift weight',
                    breakType: 'microbreak',
                    suggestedDurationSeconds: 60,
                    intervalMinutes: 25,
                    prompt: 'Stand up and shift your weight from foot to foot. Notice your posture without forcing corrections.',
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            this.db.breakStrategies = defaultStrategies;
        }
        
        await this.saveDatabase();
    }
    
    setupEventListeners() {
        // Date selection
        this.elements.packDate.addEventListener('change', () => {
            this.currentDate = this.elements.packDate.value;
            this.loadPacksForDate();
        });
        
        this.elements.todayBtn.addEventListener('click', () => {
            this.currentDate = new Date().toISOString().split('T')[0];
            this.elements.packDate.value = this.currentDate;
            this.loadPacksForDate();
        });
        
        // Tab navigation
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Active pack controls
        this.elements.pauseBtn.addEventListener('click', () => this.pauseSession());
        this.elements.resumeBtn.addEventListener('click', () => this.resumeSession());
        this.elements.stopBtn.addEventListener('click', () => this.stopSession());
        this.elements.breakNowBtn.addEventListener('click', () => this.startBreak());
        
        // Create pack form
        this.elements.createPackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPack();
        });
        
        this.elements.clearFormBtn.addEventListener('click', () => this.clearCreateForm());
        
        this.elements.taskFilter.addEventListener('input', () => this.filterTasks());
        document.getElementById('filter-by-date').addEventListener('change', () => this.filterTasks());
        document.getElementById('exclude-assigned-tasks').addEventListener('change', () => this.filterTasks());
        
        // Multi-select dropdowns
        this.setupMultiSelectDropdown('project');
        this.setupMultiSelectDropdown('label');
        
        // Config
        this.elements.saveConfigBtn.addEventListener('click', () => this.saveConfig());
        
        // Context management
        this.elements.addContextBtn.addEventListener('click', () => this.showContextModal());
        this.elements.contextModalClose.addEventListener('click', () => this.hideContextModal());
        this.elements.contextCancel.addEventListener('click', () => this.hideContextModal());
        this.elements.contextForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContext();
        });
        
        // Strategy management
        this.elements.addStrategyBtn.addEventListener('click', () => this.showStrategyModal());
        this.elements.strategyModalClose.addEventListener('click', () => this.hideStrategyModal());
        this.elements.strategyCancel.addEventListener('click', () => this.hideStrategyModal());
        this.elements.strategyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStrategy();
        });
        
        // Rating modal
        this.elements.ratingModalClose.addEventListener('click', () => this.hideRatingModal());
        this.elements.ratingCancel.addEventListener('click', () => this.hideRatingModal());
        this.elements.ratingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Rating form submitted');
            this.saveRating();
        });
        
        // Active pack task management
        this.elements.selectAllTasksBtn.addEventListener('click', () => this.selectAllPackTasks());
        this.elements.clearTaskSelectionBtn.addEventListener('click', () => this.clearPackTaskSelection());
        this.elements.markSelectedDoneBtn.addEventListener('click', () => this.markSelectedTasksDone());
        
        // Completion modal
        this.elements.completionModalClose.addEventListener('click', () => this.hideCompletionModal());
        this.elements.completionCancel.addEventListener('click', () => this.hideCompletionModal());
        this.elements.markAllSubtasksDone.addEventListener('change', () => this.toggleRemainingTasksSection());
        this.elements.completeSessionBtn.addEventListener('click', () => this.completeSessionWithOptions());
        
        // Task details modal
        this.elements.taskDetailsClose.addEventListener('click', () => this.hideTaskDetailsModal());
        
        // Reminders
        this.elements.addReminderBtn.addEventListener('click', () => this.showReminderModal());
        this.elements.reminderModalClose.addEventListener('click', () => this.hideReminderModal());
        this.elements.reminderCancel.addEventListener('click', () => this.hideReminderModal());
        this.elements.reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReminder();
        });
        this.elements.reminderType.addEventListener('change', () => this.updateReminderTypeOptions());
        this.elements.taskSearch.addEventListener('input', () => this.searchTasksForReminder('task-search'));
        this.elements.taskSearchDelay.addEventListener('input', () => this.searchTasksForReminder('task-search-delay'));
        this.elements.taskSearch.addEventListener('focus', () => this.searchTasksForReminder('task-search'));
        this.elements.taskSearchDelay.addEventListener('focus', () => this.searchTasksForReminder('task-search-delay'));
        
        // Review
        this.elements.reviewFilterType.addEventListener('change', () => this.filterAndRenderReview());
        this.elements.reviewFilterContext.addEventListener('change', () => this.filterAndRenderReview());
        this.elements.reviewViewMode.addEventListener('change', () => this.toggleReviewViewMode());
        
        // Modal backdrop clicks
        [this.elements.contextModal, this.elements.strategyModal, this.elements.ratingModal, 
         this.elements.completionModal, this.elements.taskDetailsModal, this.elements.reminderModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                    }
                });
            }
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Load data for specific tabs
        if (tabName === 'create') {
            this.loadCreatePackData();
        } else if (tabName === 'reminders') {
            this.renderReminders();
        } else if (tabName === 'review') {
            this.loadReviewData();
        } else if (tabName === 'contexts') {
            this.renderContexts();
        } else if (tabName === 'strategies') {
            this.renderStrategies();
        }
    }
    
    async loadAllData() {
        try {
            this.setStatus('Loading data...');
            
            // Load tasks, projects, and labels from Vikunja
            await this.loadTasks();
            await this.loadProjects();
            await this.loadLabels();
            
            // Load local data
            this.contexts = this.db.activityContexts || [];
            this.strategies = this.db.breakStrategies || [];
            this.packs = this.db.taskPacks || [];
            this.sessions = this.db.activitySessions || [];
            this.reminders = this.db.reminders || [];
            
            // Start reminder checking
            this.startReminderChecker();
            
            // Load packs for current date
            await this.loadPacksForDate();
            
            this.setStatus('Data loaded successfully');
        } catch (error) {
            console.error('Failed to load data:', error);
            this.setStatus('Failed to load data', 'error');
        }
    }
    
    async loadTasks() {
        try {
            const tasks = [];
            const perPage = 50;
            let page = 1;
            
            while (true) {
                const url = new URL('/api/tasks', window.location.origin);
                url.searchParams.set('page', String(page));
                url.searchParams.set('per_page', String(perPage));
                url.searchParams.set('filter', 'done=false');
                
                const response = await fetch(url.toString());
                if (!response.ok) {
                    throw new Error(`Failed to fetch tasks: ${response.status}`);
                }
                
                const data = await response.json();
                if (!Array.isArray(data) || data.length === 0) break;
                
                tasks.push(...data);
                if (data.length < perPage) break;
                page++;
            }
            
            this.allTasks = tasks;
        } catch (error) {
            console.error('Failed to load tasks:', error);
            throw error;
        }
    }
    
    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                this.allProjects = await response.json();
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Continue without projects if they can't be loaded
        }
    }
    
    async loadLabels() {
        try {
            const labels = [];
            const perPage = 50;
            let page = 1;
            
            while (true) {
                const url = new URL('/api/labels', window.location.origin);
                url.searchParams.set('page', String(page));
                url.searchParams.set('per_page', String(perPage));
                
                const response = await fetch(url.toString());
                if (!response.ok) {
                    throw new Error(`Failed to fetch labels: ${response.status}`);
                }
                
                const data = await response.json();
                if (!Array.isArray(data) || data.length === 0) break;
                
                labels.push(...data);
                if (data.length < perPage) break;
                page++;
            }
            
            this.allLabels = labels;
        } catch (error) {
            console.error('Failed to load labels:', error);
            // Continue without labels if they can't be loaded
        }
    }
    
    async loadPacksForDate() {
        // Filter packs for the current date
        const dateStr = this.currentDate;
        const packsForDate = this.packs.filter(pack => {
            return pack.date === dateStr;
        });
        
        this.renderPacksList(packsForDate);
        
        // Check for active session
        const activeSession = this.sessions.find(session => 
            session.status === 'running' || session.status === 'paused'
        );
        
        if (activeSession) {
            this.activeSession = activeSession;
            this.showActivePackPanel();
            if (activeSession.status === 'running') {
                this.startTimer();
            }
        } else {
            this.hideActivePackPanel();
        }
    }
    
    renderPacksList(packs) {
        if (packs.length === 0) {
            this.elements.packsList.innerHTML = '<div class="loading">No packs for this date</div>';
            return;
        }
        
        // Sort packs chronologically by earliest task due date, then by creation time
        const sortedPacks = [...packs].sort((a, b) => {
            const aEarliestTask = this.getPackEarliestTask(a);
            const bEarliestTask = this.getPackEarliestTask(b);
            
            // Compare by earliest task due date
            if (aEarliestTask && bEarliestTask) {
                const aDate = new Date(aEarliestTask.due_date);
                const bDate = new Date(bEarliestTask.due_date);
                const dateComparison = aDate.getTime() - bDate.getTime();
                if (dateComparison !== 0) return dateComparison;
            } else if (aEarliestTask && !bEarliestTask) {
                return -1;
            } else if (!aEarliestTask && bEarliestTask) {
                return 1;
            }
            
            // Fall back to creation time
            const aCreated = new Date(a.createdAt);
            const bCreated = new Date(b.createdAt);
            return aCreated.getTime() - bCreated.getTime();
        });
        
        this.elements.packsList.innerHTML = sortedPacks.map(pack => {
            const tasks = pack.subtaskIds.map(id => 
                this.allTasks.find(t => t.id === id)
            ).filter(Boolean);
            
            const context = this.contexts.find(c => c.id === pack.activityContextId);
            const strategies = pack.breakStrategyIds.map(id =>
                this.strategies.find(s => s.id === id)
            ).filter(Boolean);
            
            const packLabel = this.getPackLabel(pack);
            const labelHtml = packLabel ? this.renderPackLabel(packLabel) : '';
            
            return `
                <div class="pack-item">
                    <div class="pack-item-header">
                        <div>
                            <div class="pack-item-title">
                                ${this.escapeHtml(pack.title)}
                                ${labelHtml}
                            </div>
                            <div class="pack-item-meta">
                                ${context ? context.name : 'No context'} • 
                                ${strategies.length} strategies • 
                                ${tasks.length} tasks
                            </div>
                        </div>
                        <div class="pack-item-status ${pack.status}">${pack.status}</div>
                    </div>
                    
                    <div class="pack-item-tasks">
                        ${tasks.slice(0, 3).map(task => 
                            `<div class="pack-item-task">• ${this.escapeHtml(task.title || `Task ${task.id}`)}</div>`
                        ).join('')}
                        ${tasks.length > 3 ? `<div class="pack-item-task">... and ${tasks.length - 3} more</div>` : ''}
                    </div>
                    
                    <div class="pack-item-actions">
                        ${pack.status === 'idle' ? `<button class="btn btn-primary btn-sm" onclick="taskPacksApp.startPack('${pack.id}')">Start</button>` : ''}
                        ${pack.status === 'paused' ? `<button class="btn btn-primary btn-sm" onclick="taskPacksApp.resumePack('${pack.id}')">Resume</button>` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.editPack('${pack.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="taskPacksApp.deletePack('${pack.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async loadCreatePackData() {
        // Populate multi-select dropdowns
        this.populateProjectOptions();
        this.populateLabelOptions();
        
        // Populate activity context
        this.elements.activityContext.innerHTML = '<option value="">Select context...</option>';
        this.contexts.filter(c => c.active).forEach(context => {
            const option = document.createElement('option');
            option.value = context.id;
            option.textContent = context.name;
            this.elements.activityContext.appendChild(option);
        });
        
        // Render break strategies
        this.renderBreakStrategiesForCreate();
        
        // Filter and render tasks
        this.filterTasks();
    }
    
    filterTasks() {
        const filterText = this.elements.taskFilter.value.toLowerCase();
        const filterByDate = document.getElementById('filter-by-date').checked;
        const excludeAssignedTasks = document.getElementById('exclude-assigned-tasks').checked;
        const selectedDate = this.currentDate;
        
        let filtered = [...this.allTasks];
        
        // Filter by text
        if (filterText) {
            filtered = filtered.filter(task => 
                (task.title || '').toLowerCase().includes(filterText)
            );
        }
        
        // Filter by selected projects
        if (this.selectedProjects.size > 0) {
            filtered = filtered.filter(task => 
                this.selectedProjects.has(task.project_id)
            );
        }
        
        // Filter by selected labels
        if (this.selectedLabels.size > 0) {
            filtered = filtered.filter(task => {
                if (!task.labels || !Array.isArray(task.labels)) return false;
                return task.labels.some(label => this.selectedLabels.has(label.id));
            });
        }
        
        // Filter by due date if enabled
        if (filterByDate && selectedDate) {
            filtered = filtered.filter(task => {
                if (!task.due_date) return false;
                const taskDueDate = new Date(task.due_date).toISOString().split('T')[0];
                return taskDueDate === selectedDate;
            });
        }
        
        // Exclude tasks already assigned to packs for this date if enabled
        if (excludeAssignedTasks && selectedDate) {
            const assignedTaskIds = this.getAssignedTaskIdsForDate(selectedDate);
            filtered = filtered.filter(task => !assignedTaskIds.has(task.id));
        }
        
        // Always exclude task pack parent tasks (tasks in task pack project with no parent)
        if (this.config.taskPacksProjectId) {
            filtered = filtered.filter(task => !this.isTaskPackParentTask(task));
        }
        
        // Sort by due date chronologically, then by title
        filtered.sort((a, b) => {
            // First sort by due date
            const aDate = a.due_date ? new Date(a.due_date) : null;
            const bDate = b.due_date ? new Date(b.due_date) : null;
            
            // Tasks with due dates come before tasks without
            if (aDate && !bDate) return -1;
            if (!aDate && bDate) return 1;
            if (!aDate && !bDate) return (a.title || '').localeCompare(b.title || '');
            
            // Both have due dates - sort chronologically
            const dateComparison = aDate.getTime() - bDate.getTime();
            if (dateComparison !== 0) return dateComparison;
            
            // Same due date - sort by title
            return (a.title || '').localeCompare(b.title || '');
        });
        
        this.renderTasksForCreate(filtered);
    }
    
    renderTasksForCreate(tasks) {
        this.elements.availableTasks.innerHTML = tasks.map(task => {
            const labelColor = this.getTaskLabelColor(task);
            const textColor = labelColor ? this.getTextColorForBackground(labelColor) : '';
            const styleAttr = labelColor ? `style="background-color: ${labelColor}; color: ${textColor};"` : '';
            
            return `
                <div class="task-item" data-task-id="${task.id}" ${styleAttr}>
                    <input type="checkbox" class="task-checkbox" value="${task.id}">
                    <div class="task-item-title">${this.escapeHtml(task.title || `Task ${task.id}`)}</div>
                    <div class="task-item-meta">Project: ${task.project_id || 'None'}</div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        this.elements.availableTasks.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.task-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
                item.classList.toggle('selected', item.querySelector('.task-checkbox').checked);
            });
        });
    }
    
    renderBreakStrategiesForCreate() {
        this.elements.breakStrategies.innerHTML = this.strategies.filter(s => s.active).map(strategy => `
            <div class="strategy-item" data-strategy-id="${strategy.id}">
                <input type="checkbox" class="strategy-checkbox" value="${strategy.id}">
                <div class="strategy-item-info">
                    <div class="strategy-item-name">${this.escapeHtml(strategy.name)}</div>
                    <div class="strategy-item-meta">
                        ${strategy.breakType} • Every ${strategy.intervalMinutes}min • ${strategy.suggestedDurationSeconds}s
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        this.elements.breakStrategies.querySelectorAll('.strategy-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.strategy-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
                item.classList.toggle('selected', item.querySelector('.strategy-checkbox').checked);
            });
        });
    }
    
    async createPack() {
        try {
            if (!this.config.taskPacksProjectId) {
                this.setStatus('Please configure Task Packs project ID first', 'error');
                this.switchTab('config');
                return;
            }
            
            const title = this.elements.packTitle.value.trim();
            const description = this.elements.packDescription.value.trim();
            
            if (!title) {
                this.setStatus('Please enter a pack title', 'error');
                return;
            }
            
            // Get selected tasks
            const selectedTasks = Array.from(this.elements.availableTasks.querySelectorAll('.task-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedTasks.length === 0) {
                this.setStatus('Please select at least one task', 'error');
                return;
            }
            
            // Get selected context and strategies
            const activityContextId = this.elements.activityContext.value;
            const selectedStrategies = Array.from(this.elements.breakStrategies.querySelectorAll('.strategy-checkbox:checked'))
                .map(cb => cb.value);
            
            this.setStatus('Creating pack...');
            
            // Get earliest task for label and due date inheritance
            const selectedTaskObjects = selectedTasks.map(id => 
                this.allTasks.find(t => t.id === id)
            ).filter(Boolean);
            
            const earliestTask = this.getEarliestTask(selectedTaskObjects);
            
            // Create parent task in Vikunja
            const parentTask = await this.createVikunjaParentTask(title, description, earliestTask);
            
            // Assign subtasks
            await this.assignSubtasks(parentTask.id, selectedTasks);
            
            // Create local pack record
            const pack = {
                id: this.generateId(),
                vikunjaParentTaskId: parentTask.id,
                vikunjaProjectId: this.config.taskPacksProjectId,
                title,
                description,
                date: this.currentDate,
                subtaskIds: selectedTasks,
                activityContextId,
                breakStrategyIds: selectedStrategies,
                status: 'idle',
                syncStatus: 'synced',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            this.db.taskPacks.push(pack);
            await this.saveDatabase();
            
            this.packs = this.db.taskPacks;
            this.clearCreateForm();
            this.loadPacksForDate();
            this.switchTab('packs');
            
            this.setStatus('Pack created successfully');
        } catch (error) {
            console.error('Failed to create pack:', error);
            this.setStatus(`Failed to create pack: ${error.message}`, 'error');
        }
    }
    
    async createVikunjaParentTask(title, description, earliestTask = null) {
        const taskData = {
            title,
            description: description || `Task Pack created on ${this.currentDate}`,
            project_id: this.config.taskPacksProjectId
        };
        
        // Inherit label from earliest task
        if (earliestTask && earliestTask.labels && earliestTask.labels.length > 0) {
            taskData.labels = [earliestTask.labels[0]]; // Use first label
        }
        
        // Set due date one minute before earliest task
        if (earliestTask && earliestTask.due_date) {
            const earliestDueDate = new Date(earliestTask.due_date);
            const parentDueDate = new Date(earliestDueDate.getTime() - 60000); // Subtract 1 minute
            taskData.due_date = parentDueDate.toISOString();
        }
        
        const response = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create parent task: ${error}`);
        }
        
        return await response.json();
    }
    
    async assignSubtasks(parentTaskId, subtaskIds) {
        for (const subtaskId of subtaskIds) {
            try {
                const relationPayload = {
                    task_id: parentTaskId,
                    relation_kind: "subtask",
                    other_task_id: subtaskId
                };
                
                const response = await fetch(`/api/tasks/${subtaskId}/relations`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(relationPayload)
                });
                
                if (!response.ok) {
                    console.error(`Failed to assign subtask ${subtaskId}`);
                }
            } catch (error) {
                console.error(`Error assigning subtask ${subtaskId}:`, error);
            }
        }
    }
    
    clearCreateForm() {
        this.elements.packTitle.value = '';
        this.elements.packDescription.value = '';
        this.elements.taskFilter.value = '';
        this.elements.activityContext.value = '';
        
        // Clear multi-select filters
        this.selectedProjects.clear();
        this.selectedLabels.clear();
        this.updateMultiSelectDisplay('project');
        this.updateMultiSelectDisplay('label');
        
        // Reset date filter
        document.getElementById('filter-by-date').checked = true;
        document.getElementById('exclude-assigned-tasks').checked = true;
        
        // Clear task selections
        this.elements.availableTasks.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.checked = false;
        });
        this.elements.availableTasks.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Clear strategy selections
        this.elements.breakStrategies.querySelectorAll('.strategy-checkbox').forEach(cb => {
            cb.checked = false;
        });
        this.elements.breakStrategies.querySelectorAll('.strategy-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
    
    async startPack(packId) {
        try {
            const pack = this.packs.find(p => p.id === packId);
            if (!pack) return;
            
            // Reset timer state for new session
            this.timerElapsed = 0;
            this.timerStartTime = null;
            this.timerPaused = false;
            
            // Create activity session
            const session = {
                id: this.generateId(),
                taskPackId: packId,
                vikunjaParentTaskId: pack.vikunjaParentTaskId,
                startedAt: new Date().toISOString(),
                status: 'running',
                activityContextId: pack.activityContextId,
                breakStrategyIds: pack.breakStrategyIds,
                totalElapsedSeconds: 0,
                activeElapsedSeconds: 0,
                pausedIntervals: []
            };
            
            this.db.activitySessions.push(session);
            
            // Update pack status
            pack.status = 'running';
            pack.updatedAt = new Date().toISOString();
            
            await this.saveDatabase();
            
            this.activeSession = session;
            this.sessions = this.db.activitySessions;
            
            this.showActivePackPanel();
            this.startTimer();
            this.loadPacksForDate();
            
            this.setStatus('Pack started');
        } catch (error) {
            console.error('Failed to start pack:', error);
            this.setStatus('Failed to start pack', 'error');
        }
    }
    
    showActivePackPanel() {
        if (!this.activeSession) return;
        
        const pack = this.packs.find(p => p.id === this.activeSession.taskPackId);
        if (!pack) return;
        
        const context = this.contexts.find(c => c.id === pack.activityContextId);
        
        this.elements.activePackTitle.textContent = pack.title;
        this.elements.activePackMeta.textContent = `${context ? context.name : 'No context'} • ${pack.subtaskIds.length} tasks`;
        
        this.elements.activePackPanel.style.display = 'block';
        this.updateTimerDisplay();
        this.updateBreakInfo();
        this.loadActivePackTasks();
        this.startTaskReloadTimer();
    }
    
    hideActivePackPanel() {
        this.elements.activePackPanel.style.display = 'none';
        this.stopTimer();
        this.stopTaskReloadTimer();
        this.selectedPackTasks.clear();
    }
    
    startTimer() {
        if (this.timer) return;
        
        // Only reset timer elapsed to 0 when starting a completely new session
        // For resumed sessions, preserve the elapsed time
        if (!this.timerPaused && (!this.activeSession || this.activeSession.status === 'running')) {
            this.timerElapsed = 0;
        }
        
        this.timerStartTime = Date.now() - (this.timerElapsed * 1000);
        this.timerPaused = false;
        
        this.timer = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);
        
        this.elements.pauseBtn.style.display = 'inline-block';
        this.elements.resumeBtn.style.display = 'none';
        this.elements.timerStatus.textContent = 'Running';
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    pauseSession() {
        if (!this.activeSession || this.timerPaused) return;
        
        // Calculate current elapsed time before pausing
        if (this.timerStartTime) {
            this.timerElapsed = Math.floor((Date.now() - this.timerStartTime) / 1000);
        }
        
        this.timerPaused = true;
        this.stopTimer();
        
        // Record pause interval
        this.activeSession.pausedIntervals.push({
            pausedAt: new Date().toISOString()
        });
        
        this.activeSession.status = 'paused';
        this.saveDatabase();
        
        this.elements.pauseBtn.style.display = 'none';
        this.elements.resumeBtn.style.display = 'inline-block';
        this.elements.timerStatus.textContent = 'Paused';
        
        this.loadPacksForDate();
    }
    
    resumeSession() {
        if (!this.activeSession || !this.timerPaused) return;
        
        // Complete the last pause interval
        const lastPause = this.activeSession.pausedIntervals[this.activeSession.pausedIntervals.length - 1];
        if (lastPause && !lastPause.resumedAt) {
            lastPause.resumedAt = new Date().toISOString();
        }
        
        this.activeSession.status = 'running';
        this.saveDatabase();
        
        this.startTimer();
        this.loadPacksForDate();
    }
    
    async stopSession() {
        if (!this.activeSession) return;
        
        try {
            this.stopTimer();
            this.stopTaskReloadTimer();
            
            // Show completion modal first
            this.showCompletionModal();
            
        } catch (error) {
            console.error('Failed to stop session:', error);
            this.setStatus('Failed to stop session', 'error');
        }
    }
    
    calculateActiveElapsed() {
        let activeTime = this.timerElapsed;
        
        // Subtract paused time
        for (const interval of this.activeSession.pausedIntervals) {
            if (interval.pausedAt && interval.resumedAt) {
                const pausedMs = new Date(interval.resumedAt) - new Date(interval.pausedAt);
                activeTime -= Math.floor(pausedMs / 1000);
            }
        }
        
        return Math.max(0, activeTime);
    }
    
    updateTimerDisplay() {
        if (this.timerPaused) return;
        
        this.timerElapsed = Math.floor((Date.now() - this.timerStartTime) / 1000);
        
        const hours = Math.floor(this.timerElapsed / 3600);
        const minutes = Math.floor((this.timerElapsed % 3600) / 60);
        const seconds = this.timerElapsed % 60;
        
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.elements.timerDisplay.textContent = timeStr;
    }
    
    updateBreakInfo() {
        if (!this.activeSession) return;
        
        const strategies = this.activeSession.breakStrategyIds.map(id =>
            this.strategies.find(s => s.id === id)
        ).filter(Boolean);
        
        if (strategies.length === 0) {
            this.elements.breakInfo.textContent = 'No break strategies selected';
            return;
        }
        
        // Find next break (simplified - just show first strategy)
        const nextStrategy = strategies[0];
        const nextBreakMinutes = nextStrategy.intervalMinutes;
        const elapsedMinutes = Math.floor(this.timerElapsed / 60);
        const minutesUntilBreak = nextBreakMinutes - (elapsedMinutes % nextBreakMinutes);
        
        this.elements.breakInfo.innerHTML = `
            <strong>Next break:</strong> ${nextStrategy.name} in ${minutesUntilBreak} minutes
        `;
    }
    
    startBreak() {
        if (!this.activeSession) return;
        
        const strategies = this.activeSession.breakStrategyIds.map(id =>
            this.strategies.find(s => s.id === id)
        ).filter(Boolean);
        
        if (strategies.length > 0) {
            const strategy = strategies[0];
            this.showBreakNotification(strategy);
        }
    }
    
    // Context Management
    showContextModal(contextId = null) {
        const isEdit = !!contextId;
        const context = isEdit ? this.contexts.find(c => c.id === contextId) : null;
        
        document.getElementById('context-modal-title').textContent = isEdit ? 'Edit Context' : 'Add Context';
        
        if (context) {
            document.getElementById('context-name').value = context.name;
            document.getElementById('context-description').value = context.description || '';
            document.getElementById('context-type').value = context.activityType;
        } else {
            this.elements.contextForm.reset();
        }
        
        this.elements.contextForm.dataset.contextId = contextId || '';
        this.elements.contextModal.classList.add('show');
    }
    
    hideContextModal() {
        this.elements.contextModal.classList.remove('show');
        this.elements.contextForm.reset();
        delete this.elements.contextForm.dataset.contextId;
    }
    
    async saveContext() {
        try {
            const contextId = this.elements.contextForm.dataset.contextId;
            const isEdit = !!contextId;
            
            const name = document.getElementById('context-name').value.trim();
            const description = document.getElementById('context-description').value.trim();
            const activityType = document.getElementById('context-type').value;
            
            if (!name) {
                this.setStatus('Please enter a context name', 'error');
                return;
            }
            
            if (isEdit) {
                const context = this.contexts.find(c => c.id === contextId);
                if (context) {
                    context.name = name;
                    context.description = description;
                    context.activityType = activityType;
                    context.updatedAt = new Date().toISOString();
                }
            } else {
                const context = {
                    id: this.generateId(),
                    name,
                    description,
                    activityType,
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                this.db.activityContexts.push(context);
            }
            
            await this.saveDatabase();
            this.contexts = this.db.activityContexts;
            this.renderContexts();
            this.hideContextModal();
            
            this.setStatus(isEdit ? 'Context updated' : 'Context created');
        } catch (error) {
            console.error('Failed to save context:', error);
            this.setStatus('Failed to save context', 'error');
        }
    }
    
    renderContexts() {
        this.elements.contextsList.innerHTML = this.contexts.map(context => `
            <div class="context-item">
                <div class="context-item-header">
                    <div>
                        <div class="context-item-name">${this.escapeHtml(context.name)}</div>
                        <div class="context-item-type">${context.activityType.replace('_', ' ')}</div>
                    </div>
                </div>
                ${context.description ? `<div class="context-item-description">${this.escapeHtml(context.description)}</div>` : ''}
                <div class="context-item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.showContextModal('${context.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="taskPacksApp.deleteContext('${context.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    async deleteContext(contextId) {
        if (!confirm('Are you sure you want to delete this context?')) return;
        
        try {
            this.db.activityContexts = this.db.activityContexts.filter(c => c.id !== contextId);
            await this.saveDatabase();
            this.contexts = this.db.activityContexts;
            this.renderContexts();
            this.setStatus('Context deleted');
        } catch (error) {
            console.error('Failed to delete context:', error);
            this.setStatus('Failed to delete context', 'error');
        }
    }
    
    // Strategy Management
    showStrategyModal(strategyId = null) {
        const isEdit = !!strategyId;
        const strategy = isEdit ? this.strategies.find(s => s.id === strategyId) : null;
        
        document.getElementById('strategy-modal-title').textContent = isEdit ? 'Edit Strategy' : 'Add Strategy';
        
        if (strategy) {
            document.getElementById('strategy-name').value = strategy.name;
            document.getElementById('strategy-description').value = strategy.description || '';
            document.getElementById('strategy-type').value = strategy.breakType;
            document.getElementById('strategy-duration').value = strategy.suggestedDurationSeconds;
            document.getElementById('strategy-interval').value = strategy.intervalMinutes;
            document.getElementById('strategy-prompt').value = strategy.prompt || '';
        } else {
            this.elements.strategyForm.reset();
        }
        
        this.elements.strategyForm.dataset.strategyId = strategyId || '';
        this.elements.strategyModal.classList.add('show');
    }
    
    hideStrategyModal() {
        this.elements.strategyModal.classList.remove('show');
        this.elements.strategyForm.reset();
        delete this.elements.strategyForm.dataset.strategyId;
    }
    
    async saveStrategy() {
        try {
            const strategyId = this.elements.strategyForm.dataset.strategyId;
            const isEdit = !!strategyId;
            
            const name = document.getElementById('strategy-name').value.trim();
            const description = document.getElementById('strategy-description').value.trim();
            const breakType = document.getElementById('strategy-type').value;
            const suggestedDurationSeconds = parseInt(document.getElementById('strategy-duration').value) || 90;
            const intervalMinutes = parseInt(document.getElementById('strategy-interval').value) || 20;
            const prompt = document.getElementById('strategy-prompt').value.trim();
            
            if (!name) {
                this.setStatus('Please enter a strategy name', 'error');
                return;
            }
            
            if (isEdit) {
                const strategy = this.strategies.find(s => s.id === strategyId);
                if (strategy) {
                    strategy.name = name;
                    strategy.description = description;
                    strategy.breakType = breakType;
                    strategy.suggestedDurationSeconds = suggestedDurationSeconds;
                    strategy.intervalMinutes = intervalMinutes;
                    strategy.prompt = prompt;
                    strategy.updatedAt = new Date().toISOString();
                }
            } else {
                const strategy = {
                    id: this.generateId(),
                    name,
                    description,
                    breakType,
                    suggestedDurationSeconds,
                    intervalMinutes,
                    prompt,
                    active: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                this.db.breakStrategies.push(strategy);
            }
            
            await this.saveDatabase();
            this.strategies = this.db.breakStrategies;
            this.renderStrategies();
            this.hideStrategyModal();
            
            this.setStatus(isEdit ? 'Strategy updated' : 'Strategy created');
        } catch (error) {
            console.error('Failed to save strategy:', error);
            this.setStatus('Failed to save strategy', 'error');
        }
    }
    
    renderStrategies() {
        this.elements.strategiesList.innerHTML = this.strategies.map(strategy => `
            <div class="strategy-item-card">
                <div class="strategy-item-header">
                    <div>
                        <div class="strategy-item-card-name">${this.escapeHtml(strategy.name)}</div>
                        <div class="strategy-item-card-type">${strategy.breakType.replace('_', ' ')}</div>
                    </div>
                </div>
                ${strategy.description ? `<div class="strategy-item-card-description">${this.escapeHtml(strategy.description)}</div>` : ''}
                <div class="strategy-item-card-description">
                    Every ${strategy.intervalMinutes} minutes • ${strategy.suggestedDurationSeconds} seconds
                </div>
                ${strategy.prompt ? `<div class="strategy-item-card-description"><em>"${this.escapeHtml(strategy.prompt)}"</em></div>` : ''}
                <div class="strategy-item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.showStrategyModal('${strategy.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="taskPacksApp.deleteStrategy('${strategy.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    async deleteStrategy(strategyId) {
        if (!confirm('Are you sure you want to delete this strategy?')) return;
        
        try {
            this.db.breakStrategies = this.db.breakStrategies.filter(s => s.id !== strategyId);
            await this.saveDatabase();
            this.strategies = this.db.breakStrategies;
            this.renderStrategies();
            this.setStatus('Strategy deleted');
        } catch (error) {
            console.error('Failed to delete strategy:', error);
            this.setStatus('Failed to delete strategy', 'error');
        }
    }
    
    // Rating Modal
    showRatingModal() {
        this.populateRatingModal();
        this.elements.ratingModal.classList.add('show');
    }
    
    hideRatingModal() {
        this.elements.ratingModal.classList.remove('show');
        this.elements.ratingForm.reset();
    }
    
    populateRatingModal() {
        const session = this.completedSession || this.activeSession;
        if (!session) return;
        
        const pack = this.packs.find(p => p.id === session.taskPackId);
        if (!pack) return;
        
        // Populate activity context info
        const context = this.contexts.find(c => c.id === pack.activityContextId);
        const contextInfo = document.getElementById('context-rating-info');
        if (context) {
            contextInfo.innerHTML = `<strong>Context:</strong> ${this.escapeHtml(context.name)} (${context.activityType.replace('_', ' ')})`;
            document.getElementById('context-rating-section').style.display = 'block';
        } else {
            document.getElementById('context-rating-section').style.display = 'none';
        }
        
        // Populate label info
        const packLabel = this.getPackLabel(pack);
        const labelInfo = document.getElementById('label-rating-info');
        if (packLabel) {
            const labelColor = packLabel.hex_color || packLabel.color;
            const colorStyle = labelColor ? `style="background-color: ${labelColor.startsWith('#') ? labelColor : '#' + labelColor}; color: ${this.getTextColorForBackground(labelColor)}; padding: 2px 8px; border-radius: 12px; font-size: 11px;"` : '';
            labelInfo.innerHTML = `<strong>Task Type:</strong> <span ${colorStyle}>${this.escapeHtml(packLabel.title || 'Label')}</span>`;
            document.getElementById('label-rating-section').style.display = 'block';
        } else {
            document.getElementById('label-rating-section').style.display = 'none';
        }
        
        // Populate individual strategy ratings
        this.populateIndividualStrategyRatings();
    }
    
    populateIndividualStrategyRatings() {
        const session = this.completedSession || this.activeSession;
        if (!session) return;
        
        const strategies = session.breakStrategyIds.map(id =>
            this.strategies.find(s => s.id === id)
        ).filter(Boolean);
        
        const container = document.getElementById('individual-strategy-ratings');
        
        if (strategies.length === 0) {
            container.innerHTML = '<div class="loading">No break strategies were used in this session</div>';
            return;
        }
        
        container.innerHTML = strategies.map((strategy, index) => `
            <div class="individual-strategy-rating">
                <div class="strategy-rating-header">
                    <div class="strategy-rating-name">${this.escapeHtml(strategy.name)}</div>
                    <div class="strategy-rating-meta">
                        ${strategy.breakType.replace('_', ' ')} • Every ${strategy.intervalMinutes} minutes • ${strategy.suggestedDurationSeconds}s
                    </div>
                </div>
                <div class="strategy-rating-fields">
                    <div class="strategy-rating-row">
                        <label>Effectiveness:</label>
                        <div class="rating-scale">
                            <input type="radio" name="strategy_${index}_effectiveness" value="1" id="strat_${index}_eff1"><label for="strat_${index}_eff1">1</label>
                            <input type="radio" name="strategy_${index}_effectiveness" value="2" id="strat_${index}_eff2"><label for="strat_${index}_eff2">2</label>
                            <input type="radio" name="strategy_${index}_effectiveness" value="3" id="strat_${index}_eff3"><label for="strat_${index}_eff3">3</label>
                            <input type="radio" name="strategy_${index}_effectiveness" value="4" id="strat_${index}_eff4"><label for="strat_${index}_eff4">4</label>
                            <input type="radio" name="strategy_${index}_effectiveness" value="5" id="strat_${index}_eff5"><label for="strat_${index}_eff5">5</label>
                        </div>
                    </div>
                    <div class="strategy-rating-row">
                        <label>Ease of Use:</label>
                        <div class="rating-scale">
                            <input type="radio" name="strategy_${index}_ease" value="1" id="strat_${index}_ease1"><label for="strat_${index}_ease1">1</label>
                            <input type="radio" name="strategy_${index}_ease" value="2" id="strat_${index}_ease2"><label for="strat_${index}_ease2">2</label>
                            <input type="radio" name="strategy_${index}_ease" value="3" id="strat_${index}_ease3"><label for="strat_${index}_ease3">3</label>
                            <input type="radio" name="strategy_${index}_ease" value="4" id="strat_${index}_ease4"><label for="strat_${index}_ease4">4</label>
                            <input type="radio" name="strategy_${index}_ease" value="5" id="strat_${index}_ease5"><label for="strat_${index}_ease5">5</label>
                        </div>
                    </div>
                    <div class="strategy-rating-row">
                        <label>Timing:</label>
                        <div class="rating-scale">
                            <input type="radio" name="strategy_${index}_timing" value="1" id="strat_${index}_time1"><label for="strat_${index}_time1">1</label>
                            <input type="radio" name="strategy_${index}_timing" value="2" id="strat_${index}_time2"><label for="strat_${index}_time2">2</label>
                            <input type="radio" name="strategy_${index}_timing" value="3" id="strat_${index}_time3"><label for="strat_${index}_time3">3</label>
                            <input type="radio" name="strategy_${index}_timing" value="4" id="strat_${index}_time4"><label for="strat_${index}_time4">4</label>
                            <input type="radio" name="strategy_${index}_timing" value="5" id="strat_${index}_time5"><label for="strat_${index}_time5">5</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="strategy_${index}_notes">Strategy Notes:</label>
                        <textarea id="strategy_${index}_notes" rows="2" placeholder="Notes about this specific strategy..." data-strategy-id="${strategy.id}"></textarea>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async saveRating() {
        try {
            console.log('saveRating called');
            
            const session = this.completedSession || this.activeSession;
            if (!session) {
                console.log('No session found for rating');
                this.setStatus('No session found for rating', 'error');
                return;
            }
            
            const pack = this.packs.find(p => p.id === session.taskPackId);
            if (!pack) {
                console.log('Pack not found for session');
                this.setStatus('Pack not found', 'error');
                return;
            }
            
            console.log('Saving ratings for pack:', pack.title);
            const ratings = [];
            
            // Overall session rating
            const helpfulness = document.querySelector('input[name="helpfulness"]:checked')?.value;
            const timingFit = document.querySelector('input[name="timingFit"]:checked')?.value;
            const notes = document.getElementById('rating-notes').value.trim();
            
            if (helpfulness || timingFit || notes) {
                ratings.push({
                    id: this.generateId(),
                    taskPackId: session.taskPackId,
                    activitySessionId: session.id,
                    ratingType: 'overall_pack_strategy',
                    helpfulness: helpfulness ? parseInt(helpfulness) : null,
                    timingFit: timingFit ? parseInt(timingFit) : null,
                    notes,
                    createdAt: new Date().toISOString()
                });
            }
            
            // Activity context rating
            const contextFit = document.querySelector('input[name="contextFit"]:checked')?.value;
            const contextNotes = document.getElementById('context-rating-notes').value.trim();
            
            if ((contextFit || contextNotes) && pack.activityContextId) {
                ratings.push({
                    id: this.generateId(),
                    taskPackId: session.taskPackId,
                    activitySessionId: session.id,
                    activityContextId: pack.activityContextId,
                    ratingType: 'activity_context_fit',
                    contextFit: contextFit ? parseInt(contextFit) : null,
                    notes: contextNotes,
                    createdAt: new Date().toISOString()
                });
            }
            
            // Task type (label) rating
            const labelFit = document.querySelector('input[name="labelFit"]:checked')?.value;
            const labelNotes = document.getElementById('label-rating-notes').value.trim();
            const packLabel = this.getPackLabel(pack);
            
            if ((labelFit || labelNotes) && packLabel) {
                ratings.push({
                    id: this.generateId(),
                    taskPackId: session.taskPackId,
                    activitySessionId: session.id,
                    labelId: packLabel.id,
                    ratingType: 'task_type_fit',
                    labelFit: labelFit ? parseInt(labelFit) : null,
                    notes: labelNotes,
                    createdAt: new Date().toISOString()
                });
            }
            
            // Individual strategy ratings
            const strategies = session.breakStrategyIds.map(id =>
                this.strategies.find(s => s.id === id)
            ).filter(Boolean);
            
            strategies.forEach((strategy, index) => {
                const effectiveness = document.querySelector(`input[name="strategy_${index}_effectiveness"]:checked`)?.value;
                const ease = document.querySelector(`input[name="strategy_${index}_ease"]:checked`)?.value;
                const timing = document.querySelector(`input[name="strategy_${index}_timing"]:checked`)?.value;
                const strategyNotes = document.getElementById(`strategy_${index}_notes`).value.trim();
                
                if (effectiveness || ease || timing || strategyNotes) {
                    ratings.push({
                        id: this.generateId(),
                        taskPackId: session.taskPackId,
                        activitySessionId: session.id,
                        breakStrategyId: strategy.id,
                        activityContextId: pack.activityContextId,
                        labelId: packLabel?.id || null,
                        ratingType: 'break_strategy',
                        effectiveness: effectiveness ? parseInt(effectiveness) : null,
                        ease: ease ? parseInt(ease) : null,
                        timing: timing ? parseInt(timing) : null,
                        notes: strategyNotes,
                        createdAt: new Date().toISOString()
                    });
                }
            });
            
            // Save all ratings
            console.log('Saving ratings:', ratings);
            
            if (!this.db.strategyRatings) {
                this.db.strategyRatings = [];
            }
            
            this.db.strategyRatings.push(...ratings);
            await this.saveDatabase();
            
            this.hideRatingModal();
            this.setStatus(`Saved ${ratings.length} rating${ratings.length !== 1 ? 's' : ''}`);
            
            // Clear completed session after rating is saved
            this.completedSession = null;
            
            console.log('Ratings saved successfully');
        } catch (error) {
            console.error('Failed to save rating:', error);
            this.setStatus('Failed to save rating', 'error');
        }
    }
    
    // Multi-select dropdown methods
    setupMultiSelectDropdown(type) {
        const display = document.getElementById(`${type}-filter-display`);
        const dropdown = document.getElementById(`${type}-filter-dropdown`);
        const search = document.getElementById(`${type}-search`);
        
        // Toggle dropdown
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            
            // Close all other dropdowns
            document.querySelectorAll('.multi-select-dropdown.open').forEach(dd => {
                dd.classList.remove('open');
                dd.previousElementSibling.classList.remove('open');
            });
            
            if (!isOpen) {
                dropdown.classList.add('open');
                display.classList.add('open');
                search.focus();
            }
        });
        
        // Search functionality
        search.addEventListener('input', () => {
            this.filterMultiSelectOptions(type, search.value);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select-container')) {
                dropdown.classList.remove('open');
                display.classList.remove('open');
            }
        });
    }
    
    populateProjectOptions() {
        const container = document.getElementById('project-options');
        container.innerHTML = '';
        
        this.allProjects.forEach(project => {
            const option = document.createElement('div');
            option.className = 'multi-select-option';
            option.dataset.value = project.id;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedProjects.has(project.id);
            checkbox.addEventListener('change', () => {
                this.toggleProjectSelection(project.id);
            });
            
            const label = document.createElement('span');
            label.className = 'multi-select-option-label';
            label.textContent = project.title || `Project ${project.id}`;
            
            option.appendChild(checkbox);
            option.appendChild(label);
            container.appendChild(option);
            
            // Click handler for the entire option
            option.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.toggleProjectSelection(project.id);
                }
            });
        });
    }
    
    populateLabelOptions() {
        const container = document.getElementById('label-options');
        container.innerHTML = '';
        
        this.allLabels.forEach(label => {
            const option = document.createElement('div');
            option.className = 'multi-select-option';
            option.dataset.value = label.id;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedLabels.has(label.id);
            checkbox.addEventListener('change', () => {
                this.toggleLabelSelection(label.id);
            });
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'multi-select-option-label';
            labelSpan.textContent = label.title || `Label ${label.id}`;
            
            // Add color indicator if available
            if (label.hex_color) {
                const colorIndicator = document.createElement('span');
                colorIndicator.style.display = 'inline-block';
                colorIndicator.style.width = '12px';
                colorIndicator.style.height = '12px';
                colorIndicator.style.borderRadius = '50%';
                colorIndicator.style.backgroundColor = label.hex_color.startsWith('#') ? label.hex_color : `#${label.hex_color}`;
                colorIndicator.style.marginRight = '6px';
                labelSpan.prepend(colorIndicator);
            }
            
            option.appendChild(checkbox);
            option.appendChild(labelSpan);
            container.appendChild(option);
            
            // Click handler for the entire option
            option.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.toggleLabelSelection(label.id);
                }
            });
        });
    }
    
    filterMultiSelectOptions(type, searchText) {
        const container = document.getElementById(`${type}-options`);
        const options = container.querySelectorAll('.multi-select-option');
        
        options.forEach(option => {
            const label = option.querySelector('.multi-select-option-label').textContent.toLowerCase();
            const matches = label.includes(searchText.toLowerCase());
            option.style.display = matches ? 'flex' : 'none';
        });
    }
    
    toggleProjectSelection(projectId) {
        if (this.selectedProjects.has(projectId)) {
            this.selectedProjects.delete(projectId);
        } else {
            this.selectedProjects.add(projectId);
        }
        this.updateMultiSelectDisplay('project');
        this.filterTasks();
    }
    
    toggleLabelSelection(labelId) {
        if (this.selectedLabels.has(labelId)) {
            this.selectedLabels.delete(labelId);
        } else {
            this.selectedLabels.add(labelId);
        }
        this.updateMultiSelectDisplay('label');
        this.filterTasks();
    }
    
    updateMultiSelectDisplay(type) {
        const display = document.getElementById(`${type}-filter-display`);
        const selectedSet = type === 'project' ? this.selectedProjects : this.selectedLabels;
        const allItems = type === 'project' ? this.allProjects : this.allLabels;
        
        // Clear current display
        display.innerHTML = '';
        
        if (selectedSet.size === 0) {
            const placeholder = document.createElement('span');
            placeholder.className = 'placeholder';
            placeholder.textContent = type === 'project' ? 'All projects' : 'All labels';
            display.appendChild(placeholder);
        } else {
            selectedSet.forEach(id => {
                const item = allItems.find(i => i.id === id);
                if (item) {
                    const tag = document.createElement('span');
                    tag.className = 'multi-select-tag';
                    
                    const text = document.createElement('span');
                    text.textContent = item.title || item.name || `${type} ${id}`;
                    
                    const remove = document.createElement('span');
                    remove.className = 'remove';
                    remove.textContent = '×';
                    remove.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (type === 'project') {
                            this.toggleProjectSelection(id);
                        } else {
                            this.toggleLabelSelection(id);
                        }
                    });
                    
                    tag.appendChild(text);
                    tag.appendChild(remove);
                    display.appendChild(tag);
                }
            });
        }
        
        // Update checkboxes in dropdown
        const container = document.getElementById(`${type}-options`);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const optionValue = parseInt(checkbox.closest('.multi-select-option').dataset.value);
            checkbox.checked = selectedSet.has(optionValue);
        });
    }
    
    // Notification methods
    checkNotificationPermission() {
        if ('Notification' in window) {
            this.notificationPermission = Notification.permission;
            console.log('Notification permission:', this.notificationPermission);
        } else {
            console.log('This browser does not support notifications');
            this.notificationPermission = 'unsupported';
        }
    }
    
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.setStatus('This browser does not support notifications', 'warning');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
            return true;
        }
        
        if (Notification.permission === 'denied') {
            this.setStatus('Notifications are blocked. Please enable them in your browser settings.', 'warning');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            
            if (permission === 'granted') {
                this.setStatus('Notifications enabled successfully');
                return true;
            } else {
                this.setStatus('Notification permission denied', 'warning');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.setStatus('Failed to request notification permission', 'error');
            return false;
        }
    }
    
    async showBreakNotification(strategy) {
        // Check if notifications are enabled in config
        if (!this.config.breakNotificationsEnabled) {
            // Fall back to in-app notification
            this.showInAppBreakNotification(strategy);
            return;
        }
        
        // Request permission if not already granted
        if (this.notificationPermission !== 'granted') {
            const granted = await this.requestNotificationPermission();
            if (!granted) {
                // Fall back to in-app notification
                this.showInAppBreakNotification(strategy);
                return;
            }
        }
        
        try {
            const notification = new Notification('Break Time!', {
                body: `${strategy.name}\n\n${strategy.prompt}`,
                icon: '/favicon.ico', // You can add a custom icon here
                badge: '/favicon.ico',
                tag: 'task-pack-break', // Prevents duplicate notifications
                requireInteraction: true, // Keeps notification visible until user interacts
                actions: [
                    {
                        action: 'start',
                        title: 'Start Break'
                    },
                    {
                        action: 'snooze',
                        title: 'Snooze 5min'
                    }
                ]
            });
            
            // Handle notification click
            notification.onclick = () => {
                window.focus(); // Focus the app window
                this.handleBreakNotificationClick(strategy);
                notification.close();
            };
            
            // Handle notification actions (if supported)
            if ('actions' in notification) {
                notification.onnotificationclick = (event) => {
                    event.notification.close();
                    
                    if (event.action === 'start') {
                        window.focus();
                        this.handleBreakNotificationClick(strategy);
                    } else if (event.action === 'snooze') {
                        window.focus();
                        this.snoozeBreak(5); // Snooze for 5 minutes
                    }
                };
            }
            
            // Auto-close after 30 seconds if not interacted with
            setTimeout(() => {
                notification.close();
            }, 30000);
            
        } catch (error) {
            console.error('Error showing notification:', error);
            // Fall back to in-app notification
            this.showInAppBreakNotification(strategy);
        }
    }
    
    showInAppBreakNotification(strategy) {
        // Create an in-app notification as fallback
        const notification = document.createElement('div');
        notification.className = 'break-notification';
        notification.innerHTML = `
            <div class="break-notification-content">
                <h4>Break Time!</h4>
                <h5>${this.escapeHtml(strategy.name)}</h5>
                <p>${this.escapeHtml(strategy.prompt)}</p>
                <div class="break-notification-actions">
                    <button class="btn btn-primary btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">Got it</button>
                    <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.snoozeBreak(5); this.parentElement.parentElement.parentElement.remove()">Snooze 5min</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
        
        // Play a subtle sound if possible (optional)
        this.playNotificationSound();
    }
    
    handleBreakNotificationClick(strategy) {
        // Focus on the active pack panel
        if (this.elements.activePackPanel) {
            this.elements.activePackPanel.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Show break details in the break info area
        this.elements.breakInfo.innerHTML = `
            <div class="current-break">
                <strong>Current Break: ${this.escapeHtml(strategy.name)}</strong>
                <p>${this.escapeHtml(strategy.prompt)}</p>
                <small>Duration: ${strategy.suggestedDurationSeconds} seconds</small>
            </div>
        `;
        
        // Record break event
        this.recordBreakEvent(strategy);
    }
    
    snoozeBreak(minutes) {
        if (!this.activeSession) return;
        
        this.setStatus(`Break snoozed for ${minutes} minutes`);
        
        // Schedule the break again after the snooze period
        setTimeout(() => {
            if (this.activeSession && (this.activeSession.status === 'running')) {
                const strategies = this.activeSession.breakStrategyIds.map(id =>
                    this.strategies.find(s => s.id === id)
                ).filter(Boolean);
                
                if (strategies.length > 0) {
                    this.showBreakNotification(strategies[0]);
                }
            }
        }, minutes * 60 * 1000);
    }
    
    recordBreakEvent(strategy) {
        if (!this.activeSession) return;
        
        const breakEvent = {
            id: this.generateId(),
            taskPackId: this.activeSession.taskPackId,
            activitySessionId: this.activeSession.id,
            breakStrategyId: strategy.id,
            scheduledFor: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            status: 'started'
        };
        
        if (!this.db.breakEvents) this.db.breakEvents = [];
        this.db.breakEvents.push(breakEvent);
        this.saveDatabase();
    }
    
    playNotificationSound() {
        // Try to play a subtle notification sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.1;
            audio.play().catch(() => {
                // Ignore errors - sound is optional
            });
        } catch (error) {
            // Ignore errors - sound is optional
        }
    }
    
    // Task reload timer
    startTaskReloadTimer() {
        if (this.taskReloadTimer) return;
        
        const intervalMs = (this.config.taskReloadIntervalMinutes || 5) * 60 * 1000;
        this.taskReloadTimer = setInterval(() => {
            this.reloadActivePackTasks();
        }, intervalMs);
    }
    
    stopTaskReloadTimer() {
        if (this.taskReloadTimer) {
            clearInterval(this.taskReloadTimer);
            this.taskReloadTimer = null;
        }
    }
    
    async reloadActivePackTasks() {
        if (!this.activeSession) return;
        
        try {
            // Reload tasks from Vikunja
            await this.loadTasks();
            this.loadActivePackTasks();
        } catch (error) {
            console.error('Failed to reload tasks:', error);
        }
    }
    
    // Active pack task management
    async loadActivePackTasks() {
        if (!this.activeSession) return;
        
        const pack = this.packs.find(p => p.id === this.activeSession.taskPackId);
        if (!pack) return;
        
        // Get all tasks that are subtasks of this pack
        const allPackTasks = pack.subtaskIds.map(id => 
            this.allTasks.find(t => t.id === id)
        ).filter(Boolean);
        
        // Filter to only show tasks with the same due date as the pack date
        const packDate = pack.date; // YYYY-MM-DD format
        const filteredTasks = allPackTasks.filter(task => {
            if (!task.due_date) return false;
            const taskDueDate = new Date(task.due_date).toISOString().split('T')[0];
            return taskDueDate === packDate;
        });
        
        this.renderActivePackTasks(filteredTasks);
    }
    
    renderActivePackTasks(tasks) {
        if (tasks.length === 0) {
            this.elements.packTasksList.innerHTML = '<div class="loading">No tasks in this pack</div>';
            return;
        }
        
        this.elements.packTasksList.innerHTML = tasks.map(task => {
            const isDone = task.done || false;
            const isSelected = this.selectedPackTasks.has(task.id);
            
            return `
                <div class="pack-task-item ${isDone ? 'done' : ''} ${isSelected ? 'selected' : ''}" 
                     data-task-id="${task.id}">
                    <input type="checkbox" class="pack-task-checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           ${isDone ? 'disabled' : ''}>
                    <div class="pack-task-content">
                        <div class="pack-task-title">${this.escapeHtml(task.title || `Task ${task.id}`)}</div>
                        <div class="pack-task-meta">Project: ${task.project_id || 'None'}</div>
                    </div>
                    <div class="pack-task-status ${isDone ? 'done' : 'pending'}">
                        ${isDone ? 'Done' : 'Pending'}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        this.elements.packTasksList.querySelectorAll('.pack-task-item').forEach(item => {
            const taskId = parseInt(item.dataset.taskId);
            const checkbox = item.querySelector('.pack-task-checkbox');
            const isDone = item.classList.contains('done');
            
            if (!isDone) {
                // Click handler for selection
                item.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                    this.togglePackTaskSelection(taskId, checkbox.checked);
                });
                
                checkbox.addEventListener('change', () => {
                    this.togglePackTaskSelection(taskId, checkbox.checked);
                });
            }
            
            // Double-click to show task details
            item.addEventListener('dblclick', () => {
                this.showTaskDetails(taskId);
            });
        });
        
        this.updatePackTaskActions();
    }
    
    togglePackTaskSelection(taskId, selected) {
        if (selected) {
            this.selectedPackTasks.add(taskId);
        } else {
            this.selectedPackTasks.delete(taskId);
        }
        
        // Update UI
        const item = this.elements.packTasksList.querySelector(`[data-task-id="${taskId}"]`);
        if (item) {
            item.classList.toggle('selected', selected);
            const checkbox = item.querySelector('.pack-task-checkbox');
            if (checkbox) checkbox.checked = selected;
        }
        
        this.updatePackTaskActions();
    }
    
    selectAllPackTasks() {
        const items = this.elements.packTasksList.querySelectorAll('.pack-task-item:not(.done)');
        items.forEach(item => {
            const taskId = parseInt(item.dataset.taskId);
            const checkbox = item.querySelector('.pack-task-checkbox');
            if (checkbox && !checkbox.disabled) {
                checkbox.checked = true;
                this.selectedPackTasks.add(taskId);
                item.classList.add('selected');
            }
        });
        this.updatePackTaskActions();
    }
    
    clearPackTaskSelection() {
        this.selectedPackTasks.clear();
        this.elements.packTasksList.querySelectorAll('.pack-task-item').forEach(item => {
            item.classList.remove('selected');
            const checkbox = item.querySelector('.pack-task-checkbox');
            if (checkbox) checkbox.checked = false;
        });
        this.updatePackTaskActions();
    }
    
    updatePackTaskActions() {
        const hasSelection = this.selectedPackTasks.size > 0;
        this.elements.markSelectedDoneBtn.disabled = !hasSelection;
    }
    
    async markSelectedTasksDone() {
        if (this.selectedPackTasks.size === 0) return;
        
        try {
            this.setStatus(`Marking ${this.selectedPackTasks.size} tasks as done...`);
            
            let successCount = 0;
            for (const taskId of this.selectedPackTasks) {
                try {
                    await this.markTaskAsDone(taskId);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to mark task ${taskId} as done:`, error);
                }
            }
            
            this.selectedPackTasks.clear();
            await this.reloadActivePackTasks();
            
            this.setStatus(`Marked ${successCount} tasks as done`);
        } catch (error) {
            console.error('Failed to mark tasks as done:', error);
            this.setStatus('Failed to mark tasks as done', 'error');
        }
    }
    
    async markTaskAsDone(taskId) {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done: true })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to mark task ${taskId} as done: ${error}`);
        }
        
        return await response.json();
    }
    
    async deleteVikunjaTask(taskId) {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to delete task ${taskId}: ${error}`);
        }
        
        return response.status === 204 ? {} : await response.json();
    }
    
    // Task details modal
    async showTaskDetails(taskId) {
        try {
            this.setStatus(`Loading task ${taskId}...`);
            
            // Get fresh task data
            const response = await fetch(`/api/tasks/${taskId}`);
            if (!response.ok) {
                throw new Error(`Failed to load task: ${response.status}`);
            }
            
            const task = await response.json();
            
            // Update modal content
            this.elements.taskDetailsTitle.textContent = task.title || `Task ${taskId}`;
            this.elements.taskDetailsMeta.textContent = `#${taskId} • Project: ${task.project_id || 'None'}`;
            
            // Description
            this.elements.taskDetailsDescription.textContent = task.description || '';
            
            // Details grid
            this.elements.taskDetailsGrid.innerHTML = `
                <div class="detail-label">Priority:</div>
                <div class="detail-value">${task.priority || '—'}</div>
                <div class="detail-label">Due Date:</div>
                <div class="detail-value">${task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</div>
                <div class="detail-label">Created:</div>
                <div class="detail-value">${task.created ? new Date(task.created).toLocaleDateString() : '—'}</div>
                <div class="detail-label">Status:</div>
                <div class="detail-value">${task.done ? 'Done' : 'Pending'}</div>
            `;
            
            // Links
            this.elements.taskDetailsOpenLink.href = this.getTaskUrl(taskId);
            if (task.project_id) {
                this.elements.taskDetailsProjectLink.href = this.getProjectUrl(task.project_id);
                this.elements.taskDetailsProjectLink.style.display = '';
            } else {
                this.elements.taskDetailsProjectLink.style.display = 'none';
            }
            
            this.elements.taskDetailsModal.classList.add('show');
            this.setStatus('');
        } catch (error) {
            console.error('Failed to load task details:', error);
            this.setStatus('Failed to load task details', 'error');
        }
    }
    
    hideTaskDetailsModal() {
        this.elements.taskDetailsModal.classList.remove('show');
    }
    
    getTaskUrl(taskId) {
        // Use server config base URL if available
        const baseUrl = this.serverConfig?.baseUrl || '';
        const uiBaseUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
        return `${uiBaseUrl}/tasks/${taskId}`;
    }
    
    getProjectUrl(projectId) {
        const baseUrl = this.serverConfig?.baseUrl || '';
        const uiBaseUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
        return `${uiBaseUrl}/projects/${projectId}`;
    }
    
    // Completion modal
    showCompletionModal() {
        // Reset to defaults
        this.elements.markPackDone.checked = true;
        this.elements.markAllSubtasksDone.checked = true;
        this.toggleRemainingTasksSection();
        
        this.elements.completionModal.classList.add('show');
    }
    
    hideCompletionModal() {
        this.elements.completionModal.classList.remove('show');
    }
    
    toggleRemainingTasksSection() {
        const showSection = !this.elements.markAllSubtasksDone.checked;
        this.elements.remainingTasksSection.style.display = showSection ? 'block' : 'none';
        
        if (showSection) {
            this.loadRemainingTasks();
        }
    }
    
    loadRemainingTasks() {
        if (!this.activeSession) return;
        
        const pack = this.packs.find(p => p.id === this.activeSession.taskPackId);
        if (!pack) return;
        
        // Get all pack tasks
        const allPackTasks = pack.subtaskIds.map(id => 
            this.allTasks.find(t => t.id === id)
        ).filter(Boolean);
        
        // Filter to only show tasks with the same due date as the pack date and not done
        const packDate = pack.date; // YYYY-MM-DD format
        const tasks = allPackTasks.filter(task => {
            if (task.done) return false;
            if (!task.due_date) return false;
            const taskDueDate = new Date(task.due_date).toISOString().split('T')[0];
            return taskDueDate === packDate;
        });
        
        this.elements.remainingTasksList.innerHTML = tasks.map(task => `
            <div class="remaining-task-item">
                <input type="checkbox" class="remaining-task-checkbox" value="${task.id}" checked>
                <div class="remaining-task-title">${this.escapeHtml(task.title || `Task ${task.id}`)}</div>
            </div>
        `).join('');
        
        // Add click handlers
        this.elements.remainingTasksList.querySelectorAll('.remaining-task-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.remaining-task-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
            });
        });
    }
    
    async completeSessionWithOptions() {
        if (!this.activeSession) return;
        
        try {
            this.setStatus('Completing session...');
            
            const markPackDone = this.elements.markPackDone.checked;
            const markAllSubtasksDone = this.elements.markAllSubtasksDone.checked;
            
            // Get selected remaining tasks if not marking all
            let tasksToMarkDone = [];
            if (markAllSubtasksDone) {
                const pack = this.packs.find(p => p.id === this.activeSession.taskPackId);
                if (pack) {
                    // Only mark tasks that match the pack date and are not done
                    const packDate = pack.date;
                    tasksToMarkDone = pack.subtaskIds.filter(id => {
                        const task = this.allTasks.find(t => t.id === id);
                        if (!task || task.done) return false;
                        if (!task.due_date) return false;
                        const taskDueDate = new Date(task.due_date).toISOString().split('T')[0];
                        return taskDueDate === packDate;
                    });
                }
            } else {
                tasksToMarkDone = Array.from(this.elements.remainingTasksList.querySelectorAll('.remaining-task-checkbox:checked'))
                    .map(cb => parseInt(cb.value));
            }
            
            // Mark selected tasks as done
            for (const taskId of tasksToMarkDone) {
                try {
                    await this.markTaskAsDone(taskId);
                } catch (error) {
                    console.error(`Failed to mark task ${taskId} as done:`, error);
                }
            }
            
            // Mark pack task as done if requested
            if (markPackDone) {
                try {
                    await this.markTaskAsDone(this.activeSession.vikunjaParentTaskId);
                } catch (error) {
                    console.error('Failed to mark pack task as done:', error);
                }
            }
            
            // Complete the session
            this.activeSession.endedAt = new Date().toISOString();
            this.activeSession.status = 'completed';
            this.activeSession.totalElapsedSeconds = this.timerElapsed;
            this.activeSession.activeElapsedSeconds = this.calculateActiveElapsed();
            
            // Update pack status
            const pack = this.packs.find(p => p.id === this.activeSession.taskPackId);
            if (pack) {
                pack.status = 'completed';
                pack.completedAt = new Date().toISOString();
                pack.updatedAt = new Date().toISOString();
            }
            
            await this.saveDatabase();
            
            this.hideCompletionModal();
            
            // Store completed session for rating modal
            this.completedSession = { ...this.activeSession };
            
            // Show rating modal
            this.showRatingModal();
            
            this.activeSession = null;
            this.timerElapsed = 0;
            this.hideActivePackPanel();
            this.loadPacksForDate();
            
            this.setStatus('Session completed');
        } catch (error) {
            console.error('Failed to complete session:', error);
            this.setStatus('Failed to complete session', 'error');
        }
    }
    
    // Task utility methods
    getTaskLabelColor(task) {
        if (!task.labels || !Array.isArray(task.labels) || task.labels.length === 0) {
            return null;
        }
        
        // Use the first label's color
        const firstLabel = task.labels[0];
        const color = firstLabel.hex_color || firstLabel.color;
        
        if (!color) return null;
        
        return color.startsWith('#') ? color : `#${color}`;
    }
    
    getRelativeLuminance(hexColor) {
        if (!hexColor) return 0;
        
        // Remove # if present
        const hex = hexColor.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Convert to 0-1 range
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        // Apply gamma correction
        const rLinear = rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
        const gLinear = gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
        const bLinear = bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);
        
        // Calculate relative luminance
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    }
    
    getTextColorForBackground(backgroundColor) {
        const luminance = this.getRelativeLuminance(backgroundColor);
        return luminance > 0.55 ? '#000000' : '#ffffff';
    }
    
    getEarliestTask(tasks) {
        if (!tasks || tasks.length === 0) return null;
        
        // Filter tasks that have due dates
        const tasksWithDueDates = tasks.filter(task => task.due_date);
        
        if (tasksWithDueDates.length === 0) return null;
        
        // Find the task with the earliest due date
        return tasksWithDueDates.reduce((earliest, current) => {
            const earliestDate = new Date(earliest.due_date);
            const currentDate = new Date(current.due_date);
            return currentDate < earliestDate ? current : earliest;
        });
    }
    
    getPackEarliestTask(pack) {
        const tasks = pack.subtaskIds.map(id => 
            this.allTasks.find(t => t.id === id)
        ).filter(Boolean);
        
        return this.getEarliestTask(tasks);
    }
    
    getPackLabel(pack) {
        // Get the earliest task to inherit its label
        const earliestTask = this.getPackEarliestTask(pack);
        if (!earliestTask || !earliestTask.labels || !Array.isArray(earliestTask.labels) || earliestTask.labels.length === 0) {
            return null;
        }
        
        return earliestTask.labels[0]; // Use first label
    }
    
    renderPackLabel(label) {
        const color = label.hex_color || label.color;
        if (!color) return '';
        
        const backgroundColor = color.startsWith('#') ? color : `#${color}`;
        const textColor = this.getTextColorForBackground(backgroundColor);
        
        return `<span class="pack-label" style="background-color: ${backgroundColor}; color: ${textColor};">${this.escapeHtml(label.title || 'Label')}</span>`;
    }
    
    getAssignedTaskIdsForDate(date) {
        const assignedTaskIds = new Set();
        
        // Get all packs for the specified date
        const packsForDate = this.packs.filter(pack => pack.date === date);
        
        // Collect all subtask IDs from those packs
        packsForDate.forEach(pack => {
            if (pack.subtaskIds && Array.isArray(pack.subtaskIds)) {
                pack.subtaskIds.forEach(taskId => assignedTaskIds.add(taskId));
            }
        });
        
        return assignedTaskIds;
    }
    
    isTaskPackParentTask(task) {
        // A task pack parent task is:
        // 1. In the task pack project
        // 2. Has no parent task (no parent relations)
        if (task.project_id !== this.config.taskPacksProjectId) {
            return false;
        }
        
        // Check if task has any parent relations
        // In Vikunja, this would be in the related_tasks field or similar
        if (task.related_tasks && Array.isArray(task.related_tasks)) {
            const hasParent = task.related_tasks.some(relation => 
                relation.relation_kind === 'parenttask' || relation.relation_kind === 'parent'
            );
            return !hasParent;
        }
        
        // If no related_tasks field, assume it's a potential parent task
        // (this is a conservative approach - we exclude it to be safe)
        return true;
    }
    
    // Reminder Management
    showReminderModal(reminderId = null) {
        const isEdit = !!reminderId;
        const reminder = isEdit ? this.reminders.find(r => r.id === reminderId) : null;
        
        document.getElementById('reminder-modal-title').textContent = isEdit ? 'Edit Reminder' : 'Add Reminder';
        
        if (reminder) {
            this.elements.reminderText.value = reminder.text;
            this.elements.reminderType.value = reminder.type;
            this.updateReminderTypeOptions();
            
            // Populate type-specific fields
            if (reminder.type === 'delay') {
                this.elements.delayMinutes.value = reminder.delayMinutes || 15;
            } else if (reminder.type === 'time') {
                if (reminder.targetTime) {
                    this.elements.reminderTime.value = reminder.targetTime;
                }
                if (reminder.targetDate) {
                    this.elements.reminderDate.value = reminder.targetDate;
                }
            } else if (reminder.type === 'task_completion' && reminder.targetTaskId) {
                const task = this.allTasks.find(t => t.id === reminder.targetTaskId);
                if (task) {
                    this.selectedTaskForReminder = task;
                    this.updateSelectedTaskDisplay('task-search');
                }
            } else if (reminder.type === 'task_completion_delay' && reminder.targetTaskId) {
                const task = this.allTasks.find(t => t.id === reminder.targetTaskId);
                if (task) {
                    this.selectedTaskForReminderDelay = task;
                    this.updateSelectedTaskDisplay('task-search-delay');
                }
                this.elements.completionDelayMinutes.value = reminder.delayMinutes || 5;
            }
        } else {
            this.elements.reminderForm.reset();
            this.selectedTaskForReminder = null;
            this.selectedTaskForReminderDelay = null;
            this.updateReminderTypeOptions();
        }
        
        this.elements.reminderForm.dataset.reminderId = reminderId || '';
        this.elements.reminderModal.classList.add('show');
    }
    
    hideReminderModal() {
        this.elements.reminderModal.classList.remove('show');
        this.elements.reminderForm.reset();
        this.selectedTaskForReminder = null;
        this.selectedTaskForReminderDelay = null;
        this.updateSelectedTaskDisplay('task-search');
        this.updateSelectedTaskDisplay('task-search-delay');
        delete this.elements.reminderForm.dataset.reminderId;
    }
    
    updateReminderTypeOptions() {
        const type = this.elements.reminderType.value;
        
        // Hide all options first
        document.querySelectorAll('.type-option').forEach(option => {
            option.style.display = 'none';
        });
        
        // Show relevant option
        if (type === 'delay') {
            document.getElementById('delay-options').style.display = 'block';
        } else if (type === 'time') {
            document.getElementById('time-options').style.display = 'block';
            // Set default date to today if empty
            if (!this.elements.reminderDate.value) {
                this.elements.reminderDate.value = new Date().toISOString().split('T')[0];
            }
        } else if (type === 'task_completion') {
            document.getElementById('task-options').style.display = 'block';
        } else if (type === 'task_completion_delay') {
            document.getElementById('task-delay-options').style.display = 'block';
        }
    }
    
    searchTasksForReminder(searchInputId) {
        const searchText = document.getElementById(searchInputId).value.toLowerCase();
        const resultsId = searchInputId === 'task-search' ? 'task-search-results' : 'task-search-results-delay';
        const resultsContainer = document.getElementById(resultsId);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Filter tasks for today and not done
        let matchingTasks = this.allTasks.filter(task => {
            if (task.done) return false;
            
            // Check if task is due today
            if (task.due_date) {
                const taskDueDate = new Date(task.due_date).toISOString().split('T')[0];
                if (taskDueDate !== today) return false;
            } else {
                return false;
            }
            
            // If there's search text, filter by it; otherwise show all today's tasks
            if (searchText.length > 0) {
                return (task.title || '').toLowerCase().includes(searchText);
            }
            
            return true;
        });
        
        // Sort tasks: task pack parent tasks first, then by title
        matchingTasks.sort((a, b) => {
            const aIsTaskPack = this.isTaskPackParentTask(a);
            const bIsTaskPack = this.isTaskPackParentTask(b);
            
            // Task pack parent tasks come first
            if (aIsTaskPack && !bIsTaskPack) return -1;
            if (!aIsTaskPack && bIsTaskPack) return 1;
            
            // Then sort by title
            return (a.title || '').localeCompare(b.title || '');
        });
        
        // Limit to 10 results
        matchingTasks = matchingTasks.slice(0, 10);
        
        if (matchingTasks.length === 0) {
            resultsContainer.innerHTML = '<div class="task-search-result">No matching tasks found for today</div>';
            resultsContainer.classList.add('show');
            return;
        }
        
        resultsContainer.innerHTML = matchingTasks.map(task => {
            const labelColor = this.getTaskLabelColor(task);
            const textColor = labelColor ? this.getTextColorForBackground(labelColor) : 'var(--text-primary)';
            const backgroundColor = labelColor || 'var(--card-bg)';
            const isTaskPack = this.isTaskPackParentTask(task);
            
            return `
                <div class="task-search-result" data-task-id="${task.id}" data-search-type="${searchInputId}" 
                     style="background-color: ${backgroundColor}; color: ${textColor};">
                    <div class="task-search-result-title">
                        ${isTaskPack ? '📦 ' : ''}${this.escapeHtml(task.title || `Task ${task.id}`)}
                    </div>
                    <div class="task-search-result-meta" style="color: ${textColor}; opacity: 0.8;">
                        Project: ${task.project_id || 'None'}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        resultsContainer.querySelectorAll('.task-search-result').forEach(result => {
            result.addEventListener('click', () => {
                const taskId = parseInt(result.dataset.taskId);
                const searchType = result.dataset.searchType;
                const task = this.allTasks.find(t => t.id === taskId);
                
                if (task) {
                    if (searchType === 'task-search') {
                        this.selectedTaskForReminder = task;
                    } else {
                        this.selectedTaskForReminderDelay = task;
                    }
                    this.updateSelectedTaskDisplay(searchType);
                    resultsContainer.classList.remove('show');
                    document.getElementById(searchType).value = '';
                }
            });
        });
        
        resultsContainer.classList.add('show');
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.task-search-container')) {
                resultsContainer.classList.remove('show');
            }
        });
    }
    
    updateSelectedTaskDisplay(searchType) {
        const selectedTaskEl = searchType === 'task-search' ? 
            this.elements.selectedTask : this.elements.selectedTaskDelay;
        const task = searchType === 'task-search' ? 
            this.selectedTaskForReminder : this.selectedTaskForReminderDelay;
        
        if (task) {
            selectedTaskEl.querySelector('.selected-task-title').textContent = task.title || `Task ${task.id}`;
            selectedTaskEl.style.display = 'flex';
        } else {
            selectedTaskEl.style.display = 'none';
        }
    }
    
    clearSelectedTask() {
        this.selectedTaskForReminder = null;
        this.updateSelectedTaskDisplay('task-search');
    }
    
    clearSelectedTaskDelay() {
        this.selectedTaskForReminderDelay = null;
        this.updateSelectedTaskDisplay('task-search-delay');
    }
    
    async saveReminder() {
        try {
            const reminderId = this.elements.reminderForm.dataset.reminderId;
            const isEdit = !!reminderId;
            
            const text = this.elements.reminderText.value.trim();
            const type = this.elements.reminderType.value;
            
            if (!text) {
                this.setStatus('Please enter reminder text', 'error');
                return;
            }
            
            if (!type) {
                this.setStatus('Please select a reminder type', 'error');
                return;
            }
            
            const reminderData = {
                id: isEdit ? reminderId : this.generateId(),
                text,
                type,
                status: 'active',
                createdAt: isEdit ? this.reminders.find(r => r.id === reminderId).createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Add type-specific data
            if (type === 'delay') {
                const delayMinutes = parseInt(this.elements.delayMinutes.value) || 15;
                reminderData.delayMinutes = delayMinutes;
                reminderData.triggerAt = new Date(Date.now() + delayMinutes * 60000).toISOString();
            } else if (type === 'time') {
                const time = this.elements.reminderTime.value;
                const date = this.elements.reminderDate.value || new Date().toISOString().split('T')[0];
                
                if (!time) {
                    this.setStatus('Please select a time', 'error');
                    return;
                }
                
                reminderData.targetTime = time;
                reminderData.targetDate = date;
                reminderData.triggerAt = new Date(`${date}T${time}`).toISOString();
            } else if (type === 'task_completion') {
                if (!this.selectedTaskForReminder) {
                    this.setStatus('Please select a task', 'error');
                    return;
                }
                reminderData.targetTaskId = this.selectedTaskForReminder.id;
                reminderData.targetTaskTitle = this.selectedTaskForReminder.title;
            } else if (type === 'task_completion_delay') {
                if (!this.selectedTaskForReminderDelay) {
                    this.setStatus('Please select a task', 'error');
                    return;
                }
                const delayMinutes = parseInt(this.elements.completionDelayMinutes.value) || 5;
                reminderData.targetTaskId = this.selectedTaskForReminderDelay.id;
                reminderData.targetTaskTitle = this.selectedTaskForReminderDelay.title;
                reminderData.delayMinutes = delayMinutes;
            }
            
            if (isEdit) {
                const index = this.db.reminders.findIndex(r => r.id === reminderId);
                if (index !== -1) {
                    this.db.reminders[index] = reminderData;
                }
            } else {
                this.db.reminders.push(reminderData);
            }
            
            await this.saveDatabase();
            
            // Reload reminders from database to ensure consistency
            this.reminders = [...this.db.reminders];
            
            this.renderReminders();
            this.hideReminderModal();
            this.scheduleReminder(reminderData);
            
            this.setStatus(isEdit ? 'Reminder updated' : 'Reminder created');
        } catch (error) {
            console.error('Failed to save reminder:', error);
            this.setStatus('Failed to save reminder', 'error');
        }
    }
    
    renderReminders() {
        const activeReminders = this.reminders.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
        
        if (activeReminders.length === 0) {
            this.elements.remindersList.innerHTML = '<div class="loading">No active reminders</div>';
            return;
        }
        
        this.elements.remindersList.innerHTML = activeReminders.map(reminder => {
            let details = '';
            let statusText = '';
            
            if (reminder.type === 'delay') {
                const triggerTime = new Date(reminder.triggerAt);
                details = `In ${reminder.delayMinutes} minutes`;
                statusText = `Triggers at ${triggerTime.toLocaleTimeString()}`;
            } else if (reminder.type === 'time') {
                details = `At ${reminder.targetTime} on ${reminder.targetDate}`;
                statusText = `Scheduled for ${new Date(reminder.triggerAt).toLocaleString()}`;
            } else if (reminder.type === 'task_completion') {
                details = `After "${reminder.targetTaskTitle}" is completed`;
                statusText = 'Waiting for task completion';
            } else if (reminder.type === 'task_completion_delay') {
                details = `${reminder.delayMinutes} minutes after "${reminder.targetTaskTitle}" is completed`;
                statusText = 'Waiting for task completion';
            }
            
            return `
                <div class="reminder-item ${reminder.status}">
                    <div class="reminder-item-header">
                        <div>
                            <div class="reminder-item-text">${this.escapeHtml(reminder.text)}</div>
                            <div class="reminder-item-type">${reminder.type.replace('_', ' ')}</div>
                        </div>
                    </div>
                    <div class="reminder-item-details">${details}</div>
                    <div class="reminder-item-status">${statusText}</div>
                    <div class="reminder-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.showReminderModal('${reminder.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="taskPacksApp.deleteReminder('${reminder.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async deleteReminder(reminderId) {
        if (!confirm('Are you sure you want to delete this reminder?')) return;
        
        try {
            // Cancel any active timer
            if (this.reminderTimers.has(reminderId)) {
                clearTimeout(this.reminderTimers.get(reminderId));
                this.reminderTimers.delete(reminderId);
            }
            
            // Remove from database only, then sync local array
            this.db.reminders = this.db.reminders.filter(r => r.id !== reminderId);
            
            await this.saveDatabase();
            
            // Reload reminders from database to ensure consistency
            this.reminders = [...this.db.reminders];
            this.renderReminders();
            this.setStatus('Reminder deleted');
        } catch (error) {
            console.error('Failed to delete reminder:', error);
            this.setStatus('Failed to delete reminder', 'error');
        }
    }
    
    scheduleReminder(reminder) {
        if (reminder.type === 'delay' || reminder.type === 'time') {
            const triggerTime = new Date(reminder.triggerAt);
            const now = new Date();
            const delay = triggerTime.getTime() - now.getTime();
            
            if (delay > 0) {
                const timerId = setTimeout(() => {
                    this.triggerReminder(reminder);
                }, delay);
                
                this.reminderTimers.set(reminder.id, timerId);
            }
        }
        // Task-based reminders are checked in the reminder checker
    }
    
    async triggerReminder(reminder) {
        try {
            // Show notification
            await this.showReminderNotification(reminder);
            
            // Mark as completed in database
            const index = this.db.reminders.findIndex(r => r.id === reminder.id);
            if (index !== -1) {
                this.db.reminders[index].status = 'completed';
                this.db.reminders[index].completedAt = new Date().toISOString();
                await this.saveDatabase();
                
                // Reload reminders from database to ensure consistency
                this.reminders = [...this.db.reminders];
            }
            
            // Clean up timer
            this.reminderTimers.delete(reminder.id);
            
            // Refresh display
            this.renderReminders();
        } catch (error) {
            console.error('Failed to trigger reminder:', error);
        }
    }
    
    async showReminderNotification(reminder) {
        const title = 'Reminder';
        const body = reminder.text;
        
        // Try browser notification first
        if (this.notificationPermission === 'granted') {
            try {
                const notification = new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: `reminder-${reminder.id}`,
                    requireInteraction: true
                });
                
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
                
                // Auto-close after 30 seconds
                setTimeout(() => notification.close(), 30000);
                return;
            } catch (error) {
                console.error('Failed to show browser notification:', error);
            }
        }
        
        // Fall back to in-app notification
        this.showInAppReminderNotification(reminder);
    }
    
    showInAppReminderNotification(reminder) {
        const notification = document.createElement('div');
        notification.className = 'break-notification'; // Reuse existing styles
        notification.innerHTML = `
            <div class="break-notification-content">
                <h4>Reminder</h4>
                <p>${this.escapeHtml(reminder.text)}</p>
                <div class="break-notification-actions">
                    <button class="btn btn-primary btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">Got it</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
        
        this.playNotificationSound();
    }
    
    startReminderChecker() {
        // Check for task completion reminders every 30 seconds
        setInterval(() => {
            this.checkTaskCompletionReminders();
        }, 30000);
        
        // Schedule any existing time-based reminders
        this.reminders.forEach(reminder => {
            if (reminder.status === 'active' && (reminder.type === 'delay' || reminder.type === 'time')) {
                this.scheduleReminder(reminder);
            }
        });
    }
    
    async checkTaskCompletionReminders() {
        const taskReminders = this.reminders.filter(r => 
            r.status === 'active' && (r.type === 'task_completion' || r.type === 'task_completion_delay')
        );
        
        for (const reminder of taskReminders) {
            try {
                // Check if the target task is now done
                const response = await fetch(`/api/tasks/${reminder.targetTaskId}`);
                if (response.ok) {
                    const task = await response.json();
                    if (task.done) {
                        if (reminder.type === 'task_completion') {
                            // Trigger immediately
                            this.triggerReminder(reminder);
                        } else if (reminder.type === 'task_completion_delay') {
                            // Schedule delayed trigger
                            const delay = (reminder.delayMinutes || 5) * 60000;
                            reminder.triggerAt = new Date(Date.now() + delay).toISOString();
                            
                            const timerId = setTimeout(() => {
                                this.triggerReminder(reminder);
                            }, delay);
                            
                            this.reminderTimers.set(reminder.id, timerId);
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to check task ${reminder.targetTaskId} for reminder:`, error);
            }
        }
    }
    
    // Review Tab Methods
    loadReviewData() {
        // Populate context filter
        this.elements.reviewFilterContext.innerHTML = '<option value="">All Contexts</option>';
        this.contexts.forEach(context => {
            const option = document.createElement('option');
            option.value = context.id;
            option.textContent = context.name;
            this.elements.reviewFilterContext.appendChild(option);
        });
        
        this.filterAndRenderReview();
    }
    
    filterAndRenderReview() {
        const filterType = this.elements.reviewFilterType.value;
        const filterContext = this.elements.reviewFilterContext.value;
        
        let filteredRatings = [...(this.db.strategyRatings || [])];
        
        // Filter by rating type
        if (filterType !== 'all') {
            filteredRatings = filteredRatings.filter(rating => rating.ratingType === filterType);
        }
        
        // Filter by activity context
        if (filterContext) {
            filteredRatings = filteredRatings.filter(rating => rating.activityContextId === filterContext);
        }
        
        // Sort by creation date (newest first)
        filteredRatings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        this.renderIndividualRatings(filteredRatings);
        
        // Update aggregated view if it's active
        if (this.elements.reviewViewMode.value === 'aggregated') {
            this.renderAggregatedRatings(filteredRatings);
        }
    }
    
    toggleReviewViewMode() {
        const mode = this.elements.reviewViewMode.value;
        
        if (mode === 'individual') {
            this.elements.reviewIndividual.style.display = 'block';
            this.elements.reviewAggregated.style.display = 'none';
        } else {
            this.elements.reviewIndividual.style.display = 'none';
            this.elements.reviewAggregated.style.display = 'block';
            this.filterAndRenderReview(); // Refresh aggregated view
        }
    }
    
    renderIndividualRatings(ratings) {
        if (ratings.length === 0) {
            this.elements.ratingsList.innerHTML = '<div class="loading">No ratings found</div>';
            return;
        }
        
        this.elements.ratingsList.innerHTML = ratings.map(rating => {
            const pack = this.packs.find(p => p.id === rating.taskPackId);
            const context = this.contexts.find(c => c.id === rating.activityContextId);
            const strategy = this.strategies.find(s => s.id === rating.breakStrategyId);
            const label = this.allLabels.find(l => l.id === rating.labelId);
            
            let title = 'Unknown Rating';
            let meta = '';
            let scores = [];
            
            if (rating.ratingType === 'overall_pack_strategy') {
                title = pack ? pack.title : 'Unknown Pack';
                meta = `Overall session rating • ${new Date(rating.createdAt).toLocaleDateString()}`;
                if (rating.helpfulness) scores.push({ label: 'Helpfulness', value: rating.helpfulness });
                if (rating.timingFit) scores.push({ label: 'Timing Fit', value: rating.timingFit });
            } else if (rating.ratingType === 'activity_context_fit') {
                title = context ? context.name : 'Unknown Context';
                meta = `Context rating • ${new Date(rating.createdAt).toLocaleDateString()}`;
                if (rating.contextFit) scores.push({ label: 'Context Fit', value: rating.contextFit });
            } else if (rating.ratingType === 'task_type_fit') {
                title = label ? label.title : 'Unknown Task Type';
                meta = `Task type rating • ${new Date(rating.createdAt).toLocaleDateString()}`;
                if (rating.labelFit) scores.push({ label: 'Task Type Fit', value: rating.labelFit });
            } else if (rating.ratingType === 'break_strategy') {
                title = strategy ? strategy.name : 'Unknown Strategy';
                meta = `Strategy rating • ${new Date(rating.createdAt).toLocaleDateString()}`;
                if (rating.effectiveness) scores.push({ label: 'Effectiveness', value: rating.effectiveness });
                if (rating.ease) scores.push({ label: 'Ease', value: rating.ease });
                if (rating.timing) scores.push({ label: 'Timing', value: rating.timing });
            }
            
            const scoresHtml = scores.map(score => `
                <div class="rating-score">
                    <div class="rating-score-label">${score.label}</div>
                    <div class="rating-score-value">${score.value}/5</div>
                </div>
            `).join('');
            
            return `
                <div class="rating-item">
                    <div class="rating-item-header">
                        <div>
                            <div class="rating-item-title">${this.escapeHtml(title)}</div>
                            <div class="rating-item-meta">${meta}</div>
                        </div>
                        <div class="rating-item-type">${rating.ratingType.replace('_', ' ')}</div>
                    </div>
                    
                    ${scores.length > 0 ? `<div class="rating-item-scores">${scoresHtml}</div>` : ''}
                    
                    ${rating.notes ? `<div class="rating-item-notes">${this.escapeHtml(rating.notes)}</div>` : ''}
                    
                    <div class="rating-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="taskPacksApp.editRating('${rating.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="taskPacksApp.deleteRating('${rating.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderAggregatedRatings(ratings) {
        // Filter to only break strategy ratings
        const strategyRatings = ratings.filter(r => r.ratingType === 'break_strategy');
        
        if (strategyRatings.length === 0) {
            this.elements.aggregatedRatings.innerHTML = '<div class="loading">No break strategy ratings found</div>';
            return;
        }
        
        // Group by strategy ID
        const groupedByStrategy = {};
        strategyRatings.forEach(rating => {
            const strategyId = rating.breakStrategyId;
            if (!groupedByStrategy[strategyId]) {
                groupedByStrategy[strategyId] = [];
            }
            groupedByStrategy[strategyId].push(rating);
        });
        
        // Calculate aggregated stats for each strategy
        const aggregatedData = Object.entries(groupedByStrategy).map(([strategyId, ratings]) => {
            const strategy = this.strategies.find(s => s.id === strategyId);
            
            // Calculate averages
            const effectiveness = ratings.filter(r => r.effectiveness).map(r => r.effectiveness);
            const ease = ratings.filter(r => r.ease).map(r => r.ease);
            const timing = ratings.filter(r => r.timing).map(r => r.timing);
            
            const avgEffectiveness = effectiveness.length > 0 ? 
                (effectiveness.reduce((a, b) => a + b, 0) / effectiveness.length).toFixed(1) : null;
            const avgEase = ease.length > 0 ? 
                (ease.reduce((a, b) => a + b, 0) / ease.length).toFixed(1) : null;
            const avgTiming = timing.length > 0 ? 
                (timing.reduce((a, b) => a + b, 0) / timing.length).toFixed(1) : null;
            
            // Group by context for breakdown
            const contextBreakdown = {};
            ratings.forEach(rating => {
                const contextId = rating.activityContextId;
                if (!contextBreakdown[contextId]) {
                    contextBreakdown[contextId] = [];
                }
                contextBreakdown[contextId].push(rating);
            });
            
            return {
                strategy,
                ratings,
                avgEffectiveness,
                avgEase,
                avgTiming,
                totalRatings: ratings.length,
                contextBreakdown
            };
        });
        
        // Sort by average effectiveness (highest first)
        aggregatedData.sort((a, b) => {
            const aEff = parseFloat(a.avgEffectiveness) || 0;
            const bEff = parseFloat(b.avgEffectiveness) || 0;
            return bEff - aEff;
        });
        
        this.elements.aggregatedRatings.innerHTML = aggregatedData.map(data => {
            const contextBreakdownHtml = Object.entries(data.contextBreakdown).map(([contextId, contextRatings]) => {
                const context = this.contexts.find(c => c.id === contextId) || { name: 'Unknown Context' };
                const contextEffectiveness = contextRatings.filter(r => r.effectiveness).map(r => r.effectiveness);
                const avgContextEff = contextEffectiveness.length > 0 ? 
                    (contextEffectiveness.reduce((a, b) => a + b, 0) / contextEffectiveness.length).toFixed(1) : '—';
                
                return `
                    <div class="context-breakdown-item">
                        <div class="context-breakdown-name">${this.escapeHtml(context.name)}</div>
                        <div class="context-breakdown-stats">
                            <span>Avg: ${avgContextEff}/5</span>
                            <span>${contextRatings.length} ratings</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="aggregated-strategy">
                    <div class="aggregated-strategy-header">
                        <div class="aggregated-strategy-name">${this.escapeHtml(data.strategy?.name || 'Unknown Strategy')}</div>
                        <div class="aggregated-strategy-meta">
                            ${data.strategy?.breakType?.replace('_', ' ') || 'Unknown type'} • 
                            ${data.totalRatings} rating${data.totalRatings !== 1 ? 's' : ''}
                        </div>
                    </div>
                    
                    <div class="aggregated-stats">
                        ${data.avgEffectiveness ? `
                            <div class="aggregated-stat">
                                <div class="aggregated-stat-label">Effectiveness</div>
                                <div class="aggregated-stat-value">${data.avgEffectiveness}/5</div>
                                <div class="aggregated-stat-count">${data.ratings.filter(r => r.effectiveness).length} ratings</div>
                            </div>
                        ` : ''}
                        ${data.avgEase ? `
                            <div class="aggregated-stat">
                                <div class="aggregated-stat-label">Ease of Use</div>
                                <div class="aggregated-stat-value">${data.avgEase}/5</div>
                                <div class="aggregated-stat-count">${data.ratings.filter(r => r.ease).length} ratings</div>
                            </div>
                        ` : ''}
                        ${data.avgTiming ? `
                            <div class="aggregated-stat">
                                <div class="aggregated-stat-label">Timing</div>
                                <div class="aggregated-stat-value">${data.avgTiming}/5</div>
                                <div class="aggregated-stat-count">${data.ratings.filter(r => r.timing).length} ratings</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${Object.keys(data.contextBreakdown).length > 1 ? `
                        <div class="context-breakdown">
                            <div class="context-breakdown-title">By Activity Context:</div>
                            ${contextBreakdownHtml}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    async editRating(ratingId) {
        // For now, just show a message - full edit functionality can be added later
        this.setStatus('Rating edit functionality not yet implemented');
    }
    
    async deleteRating(ratingId) {
        if (!confirm('Are you sure you want to delete this rating?')) return;
        
        try {
            this.db.strategyRatings = this.db.strategyRatings.filter(r => r.id !== ratingId);
            await this.saveDatabase();
            this.filterAndRenderReview();
            this.setStatus('Rating deleted');
        } catch (error) {
            console.error('Failed to delete rating:', error);
            this.setStatus('Failed to delete rating', 'error');
        }
    }
    
    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setStatus(message, type = '') {
        this.elements.statusBar.textContent = message;
        this.elements.statusBar.className = 'status-bar';
        if (type) {
            this.elements.statusBar.classList.add(type);
        }
        
        // Auto-clear status after 5 seconds
        setTimeout(() => {
            if (this.elements.statusBar.textContent === message) {
                this.elements.statusBar.textContent = '';
                this.elements.statusBar.className = 'status-bar';
            }
        }, 5000);
    }
    
    // Placeholder methods for pack management
    async editPack(packId) {
        this.setStatus('Edit pack functionality not yet implemented');
    }
    
    async deletePack(packId) {
        if (!confirm('Are you sure you want to delete this pack?')) return;
        
        try {
            const pack = this.packs.find(p => p.id === packId);
            if (!pack) {
                this.setStatus('Pack not found', 'error');
                return;
            }
            
            // Check if pack has been run (has any sessions)
            const hasBeenRun = this.sessions.some(session => session.taskPackId === packId);
            
            if (!hasBeenRun && pack.vikunjaParentTaskId) {
                // Delete the Vikunja parent task if pack hasn't been run
                this.setStatus('Deleting Vikunja parent task...');
                try {
                    await this.deleteVikunjaTask(pack.vikunjaParentTaskId);
                    this.setStatus('Vikunja parent task deleted');
                } catch (vikunjaError) {
                    console.error('Failed to delete Vikunja parent task:', vikunjaError);
                    this.setStatus('Warning: Failed to delete Vikunja parent task, but continuing with local deletion', 'warning');
                }
            }
            
            // Remove from local database
            this.db.taskPacks = this.db.taskPacks.filter(p => p.id !== packId);
            await this.saveDatabase();
            this.packs = this.db.taskPacks;
            this.loadPacksForDate();
            this.setStatus('Pack deleted');
        } catch (error) {
            console.error('Failed to delete pack:', error);
            this.setStatus('Failed to delete pack', 'error');
        }
    }
    
    async resumePack(packId) {
        // Find the most recent session for this pack
        const sessions = this.sessions.filter(s => s.taskPackId === packId && s.status === 'paused');
        if (sessions.length > 0) {
            const session = sessions[sessions.length - 1];
            this.activeSession = session;
            this.resumeSession();
        }
    }
}

// Initialize the app
let taskPacksApp;
document.addEventListener('DOMContentLoaded', () => {
    taskPacksApp = new TaskPacksApp();
});
