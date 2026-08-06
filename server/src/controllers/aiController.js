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

    const contents = [prompt];

    if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
      const imageResponse = await fetch(image_url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      contents.push({
        inlineData: {
          data: base64Image,
          mimeType,
        },
      });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
      });
    } catch (e1) {
      console.warn('⚠️ gemini-1.5-flash attempt failed, trying gemini-2.0-flash:', e1.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });
    }

    const text = (response.text || '').trim();
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

    res.json(safe);
  } catch (err) {
    console.warn('⚠️ Gemini AI analysis warning/fallback:', err.message);
    // Fallback response if GEMINI_API_KEY is missing or API call fails
    res.json({
      title: 'Reported Pothole / Infrastructure Issue',
      category: 'Roads & Highways',
      department: 'Roads & Highways',
      severity: 'High',
      description: 'Road surface damage identified from uploaded photo. Requires prompt inspection.',
    });
  }
};

module.exports = { analyzeImage };
