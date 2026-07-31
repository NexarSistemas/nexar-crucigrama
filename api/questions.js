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

function cleanExtract(extract, answerLabel) {
  let text = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const exact = new RegExp(escapeRegExp(answerLabel), 'giu');
  text = text.replace(exact, '');
  return text.replace(/\s{2,}/g, ' ').trim();
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function makeClue(title, extract, category) {
  const answerLabel = cleanTitle(title);
  const text = cleanExtract(extract, answerLabel);
  if (!text) return '';

  const province = matchFirst(text, [
    /provincia de ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
    /provincia argentina de ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
  ]);
  const river = matchFirst(text, [
    /río ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
  ]);
  const area = matchFirst(text, [
    /(Gran [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,30})[,.;]/u,
    /(área metropolitana de [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,30})[,.;]/u,
  ]);
  const born = matchFirst(text, [
    /naci(?:ó|da|do) en ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
  ]);
  const work = matchFirst(text, [
    /autor(?:a)? de ([^.;]{4,80})[.;]/iu,
    /conocid[oa] por ([^.;]{4,80})[.;]/iu,
  ]);

  if (category === 'Provincias de Argentina') {
    const capital = matchFirst(text, [/capital(?: es|:)? ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/iu]);
    if (capital) return `Provincia argentina cuya capital es ${capital}.`;
    return 'Provincia de la República Argentina.';
  }

  if (category === 'Ciudades de Argentina' || category === 'Localidades de Argentina') {
    if (province) return `Ciudad argentina ubicada en la provincia de ${province}.`;
    if (area) return `Localidad argentina que forma parte de ${area}.`;
    if (river) return `Ciudad argentina situada junto al río ${river}.`;
    return 'Ciudad o localidad de la Argentina.';
  }

  if (category === 'Ríos de Argentina') {
    if (province) return `Río argentino vinculado con la provincia de ${province}.`;
    return 'Río de la Argentina.';
  }

  if (category === 'Montañas de Argentina') {
    if (province) return `Montaña argentina ubicada en la provincia de ${province}.`;
    return 'Montaña o cumbre de la Argentina.';
  }

  if (category === 'Parques nacionales de Argentina') {
    if (province) return `Parque nacional argentino ubicado en la provincia de ${province}.`;
    return 'Área protegida integrante del sistema de parques nacionales de Argentina.';
  }

  if (category === 'Escritores de Argentina') {
    if (work) return `Escritor o escritora argentina, ${work}.`;
    if (born) return `Escritor o escritora argentina nacido en ${born}.`;
    return 'Escritor o escritora de la Argentina.';
  }

  if (category === 'Cantantes de Argentina') {
    if (born) return `Cantante argentino o argentina nacido en ${born}.`;
    return 'Cantante de la Argentina.';
  }

  if (category === 'Futbolistas de Argentina') {
    if (born) return `Futbolista argentino nacido en ${born}.`;
    return 'Futbolista de nacionalidad argentina.';
  }

  if (category === 'Científicos de Argentina') {
    if (born) return `Científico o científica argentina nacido en ${born}.`;
    return 'Científico o científica de la Argentina.';
  }

  if (category === 'Políticos de Argentina') {
    if (born) return `Político o política argentina nacido en ${born}.`;
    return 'Figura de la política argentina.';
  }

  if (category === 'Museos de Argentina') {
    if (province) return `Museo argentino ubicado en la provincia de ${province}.`;
    return 'Museo ubicado en la Argentina.';
  }

  const sentence = text.split(/(?<=[.!?])\s+/u).find(s => s.length >= 24 && s.length <= 150) || '';
  return sentence.replace(/^,?\s*/u, '').trim();
}

async function wikipedia(params) {
  const url = new URL(WIKIPEDIA_API);
  url.search = new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NexarCrucigrama/1.0 (educational crossword; contact via GitHub)' },
    });
    if (!response.ok) throw new Error(`wikipedia_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getCategoryTitles(category, limit = 30) {
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
    titles: titles.slice(0, 25).join('|'),
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
  const excludedList = String(req.query.exclude || '')
    .split(',')
    .map(normalizeAnswer)
    .filter(Boolean)
    .slice(0, 80);

  try {
    const categories = shuffle(CATEGORY_POOLS[level]);
    const candidates = [];
    const categoryErrors = [];
    const targetCandidates = config.count * 3;

    for (const category of categories) {
      try {
        const titles = shuffle(await getCategoryTitles(category, 30)).slice(0, 25);
        const pages = await getExtracts(titles);
        for (const page of pages) candidates.push({ ...page, category });
      } catch (error) {
        categoryErrors.push(category);
        console.warn(`Wikipedia category skipped: ${category}`, error?.message || error);
      }

      if (candidates.length >= targetCandidates) break;
    }

    if (!candidates.length) {
      return send(res, 502, { error: 'wikipedia_fetch_failed', categoryErrors });
    }

    function buildQuestions(excluded) {
      const seen = new Set();
      const questions = [];
      for (const item of shuffle(candidates)) {
        const answerLabel = cleanTitle(item.title);
        const answer = normalizeAnswer(answerLabel);
        if (answer.length < config.min || answer.length > config.max) continue;
        if (excluded.has(answer) || seen.has(answer)) continue;

        const question = makeClue(item.title, item.extract, item.category);
        if (!question || question.length < 20 || question.length > 150) continue;
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
      return questions;
    }

    let questions = buildQuestions(new Set(excludedList));
    let historyRelaxed = false;

    if (questions.length < 6 && excludedList.length) {
      const relaxed = new Set(excludedList.slice(Math.ceil(excludedList.length / 2)));
      questions = buildQuestions(relaxed);
      historyRelaxed = true;
    }

    if (questions.length < 6) {
      return send(res, 502, {
        error: 'insufficient_wikipedia_questions',
        generated: questions.length,
        candidates: candidates.length,
        categoryErrors,
      });
    }

    return send(res, 200, {
      source: 'wikipedia-es',
      level,
      historyRelaxed,
      categoryErrors,
      questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'wikipedia_fetch_failed', detail: error?.message || 'unknown' });
  }
}
