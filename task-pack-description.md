# Vikunja Calendar Companion: Task Packs + Activity Contexts Specification

## 1. Purpose

Add a new **Task Packs** page to the existing Vikunja calendar companion app. A Task Pack is a reusable or one-off bundle of Vikunja tasks organized around an activity session, physical/body context, planned breaks, and optional parallel activities such as podcast episodes or music playlists.

The feature is intended to bridge productivity planning with body-state management, flare-aware pacing, and later physical-therapy meta-planning. It does **not** prescribe specific PT exercises. Instead, it tracks what kinds of tasks and activity contexts are associated with tension, fatigue, symptom flares, and effective reset strategies.

## 2. Core Idea

A **Task Pack** is represented in Vikunja as a parent task created in a configured Vikunja project named or designated as the **Task Packs project**. Tasks included in the pack are marked as subtasks of that parent task.

The companion app adds local metadata in the existing lowdb database:

* Task Pack timing sessions
* Activity contexts
* Planned and completed breaks
* Strategy ratings
* Open-ended notes
* Optional browser notification settings
* Optional parallel activities such as podcasts, playlists, videos, audiobooks, or ambient sound sets

Vikunja remains the task source of truth. The companion app stores supplemental planning and tracking metadata.

---

## 3. Goals

### 3.1 Functional goals

The new page should allow the user to:

1. Create Task Packs from selected Vikunja tasks.
2. Automatically create a new parent task in the configured Vikunja **Task Packs** project.
3. Assign selected tasks as subtasks of the new Task Pack parent task.
4. Start, stop, pause, and resume timers for Task Packs.
5. Record pack activity sessions to the existing lowdb database.
6. Create and manage activity contexts manually.
7. Create and manage recommended break strategies manually.
8. Use saved contexts and break strategies to pre-populate future Task Pack creation.
9. Rate planned break strategies after or during activity sessions.
10. Add open-ended notes to Task Packs and activity sessions.
11. Optionally send browser notifications for planned breaks.
12. Associate Task Packs with parallel activities such as specific podcast episodes, music playlists, videos, ambient sound, or other non-task media.

### 3.2 Non-goals

The feature should not initially attempt to:

1. Replace Vikunja as the primary task manager.
2. Implement a full PT planning system.
3. Provide medical advice or determine what exercises are safe.
4. Perform automated symptom diagnosis.
5. Require all reset breaks to be stored as Vikunja tasks.
6. Overload Vikunja with every timer event or microbreak as separate tasks.

---

## 4. Definitions

### 4.1 Task Pack

A Task Pack is a parent task in Vikunja plus local metadata describing a bundle of tasks, contexts, planned breaks, timing sessions, ratings, and notes.

Example Task Pack:

> “Morning computer work block”

Subtasks:

* Respond to Wesley
* Update HFI calibration notes
* Check backup logs

Local metadata:

* Activity context: computer work / main desk
* Primary tension risks: scalenes, inner thighs, jaw
* Planned break strategy: 25-minute work blocks with 2-minute scalene and adductor resets
* Parallel activity: instrumental focus playlist
* Session logs and ratings

### 4.2 Activity Context

An Activity Context describes the type of activity associated with a Task Pack or session.

Examples:

* Computer work at main desk
* Computer work on couch laptop
* Standing kitchen work
* Walking
* Driving
* Load bearing / carrying
* Chores
* Reclining / recovery
* Admin work
* High-cognitive deep work

Activity contexts may include expected body-load dimensions, posture risks, reset targets, and recommended breaks.

### 4.3 Recommended Break Strategy

A Recommended Break Strategy is a reusable break plan. It can be selected when creating a Task Pack and can be rated after use.

Examples:

* Scalene / jaw / tongue check every 20 minutes
* Inner-thigh / pelvic-floor unclench every 30 minutes
* Stand and shift weight every 25 minutes
* Post-driving hip/adductor reset
* Post-flare conservative pacing reset

