const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
//require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
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
    const perPage = req.query.per_page || 250;
    const filter = req.query.filter || 'done=false';
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    const url = new URL(`${baseUrl}/api/v1/tasks`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('filter', filter);
    
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

// Update labels for a task (using the regular task update endpoint)
app.post('/api/tasks/:taskId/labels', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE_URL;
    const token = process.env.API_TOKEN;
    const taskId = req.params.taskId;
    const labels = req.body.labels || [];
    
    if (!baseUrl || !token) {
      return res.status(500).json({ error: 'Missing API_BASE_URL or API_TOKEN in environment variables' });
    }
    
    console.log(`Updating labels for task ${taskId}, label count: ${labels.length}`);
    
    // First get the current task
    const taskUrl = `${baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`;
    console.log(`Fetching task from: ${taskUrl}`);
    
    const taskResponse = await fetch(taskUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!taskResponse.ok) {
      const text = await taskResponse.text();
      console.error(`Error fetching task: ${text}`);
      return res.status(taskResponse.status).send(text);
    }
    
    const task = await taskResponse.json();
    console.log(`Current task labels: ${JSON.stringify(task.labels?.map(l => l.id) || [])}`);
    console.log(`New labels: ${JSON.stringify(labels.map(l => l.id))}`);
    
    // Create a copy of the task with only necessary fields
    const taskUpdate = {
      id: task.id,
      title: task.title,
      description: task.description,
      done: task.done,
      due_date: task.due_date,
      labels: labels
    };
    
    console.log(`Sending update to: ${taskUrl}`);
    
    // Send the updated task back to the API
    const updateResponse = await fetch(taskUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(taskUpdate)
    });
    
    console.log(`Update response status: ${updateResponse.status}`);
    
    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      console.error(`Error updating task: ${text}`);
      return res.status(updateResponse.status).send(text);
    }
    
    const data = await updateResponse.json();
    console.log(`Update successful, new label count: ${data.labels?.length || 0}`);
    res.json(data);
  } catch (error) {
    console.error(`Error updating labels for task ${req.params.taskId}:`, error);
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

// Add an endpoint to get the base URL for the frontend
app.get('/api/config', (req, res) => {
  res.json({
    baseUrl: process.env.API_BASE_URL
  });
});

// Serve the index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
