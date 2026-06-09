# Simple Vikunja Calendar Task rescheduler

This is a "minimally simple" calendar task scheduler used with Vikunja.
I just wanted to be able to easily drag and drop tasks to dates, including having a space for unscheduled tasks.
It is surpisingly challenging to find a calendar or project management app that has this feature.

I have been using this for several months now and find it works very well for my needs. However, it should be
noted that the application is fairly high-latency by web production standards. The main reasons for this are
due to frequent re-querying and re-parsing of Vikunja tasks to ensure up-to-date state, and that bulk task updates
are performed sequentially due to Vikunja having some issues with parellel database updates, at least when using a
SQLite database (which I do).

**Data Warning**: This application does not listen for updates to tasks made outside the application. Tasks should be
reloaded whenever updated elsewhere (i.e. within the Vikunja UI) in order to prevent data loss. For example, if you 
added a detailed description to a task from the Vikunja UI, then marked the task done *from within this companion app
without reloading first*, the description will most likely get deleted. You can reload with the "Load Tasks" button
in the configuration menu.

# Feature List

These are the features in the :latest docker image.

* Calendar month/week/day display of Vikunja Tasks with a due date (configuration option for start or end date instead)
* Label filtering
* Task coloring based on Vikunja label color
* Recurring events projection (enable/disable in configuration - adds notable latency)
* Click and drag to move tasks to other dates, unscheduled zone, or to mark done
* Ctrl-click to multi-select tasks for bulk rescheduling or marking done
* In Calendar "day" view, specific times or orders of tasks can be organized
* Click task for more info and links to Vikunja task and project
* Persistent calendar day coloring and labeling (i.e. blue rest day, green work day)
* Bulk "Mark as Subtask" tool

## Unstable features

These are features that are or have been in the :unstable docker image. They are either incomplete, buggy, or under-tested. No guarantees they
will be completed.

* "Task pack" pacing helper, to group tasks into "packs" with particular timed pacing strategies (i.e. stretch break, hydration break)

# Intended usage

This is intended for a single user to manage their tasks from within a secure network connection, with no more than a few hundred active ("Not Done") tasks.

## Secure connection

The app uses your Vikunja API key in the environment variables, and so anyone with access to the served web app will have read and write access to your tasks.
It is not recommended to expose this application to the open internet unless you are already doing that with your Vikunja credentials.
You could run it on a secure local network, on a VPN, or wrap the container in a custom credentialing tool.

## Scale: a few hundred tasks

Tasks are parsed into a calendar object client-side, in-browser, including duplication of event recurrences (this can be disabled in configuration).
All tasks not marked done are loaded. I have found this adequate for my personal needs, where I have fewer than a few hundred tasks not marked done
at any given time. But this would quickly become a bottleneck for much higher numbers of tasks. Event recurrence adds considerable latency, so it
is not recommended for nominal usage if recurring events are very common in your projects - rather, I recommend enabling the recurrence projection
when it helps with planning ahead, but otherwise leaving it disabled or limiting the duration of projecting ahead to one or two weeks (configurable in settings).

# Caveats / Disclaimers

1. Use at your own risk.
   
    This code has not been heavily tested. *It could delete information on you Vikunja tasks*. *If your Vikunja instance has malicious content, it could theoretically end up getting executed on this app.*
    If there are such bugs, I'll hopefully find and 
    catch them before they become too much of a hassle for myself.
2. AI usage
   
    This code was written with significant assistance from AI tools (aider and Claude), and I did not make a significant effort to polish it nicely.
    I am a software developer and am well aware that the quality of the code organization leaves a lot to be desired.
    It is a simple enough feature that I find it readable enough to edit, and it is not in scope to make this code elegant and generalizable at this time.
   
3. Privacy and Security
   
    The app stores some configuration details in-browser, like label filter selections and date field. You can clear browser data with the Clear browser data button.
    The app will communicate with your Vikunja instance via the protocol you set and that Vikunja allows - if you use HTTP as your API_BASE_URL, your token could be exposed,
    so don't do that on an insecure network. Your token and Vikunja URL is not persisted by the application. Calendar day labels (i.e. 6/1 is "red") are persisted server-side
    in a lowdb json file.
   