### 4.4 Parallel Activity

A Parallel Activity is media or background activity intentionally paired with a Task Pack.

Examples:

* Podcast episode
* Music playlist
* Ambient sound playlist
* Audiobook chapter
* YouTube video
* Meditation audio
* White noise / binaural / focus track

Parallel activities are not subtasks. They are contextual supports or companions for a Task Pack session.

---

## 5. Configuration

Add a configuration section for Task Packs.

### 5.1 Required configuration

```json
{
  "taskPacks": {
    "enabled": true,
    "projectId": 123,
    "projectName": "Task Packs",
    "defaultPackDurationMinutes": 45,
    "defaultBreakNotificationEnabled": true
  }
}
```

### 5.2 Optional configuration

```json
{
  "taskPacks": {
    "defaultActivityContextId": "computer_main_desk",
    "defaultBreakStrategyIds": [
      "scalene_jaw_tongue_microbreak",
      "inner_thigh_adductor_release"
    ],
    "autoCreateMissingProject": false,
    "subtaskMode": "parent_child",
    "copyLabelsToParent": true,
    "copyDueDateToParent": false,
    "browserNotifications": {
      "enabledByDefault": true,
      "notifyBeforeBreakSeconds": 0,
      "notifyAtBreakStart": true,
      "notifyAtBreakEnd": false
    }
  }
}
```

### 5.3 Configuration behavior

* If `taskPacks.projectId` is configured, use it directly.
* If only `projectName` is configured, the app may search Vikunja projects by name.
* If the project cannot be found and `autoCreateMissingProject` is false, show a clear configuration error.
* If `autoCreateMissingProject` is true, create the project if the authenticated Vikunja user has permission.
* Do not create packs until the Task Packs project is resolved.

---

## 6. Vikunja Integration

## 6.1 Task Pack creation flow

When the user creates a Task Pack:

1. User selects existing Vikunja tasks from the calendar companion interface.
2. User enters Task Pack title and optional description.
3. User selects activity context, recommended break strategies, and optional parallel activities.
4. App creates a new task in the configured Task Packs project.
5. App assigns selected tasks as subtasks of the new parent task.
6. App records local metadata in lowdb.
7. App displays the new Task Pack in the Task Packs page.

### 6.2 Parent task fields

The parent task should include:

* Title
* Description
* Optional due date
* Optional labels
* Optional priority
* Optional relation to included tasks if subtask API behavior requires relation objects

Suggested parent task description:

```md
Created by Vikunja Calendar Companion Task Packs.

Activity Context: Computer work / main desk
Planned Breaks:
- Scalene / jaw / tongue check every 20 minutes
- Inner-thigh / adductor release every 30 minutes

Parallel Activities:
- Playlist: Focus instrumental playlist

Local metadata is stored in the companion app database.
```

### 6.3 Subtask assignment

The app should support Vikunja’s available subtask/parent relationship mechanism.

Implementation should abstract this behind a service method:

```ts
createTaskPackParentWithSubtasks(input: CreateTaskPackInput): Promise<TaskPackCreationResult>
```

The UI should not depend directly on Vikunja’s internal relation format.

### 6.4 Error handling

If parent task creation succeeds but subtask assignment partially fails:

* Preserve the created parent task.
* Record local metadata with a `syncStatus` of `partial`.
* Show the failed tasks in a recoverable state.
* Provide a “retry subtask sync” action.

If parent creation fails:

* Do not create local Task Pack metadata.
* Show the Vikunja error.
* Preserve the user’s draft pack input in local UI state.

---

## 7. LowDB Data Model

The existing lowdb database should be extended with new collections.

Recommended top-level structure:

```json
{
  "taskPacks": [],
  "activitySessions": [],
  "activityContexts": [],
  "breakStrategies": [],
  "breakEvents": [],
  "strategyRatings": [],
  "parallelActivities": [],
  "taskPackTemplates": []
}
```

---

