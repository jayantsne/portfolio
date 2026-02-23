const functions = require('firebase-functions');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection String - Update this with your connection string
const MONGODB_URI = 'mongodb+srv://bjayantsne_db_user:H3Y4FWCZ3t0ZIzu6@cluster0.9liq2qs.mongodb.net/jayant-portfolio?retryWrites=true&w=majority';

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==================== SCHEMAS ====================

// Questions Schema
const QuestionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true },
  tags: [String],
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  dateAdded: { type: Date, default: Date.now }
});

// User Progress Schema
const UserProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bookmarks: [Number],
  progress: { type: Map, of: Number },
  totalTime: { type: Number, default: 0 },
  lastVisit: { type: Date, default: Date.now },
  visitDates: [String]
});

// Auth Schema
const AuthSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAuthenticated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// AI Q&A Schema
const AIQASchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: String,
  saved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

// Models
const Question = mongoose.model('Question', QuestionSchema);
const UserProgress = mongoose.model('UserProgress', UserProgressSchema);
const Auth = mongoose.model('Auth', AuthSchema);
const AIQA = mongoose.model('AIQA', AIQASchema);

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== QUESTIONS ROUTES ====================

// Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ id: 1 });
    const totalQuestions = questions.length;
    
    res.json({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      totalQuestions,
      questions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new question
app.post('/api/questions', async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a question
app.put('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    );
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a question
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({ id: parseInt(req.params.id) });
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all questions
app.delete('/api/questions', async (req, res) => {
  try {
    await Question.deleteMany({});
    res.json({ message: 'All questions deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import questions
app.post('/api/questions/import', async (req, res) => {
  try {
    const { questions } = req.body;
    await Question.deleteMany({});
    const inserted = await Question.insertMany(questions);
    res.json({ message: 'Questions imported successfully', count: inserted.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== USER PROGRESS ROUTES ====================

// Get user progress
app.get('/api/user-progress/:userId', async (req, res) => {
  try {
    let progress = await UserProgress.findOne({ userId: req.params.userId });
    
    if (!progress) {
      progress = new UserProgress({
        userId: req.params.userId,
        bookmarks: [],
        progress: {},
        totalTime: 0,
        visitDates: []
      });
      await progress.save();
    }
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user progress
app.put('/api/user-progress/:userId', async (req, res) => {
  try {
    const progress = await UserProgress.findOneAndUpdate(
      { userId: req.params.userId },
      { ...req.body, lastVisit: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== AUTH ROUTES ====================

// Check auth status
app.get('/api/auth/:userId', async (req, res) => {
  try {
    const user = await Auth.findOne({ userId: req.params.userId });
    res.json({ isAuthenticated: user ? user.isAuthenticated : false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existingUser = await Auth.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = username.toLowerCase().replace(/\s+/g, '-');
    const newUser = new Auth({
      userId,
      username,
      password: hashedPassword,
      isAuthenticated: false
    });
    
    await newUser.save();
    res.status(201).json({ success: true, message: 'User registered successfully', userId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await Auth.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    user.isAuthenticated = true;
    user.lastLogin = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      userId: user.userId,
      username: user.username,
      message: 'Login successful' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await Auth.findOne({ userId });
    
    if (user) {
      user.isAuthenticated = false;
      await user.save();
    }
    
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AI Q&A ROUTES ====================

// Get AI Q&As for a user
app.get('/api/ai-qa/:userId', async (req, res) => {
  try {
    const qas = await AIQA.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(qas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add AI Q&A
app.post('/api/ai-qa', async (req, res) => {
  try {
    const qa = new AIQA(req.body);
    await qa.save();
    res.status(201).json(qa);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update AI Q&A
app.put('/api/ai-qa/:id', async (req, res) => {
  try {
    const qa = await AIQA.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!qa) {
      return res.status(404).json({ error: 'Q&A not found' });
    }
    res.json(qa);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete AI Q&A
app.delete('/api/ai-qa/:id', async (req, res) => {
  try {
    const qa = await AIQA.findByIdAndDelete(req.params.id);
    if (!qa) {
      return res.status(404).json({ error: 'Q&A not found' });
    }
    res.json({ message: 'Q&A deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default admin user
async function initializeDefaultUser() {
  try {
    const adminExists = await Auth.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = new Auth({
        userId: 'admin',
        username: 'admin',
        password: hashedPassword,
        isAuthenticated: false
      });
      await adminUser.save();
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
}

// Initialize on startup
mongoose.connection.once('open', () => {
  initializeDefaultUser();
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
