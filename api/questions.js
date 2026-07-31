const WIKIPEDIA_API = 'https://es.wikipedia.org/w/api.php';

const LEVEL_CONFIG = {
  facil: { count: 30, min: 4, max: 10 },
  medio: { count: 45, min: 4, max: 13 },
  pro: { count: 70, min: 4, max: 16 },
};

const CATEGORY_POOLS = {
  facil: [
    'Provincias de Argentina',
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
  ],
  medio: [
    'Provincias de Argentina',
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
  ],
  pro: [
    'Provincias de Argentina',
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
    'Científicos de Argentina',
    'Museos de Argentina',
  ],
};

function normalizeAnswer(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-zÑñ]/g, '').toUpperCase();
}

function cleanTitle(title) {
  return String(title || '').replace(/\s*\([^)]*\)\s*$/u, '').replace(/^Anexo:/u, '').trim();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractFacts(text) {
  return {
    province: matchFirst(text, [
      /provincia de ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
      /provincia argentina de ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u,
    ]),
    river: matchFirst(text, [/río ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u]),
    area: matchFirst(text, [/(Gran [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,30})[,.;]/u]),
    capital: matchFirst(text, [/capital(?: es|:)? ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/iu]),
    founded: matchFirst(text, [/fundad[oa] (?:el |en )([^.;]{4,45})[.;]/iu]),
    elevation: matchFirst(text, [/(?:altura|altitud)[^\d]{0,20}(\d{2,5}\s*m(?: s\. ?n\. ?m\.)?)/iu]),
    work: matchFirst(text, [
      /autor(?:a)? de ([^.;]{4,70})[.;]/iu,
      /conocid[oa] por ([^.;]{4,70})[.;]/iu,
      /se destac[óo] por ([^.;]{4,70})[.;]/iu,
      /famos[oa] por ([^.;]{4,70})[.;]/iu,
    ]),
    club: matchFirst(text, [
      /jugó en ([^.;]{3,55})[.;]/iu,
      /militó en ([^.;]{3,55})[.;]/iu,
    ]),
    award: matchFirst(text, [
      /(?:ganó|recibió|obtuvo) (?:el |la )?([^.;]{4,65})[.;]/iu,
      /premio ([^.;]{4,60})[.;]/iu,
    ]),
  };
}

function trimFact(value, max = 70) {
  const clean = String(value || '').replace(/\s+/g, ' ').replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '').trim();
  return clean.length <= max ? clean : '';
}

function makeClue(title, extract, category, level) {
  const answerLabel = cleanTitle(title);
  const text = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const f = extractFacts(text);
  Object.keys(f).forEach(key => { f[key] = trimFact(f[key]); });

  // Fácil: solo pistas directas y de cultura/geografía general.
  if (level === 'facil') {
    if (category === 'Provincias de Argentina' && f.capital) return `Provincia argentina cuya capital es ${f.capital}.`;
    if (category === 'Ciudades de Argentina' && f.province && f.river) return `Ciudad de ${f.province} situada junto al río ${f.river}.`;
    if (category === 'Montañas de Argentina' && f.province && f.elevation) return `Montaña de ${f.province}, de aproximadamente ${f.elevation} de altitud.`;
    return '';
  }

  if (category === 'Provincias de Argentina') {
    if (f.capital) return `Provincia argentina cuya capital es ${f.capital}.`;
    return '';
  }

  if (category === 'Ciudades de Argentina') {
    if (f.province && f.river) return `Ciudad de ${f.province} situada junto al río ${f.river}.`;
    if (f.province && f.area) return `Ciudad de ${f.province} que integra ${f.area}.`;
    if (level === 'pro' && f.province && f.founded) return `Ciudad de ${f.province}, fundada ${f.founded}.`;
    return '';
  }

  if (category === 'Ríos de Argentina') {
    if (f.province) return `Río argentino vinculado con la provincia de ${f.province}.`;
    return '';
  }

  if (category === 'Montañas de Argentina') {
    if (f.province && f.elevation) return `Montaña de ${f.province}, de aproximadamente ${f.elevation} de altitud.`;
    return '';
  }

  if (category === 'Parques nacionales de Argentina') {
    if (f.province) return `Parque nacional argentino ubicado en ${f.province}.`;
    return '';
  }

  if (category === 'Escritores de Argentina') {
    if (f.work) return `Autor o autora argentina conocido por ${f.work}.`;
    if (level === 'pro' && f.award) return `Escritor o escritora argentina distinguido con ${f.award}.`;
    return '';
  }

  if (category === 'Cantantes de Argentina') {
    if (f.work) return `Cantante argentino conocido por ${f.work}.`;
    if (level === 'pro' && f.award) return `Cantante argentino distinguido con ${f.award}.`;
    return '';
  }

  if (category === 'Futbolistas de Argentina') {
    if (f.club) return `Futbolista argentino que jugó en ${f.club}.`;
    if (f.award) return `Futbolista argentino distinguido con ${f.award}.`;
    return '';
  }

  if (category === 'Científicos de Argentina') {
    if (f.work) return `Científico argentino destacado por ${f.work}.`;
    if (f.award) return `Científico argentino distinguido con ${f.award}.`;
    return '';
  }

  if (category === 'Museos de Argentina') {
    if (f.province) return `Museo argentino ubicado en ${f.province}.`;
    return '';
  }

  return '';
}

