# Simple Vikunja Calendar Task rescheduler

This is a "minimally simple" calendar task scheduler used with Vikunja.
I just wanted to be able to easily drag and drop tasks to dates, including having a space for unscheduled tasks.
It is surpisingly challenging to find a calendar or project management app that has this feature.

# Intended usage

The web page loads all tasks that are not marked done.
You can filter by label - I recommend using special labels intended for usage with this web page, rather than labels that are meaningful to your
projects. Or at least that is how I plan to use it: I use labels that are agnostic to the project but correlate to the kind of work the task
involves, e.g. desk work, reading, errand, house chore.

By design, this application ONLY edits a date field - you can select which date field out of start, end, due that will
be used for the editing and displaying. This is not intended to be a primary place to view and edit your tasks otherwise - fine grained task 
editing should be performed in Vikunja. As a simple QOL feature, you can click a task to view its basic information and be given a link to open
it in Vikunja. However, note that concurrent changes to a task made within Vikunja are not propogated to the application without clicking "Load tasks" again.

I have only implemented this for Vikunja, as I find Vikunja fairly feature complete for my usage, other than this one feature.
It would probably not be terribly difficult to extend this to other apps or CalDAV, but I have no plans to do that.
I did look into CalDAV editors to use with Vikunja's CalDAV beta, but I did not find an CalDAV editor that quite gave the functionality I wanted.

# Caveats / Disclaimers

1. Use at your own risk.
    This code has not been heavily tested. *It could delete information on you Vikunja tasks*. *If your Vikunja instance has malicious content, it could theoretically end up getting executed on this app.*
    If there are such bugs, I'll hopefully find and 
    catch them before they become too much of a hassle for myself.
2. AI usage
    This code was written with significant assistance from AI tools, and I did not make a significant effort to polish it nicely.
    It is a simple enough feature that I find it readable enough to edit, and it is not in scope to make this code elegant and generalizable at this time.
3. Privacy and Security
    The app stores some configuration details in-browser, like label filter selections and date field. You can clear browser data with the Clear browser data button.
    The app will communicate with your Vikunja instance via the protocol you set and that Vikunja allows - if you use HTTP as your API_BASE_URL, your token could be exposed,
    so don't do that on an insecure network. Your token and Vikunja URL is not persisted by the application.
4. Concurrent use with Vikunja
    Updates made in Vikunja will not be loaded into the web app without clicking "Load tasks" again. Use with caution if you are editing tasks in Vikunja at the same time;
    editing a task description in Vikunja, then moving the tasks in the calendar app without reloading tasks will result in those changes getting overwritten.


# Installation Instructions

## Building and running locally

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

## Running Docker image

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
   Set the value of `API_TOKEN` to a token you made in Vikunja. The token must have permissions labels:read and tasks:read,readall,readone,update

2. **Run docker compose**
   ```bash
   docker compose up -d
   ```

# Screenshots
Recurring events will be projected a duration ahead on the calendar (only originating event can be drag and dropped)
![Recurring events](https://github.com/user-attachments/assets/1489502c-4175-49de-9479-e539d7fd4dd2)

Configuration pane collapses to show unscheduled tasks area
![Drag and drop unscheduled tasks view](https://github.com/user-attachments/assets/46ad4ca0-1c06-4785-b585-6cbcf6275f24)

Clicking a task opens a menu with some more details and a link to open the task in Vikunja
![TaskView](https://github.com/user-attachments/assets/755627b6-c2d9-4c54-8fef-067bd4f68375)

Bulk subtask assignment tool, accessible in hamburger menu
![Bulk Subtask Assignment tool](https://github.com/user-attachments/assets/b85dff69-09f1-430a-95e4-4496ab544ae0)



