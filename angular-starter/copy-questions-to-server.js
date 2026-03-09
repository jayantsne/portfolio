const mongoose = require('mongoose');

// Source: MongoDB Atlas
const ATLAS_URI = 'mongodb+srv://bjayantsne_db_user:H3Y4FWCZ3t0ZIzu6@cluster0.9liq2qs.mongodb.net/jayant-portfolio?retryWrites=true&w=majority';

// Destination: Server MongoDB
const SERVER_URI = 'mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@76.13.244.113:27017/jayant-portfolio?authSource=admin';

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
}, { collection: 'questions' });

async function copyQuestions() {
  let atlasConn, serverConn;
  
  try {
    console.log('📡 Step 1: Connecting to MongoDB Atlas...');
    atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connected to Atlas');
    
    const AtlasQuestion = atlasConn.model('Question', questionSchema);
    
    console.log('\n📥 Step 2: Fetching questions from Atlas...');
    const questions = await AtlasQuestion.find({}).lean();
    console.log(`✅ Found ${questions.length} questions in Atlas`);
    
    if (questions.length === 0) {
      console.log('⚠️ No questions found in Atlas. Exiting...');
      await atlasConn.close();
      return;
    }
    
    // Show sample
    console.log('\n📋 Sample question:');
    console.log({
      id: questions[0].id,
      question: questions[0].question.substring(0, 50) + '...',
      category: questions[0].category,
      difficulty: questions[0].difficulty
    });
    
    console.log('\n🔌 Step 3: Connecting to Server MongoDB...');
    serverConn = await mongoose.createConnection(SERVER_URI).asPromise();
    console.log('✅ Connected to Server');
    
    const ServerQuestion = serverConn.model('Question', questionSchema);
    
    console.log('\n🗑️ Step 4: Clearing existing questions on server...');
    const deleteResult = await ServerQuestion.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing questions`);
    
    console.log('\n📤 Step 5: Inserting questions to server...');
    
    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      await ServerQuestion.insertMany(batch);
      inserted += batch.length;
      console.log(`   Progress: ${inserted}/${questions.length} questions`);
    }
    
    console.log(`✅ Inserted ${inserted} questions`);
    
    console.log('\n🔍 Step 6: Verifying import...');
    const count = await ServerQuestion.countDocuments();
    console.log(`✅ Verification: ${count} questions in server database`);
    
    // Show categories
    const categories = await ServerQuestion.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Questions by category:');
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count}`);
    });
    
    console.log('\n✅ IMPORT COMPLETE!');
    console.log(`📦 Total: ${count} questions successfully copied to server`);
    console.log('🌐 API Endpoint: https://learnwithai.tech/api/questions');
    
    await atlasConn.close();
    await serverConn.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    
    if (atlasConn) await atlasConn.close();
    if (serverConn) await serverConn.close();
    process.exit(1);
  }
}

copyQuestions();
