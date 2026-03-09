const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Server MongoDB connection
const SERVER_URI = 'mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@76.13.244.113:27017/jayant-portfolio?authSource=admin';

// Read questions from TypeScript file
const tsFilePath = path.join(__dirname, 'src', 'app', 'ai-qa', 'interview-questions-data.ts');
console.log('📂 Reading from:', tsFilePath);

if (!fs.existsSync(tsFilePath)) {
  console.error('❌ File not found:', tsFilePath);
  process.exit(1);
}

const tsContent = fs.readFileSync(tsFilePath, 'utf8');

// Extract array content using regex
const match = tsContent.match(/export const INTERVIEW_QUESTIONS = (\[[\s\S]*\]);/);
if (!match) {
  console.error('❌ Could not extract questions from TypeScript file');
  process.exit(1);
}

// Convert TypeScript to JSON by replacing single quotes with double quotes
const jsonString = match[1]
  .replace(/'/g, '"')  
  .replace(/\n/g, '\\n')  // Escape newlines in strings
  .replace(/\\"/g, "'");  // Restore apostrophes

let questions;
try {
  questions = eval('(' + match[1] + ')');  // Use eval to properly parse the array
} catch (e) {
  console.error('❌ Error parsing questions:', e.message);
  process.exit(1);
}

console.log(`📊 Parsed ${questions.length} questions from TypeScript file`);

// Question Schema
const questionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  answer: String,
  category: String,
  tags: [String],
  difficulty: String,
  dateAdded: { type: Date, default: Date.now },
  expanded: { type: Boolean, default: false }
}, { collection: 'questions' });

async function seedDatabase() {
  try {
    console.log('\n🔌 Connecting to Server MongoDB...');
    await mongoose.connect(SERVER_URI);
    console.log('✅ Connected to Server MongoDB');
    
    const Question = mongoose.model('Question', questionSchema);
    
    console.log('\n🗑️ Clearing existing questions...');
    const deleteResult = await Question.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing questions`);
    
    console.log('\n📤 Inserting questions...');
    
    // Add dateAdded to all questions
    const questionsWithDates = questions.map(q => ({
      ...q,
      dateAdded: new Date(),
      expanded: false
    }));
    
    // Insert in batches
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < questionsWithDates.length; i += batchSize) {
      const batch = questionsWithDates.slice(i, i + batchSize);
      await Question.insertMany(batch);
      inserted += batch.length;
      console.log(`   Progress: ${inserted}/${questionsWithDates.length} questions`);
    }
    
    console.log(`✅ Inserted ${inserted} questions successfully`);
    
    console.log('\n🔍 Verifying import...');
    const count = await Question.countDocuments();
    console.log(`✅ Verification: ${count} questions in database`);
    
    // Show categories
    const categories = await Question.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Questions by category:');
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} questions`);
    });
    
    // Sample question
    const sample = await Question.findOne({});
    console.log('\n📋 Sample question:');
    console.log({
      id: sample.id,
      question: sample.question.substring(0, 80) + '...',
      category: sample.category,
      difficulty: sample.difficulty,
      tags: sample.tags
    });
    
    await mongoose.connection.close();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📦 Total: ${count} questions`);
    console.log('🌐 Test API: https://learnwithai.tech/api/questions');
    console.log('\n💡 Next: Restart API service on server');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedDatabase();
