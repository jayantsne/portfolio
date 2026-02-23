const fetch = require('node-fetch');

async function testQuestions() {
  try {
    const response = await fetch('https://jayant-portfolio-api.jayant-ai.workers.dev/api/questions');
    const data = await response.json();
    console.log('Questions Response:');
    console.log('Total Questions:', data.totalQuestions);
    console.log('Questions:', JSON.stringify(data.questions, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQuestions();
