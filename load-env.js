const dotenv = require('dotenv');
dotenv.config();

console.log('Environment variables loaded:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '******' : 'not set');
console.log('ABSTRACT_API_KEY:', process.env.ABSTRACT_API_KEY ? '******' : 'not set');
console.log('APP_URL:', process.env.APP_URL);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '******' : 'not set');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GOOGLE_CUSTOM_SEARCH_API_KEY:', process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ? '******' : 'not set');
console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '******' : 'not set'); 