window.QuestionSource = (() => {
  const fallback = [
    { q: 'Provincia argentina famosa por sus vinos Malbec', a: 'MENDOZA' },
    { q: 'Infusión tradicional que se comparte en ronda', a: 'MATE' },
    { q: 'Baile rioplatense reconocido en todo el mundo', a: 'TANGO' },
    { q: 'Provincia cuya capital es Rawson', a: 'CHUBUT' },
    { q: 'Ciudad santafesina donde se creó la bandera argentina', a: 'ROSARIO' },
    { q: 'Apellido del creador de la bandera argentina', a: 'BELGRANO' },
    { q: 'Cordillera que separa Argentina de Chile', a: 'ANDES' },
    { q: 'Capital de Tierra del Fuego', a: 'USHUAIA' },
    { q: 'Provincia conocida como La Linda', a: 'SALTA' },
    { q: 'Región argentina famosa por sus viñedos', a: 'CUYO' },
    { q: 'Pico más alto de América', a: 'ACONCAGUA' },
    { q: 'Río importante del Litoral argentino', a: 'PARANA' },
    { q: 'Región del sur argentino con glaciares y montañas', a: 'PATAGONIA' },
    { q: 'Ciudad rionegrina famosa por sus lagos y esquí', a: 'BARILOCHE' },
    { q: 'Apellido del Libertador que cruzó los Andes', a: 'SANMARTIN' },
    { q: 'Edificio histórico frente a Plaza de Mayo', a: 'CABILDO' },
  ];

  const HISTORY_KEY = 'nexar_crucigrama_recent_answers';
  const HISTORY_LIMIT = 80;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-zÑñ]/g, '')
    .toUpperCase();

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value.map(normalize).filter(Boolean).slice(-HISTORY_LIMIT) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(questions) {
    try {
      const previous = readHistory();
      const current = questions.map(item => normalize(item.a)).filter(Boolean);
      const unique = [...new Set([...previous, ...current])].slice(-HISTORY_LIMIT);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(unique));
    } catch {
      // localStorage puede no estar disponible.
    }
  }

  async function get(level) {
    try {
      const history = readHistory();
      const params = new URLSearchParams({ level });
      if (history.length) params.set('exclude', history.join(','));

      const apiBase = window.NEXAR_QUESTIONS_API_URL || '/api/questions';
      const separator = apiBase.includes('?') ? '&' : '?';
      const response = await fetch(`${apiBase}${separator}${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data.questions) || data.questions.length < 6) throw new Error('Respuesta incompleta');

      const questions = data.questions
        .map(item => ({ q: String(item.question || '').trim(), a: normalize(item.answer) }))
        .filter(item => item.q && item.a.length >= 3);

      if (questions.length < 6) throw new Error('Preguntas inválidas');
      saveHistory(questions);
      return { source: data.source || 'cloud', questions };
    } catch (error) {
      console.warn('No se pudo cargar preguntas desde la nube. Se usa respaldo local.', error);
      return { source: 'local', questions: [...fallback].sort(() => Math.random() - 0.5) };
    }
  }

  return { get };
})();
