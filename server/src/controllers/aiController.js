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

const SEVERITIES = ['Low', 'Medium', 'High'];

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
Severity guide: Low=inconvenience, Medium=daily life, High=safety risk or immediate danger.
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

    // ── Step 2: Try vision model (qwen/qwen3.8-27b) ──────────────────────────
    let responseText = null;

    let visionBlocked = false;

    // Attempt A: vision with direct URL
    if (!responseText) {
      try {
        console.log('🔍 Trying qwen/qwen3.8-27b with image URL...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.8-27b',
          temperature: 0.2,
          max_tokens: 1024,
          reasoning_format: 'hidden',
          response_format: { type: 'json_object' },
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
        if (err.message?.includes('model_permission_blocked_project')) {
          visionBlocked = true;
          console.warn('👉 To enable vision model, allow `qwen/qwen3.8-27b` at: https://console.groq.com/settings/project/limits');
        }
      }
    }

    // Attempt B: vision with base64 data URI
    if (!responseText && base64DataUri) {
      try {
        console.log('🔍 Trying qwen/qwen3.8-27b with base64 image...');
        const result = await groq.chat.completions.create({
          model: 'qwen/qwen3.8-27b',
          temperature: 0.2,
          max_tokens: 1024,
          reasoning_format: 'hidden',
          response_format: { type: 'json_object' },
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
        if (err.message?.includes('model_permission_blocked_project')) {
          visionBlocked = true;
        }
      }
    }

    // ── Step 3: Handle response or permission blocks ──────────────────────────
    if (!responseText) {
      if (visionBlocked) {
        return res.status(403).json({
          message: 'Groq vision model (qwen/qwen3.8-27b) is blocked in your Groq Project Limits. Please allow it at: https://console.groq.com/settings/project/limits',
        });
      }
      return res.status(500).json({
        message: 'AI image analysis failed — unable to inspect image with Groq vision model.',
      });
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
    return res.status(500).json({
      message: err.message || 'AI analysis error',
    });
  }
};

module.exports = { analyzeImage };