## 8. Data Schemas

## 8.1 Task Pack local record

```ts
interface TaskPackRecord {
  id: string;
  vikunjaParentTaskId: number;
  vikunjaProjectId: number;
  title: string;
  description?: string;

  subtaskIds: number[];
  activityContextIds: string[];
  breakStrategyIds: string[];
  parallelActivityIds: string[];

  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  syncStatus: 'synced' | 'partial' | 'error';
  syncError?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  notes?: string;
  tags?: string[];
}
```

## 8.2 Activity Session

An Activity Session records actual time spent working within a Task Pack.

```ts
interface ActivitySessionRecord {
  id: string;
  taskPackId: string;
  vikunjaParentTaskId: number;

  startedAt: string;
  endedAt?: string;
  pausedIntervals: Array<{
    pausedAt: string;
    resumedAt?: string;
  }>;

  totalElapsedSeconds?: number;
  activeElapsedSeconds?: number;

  activityContextIds: string[];
  breakStrategyIds: string[];
  parallelActivityIds: string[];

  preSessionState?: BodyStateSnapshot;
  postSessionState?: BodyStateSnapshot;
  delayedPostSessionState?: BodyStateSnapshot;

  notes?: string;
  status: 'running' | 'paused' | 'completed' | 'abandoned';
}
```

## 8.3 Body State Snapshot

```ts
interface BodyStateSnapshot {
  capturedAt: string;
  phase: 'before' | 'during' | 'after' | 'delayed_after';

  scalenes?: number;
  innerThighs?: number;
  jawTongue?: number;
  abdomenBreathHolding?: number;
  pelvicFloorGlutes?: number;
  shouldersTraps?: number;
  hipFlexors?: number;
  autonomicLoad?: number;
  cognitiveClarity?: number;
  pain?: number;
  fatigue?: number;

  mode?: 'normal' | 'watchful' | 'flare' | 'post_flare' | 'rebuild';
  primaryTension?: string[];
  notes?: string;
}
```

Ratings should use a consistent scale, preferably `0–5`:

* `0`: none / not present
* `1`: barely noticeable
* `2`: mild
* `3`: moderate
* `4`: significant
* `5`: severe / dominant

## 8.4 Activity Context

```ts
interface ActivityContextRecord {
  id: string;
  name: string;
  description?: string;

  activityType:
    | 'computer_work'
    | 'standing'
    | 'walking'
    | 'driving'
    | 'load_bearing'
    | 'chores'
    | 'reclining'
    | 'admin'
    | 'deep_work'
    | 'social'
    | 'custom';

  stationId?: string;
  stationLabel?: string;

  expectedLoads?: Partial<Record<LoadDimension, number>>;
  commonTensionTargets?: string[];
  recommendedBreakStrategyIds?: string[];

  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Suggested `LoadDimension` values:

```ts
type LoadDimension =
  | 'cognitive_load'
  | 'visual_load'
  | 'neck_load'
  | 'jaw_tension_risk'
  | 'breathing_constraint'
  | 'hip_flexor_load'
  | 'adductor_load'
  | 'pelvic_floor_guarding_risk'
  | 'shoulder_stability_load'
  | 'grip_load'
  | 'standing_load'
  | 'walking_load'
  | 'carrying_load'
  | 'autonomic_load'
  | 'sensory_load'
  | 'social_load'
  | 'recovery_potential';
```

## 8.5 Break Strategy

```ts
interface BreakStrategyRecord {
  id: string;
  name: string;
  description?: string;

  breakType:
    | 'microbreak'
    | 'long_break'
    | 'pre_task_reset'
    | 'post_task_reset'
    | 'flare_downshift'
    | 'custom';

  targetAreas: string[];
  suggestedDurationSeconds: number;
  recurrence?: {
    mode: 'interval' | 'specific_times' | 'manual_only';
    everyMinutes?: number;
    times?: string[];
  };

  prompt: string;
  cautionNote?: string;

