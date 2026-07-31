const WIKIPEDIA_API = 'https://es.wikipedia.org/w/api.php';

const LEVEL_CONFIG = {
  facil: { count: 12, min: 4, max: 10 },
  medio: { count: 16, min: 5, max: 13 },
  pro: { count: 20, min: 6, max: 16 },
};

const CATEGORY_POOLS = {
  facil: [
    'Provincias de Argentina',
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
  ],
  medio: [
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
  ],
  pro: [
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
    'Científicos de Argentina',
    'Políticos de Argentina',
    'Localidades de Argentina',
    'Museos de Argentina',
  ],
};

function normalizeAnswer(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-zÑñ]/g, '')
    .toUpperCase();
}

function cleanTitle(title) {
  return String(title || '')
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/^Anexo:/u, '')
    .trim();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeClue(title, extract) {
  const clean = cleanTitle(title);
  let text = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const sentences = text.split(/(?<=[.!?])\s+/u).filter(Boolean);
  text = sentences.slice(0, 2).join(' ');
  if (text.length > 240) text = text.slice(0, 237).replace(/\s+\S*$/u, '') + '…';

  const exact = new RegExp(escapeRegExp(clean), 'giu');
  text = text.replace(exact, 'Esta respuesta');

  const variants = clean.split(/\s+/u).filter(part => part.length >= 5);
  for (const part of variants) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, 'giu'), '…');
  }

  if (/^Esta respuesta\s+es\s+/iu.test(text)) text = text.replace(/^Esta respuesta\s+es\s+/iu, 'Es ');
  if (/^Esta respuesta\s+fue\s+/iu.test(text)) text = text.replace(/^Esta respuesta\s+fue\s+/iu, 'Fue ');
  return text.trim();
}

async function wikipedia(params) {
  const url = new URL(WIKIPEDIA_API);
  url.search = new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NexarCrucigrama/1.0 (educational crossword; contact via GitHub)' },
  });
  if (!response.ok) throw new Error(`wikipedia_${response.status}`);
  return response.json();
}

async function getCategoryTitles(category, limit = 35) {
  const data = await wikipedia({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Categoría:${category}`,
    cmtype: 'page',
    cmlimit: String(limit),
  });
  return (data.query?.categorymembers || []).map(item => item.title).filter(Boolean);
}

async function getExtracts(titles) {
  if (!titles.length) return [];
  const data = await wikipedia({
    action: 'query',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    redirects: '1',
    titles: titles.join('|'),
  });
  return Object.values(data.query?.pages || {}).map(page => ({ title: page.title, extract: page.extract || '' }));
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
    return res.status(204).end();
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });

  const level = LEVEL_CONFIG[req.query.level] ? req.query.level : 'facil';
  const config = LEVEL_CONFIG[level];
  const excluded = new Set(String(req.query.exclude || '')
    .split(',')
    .map(normalizeAnswer)
    .filter(Boolean)
    .slice(0, 80));

  try {
    const categories = shuffle(CATEGORY_POOLS[level]);
    const candidates = [];

    for (const category of categories) {
      const titles = shuffle(await getCategoryTitles(category, 35)).slice(0, 20);
      const pages = await getExtracts(titles);
      for (const page of pages) candidates.push({ ...page, category });
      if (candidates.length >= config.count * 4) break;
    }

    const seen = new Set();
    const questions = [];

    for (const item of shuffle(candidates)) {
      const answerLabel = cleanTitle(item.title);
      const answer = normalizeAnswer(answerLabel);
      if (answer.length < config.min || answer.length > config.max) continue;
      if (excluded.has(answer) || seen.has(answer)) continue;

      const question = makeClue(item.title, item.extract);
      if (!question || question.length < 24) continue;
      if (normalizeAnswer(question).includes(answer)) continue;

      seen.add(answer);
      questions.push({
        question,
        answer,
        sourceTitle: item.title,
        sourceUrl: `https://es.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      });

      if (questions.length >= config.count) break;
    }

    if (questions.length < 6) {
      return send(res, 502, { error: 'insufficient_wikipedia_questions', generated: questions.length });
    }

    return send(res, 200, {
      source: 'wikipedia-es',
      level,
      questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'wikipedia_fetch_failed' });
  }
}
