const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
//require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup lowdb
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { dayColors: {} }); // Provide default data structure

// Initialize the database
(async () => {
  try {
    // Read the database or create it with default structure
    await db.read();
    console.log('Database initialized successfully');
    
    // Ensure all required structures exist
    db.data = db.data || {};
    db.data.dayColors = db.data.dayColors || {};
    db.data.colorLabels = db.data.colorLabels || {
      red: "Red",
      green: "Green",
      blue: "Blue",
      yellow: "Yellow",
      purple: "Purple"
    };
    
    await db.write();
  } catch (error) {
    console.error('Error reading database:', error);
    // Ensure the default structure is set
    db.data = { 
      dayColors: {},
      colorLabels: {
        red: "Red",
        green: "Green",
        blue: "Blue",
        yellow: "Yellow",
        purple: "Purple"
      }
    };
    try {
      await db.write();
      console.log('Created new database with default structure');
    } catch (writeError) {
      console.error('Failed to write default database structure:', writeError);
    }
  }
})();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API proxy endpoints
app.get('/api/labels', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 250;
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = new URL(`${baseUrl}/api/v1/labels`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 50;
    const filter = req.query.filter || 'done=false';
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = new URL(`${baseUrl}/api/v1/tasks`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    // bulklabels page sending 'NONE'
    if (filter !== 'NONE') url.searchParams.set('filter', filter);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const taskId = req.params.taskId;
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching task ${req.params.taskId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:taskId', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const taskId = req.params.taskId;
    const payload = req.body;
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error updating task ${req.params.taskId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const taskId = req.params.taskId;
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/comments`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching comments for task ${req.params.taskId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add task relation endpoint
app.put('/api/tasks/:taskId/relations', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const taskId = req.params.taskId;
    const payload = req.body;
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/relations`;
    
    console.debug(`Creating task relation for task ${taskId} with payload:`, payload);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Error creating task relation: ${text}`);
      return res.status(response.status).send(text);
    }
    
    const data = await response.json();
    console.debug(`Task relation created successfully:`, data);
    res.json(data);
  } catch (error) {
    console.error(`Error creating relation for task ${req.params.taskId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add an endpoint to get the base URL for the frontend
app.get('/api/config', (req, res) => {
  res.json({
    baseUrl: process.env.API_BASE_URL
  });
});

// Day color endpoints
app.get('/api/daycolors', async (req, res) => {
  try {
    await db.read();
    // Ensure we have a valid dayColors object
    if (!db.data || !db.data.dayColors) {
      console.log('Missing dayColors in database, returning empty object');
      return res.json({});
    }
    res.json(db.data.dayColors);
  } catch (error) {
    console.error('Error fetching day colors:', error);
    // Return empty object instead of error to allow app to continue working
    res.json({});
  }
});

// Color labels endpoints
app.get('/api/colorlabels', async (req, res) => {
  try {
    await db.read();
    // Ensure we have a valid colorLabels object
    if (!db.data || !db.data.colorLabels) {
      console.log('Missing colorLabels in database, returning default labels');
      return res.json({
        red: "Red",
        green: "Green",
        blue: "Blue",
        yellow: "Yellow",
        purple: "Purple"
      });
    }
    res.json(db.data.colorLabels);
  } catch (error) {
    console.error('Error fetching color labels:', error);
    // Return default labels instead of error to allow app to continue working
    res.json({
      red: "Red",
      green: "Green",
      blue: "Blue",
      yellow: "Yellow",
      purple: "Purple"
    });
  }
});

app.post('/api/daycolors', async (req, res) => {
  try {
    const { date, color } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    await db.read();
    
    // Ensure db.data and dayColors exist
    if (!db.data) db.data = {};
    if (!db.data.dayColors) db.data.dayColors = {};
    
    // If color is null, remove the entry (clear color)
    if (color === null) {
      delete db.data.dayColors[date];
    } else {
      // Validate color before saving
      const validColors = ['red', 'green', 'blue', 'yellow', 'purple'];
      if (validColors.includes(color)) {
        db.data.dayColors[date] = color;
      } else {
        return res.status(400).json({ error: 'Invalid color value' });
      }
    }
    
    await db.write();
    res.json({ success: true, date, color });
  } catch (error) {
    console.error('Error saving day color:', error);
    // Return a more graceful error that won't break the UI
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to save color, but you can continue using the app'
    });
  }
});

app.post('/api/colorlabels', async (req, res) => {
  try {
    const { colorKey, label } = req.body;
    
    if (!colorKey) {
      return res.status(400).json({ error: 'Color key is required' });
    }
    
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ error: 'Label must be a non-empty string' });
    }
    
    await db.read();
    
    // Ensure db.data and colorLabels exist
    if (!db.data) db.data = {};
    if (!db.data.colorLabels) db.data.colorLabels = {
      red: "Red",
      green: "Green",
      blue: "Blue",
      yellow: "Yellow",
      purple: "Purple"
    };
    
    // Validate color key before saving
    const validColors = ['red', 'green', 'blue', 'yellow', 'purple'];
    if (validColors.includes(colorKey)) {
      db.data.colorLabels[colorKey] = label;
    } else {
      return res.status(400).json({ error: 'Invalid color key' });
    }
    
    await db.write();
    res.json({ success: true, colorKey, label });
  } catch (error) {
    console.error('Error saving color label:', error);
    // Return a more graceful error that won't break the UI
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to save color label, but you can continue using the app'
    });
  }
});

// Serve the index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