  notificationDefaults?: {
    enabled: boolean;
    title?: string;
    body?: string;
    requireInteraction?: boolean;
  };

  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Example break strategies:

```json
{
  "id": "scalene_jaw_tongue_microbreak",
  "name": "Scalene / jaw / tongue microbreak",
  "breakType": "microbreak",
  "targetAreas": ["scalenes", "jaw", "tongue", "upper_ribs", "breath"],
  "suggestedDurationSeconds": 90,
  "recurrence": {
    "mode": "interval",
    "everyMinutes": 20
  },
  "prompt": "Pause. Let the jaw and tongue soften. Notice whether the sides/front of the neck are gripping. Do not force a stretch. Let the breath move gently.",
  "cautionNote": "Avoid aggressive neck stretching. This is a tone check, not a correction drill.",
  "notificationDefaults": {
    "enabled": true,
    "title": "Scalene reset",
    "body": "Check jaw, tongue, throat, upper ribs, and breath."
  },
  "active": true
}
```

```json
{
  "id": "inner_thigh_adductor_release",
  "name": "Inner thigh / adductor release",
  "breakType": "microbreak",
  "targetAreas": ["inner_thighs", "adductors", "pelvic_floor", "hip_flexors", "glutes"],
  "suggestedDurationSeconds": 120,
  "recurrence": {
    "mode": "interval",
    "everyMinutes": 30
  },
  "prompt": "Check whether the inner thighs are gripping. Let knees, hips, belly, and pelvic floor soften without collapsing posture. Shift position slightly. Avoid forcing a stretch.",
  "cautionNote": "Look for unnecessary holding rather than trying to force range of motion.",
  "notificationDefaults": {
    "enabled": true,
    "title": "Inner thigh reset",
    "body": "Check adductors, pelvic floor, hip flexors, and glutes."
  },
  "active": true
}
```

## 8.6 Break Event

A Break Event is an actual scheduled or completed break during an activity session.

```ts
interface BreakEventRecord {
  id: string;
  taskPackId: string;
  activitySessionId: string;
  breakStrategyId: string;

  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;

  status: 'scheduled' | 'notified' | 'started' | 'completed' | 'skipped' | 'missed';

  notificationSentAt?: string;
  userResponse?: 'started' | 'snoozed' | 'dismissed' | 'skipped';
  snoozedUntil?: string;

  notes?: string;
}
```

## 8.7 Strategy Rating

```ts
interface StrategyRatingRecord {
  id: string;
  taskPackId: string;
  activitySessionId?: string;
  breakStrategyId?: string;
  activityContextId?: string;

  ratingType: 'break_strategy' | 'overall_pack_strategy' | 'activity_context_fit';

  helpfulness?: number;
  ease?: number;
  timingFit?: number;
  symptomImpact?: number;
  productivityImpact?: number;
  repeatAgain?: boolean;

  notes?: string;
  createdAt: string;
}
```

Suggested rating scale: `1–5`, with optional “not applicable.”

## 8.8 Parallel Activity

```ts
interface ParallelActivityRecord {
  id: string;
  name: string;
  type:
    | 'podcast_episode'
    | 'music_playlist'
    | 'album'
    | 'audiobook'
    | 'video'
    | 'ambient_sound'
    | 'meditation_audio'
    | 'custom';

  url?: string;
  source?: string;
  description?: string;
  durationSeconds?: number;

  intendedUse?:
    | 'focus_support'
    | 'downshift'
    | 'movement_support'
    | 'chores_support'
    | 'flare_support'
    | 'background_comfort'
    | 'custom';

  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 9. User Interface Specification

## 9.1 Navigation

Add a new route/page:

```text
/task-packs
```

Suggested sub-tabs:

1. **Packs**
2. **Create Pack**
3. **Activity Contexts**
4. **Break Strategies**
5. **Parallel Activities**
6. **History / Reports**

For the first implementation, tabs 1–4 are essential. Parallel Activities and Reports can be minimal.

---

## 10. Task Packs Page

## 10.1 Pack list

Display existing Task Packs with:

* Title
* Status
* Linked Vikunja parent task
* Number of subtasks
* Active timer state
* Activity context badges
* Break strategy badges
* Last session date
* Total logged time
* Quick actions

Quick actions:

* Start
* Pause
* Resume
* Stop
* Complete
* Edit
* Add note
* Rate strategy
* Open in Vikunja

## 10.2 Active pack panel

When a pack is running, show a prominent active session panel:

* Pack title
* Current elapsed time
* Active elapsed time excluding pauses
* Current activity context
* Next planned break
* Time until next break
* Parallel activities
* Break notification status
* Buttons:

  * Pause
  * Stop
  * Start break now
  * Snooze next break
  * Add note
  * Rate current strategy

---

## 11. Create Pack Flow

## 11.1 Inputs

The Create Pack screen should include:

1. Pack title
2. Pack description
3. Task selection UI
4. Activity context selection
5. Break strategy selection
6. Parallel activity selection
7. Optional body-state baseline
8. Notification preferences
9. Create button

## 11.2 Task selection

The user should be able to select tasks from:

* Today’s tasks
* Calendar visible range
* Overdue tasks
* Specific project
* Search results
* Recently used tasks

Selected tasks should show:

* Title
* Project
* Due date
* Labels
* Priority
* Current status

## 11.3 Pre-population logic

When the user selects one or more activity contexts, the app should suggest:

* Recommended break strategies associated with those contexts
* Common tension targets
* Optional default session duration
* Optional relevant parallel activities

Example:

Context: `Computer work / main desk`

Pre-populate:

* Scalene / jaw / tongue microbreak
* Inner thigh / adductor release
* Eyes / visual lock reset
* Standing shift reset

Context: `Driving`

Pre-populate:

* Pre-drive neck and jaw check
* Post-drive inner-thigh / hip flexor reset
* Post-drive standing shift

## 11.4 Creation result

After creation:

* Create Vikunja parent task.
* Assign selected tasks as subtasks.
* Write local Task Pack record.
* Show success state.
* Offer actions:

  * Start timer now
  * Open pack
  * Open in Vikunja
  * Create another pack

---

## 12. Timer Behavior

## 12.1 Timer states

A Task Pack session can be:

* `idle`
* `running`
* `paused`
* `break_running`
* `completed`
* `abandoned`

## 12.2 Start

When starting a pack:

1. Create an `ActivitySessionRecord`.
2. Capture selected activity contexts and break strategies.
3. Optionally ask for pre-session body state.
4. Compute break schedule based on selected strategies.
5. Start timer.

## 12.3 Pause

On pause:

* Add `pausedAt` timestamp to current session.
* Pause active elapsed timer.
* Do not count paused time toward active elapsed seconds.
* Optionally pause break countdowns.

## 12.4 Resume

On resume:

* Fill `resumedAt` on latest pause interval.
* Resume active elapsed timer.
* Recompute upcoming break schedule if necessary.

## 12.5 Stop / complete

When stopping:

1. Set session `endedAt`.
2. Calculate total and active elapsed seconds.
3. Mark pending breaks as missed or cancelled.
4. Prompt for post-session body state.
5. Prompt for strategy rating.
6. Allow notes.
7. Persist all records.

## 12.6 Abandon

If the user abandons a session:

* Preserve elapsed data.
* Mark session as `abandoned`.
* Do not force rating or post-session check-in.
* Allow optional reason note.

---

## 13. Break Scheduling and Notifications

## 13.1 Break generation

When a session starts, create scheduled Break Events from selected Break Strategies.

For interval strategies:

```text
sessionStart + everyMinutes
sessionStart + 2 * everyMinutes
sessionStart + 3 * everyMinutes
...
```

For manual-only strategies, do not create scheduled break events. Show them under “Available breaks.”

## 13.2 Browser notifications

Browser notifications should be optional.

Behavior:

1. Ask permission only after the user enables notifications.
2. Do not request notification permission on page load.
3. If permission is denied, show non-blocking UI notification instead.
4. If permission is granted, show browser notification at scheduled break time.

Notification example:

```text
Title: Scalene reset
Body: Check jaw, tongue, throat, upper ribs, and breath.
```

Click behavior:

* Focus the app window if possible.
* Open the active Task Pack panel.
* Mark break event as `notified` or `started` depending on implementation.

## 13.3 Snooze

User can snooze a break.

Suggested snooze options:

* 2 minutes
* 5 minutes
* 10 minutes
* Skip this break

## 13.4 Break completion

When a break is completed:

* Set `startedAt` and `completedAt` if available.
* Mark `status = completed`.
* Optionally ask “Did this help?” with a quick 1–5 rating.

---

## 14. Activity Context Management Page

The Activity Contexts page should allow manual CRUD operations.

Fields:

* Name
* Description
* Activity type
* Station / location label
* Expected load ratings
* Common tension targets
* Recommended break strategies
* Active/inactive flag

Default contexts should be seeded on first run.

Suggested initial contexts:

1. Computer work / main desk
2. Computer work / couch laptop
3. Computer work / standing desk
4. Driving
5. Walking
6. Standing kitchen work
7. Load bearing / carrying
8. Chores
9. Reclining / recovery
10. High-cognitive deep work

---

## 15. Break Strategy Management Page

The Break Strategies page should allow manual CRUD operations.

Fields:

* Name
* Description
* Break type
* Target areas
* Suggested duration
* Recurrence mode
* Prompt text
* Caution note
* Notification title/body
* Active/inactive flag

Seed initial break strategies:

1. Scalene / jaw / tongue microbreak
2. Inner thigh / adductor release
3. Standing shift reset
4. Eyes / visual lock reset
5. Breathing without neck gripping check
6. Post-driving hip/adductor reset
7. Post-flare conservative downshift
8. Load-bearing shoulder/neck decompression

---

## 16. Parallel Activities Page

Parallel Activities can be implemented as a simple saved library.

Fields:

* Name
* Type
* URL
* Source
* Intended use
* Tags
* Notes

Examples:

* Focus playlist
* Gentle chores playlist
* Specific podcast episode
* Ambient rain track
* Audiobook chapter
* Recovery/downshift audio

When creating a Task Pack, allow selection from saved parallel activities and also allow creating one inline.

---

## 17. Notes and Ratings

## 17.1 Notes

Notes should be attachable to:

* Task Pack
* Activity Session
* Break Event
* Strategy Rating
* Activity Context

Note fields should be open-ended and timestamped where appropriate.

## 17.2 Ratings

At minimum, allow rating the overall pack strategy after a session:

* Helpfulness
* Ease
* Timing fit
* Symptom impact
* Productivity impact
* Would repeat again
* Notes

For break-specific ratings, allow quick rating from the break completion UI.

---

## 18. Reporting / History

Initial reports can be simple.

Useful summaries:

1. Total time by Activity Context
2. Most used Break Strategies
3. Highest-rated Break Strategies
4. Lowest-rated Break Strategies
5. Body-state before/after changes by context
6. Contexts associated with increased scalene tension
7. Contexts associated with increased inner-thigh/adductor tension
8. Packs completed during flare or post-flare modes
9. Parallel activities associated with better ratings

Example report:

```text
Last 14 days:

Computer work / main desk
- 9 sessions
- Average scalene change: +1.2
- Average inner-thigh change: +0.7
- Best-rated break: Scalene / jaw / tongue microbreak

Driving
- 3 sessions
- Average inner-thigh change: +2.0
- Best-rated break: Post-driving hip/adductor reset
```

---

## 19. Sync and Persistence

## 19.1 Source of truth

Vikunja:

* Tasks
* Projects
* Parent/subtask relationships
* Task completion status

lowdb:

* Task Pack metadata
* Activity sessions
* Break events
* Strategy ratings
* Contexts
* Parallel activities
* Notes

## 19.2 Sync repair actions

Add repair actions:

* Retry creating parent task
* Retry assigning subtasks
* Refresh pack from Vikunja
* Re-link local pack to Vikunja parent task
* Mark local pack archived if parent task deleted

## 19.3 Handling deleted Vikunja tasks

If a subtask is missing from Vikunja:

* Keep its historical ID in lowdb.
* Mark it as missing in UI.
* Do not delete historical session records.

---

## 20. Suggested Implementation Services

### 20.1 `taskPackService`

Responsibilities:

* Create pack
* Update pack metadata
* List packs
* Start/stop sessions
* Archive packs
* Repair sync

### 20.2 `vikunjaTaskPackService`

Responsibilities:

* Resolve Task Packs project
* Create parent task
* Assign subtasks
* Fetch linked Vikunja task data
* Open task URL generation

### 20.3 `activityContextService`

Responsibilities:

* CRUD activity contexts
* Seed defaults
* Suggest break strategies by context

### 20.4 `breakStrategyService`

Responsibilities:

* CRUD break strategies
* Seed defaults
* Generate break events for sessions

### 20.5 `timerService`

Responsibilities:

* Track timer state
* Compute elapsed time
* Manage pauses
* Trigger scheduled break events

### 20.6 `notificationService`

Responsibilities:

* Request browser notification permission
* Send break notifications
* Fall back to in-app alerts

### 20.7 `parallelActivityService`

Responsibilities:

* CRUD parallel activities
* Attach/detach from packs
* Suggest by context or previous usage

---

## 21. MVP Scope

The first implementation should include:

1. Config for Task Packs project.
2. Task Pack creation from selected Vikunja tasks.
3. Vikunja parent task creation.
4. Subtask assignment.
5. lowdb Task Pack records.
6. Start/stop timer.
7. Activity Session logging.
8. Manual Activity Context CRUD.
9. Manual Break Strategy CRUD.
10. Selecting contexts and breaks during pack creation.
11. Browser notifications for scheduled breaks.
12. Strategy rating and notes after stopping a session.
13. Basic active session UI.

Defer:

1. Advanced reports.
2. AI recommendations.
3. Complex flare analytics.
4. Automatic pack creation.
5. Complex media integrations.
6. Cross-device timer synchronization.
7. Deep PT-planning ontology.

---

## 22. Future Enhancements

### 22.1 Templates

Allow users to save Task Pack Templates:

* Morning computer work
* Driving errand block
* Flare-safe admin block
* Post-flare re-entry block
* Chores with music

### 22.2 Recommendations

Use historical data to suggest:

* Best breaks for a given activity context
* Safer work block length during flares
* Contexts that correlate with increased scalene tension
* Contexts that correlate with inner-thigh/adductor tension
* Parallel activities that seem helpful

### 22.3 Calendar integration

Display Task Pack sessions on the existing calendar view.

Possible display modes:

* Planned packs
* Completed sessions
* Missed/abandoned sessions
* Breaks as small markers

### 22.4 Vikunja labels

Optionally apply labels to parent Task Pack tasks:

* `task-pack`
* `body-aware`
* `flare-sensitive`
* `computer-work`
* `driving`
* `standing`
* `deep-work`

### 22.5 Flare management templates

Add mode-specific strategy presets:

* Normal
* Watchful
* Flare
* Post-flare
* Rebuild

### 22.6 PT meta-planning

Add high-level PT planning metadata without storing detailed PT exercise prescriptions:

* PT theme
* Body region focus
* Stabilization vs mobility vs recovery
* Questions for physical therapist
* Relevant activity contexts
* Relevant Task Packs

---

## 23. Implementation Notes

### 23.1 Avoid task clutter

Do not create a Vikunja task for every microbreak by default. Store microbreaks in lowdb. Only the pack itself should become a Vikunja parent task.

### 23.2 Keep body prompts non-prescriptive

Break prompts should be phrased as awareness and reset cues, not medical directives.

Prefer:

> “Notice whether the inner thighs are gripping.”

Avoid:

> “Correct your pelvic alignment.”

### 23.3 Preserve historical records

Do not delete session history when contexts, strategies, or parallel activities are edited. Use stable IDs and preserve historical names where needed.

### 23.4 Support quick capture

The feature should allow low-friction logging. The user should be able to start a pack with minimal required input, then add ratings and notes later.

### 23.5 Make ratings optional

Ratings are valuable, but forced ratings can make the system aversive. Allow skipping.

---

## 24. Acceptance Criteria

### 24.1 Task Pack creation

* User can select existing Vikunja tasks.
* User can create a Task Pack.
* App creates a parent task in the configured Task Packs project.
* Selected tasks become subtasks of the parent task.
* Local Task Pack metadata is saved to lowdb.

### 24.2 Timer logging

* User can start a Task Pack timer.
* User can pause and resume timer.
* User can stop timer.
* Session is saved to lowdb with start/end timestamps and elapsed time.

### 24.3 Activity contexts

* User can create, edit, deactivate, and select activity contexts.
* Selected contexts are stored on Task Packs and sessions.
* Contexts can pre-populate recommended break strategies.

### 24.4 Break strategies

* User can create, edit, deactivate, and select break strategies.
* Break strategies can generate scheduled break events.
* Breaks can optionally trigger browser notifications.

### 24.5 Ratings and notes

* User can add open-ended notes to Task Packs and sessions.
* User can rate planned break strategies after a session.
* Ratings are saved to lowdb and associated with the relevant pack/session/strategy.

### 24.6 Parallel activities

* User can create or select parallel activities.
* Parallel activities can be attached to Task Packs.
* Attached parallel activities are visible during active sessions.

---

## 25. Recommended Build Order

1. Add config section and resolve Task Packs project.
2. Add lowdb schema migration/default initialization.
3. Implement Activity Context CRUD.
4. Implement Break Strategy CRUD.
5. Implement Task Pack creation UI.
6. Implement Vikunja parent task creation.
7. Implement subtask assignment.
8. Implement Task Pack list and detail views.
9. Implement start/stop timer and session logging.
10. Implement break schedule generation.
11. Implement browser notifications.
12. Implement ratings and notes.
13. Add Parallel Activities library.
14. Add basic reports/history.
15. Add templates and recommendations.

---

## 26. Example End-to-End Scenario

1. User opens Task Packs page.
2. User clicks “Create Pack.”
3. User selects tasks:

   * Respond to Wesley
   * Review HFI calibration output
   * Update notes
4. User names pack: “Morning desk work block.”
5. User selects context: “Computer work / main desk.”
6. App pre-selects break strategies:

   * Scalene / jaw / tongue microbreak
   * Inner thigh / adductor release
7. User attaches parallel activity:

   * Focus instrumental playlist
8. User enables browser notifications.
9. User creates pack.
10. App creates Vikunja parent task in Task Packs project.
11. App marks selected tasks as subtasks.
12. User starts timer.
13. After 20 minutes, browser notification appears:

* “Scalene reset: check jaw, tongue, throat, upper ribs, and breath.”

14. User completes break.
15. After 30 minutes, notification appears:

* “Inner thigh reset: check adductors, pelvic floor, hip flexors, and glutes.”

16. User stops session after 52 minutes.
17. App prompts for ratings:

* Helpfulness: 4/5
* Timing fit: 3/5
* Symptom impact: 4/5
* Notes: “Scalene reset helped. Inner thigh reset should happen earlier.”

18. App saves session and ratings to lowdb.
19. Future packs using “Computer work / main desk” can suggest the inner-thigh reset earlier.
