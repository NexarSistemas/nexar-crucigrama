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

const VERIFIED_CLUES = [
  ['MENDOZA','Provincia argentina famosa mundialmente por sus vinos Malbec.','facil'],
  ['USHUAIA','Capital de la provincia de Tierra del Fuego.','facil'],
  ['ANDES','Cordillera que marca gran parte del límite entre Argentina y Chile.','facil'],
  ['PARANA','Río que recorre el Litoral argentino y desemboca en el Río de la Plata.','facil'],
  ['ACONCAGUA','Montaña más alta de América, ubicada en Mendoza.','facil'],
  ['ROSARIO','Ciudad santafesina donde Manuel Belgrano creó la bandera argentina.','facil'],
  ['SALTA','Provincia del noroeste argentino conocida como La Linda.','facil'],
  ['BARILOCHE','Ciudad rionegrina famosa por sus lagos, montañas y centros de esquí.','facil'],
  ['TANGO','Baile rioplatense reconocido internacionalmente.','facil'],
  ['MATE','Infusión tradicional argentina que suele compartirse en ronda.','facil'],
  ['CHUBUT','Provincia patagónica cuya capital es Rawson.','facil'],
  ['JUJUY','Provincia argentina cuya capital es San Salvador de Jujuy.','facil'],
  ['NEUQUEN','Provincia patagónica cuya capital lleva el mismo nombre.','medio'],
  ['IGUAZU','Cataratas ubicadas en Misiones, compartidas por Argentina y Brasil.','medio'],
  ['NAHUELHUAPI','Lago patagónico ubicado entre Río Negro y Neuquén.','medio'],
  ['CALAFATE','Localidad santacruceña considerada puerta de acceso al glaciar Perito Moreno.','medio'],
  ['PERITOMORENO','Glaciar argentino famoso por sus periódicos desprendimientos de hielo.','medio'],
  ['BELGRANO','Apellido del creador de la bandera argentina.','facil'],
  ['SANMARTIN','Apellido del Libertador que encabezó el cruce de los Andes.','facil'],
  ['BORGES','Apellido del autor argentino de El Aleph y Ficciones.','medio'],
  ['CORTAZAR','Apellido del autor argentino de Rayuela.','medio'],
  ['SABATO','Apellido del autor argentino de El túnel y Sobre héroes y tumbas.','medio'],
  ['FAVALORO','Apellido del cardiocirujano argentino reconocido por desarrollar el bypass coronario.','pro'],
  ['HOUSSAY','Apellido del científico argentino ganador del Premio Nobel de Medicina en 1947.','pro'],
  ['MILSTEIN','Apellido del científico argentino ganador del Premio Nobel de Medicina en 1984.','pro'],
  ['MAFALDA','Personaje de historieta creado por el dibujante argentino Quino.','medio'],
  ['PENINSULAVALDES','Área natural de Chubut famosa por el avistaje de ballenas francas australes.','pro'],
  ['TALAMPAYA','Parque nacional riojano conocido por sus formaciones geológicas rojizas.','pro'],
];

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
  const text = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const f = extractFacts(text);
  Object.keys(f).forEach(key => { f[key] = trimFact(f[key]); });

  if (level === 'facil') {
    if (category === 'Provincias de Argentina' && f.capital) return `Provincia argentina cuya capital es ${f.capital}.`;
    if (category === 'Ciudades de Argentina' && f.province && f.river) return `Ciudad de ${f.province} situada junto al río ${f.river}.`;
    if (category === 'Montañas de Argentina' && f.province && f.elevation) return `Montaña de ${f.province}, de aproximadamente ${f.elevation} de altitud.`;
    return '';
  }

  if (category === 'Provincias de Argentina' && f.capital) return `Provincia argentina cuya capital es ${f.capital}.`;
  if (category === 'Ciudades de Argentina') {
    if (f.province && f.river) return `Ciudad de ${f.province} situada junto al río ${f.river}.`;
    if (f.province && f.area) return `Ciudad de ${f.province} que integra ${f.area}.`;
    if (level === 'pro' && f.province && f.founded) return `Ciudad de ${f.province}, fundada ${f.founded}.`;
    return '';
  }
  if (category === 'Ríos de Argentina' && f.province) return `Río argentino vinculado con la provincia de ${f.province}.`;
  if (category === 'Montañas de Argentina' && f.province && f.elevation) return `Montaña de ${f.province}, de aproximadamente ${f.elevation} de altitud.`;
  if (category === 'Parques nacionales de Argentina' && f.province) return `Parque nacional argentino ubicado en ${f.province}.`;
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
  if (category === 'Museos de Argentina' && f.province) return `Museo argentino ubicado en ${f.province}.`;
  return '';
}

function isGoodClue(question, level) {
  if (!question || question.length < 24 || question.length > 125) return false;
  const q = question.toLowerCase();
  const banned = [
    'se subdivide', 'partido homónimo', 'departamento homónimo', 'microcentro',
    'a aproximadamente', 'nació en', 'de origen mendocino', 'de origen argentino',
    'es un actor', 'es una actriz', 'es un cantante', 'es una cantante',
    'es un futbolista', 'es una futbolista', 'es un político', 'es una política',
  ];
  if (banned.some(value => q.includes(value))) return false;
  if (/\b\d{1,3}\s*km\b/iu.test(question)) return false;
  if (/\b(19|20)\d{2}\b/u.test(question) && level !== 'pro') return false;
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

function verifiedFor(level, excluded) {
  const rank = { facil: 0, medio: 1, pro: 2 };
  return shuffle(VERIFIED_CLUES)
    .filter(([answer,, minimum]) => rank[minimum] <= rank[level] && !excluded.has(answer))
    .map(([answer, question]) => ({
      question,
      answer,
      sourceTitle: answer,
      sourceUrl: `https://es.wikipedia.org/wiki/${encodeURIComponent(answer.replace(/ /g, '_'))}`,
      verifiedFallback: true,
    }));
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
      }

      for (const item of verifiedFor(level, excluded)) {
        if (questions.length >= requestedCount) break;
        if (seen.has(item.answer)) continue;
        seen.add(item.answer);
        questions.push(item);
      }
      return questions.slice(0, requestedCount);
    }

    let questions = buildQuestions(new Set(excludedList));
    let historyRelaxed = false;
    if (questions.length < Math.min(12, requestedCount) && excludedList.length) {
      questions = buildQuestions(new Set(excludedList.slice(Math.ceil(excludedList.length / 2))));
      historyRelaxed = true;
    }
    if (questions.length < 6) {
      questions = buildQuestions(new Set());
      historyRelaxed = true;
    }

    if (questions.length < 6) {
      return send(res, 502, { error: 'insufficient_wikipedia_questions', generated: questions.length, candidates: candidates.length, categoryErrors });
    }

    const verifiedFallbackCount = questions.filter(q => q.verifiedFallback).length;
    return send(res, 200, {
      source: verifiedFallbackCount ? 'wikipedia-es+verificado' : 'wikipedia-es',
      level, requestedCount, historyRelaxed, categoryErrors,
      candidateCount: candidates.length, verifiedFallbackCount, questions,
    });
  } catch (error) {
    console.error(error);
    return send(res, 502, { error: 'wikipedia_fetch_failed', detail: error?.message || 'unknown' });
  }
}