function isGoodClue(question, level) {
  if (!question || question.length < 28 || question.length > 125) return false;
  const q = question.toLowerCase();
  const banned = [
    'se subdivide', 'partido homónimo', 'departamento homónimo', 'microcentro',
    'a aproximadamente', 'nació en', 'de origen mendocino', 'de origen argentino',
    'es un actor', 'es una actriz', 'es un cantante', 'es una cantante',
    'es un futbolista', 'es una futbolista', 'es un político', 'es una política',
  ];
  if (banned.some(value => q.includes(value))) return false;
  if (/\b(19|20)\d{2}\b/u.test(question) && level !== 'pro') return false;
  if (/\b\d{1,3}\s*km\b/iu.test(question)) return false;
  return true;
}

async function wikipedia(params) {
  const url = new URL(WIKIPEDIA_API);
  url.search = new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
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

async function getCategoryPages(category, limit = 45) {
  const data = await wikipedia({
    action: 'query', generator: 'categorymembers', gcmtitle: `Categoría:${category}`,
    gcmtype: 'page', gcmlimit: String(limit), prop: 'extracts', exintro: '1', explaintext: '1', redirects: '1',
  });
  return Object.values(data.query?.pages || {}).map(page => ({ title: page.title, extract: page.extract || '', category }));
}

async function collectCandidates(categories) {
  const candidates = [], categoryErrors = [], ordered = shuffle(categories), batchSize = 3;
  for (let i = 0; i < ordered.length; i += batchSize) {
    const batch = ordered.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(category => getCategoryPages(category)));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') candidates.push(...result.value);
      else categoryErrors.push(batch[index]);
    });
  }
  return { candidates, categoryErrors };
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
  const requestedCount = Math.max(6, Math.min(80, Number(req.query.count) || config.count));
  const excludedList = String(req.query.exclude || '').split(',').map(normalizeAnswer).filter(Boolean).slice(0, 80);

  try {
    const { candidates, categoryErrors } = await collectCandidates(CATEGORY_POOLS[level]);
    if (!candidates.length) return send(res, 502, { error: 'wikipedia_fetch_failed', categoryErrors });

    function buildQuestions(excluded) {
      const seen = new Set(), seenClues = new Set(), questions = [];
      for (const item of shuffle(candidates)) {
        const answerLabel = cleanTitle(item.title);
        const answer = normalizeAnswer(answerLabel);
        if (answer.length < config.min || answer.length > config.max || excluded.has(answer) || seen.has(answer)) continue;
        const question = makeClue(item.title, item.extract, item.category, level);
        if (!isGoodClue(question, level) || normalizeAnswer(question).includes(answer)) continue;
        const clueKey = question.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seenClues.has(clueKey)) continue;
        seen.add(answer); seenClues.add(clueKey);
        questions.push({
          question, answer, sourceTitle: item.title,
          sourceUrl: `https://es.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        });
        if (questions.length >= requestedCount) break;
      }
      return questions;
    }

    let questions = buildQuestions(new Set(excludedList));
    let historyRelaxed = false;
    if (questions.length < Math.min(12, requestedCount) && excludedList.length) {
      questions = buildQuestions(new Set(excludedList.slice(Math.ceil(excludedList.length / 2))));
      historyRelaxed = true;
    }
    if (questions.length < 6 && excludedList.length) {
      questions = buildQuestions(new Set());
      historyRelaxed = true;
    }
    if (questions.length < 6) {
      return send(res, 502, { error: 'insufficient_wikipedia_questions', generated: questions.length, candidates: candidates.length, categoryErrors });
    }

    return send(res, 200, {
      source: 'wikipedia-es', level, requestedCount, historyRelaxed, categoryErrors,
      candidateCount: candidates.length, questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'wikipedia_fetch_failed', detail: error?.message || 'unknown' });
  }
}
