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
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
  ],
  pro: [
    'Ciudades de Argentina',
    'Ríos de Argentina',
    'Montañas de Argentina',
    'Parques nacionales de Argentina',
    'Escritores de Argentina',
    'Cantantes de Argentina',
    'Futbolistas de Argentina',
    'Científicos de Argentina',
    'Políticos de Argentina',
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

function redactAnswer(text, answerLabel) {
  let result = String(text || '').replace(/\s+/g, ' ').trim();
  if (!result) return '';
  result = result.replace(new RegExp(escapeRegExp(answerLabel), 'giu'), '');
  for (const part of answerLabel.split(/\s+/u).filter(part => part.length >= 5)) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, 'giu'), '');
  }
  return result
    .replace(/\s+([,.;:])/gu, '$1')
    .replace(/\s{2,}/gu, ' ')
    .replace(/^[,.;:\-–—\s]+/u, '')
    .trim();
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
    area: matchFirst(text, [
      /(Gran [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,30})[,.;]/u,
      /(área metropolitana de [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,30})[,.;]/u,
    ]),
    born: matchFirst(text, [/naci(?:ó|da|do) en ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/u]),
    work: matchFirst(text, [
      /autor(?:a)? de ([^.;]{4,80})[.;]/iu,
      /conocid[oa] por ([^.;]{4,80})[.;]/iu,
      /se destac[óo] por ([^.;]{4,80})[.;]/iu,
    ]),
    capital: matchFirst(text, [/capital(?: es|:)? ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ .'-]{2,40})[,.;]/iu]),
    distance: matchFirst(text, [/a (\d{1,4}\s*km[^.;]{0,45})[.;]/iu]),
    founded: matchFirst(text, [/fundad[oa] (?:el |en )([^.;]{4,60})[.;]/iu]),
    elevation: matchFirst(text, [/(?:altura|altitud)[^\d]{0,20}(\d{2,5}\s*m(?: s\. ?n\. ?m\.)?)/iu]),
  };
}

function distinctiveSentence(extract, answerLabel) {
  return String(extract || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/u)
    .map(sentence => redactAnswer(sentence, answerLabel))
    .filter(sentence => sentence.length >= 35 && sentence.length <= 135)
    .filter(sentence => !/^es (una|un) /iu.test(sentence))
    .filter(sentence => !/^(ciudad|localidad|río|montaña|provincia|museo) (de|de la) argentina/iu.test(sentence))
    .find(sentence => /\d|río|capital|fund|premio|obra|cordillera|parque|provincia|club|selección|museo/iu.test(sentence)) || '';
}

function makeClue(title, extract, category) {
  const answerLabel = cleanTitle(title);
  const text = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const facts = extractFacts(text);
  const unique = distinctiveSentence(text, answerLabel);

  if (category === 'Provincias de Argentina') {
    if (facts.capital) return `Provincia argentina cuya capital es ${facts.capital}.`;
    return unique;
  }
  if (category === 'Ciudades de Argentina') {
    if (facts.province && facts.river) return `Ciudad de la provincia de ${facts.province}, situada junto al río ${facts.river}.`;
    if (facts.province && facts.area) return `Ciudad de ${facts.province} que forma parte de ${facts.area}.`;
    if (facts.province && facts.founded) return `Ciudad de ${facts.province}, fundada ${facts.founded}.`;
    if (facts.province && facts.distance) return `Ciudad de ${facts.province}, ubicada ${facts.distance}.`;
    return unique;
  }
  if (category === 'Ríos de Argentina') {
    if (facts.province) return `Río argentino asociado a la provincia de ${facts.province}.`;
    return unique;
  }
  if (category === 'Montañas de Argentina') {
    if (facts.province && facts.elevation) return `Montaña de ${facts.province}, con una altitud aproximada de ${facts.elevation}.`;
    if (facts.province) return `Montaña argentina ubicada en la provincia de ${facts.province}.`;
    return unique;
  }
  if (category === 'Parques nacionales de Argentina') {
    if (facts.province) return `Parque nacional argentino ubicado en ${facts.province}.`;
    return unique;
  }
  if (category === 'Escritores de Argentina') {
    if (facts.work) return `Autor o autora argentina conocido por ${facts.work}.`;
    if (facts.born) return `Escritor o escritora argentina nacido en ${facts.born}.`;
    return unique;
  }
  if (category === 'Cantantes de Argentina') {
    if (facts.work) return `Cantante de Argentina conocido por ${facts.work}.`;
    if (facts.born) return `Cantante argentino nacido en ${facts.born}.`;
    return unique;
  }
  if (category === 'Futbolistas de Argentina') {
    if (facts.born) return `Futbolista argentino nacido en ${facts.born}.`;
    return unique;
  }
  if (category === 'Científicos de Argentina') {
    if (facts.work) return `Científico argentino destacado por ${facts.work}.`;
    if (facts.born) return `Científico argentino nacido en ${facts.born}.`;
    return unique;
  }
  if (category === 'Políticos de Argentina') {
    if (facts.born) return `Figura de la política argentina nacida en ${facts.born}.`;
    return unique;
  }
  if (category === 'Museos de Argentina') {
    if (facts.province) return `Museo argentino ubicado en ${facts.province}.`;
    return unique;
  }
  return unique;
}