5. Concurrent use with Vikunja
   
    Updates made in Vikunja will not be loaded into the web app without clicking "Load tasks" again. Use with caution if you are editing tasks in Vikunja at the same time;
    editing a task description in Vikunja, then moving the tasks in the calendar app without reloading tasks will result in those changes getting overwritten.

# FAQ

1. Why not support CalDav?
    * At the time of writing this app, Vikunja CalDav was in beta, and it seemed likely easier to use the Vikunja API directly.
      I do not have plans at this time to make this generally support CalDav.
2. Why only support Vikunja?
    * I was using Vikunja and really liked it, and still do. Making something that worked with it, and quickly, was my priority.
      I do not have plans at this time to extend the application to other task or calendar apps.

# Roadmap

I don't really have specific plans. I will fix bugs or add minor QOL improvements as they become apparent to me. Occassionally
I will build a new feature into a dev branch, publishing under :unstable, and I merge to main and publish to :latest after
testing it for a few weeks. This is how I pushed bulk task moving and calendar day labeling. Since this tool is a bit of a 
daily driver for me, I may choose to incorporate other general daily driver tools into it as time goes on.

# Contribution

If you would like to contribute, make a reasonable pull request. I will prioritize those that are clear to read and implement features
I am likely to use myself. Or fork it and use as you like.

# Development Instructions

## Building and running locally

First clone the repo, then run with docker or npm.

### Docker

1. **Build the Docker image:**
   ```bash
   docker build -t myapp .
   ```

2. **Run the Docker container:**
   ```bash
   docker run -e API_BASE_URL=your-api-base-url -e API_TOKEN=your-api-token -p 3000:3000 myapp
   ```

### Node

1. **Install**
   ```bash
   npm install
   ```

2. **Run**
   ```bash
   npm start
   ```

### Code overview

server.js runs the server side code, which queries Vikunja, handles some processing logic, and serves the web page. Under public/, web pages are
split into html, js, and styles. The majority of the app is just on public/index.html and public/js/script.js.

# Installation: Running Docker image

You can run this right from docker. If your Vikunja instance is ran with docker-compose on a secure network, you can run this
right alongside it.

### Terminal

```bash
docker run -e API_BASE_URL=your-api-base-url -e API_TOKEN=your-api-token -p 3000:3000 ghcr.io/entropicgeo/vikunja-calendar-companion:latest
```

Or copy `.env.example` to `.env` and fill with your credentials and run

```bash
docker run --env-file .env -p 3000:${PORT:-3000} myapp
```

### Docker compose

1. **Set up .env**
   ```bash
   cp .env.example .env
   ```
   
   ```bash
   nano .env
   ```
   Set the value of `API_BASE_URL` to you Vikunja URL or IP, including http(s) and non-standard ports if needed.
   Set the value of `API_TOKEN` to a token you made in Vikunja. "Task Management" permissions are recommended.

2. **Run docker compose**

```
services:
  vikunja-cal:
    image: ghcr.io/entropicgeo/vikunja-calendar-companion:latest
    ports:
      - 8088:3000
    environment:
      - DB_PATH=/data
    volumes:
      - /path/to/data:/data
    env_file:
      - .env
```

Replace `/path/to/data` with a path to a directory where you would like to save the Calendar day labels. This is saved
as a lowdb json file.

# Screenshots
Recurring events will be projected a duration ahead on the calendar (only originating event can be drag and dropped)
![Recurring events](https://github.com/user-attachments/assets/1489502c-4175-49de-9479-e539d7fd4dd2)

Configuration pane collapses to show unscheduled tasks area
![Drag and drop unscheduled tasks view](https://github.com/user-attachments/assets/46ad4ca0-1c06-4785-b585-6cbcf6275f24)

Clicking a task opens a menu with some more details and a link to open the task in Vikunja
![TaskView](https://github.com/user-attachments/assets/755627b6-c2d9-4c54-8fef-067bd4f68375)

Bulk subtask assignment tool, accessible in hamburger menu
![Bulk Subtask Assignment tool](https://github.com/user-attachments/assets/b85dff69-09f1-430a-95e4-4496ab544ae0)



