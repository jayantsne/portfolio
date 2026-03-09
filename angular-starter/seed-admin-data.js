const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@76.13.244.113:27017/jayant-portfolio?authSource=admin';

// AI Provider Settings Schema
const aiProviderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: String,
  enabled: { type: Boolean, default: false },
  priority: { type: Number, default: 0 }, // Higher priority = tried first
  type: { type: String, enum: ['local', 'api'], required: true },
  endpoint: String, // For Ollama
  model: String, // For Ollama
  apiKeys: [String], // For API providers
  config: mongoose.Schema.Types.Mixed, // Provider-specific config
  stats: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    lastUsed: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Admin User Schema
const adminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  email: String,
  role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const AIProvider = mongoose.model('AIProvider', aiProviderSchema);
const AdminUser = mongoose.model('AdminUser', adminUserSchema);

async function seedAdminData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Create default admin user (you should change this password!)
    const bcrypt = require('bcryptjs');
    const defaultPassword = 'Admin@123'; // CHANGE THIS!
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const existingAdmin = await AdminUser.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await AdminUser.create({
        username: 'admin',
        passwordHash: passwordHash,
        email: 'admin@learnwithai.tech',
        role: 'admin'
      });
      console.log('✅ Created default admin user');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
      console.log('   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!\n');
    } else {
      console.log('✅ Admin user already exists\n');
    }

    // Seed AI Providers
    const providers = [
      {
        name: 'ollama',
        displayName: 'Ollama (Local Server)',
        enabled: true,
        priority: 10, // Highest priority - use first
        type: 'local',
        endpoint: 'http://localhost:11434/api/generate',
        model: 'qwen2.5:7b-instruct-q4_K_M',
        config: {
          temperature: 0.7,
          maxTokens: 2000,
          stream: false
        }
      },
      {
        name: 'groq',
        displayName: 'Groq (Fast Cloud)',
        enabled: true,
        priority: 9,
        type: 'api',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        apiKeys: [], // Will be populated from environment
        config: {
          temperature: 0.7,
          maxTokens: 2000
        }
      },
      {
        name: 'gemini',
        displayName: 'Google Gemini',
        enabled: true,
        priority: 8,
        type: 'api',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        apiKeys: [], // Will be populated from environment
        config: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      },
      {
        name: 'huggingface',
        displayName: 'HuggingFace',
        enabled: true,
        priority: 7,
        type: 'api',
        endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        apiKeys: [], // Will be populated from environment
        config: {
          temperature: 0.7,
          max_new_tokens: 2000
        }
      },
      {
        name: 'together',
        displayName: 'Together AI',
        enabled: false,
        priority: 6,
        type: 'api',
        endpoint: 'https://api.together.xyz/v1/chat/completions',
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        apiKeys: [],
        config: {
          temperature: 0.7,
          max_tokens: 2000
        }
      }
    ];

    for (const provider of providers) {
      const existing = await AIProvider.findOne({ name: provider.name });
      if (!existing) {
        await AIProvider.create(provider);
        console.log(`✅ Created provider: ${provider.displayName}`);
      } else {
        await AIProvider.updateOne(
          { name: provider.name },
          { $set: { ...provider, updatedAt: new Date() } }
        );
        console.log(`✅ Updated provider: ${provider.displayName}`);
      }
    }

    console.log('\n📊 Current AI Providers:');
    const allProviders = await AIProvider.find({}).sort({ priority: -1 });
    allProviders.forEach(p => {
      const status = p.enabled ? '✅ Enabled' : '❌ Disabled';
      const type = p.type === 'local' ? '🖥️  Local' : '☁️  Cloud';
      console.log(`   ${status} ${type} - ${p.displayName} (Priority: ${p.priority})`);
    });

    await mongoose.connection.close();
    console.log('\n👋 Done! MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedAdminData();