function isGenericClue(question) {
  const normalized = question.toLowerCase();
  return [
    'provincia de la república argentina',
    'ciudad o localidad de la argentina',
    'río de la argentina',
    'montaña o cumbre de la argentina',
    'escritor o escritora de la argentina',
    'cantante de la argentina',
    'futbolista de nacionalidad argentina',
    'científico o científica de la argentina',
    'figura de la política argentina',
    'museo ubicado en la argentina',
  ].some(value => normalized.includes(value));
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

async function getCategoryPages(category, limit = 40) {
  const data = await wikipedia({
    action: 'query',
    generator: 'categorymembers',
    gcmtitle: `Categoría:${category}`,
    gcmtype: 'page',
    gcmlimit: String(limit),
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    redirects: '1',
  });
  return Object.values(data.query?.pages || {}).map(page => ({
    title: page.title,
    extract: page.extract || '',
    category,
  }));
}

async function collectCandidates(categories) {
  const candidates = [];
  const categoryErrors = [];
  const ordered = shuffle(categories);
  const batchSize = 3;

  for (let i = 0; i < ordered.length; i += batchSize) {
    const batch = ordered.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(category => getCategoryPages(category, 40)));
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
  const excludedList = String(req.query.exclude || '')
    .split(',')
    .map(normalizeAnswer)
    .filter(Boolean)
    .slice(0, 80);

  try {
    const { candidates, categoryErrors } = await collectCandidates(CATEGORY_POOLS[level]);
    if (!candidates.length) return send(res, 502, { error: 'wikipedia_fetch_failed', categoryErrors });

    function buildQuestions(excluded) {
      const seen = new Set();
      const seenClues = new Set();
      const questions = [];
      for (const item of shuffle(candidates)) {
        const answerLabel = cleanTitle(item.title);
        const answer = normalizeAnswer(answerLabel);
        if (answer.length < config.min || answer.length > config.max) continue;
        if (excluded.has(answer) || seen.has(answer)) continue;
        const question = makeClue(item.title, item.extract, item.category);
        if (!question || question.length < 24 || question.length > 150) continue;
        if (isGenericClue(question) || normalizeAnswer(question).includes(answer)) continue;
        const clueKey = question.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seenClues.has(clueKey)) continue;
        seen.add(answer);
        seenClues.add(clueKey);
        questions.push({
          question,
          answer,
          sourceTitle: item.title,
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
      requestedCount,
      historyRelaxed,
      categoryErrors,
      candidateCount: candidates.length,
      questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'wikipedia_fetch_failed', detail: error?.message || 'unknown' });
  }
}
