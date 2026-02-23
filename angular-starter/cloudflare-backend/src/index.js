/**
 * Cloudflare Worker API - KV Storage Backend
 * 
 * This worker provides a REST API for the Angular frontend and stores ALL data
 * in Cloudflare KV (Key-Value) storage namespaces. No MongoDB is used.
 * 
 * KV Namespaces:
 * - AUTH_KV: User authentication, passwords (bcrypt), auth settings, face data, portfolio settings
 * - QUESTIONS_KV: Interview questions and answers
 * - PROGRESS_KV: User progress, bookmarks, study time
 * - CHAT_KV: AI conversations and Q&A history
 * 
 * All data is globally distributed and persisted by Cloudflare's KV infrastructure.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';

const app = new Hono();

// CORS configuration
app.use('/*', cors({
  origin: [
    'https://myportfolioadmin-d45bd.web.app',
    'https://jayantbhardwaj.com',
    /^http:\/\/localhost:\d+$/
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Helper functions for KV storage - ALL data uses KV namespaces
async function getFromKV(env, key, namespace = 'AUTH') {
  const kv = namespace === 'AUTH' ? env.AUTH_KV : 
             namespace === 'QUESTIONS' ? env.QUESTIONS_KV :
             namespace === 'PROGRESS' ? env.PROGRESS_KV : env.CHAT_KV;
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
}

async function setInKV(env, key, value, namespace = 'AUTH') {
  const kv = namespace === 'AUTH' ? env.AUTH_KV : 
             namespace === 'QUESTIONS' ? env.QUESTIONS_KV :
             namespace === 'PROGRESS' ? env.PROGRESS_KV : env.CHAT_KV;
  await kv.put(key, JSON.stringify(value));
}

// Health check - Verify KV storage is accessible
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Cloudflare Worker with KV storage is running',
    storage: 'Cloudflare KV (4 namespaces: AUTH_KV, QUESTIONS_KV, PROGRESS_KV, CHAT_KV)'
  });
});

// Auth - Check if user exists
app.get('/api/auth/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await getFromKV(c.env, `user:${userId}`, 'AUTH');
    
    if (user) {
      return c.json({ exists: true, userId: user.userId });
    } else {
      return c.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    return c.json({ error: 'Failed to check auth', message: error.message }, 500);
  }
});

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    // Accept both username and userId for backwards compatibility
    const userId = body.userId || body.username;
    const password = body.password;
    
    if (!userId || !password) {
      return c.json({ success: false, message: 'Username and password required' }, 400);
    }
    
    const user = await getFromKV(c.env, `user:${userId}`, 'AUTH');
    
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 401);
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return c.json({ success: false, message: 'Invalid password' }, 401);
    }
    
    return c.json({ success: true, userId: user.userId, username: user.userId });
  } catch (error) {
    console.error('Error during login:', error);
    return c.json({ error: 'Failed to login', message: error.message }, 500);
  }
});

// Initialize default user
app.post('/api/auth/initialize', async (c) => {
  try {
    const { userId, password } = await c.req.json();
    const existingUser = await getFromKV(c.env, `user:${userId}`, 'AUTH');
    
    if (existingUser) {
      return c.json({ success: false, message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await setInKV(c.env, `user:${userId}`, { userId, password: hashedPassword }, 'AUTH');
    
    return c.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('Error initializing user:', error);
    return c.json({ error: 'Failed to initialize user', message: error.message }, 500);
  }
});

// Get all questions from KV
app.get('/api/questions', async (c) => {
  try {
    const list = await c.env.QUESTIONS_KV.list({ prefix: 'question:' });
    const questions = [];
    
    for (const key of list.keys) {
      const data = await c.env.QUESTIONS_KV.get(key.name);
      if (data) questions.push(JSON.parse(data));
    }
    
    // Return in MongoDB format for compatibility
    return c.json({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalQuestions: questions.length,
      questions: questions.sort((a, b) => a.id - b.id)
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return c.json({ error: 'Failed to fetch questions', message: error.message }, 500);
  }
});

// Add question to KV
app.post('/api/questions', async (c) => {
  try {
    const questionData = await c.req.json();
    
    // Get highest ID to auto-increment
    const list = await c.env.QUESTIONS_KV.list({ prefix: 'question:' });
    let maxId = 0;
    for (const key of list.keys) {
      const id = parseInt(key.name.split(':')[1]);
      if (id > maxId) maxId = id;
    }
    
    const newQuestion = {
      ...questionData,
      id: questionData.id || maxId + 1,
      dateAdded: new Date().toISOString()
    };
    
    await setInKV(c.env, `question:${newQuestion.id}`, newQuestion, 'QUESTIONS');
    return c.json(newQuestion);
  } catch (error) {
    console.error('Error adding question:', error);
    return c.json({ error: 'Failed to add question', message: error.message }, 500);
  }
});

// Update question in KV
app.put('/api/questions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = await getFromKV(c.env, `question:${id}`, 'QUESTIONS');
    
    if (existing) {
      const updated = { ...existing, ...updates };
      await setInKV(c.env, `question:${id}`, updated, 'QUESTIONS');
      return c.json(updated);
    } else {
      return c.json({ error: 'Question not found' }, 404);
    }
  } catch (error) {
    console.error('Error updating question:', error);
    return c.json({ error: 'Failed to update question', message: error.message }, 500);
  }
});

// Delete question from KV
app.delete('/api/questions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.QUESTIONS_KV.delete(`question:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return c.json({ error: 'Failed to delete question', message: error.message }, 500);
  }
});

// Get user progress from KV
app.get('/api/progress/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const list = await c.env.PROGRESS_KV.list({ prefix: `progress:${userId}:` });
    const progress = [];
    
    for (const key of list.keys) {
      const data = await c.env.PROGRESS_KV.get(key.name);
      if (data) progress.push(JSON.parse(data));
    }
    
    return c.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return c.json([]);
  }
});

// Save user progress to KV
app.post('/api/progress', async (c) => {
  try {
    const progressData = await c.req.json();
    const key = `progress:${progressData.userId}:${progressData.questionId || Date.now()}`;
    await setInKV(c.env, key, progressData, 'PROGRESS');
    return c.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    return c.json({ error: 'Failed to save progress', message: error.message }, 500);
  }
});

// Get user progress (alternative endpoint for compatibility)
app.get('/api/user-progress/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const data = await getFromKV(c.env, `user-progress:${userId}`, 'PROGRESS');
    
    if (data) {
      return c.json(data);
    } else {
      // Return default structure
      return c.json({
        userId,
        bookmarks: [],
        progress: {},
        totalTime: 0,
        lastVisit: new Date().toISOString(),
        visitDates: []
      });
    }
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return c.json({ error: 'Failed to fetch progress', message: error.message }, 500);
  }
});

// Update user progress (alternative endpoint)
app.put('/api/user-progress/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const updates = await c.req.json();
    const existing = await getFromKV(c.env, `user-progress:${userId}`, 'PROGRESS') || {};
    
    const updated = {
      ...existing,
      ...updates,
      userId,
      lastVisit: new Date().toISOString()
    };
    
    await setInKV(c.env, `user-progress:${userId}`, updated, 'PROGRESS');
    return c.json(updated);
  } catch (error) {
    console.error('Error updating user progress:', error);
    return c.json({ error: 'Failed to update progress', message: error.message }, 500);
  }
});

// AI Chat - store in KV
app.post('/api/ai/chat', async (c) => {
  try {
    const chatData = await c.req.json();
    const chatEntry = {
      ...chatData,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    await setInKV(c.env, `chat:${chatEntry.id}`, chatEntry, 'CHAT');
    
    return c.json({
      success: true,
      response: 'AI response placeholder - integrate with your AI service'
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return c.json({ error: 'Failed to process AI chat', message: error.message }, 500);
  }
});

// Get AI chat history from KV
app.get('/api/ai/chat/history', async (c) => {
  try {
    const list = await c.env.CHAT_KV.list({ prefix: 'chat:' });
    const history = [];
    
    for (const key of list.keys) {
      const data = await c.env.CHAT_KV.get(key.name);
      if (data) history.push(JSON.parse(data));
    }
    
    return c.json(history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return c.json([]);
  }
});

// Get AI Q&A for user
app.get('/api/ai-qa/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const list = await c.env.CHAT_KV.list({ prefix: `aiqa:${userId}:` });
    const qaList = [];
    
    for (const key of list.keys) {
      const data = await c.env.CHAT_KV.get(key.name);
      if (data) qaList.push(JSON.parse(data));
    }
    
    return c.json(qaList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (error) {
    console.error('Error fetching AI Q&A:', error);
    return c.json([]);
  }
});

// Add AI Q&A
app.post('/api/ai-qa', async (c) => {
  try {
    const qaData = await c.req.json();
    const id = Date.now();
    const qa = {
      ...qaData,
      _id: id.toString(),
      timestamp: new Date().toISOString()
    };
    
    await setInKV(c.env, `aiqa:${qa.userId}:${id}`, qa, 'CHAT');
    return c.json(qa);
  } catch (error) {
    console.error('Error adding AI Q&A:', error);
    return c.json({ error: 'Failed to add AI Q&A', message: error.message }, 500);
  }
});

// Delete AI Q&A
app.delete('/api/ai-qa/:id', async (c) => {
  try {
    const id = c.req.param('id');
    // Need to find the key by searching
    const list = await c.env.CHAT_KV.list({ prefix: 'aiqa:' });
    
    for (const key of list.keys) {
      const data = await c.env.CHAT_KV.get(key.name);
      if (data) {
        const qa = JSON.parse(data);
        if (qa._id === id) {
          await c.env.CHAT_KV.delete(key.name);
          return c.json({ success: true });
        }
      }
    }
    
    return c.json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Error deleting AI Q&A:', error);
    return c.json({ error: 'Failed to delete AI Q&A', message: error.message }, 500);
  }
});

// Update AI Q&A
app.put('/api/ai-qa/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const list = await c.env.CHAT_KV.list({ prefix: 'aiqa:' });
    
    for (const key of list.keys) {
      const data = await c.env.CHAT_KV.get(key.name);
      if (data) {
        const qa = JSON.parse(data);
        if (qa._id === id) {
          const updated = { ...qa, ...updates };
          await setInKV(c.env, key.name, updated, 'CHAT');
          return c.json(updated);
        }
      }
    }
    
    return c.json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Error updating AI Q&A:', error);
    return c.json({ error: 'Failed to update AI Q&A', message: error.message }, 500);
  }
});

export default app;
