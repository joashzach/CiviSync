const Groq = require('groq-sdk');

const apiKey = (process.env.GROQ_API_KEY || '').trim() || 'demo-key';

const groq = new Groq({ apiKey });

module.exports = groq;
