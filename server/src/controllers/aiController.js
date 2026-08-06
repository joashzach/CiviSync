const ai = require('../config/gemini');

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
    const prompt = `You are an AI assistant for a civic issue reporting platform in India.
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

    let base64Image = null;
    let mimeType = 'image/jpeg';

    if (image_url && (image_url.startsWith('http://') || image_url.startsWith('https://'))) {
      try {
        const imageResponse = await fetch(image_url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const arrayBuffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imageResponse.headers.get('content-type');
        if (contentType) mimeType = contentType.split(';')[0];
      } catch (fetchErr) {
        console.warn('⚠️ Failed to fetch image for AI analysis:', fetchErr.message);
      }
    }

    // Payload formats for @google/genai SDK
    const contentsPayloads = [];

    if (base64Image) {
      contentsPayloads.push([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
      ]);
      contentsPayloads.push([
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: mimeType } },
          ],
        },
      ]);
    } else {
      contentsPayloads.push([prompt]);
    }

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-exp',
    ];
    let responseText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      for (const payload of contentsPayloads) {
        try {
          const result = await ai.models.generateContent({
            model: modelName,
            contents: payload,
          });

          if (result && result.text) {
            responseText = result.text;
            break;
          } else if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            responseText = result.candidates[0].content.parts[0].text;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`⚠️ Gemini model ${modelName} payload attempt failed:`, err.message);

          // If rate limited (429), wait 1.2s before trying next model/payload
          if (err.status === 429 || (err.message && err.message.includes('429'))) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      throw lastError || new Error('No response received from Gemini AI models');
    }

    const text = responseText.trim();
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
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

    return res.json(safe);
  } catch (err) {
    console.error('❌ Gemini AI analysis error:', err.message || err);
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
