const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection String
const MONGODB_URI = 'mongodb+srv://bjayantsne_db_user:H3Y4FWCZ3t0ZIzu6@cluster0.9liq2qs.mongodb.net/jayant-portfolio?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Schema Definitions
const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true },
  tags: [String],
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  dateAdded: { type: Date, default: Date.now },
  expanded: { type: Boolean, default: false }
}, { timestamps: true });

const userProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  bookmarks: [Number],
  progress: { type: Map, of: Number },
  totalTime: { type: Number, default: 0 },
  lastVisit: { type: Date, default: Date.now },
  visitDates: [String]
}, { timestamps: true });

const authSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAuthenticated: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

const aiQASchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: String,
  saved: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Models
const Question = mongoose.model('Question', questionSchema);
const UserProgress = mongoose.model('UserProgress', userProgressSchema);
const Auth = mongoose.model('Auth', authSchema);
const AIQA = mongoose.model('AIQA', aiQASchema);

// ==================== QUESTIONS ROUTES ====================

// Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ dateAdded: -1 });
    res.json({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalQuestions: questions.length,
      questions: questions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new question
app.post('/api/questions', async (req, res) => {
  try {
    const lastQuestion = await Question.findOne().sort({ id: -1 });
    const newId = lastQuestion ? lastQuestion.id + 1 : 1;
    
    const question = new Question({
      ...req.body,
      id: newId,
      dateAdded: new Date()
    });
    
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update question
app.put('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete question
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

// Clear all questions
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
    await Question.deleteMany({});
    const questions = await Question.insertMany(req.body.questions);
    res.json({ message: 'Questions imported successfully', count: questions.length });
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
      progress = new UserProgress({ userId: req.params.userId });
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
      { new: true, upsert: true }
    );
    res.json(progress);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== AUTH ROUTES ====================

// Check authentication
app.get('/api/auth/:userId', async (req, res) => {
  try {
    const auth = await Auth.findOne({ userId: req.params.userId });
    res.json({ isAuthenticated: auth ? auth.isAuthenticated : false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user already exists
    const existingUser = await Auth.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
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
    
    // Find user by username
    const user = await Auth.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Update authentication status
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

// Initialize default admin user
async function initializeDefaultUser() {
  try {
    const adminExists = await Auth.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new Auth({
        userId: 'admin',
        username: 'admin',
        password: hashedPassword,
        isAuthenticated: false
      });
      await admin.save();
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error initializing default user:', error);
  }
}

// ==================== AI Q&A ROUTES ====================

// Get all AI Q&As for a user
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

// Delete AI Q&A
app.delete('/api/ai-qa/:id', async (req, res) => {
  try {
    await AIQA.findByIdAndDelete(req.params.id);
    res.json({ message: 'AI Q&A deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update AI Q&A
app.put('/api/ai-qa/:id', async (req, res) => {
  try {
    const qa = await AIQA.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(qa);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize default admin user after MongoDB connection
  initializeDefaultUser();
});
