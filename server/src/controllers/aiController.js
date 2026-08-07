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
 * Attempt to repair truncated JSON from LLM output.
 * Handles common cases: missing closing quotes, braces, brackets.
 */
function repairJSON(raw) {
  let s = raw.trim();

  // Strip markdown fences and <think> blocks
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  s = s.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  s = s.trim();

  // Try parsing as-is first
  try { return JSON.parse(s); } catch (_) { /* continue to repair */ }

  // Close unterminated string: if odd number of unescaped quotes, add one
  const unescapedQuotes = s.match(/(?<!\\)"/g);
  if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
    s += '"';
  }

  // Count open/close braces and brackets, close any unclosed ones
  const opens = (s.match(/{/g) || []).length;
  const closes = (s.match(/}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) s += '}';

  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets - closeBrackets; i++) s += ']';

  // Remove trailing comma before closing brace (invalid JSON)
  s = s.replace(/,\s*}/g, '}');

  try { return JSON.parse(s); } catch (_) { /* continue */ }

  // More aggressive: find the last complete key-value pair and close the object
  const lastCompleteValue = s.lastIndexOf('",');
  if (lastCompleteValue > 0) {
    const truncated = s.substring(0, lastCompleteValue + 1);
    const fixedOpens = (truncated.match(/{/g) || []).length;
    const fixedCloses = (truncated.match(/}/g) || []).length;
    let fixed = truncated;
    for (let i = 0; i < fixedOpens - fixedCloses; i++) fixed += '}';
    try { return JSON.parse(fixed); } catch (_) { /* give up */ }
  }

  // Give up — throw so caller can fallback
  throw new Error('Could not repair truncated JSON from AI response');
}

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
    const promptText = `You are a civic issue classifier for an Indian municipal platform.
Look at the image and respond with ONLY a JSON object (no markdown):
{
  "title": "Brief title under 60 chars",
  "category": "One of: ${DEPARTMENTS.join(' | ')}",
  "department": "Same as category",
  "severity": "One of: ${SEVERITIES.join(' | ')}",
  "description": "1-2 sentence description of the civic issue."
}
Severity guide: Low=inconvenience, Medium=daily life, High=safety risk, Critical=immediate danger.
For pollution issues (noise/air/water/smoke), use Pollution Control.
Keep the description SHORT (under 150 chars).`;

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

    // Attempt A: vision with direct URL (fastest)
    if (!responseText) {
      try {
        console.log('🔍 Trying qwen/qwen3.6-27b with image URL...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.6-27b',
          reasoning_format: 'hidden',
          temperature: 0.2,
          max_tokens: 4096,
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

    // Attempt B: vision with base64 data URI
    if (!responseText && base64DataUri) {
      try {
        console.log('🔍 Trying qwen/qwen3.6-27b with base64 image...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.6-27b',
          reasoning_format: 'hidden',
          temperature: 0.2,
          max_tokens: 4096,
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

    // Attempt C: text-only fallback with llama (no image, string content)
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

    console.log('📝 Raw AI response length:', responseText.length, 'chars');
    const parsed = repairJSON(responseText);

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
