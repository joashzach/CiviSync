const groq = require('../config/groq');

const DEPARTMENTS = [
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * POST /api/ai/analyze
 * Body: { image_url: string }
 * Returns: { category, department, severity, description, title }
 */
const analyzeImage = async (req, res) => {
  const { image_url } = req.body;

  if (!image_url) {
    return res.status(400).json({ message: 'image_url is required' });
  }

  try {
    const promptText = `You are an AI assistant for a civic issue reporting platform in India.
Analyze the provided image and extract the following information about the civic problem shown.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "Short descriptive title (max 60 chars)",
  "category": "One of: ${DEPARTMENTS.join(' | ')}",
  "department": "Same as category",
  "severity": "One of: ${SEVERITIES.join(' | ')}",
  "description": "Detailed description of the issue in 2-3 sentences, suitable for a formal complaint."
}

Guidelines:
- severity: Low = minor inconvenience, Medium = affects daily life, High = safety risk, Critical = immediate danger
- Choose the most appropriate department based on what you see
- For noise, air, water, or smoke issues, choose Pollution Control`;

    // ── Step 1: Fetch image as base64 ───────────────────────────────────────
    let base64DataUri = null;
    if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
      try {
        const imageResponse = await fetch(image_url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = (imageResponse.headers.get('content-type') || 'image/jpeg').split(';')[0];
        base64DataUri = `data:${contentType};base64,${base64}`;
        console.log('📸 Image fetched for AI analysis, size:', Math.round(arrayBuffer.byteLength / 1024), 'KB');
      } catch (fetchErr) {
        console.warn('⚠️ Failed to fetch image:', fetchErr.message);
      }
    }

    // ── Step 2: Try vision model (qwen — the only Groq vision model) ──────
    let responseText = null;

    // Attempt A: vision with direct URL (fastest, works if Groq can access the URL)
    if (!responseText) {
      try {
        console.log('🔍 Trying qwen/qwen3.6-27b with image URL...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.6-27b',
          reasoning_format: 'hidden',
          temperature: 0.2,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: image_url } },
            ],
          }],
        });
        responseText = result?.choices?.[0]?.message?.content || null;
        if (responseText) console.log('✅ qwen vision (URL) succeeded');
      } catch (err) {
        console.warn('⚠️ qwen vision (URL) failed:', err.message);

        if (err.status === 429) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // Attempt B: vision with base64 data URI (works even if Groq can't access the URL)
    if (!responseText && base64DataUri) {
      try {
        console.log('🔍 Trying qwen/qwen3.6-27b with base64 image...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.6-27b',
          reasoning_format: 'hidden',
          temperature: 0.2,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: base64DataUri } },
            ],
          }],
        });
        responseText = result?.choices?.[0]?.message?.content || null;
        if (responseText) console.log('✅ qwen vision (base64) succeeded');
      } catch (err) {
        console.warn('⚠️ qwen vision (base64) failed:', err.message);

        if (err.status === 429) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // Attempt C: text-only fallback with a fast non-vision model
    // llama-3.3-70b-versatile requires content as a plain string, not an array
    if (!responseText) {
      try {
        console.log('🔍 Trying llama-3.3-70b-versatile text-only fallback...');
        const textOnlyPrompt = `${promptText}\n\nNote: The image is hosted at: ${image_url}\nBased on the URL and context, provide your best analysis. If you cannot determine the issue, classify it as Sanitation with Medium severity.`;

        const result = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: textOnlyPrompt,
          }],
        });
        responseText = result?.choices?.[0]?.message?.content || null;
        if (responseText) console.log('✅ llama text-only fallback succeeded');
      } catch (err) {
        console.warn('⚠️ llama text-only fallback failed:', err.message);
      }
    }

    // ── Step 3: Parse the response ──────────────────────────────────────────
    if (!responseText) {
      throw new Error('All Groq AI attempts failed — no response received');
    }

    // Strip any residual <think> blocks and markdown code fences
    const cleaned = responseText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const matchedDept = DEPARTMENTS.includes(parsed.department || parsed.category)
      ? (parsed.department || parsed.category)
      : 'Sanitation';

    const safe = {
      title: parsed.title || 'Civic Issue Reported',
      category: matchedDept,
      department: matchedDept,
      severity: SEVERITIES.includes(parsed.severity) ? parsed.severity : 'Medium',
      description: parsed.description || 'A civic issue has been identified at this location.',
    };

    console.log('🎯 AI analysis result:', safe.title, '|', safe.department, '|', safe.severity);
    return res.json(safe);
  } catch (err) {
    console.error('❌ Groq AI analysis error:', err.message || err);
    return res.json({
      title: 'Civic Issue Reported',
      category: 'Sanitation',
      department: 'Sanitation',
      severity: 'Medium',
      description: 'Issue reported at this location. Please inspect the attached photo for details.',
    });
  }
};

module.exports = { analyzeImage };
