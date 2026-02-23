const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://bjayantsne_db_user:H3Y4FWCZ3t0ZIzu6@cluster0.9liq2qs.mongodb.net/jayant-portfolio?retryWrites=true&w=majority';

// Question Schema
const questionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  answer: String,
  category: String,
  tags: [String],
  difficulty: String,
  dateAdded: Date,
  expanded: Boolean
});

const Question = mongoose.model('Question', questionSchema);

async function migrateQuestions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📥 Fetching questions from MongoDB...');
    const questions = await Question.find({}).lean();
    console.log(`📊 Found ${questions.length} questions`);

    // Output questions as JSON for wrangler KV bulk import
    const kvData = questions.map(q => ({
      key: `question:${q.id}`,
      value: JSON.stringify({
        id: q.id,
        question: q.question,
        answer: q.answer,
        category: q.category,
        tags: q.tags || [],
        difficulty: q.difficulty || 'Medium',
        dateAdded: q.dateAdded,
        expanded: q.expanded || false
      })
    }));

    // Write to file for wrangler KV bulk import
    const fs = require('fs');
    fs.writeFileSync('./questions-kv-data.json', JSON.stringify(kvData, null, 2));
    console.log('✅ Questions exported to questions-kv-data.json');
    console.log(`📦 Total: ${kvData.length} questions ready for KV import`);

    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
    
    console.log('\n🚀 Next step: Run this command to import to KV:');
    console.log('cd cloudflare-backend && npx wrangler kv:bulk put PORTFOLIO_KV ../questions-kv-data.json');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateQuestions();
