const { GoogleGenAI } = require('@google/genai');

const apiKey = (process.env.GEMINI_API_KEY || '').trim() || 'demo-key';

const ai = new GoogleGenAI({
  apiKey,
});

module.exports = ai;
