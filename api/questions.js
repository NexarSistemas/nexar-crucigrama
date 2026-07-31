const OPENAI_URL = 'https://api.openai.com/v1/responses';

const LEVEL_CONFIG = {
  facil: { count: 12, min: 4, max: 10, guidance: 'preguntas de cultura general argentina, claras y bastante conocidas' },
  medio: { count: 16, min: 5, max: 13, guidance: 'preguntas de dificultad media sobre geografía, historia, cultura, ciencia, deportes y tradiciones argentinas' },
  pro: { count: 20, min: 6, max: 16, guidance: 'preguntas más exigentes sobre Argentina, evitando datos excesivamente oscuros o ambiguos' },
};

function normalizeAnswer(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-zÑñ]/g, '')
    .toUpperCase();
}

function getOutputText(payload) {
  for (const item of payload.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(body);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return send(res, 503, { error: 'openai_api_key_missing' });

  const level = LEVEL_CONFIG[req.query.level] ? req.query.level : 'facil';
  const config = LEVEL_CONFIG[level];
  const excluded = String(req.query.exclude || '')
    .split(',')
    .map(normalizeAnswer)
    .filter(Boolean)
    .slice(0, 80);

  const prompt = [
    'Generá un lote de preguntas para un crucigrama en español sobre Argentina.',
    `Nivel: ${level}. ${config.guidance}.`,
    `Necesito exactamente ${config.count} preguntas válidas.`,
    `Cada respuesta debe tener entre ${config.min} y ${config.max} letras después de quitar espacios, tildes, guiones y signos.`,
    'Las respuestas deben ser una sola palabra o una expresión corta que pueda escribirse sin espacios en una cuadrícula.',
    'No uses respuestas ambiguas, opiniones, datos cambiantes ni hechos dudosos.',
    'Buscá en la web cuando sea útil y corroborá cada dato antes de incluirlo.',
    'Diversificá temas: provincias, ciudades, geografía, historia, cultura, ciencia, deportes, literatura, música y tradiciones.',
    'No repitas respuestas dentro del lote.',
    excluded.length ? `Evitá estas respuestas usadas recientemente: ${excluded.join(', ')}.` : '',
    'Redactá pistas naturales, correctas y sin revelar literalmente la respuesta.',
  ].filter(Boolean).join('\n');

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: config.count,
        maxItems: config.count,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string', minLength: 12, maxLength: 180 },
            answer: { type: 'string', minLength: 2, maxLength: 40 },
          },
          required: ['question', 'answer'],
        },
      },
    },
    required: ['questions'],
  };

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        reasoning: { effort: 'low' },
        tools: [{ type: 'web_search', search_context_size: 'low' }],
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'crossword_questions',
            strict: true,
            schema,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', payload);
      return send(res, 502, { error: 'question_generation_failed' });
    }

    const text = getOutputText(payload);
    const parsed = JSON.parse(text);
    const seen = new Set();
    const questions = (parsed.questions || [])
      .map(item => ({ question: String(item.question || '').trim(), answer: normalizeAnswer(item.answer) }))
      .filter(item => {
        if (!item.question || item.answer.length < config.min || item.answer.length > config.max) return false;
        if (excluded.includes(item.answer) || seen.has(item.answer)) return false;
        seen.add(item.answer);
        return true;
      });

    if (questions.length < 6) return send(res, 502, { error: 'insufficient_valid_questions' });

    return send(res, 200, {
      source: 'openai-web-verified',
      level,
      questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'unexpected_error' });
  }
}
