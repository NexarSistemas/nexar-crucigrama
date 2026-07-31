window.Crossword = (() => {
  const CONFIG = {
    facil: { size: 6, minWords: 4, nodeLimit: 7000 },
    medio: { size: 8, minWords: 7, nodeLimit: 18000 },
    pro: { size: 15, minWords: 12, nodeLimit: 70000 },
  };

  // # = bloque negro, . = casilla de letra. Las plantillas son deliberadamente
  // densas y simétricas para lograr un aspecto de crucigrama tradicional.
  const TEMPLATES = {
    facil: [
      [
        '...#..',
        '......',
        '..#...',
        '...#..',
        '......',
        '..#...',
      ],
      [
        '......',
        '..#...',
        '......',
        '...#..',
        '......',
        '...#..',
      ],
    ],
    medio: [
      [
        '...#....',
        '........',
        '..#...#.',
        '........',
        '.#...#..',
        '........',
        '....#...',
        '........',
      ],
      [
        '........',
        '.#...#..',
        '........',
        '...#....',
        '....#...',
        '........',
        '..#...#.',
        '........',
      ],
    ],
    pro: [
      [
        '.....#....#....',
        '...............',
        '..#....#....#..',
        '...............',
        '....#.....#....',
        '#.............#',
        '...#.......#...',
        '...............',
        '...#.......#...',
        '#.............#',
        '....#.....#....',
        '...............',
        '..#....#....#..',
        '...............',
        '....#....#.....',
      ],
      [
        '....#.....#....',
        '...............',
        '.#....#.#....#.',
        '...............',
        '...#.......#...',
        '...............',
        '#....#...#....#',
        '...............',
        '#....#...#....#',
        '...............',
        '...#.......#...',
        '...............',
        '.#....#.#....#.',
        '...............',
        '....#.....#....',
      ],
    ],
  };

  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function parseTemplate(lines) {
    return lines.map(line => [...line].map(ch => ch === '#' ? '#' : null));
  }

  function collectSlots(template) {
    const size = template.length;
    const slots = [];
    let id = 0;

    for (let r = 0; r < size; r++) {
      let c = 0;
      while (c < size) {
        while (c < size && template[r][c] === '#') c++;
        const start = c;
        while (c < size && template[r][c] !== '#') c++;
        const length = c - start;
        if (length >= 3) slots.push({ id: id++, row: r, col: start, dir: 'H', length });
      }
    }

    for (let c = 0; c < size; c++) {
      let r = 0;
      while (r < size) {
        while (r < size && template[r][c] === '#') r++;
        const start = r;
        while (r < size && template[r][c] !== '#') r++;
        const length = r - start;
        if (length >= 3) slots.push({ id: id++, row: start, col: c, dir: 'V', length });
      }
    }

    return slots;
  }

  function slotCells(slot) {
    return Array.from({ length: slot.length }, (_, i) => ({
      r: slot.row + (slot.dir === 'V' ? i : 0),
      c: slot.col + (slot.dir === 'H' ? i : 0),
    }));
  }

  function fits(grid, slot, answer) {
    if (answer.length !== slot.length) return false;
    return slotCells(slot).every(({ r, c }, i) => grid[r][c] == null || grid[r][c] === answer[i]);
  }

  function writeWord(grid, slot, answer) {
    const changed = [];
    slotCells(slot).forEach(({ r, c }, i) => {
      if (grid[r][c] == null) {
        grid[r][c] = answer[i];
        changed.push([r, c]);
      }
    });
    return changed;
  }

  function undo(grid, changed) {
    changed.forEach(([r, c]) => { grid[r][c] = null; });
  }

  function candidatesFor(grid, slot, words, used) {
    return words.filter((word, idx) => !used.has(idx) && fits(grid, slot, word.a));
  }

  function fillTemplate(items, lines, cfg) {
    const template = parseTemplate(lines);
    const slots = collectSlots(template);
    const words = shuffle(items)
      .filter(w => w?.a && w.a.length >= 3 && w.a.length <= cfg.size)
      .filter((w, i, arr) => arr.findIndex(x => x.a === w.a) === i);

    if (!words.length || !slots.length) return null;

    const byLength = new Map();
    words.forEach((word, idx) => {
      if (!byLength.has(word.a.length)) byLength.set(word.a.length, []);
      byLength.get(word.a.length).push(idx);
    });

    // Si una plantilla exige demasiadas longitudes que ni siquiera existen,
    // se descarta antes de entrar al backtracking.
    const feasibleSlots = slots.filter(slot => byLength.has(slot.length));
    if (feasibleSlots.length < cfg.minWords) return null;

    const grid = template.map(row => row.map(cell => cell === '#' ? '#' : null));
    const used = new Set();
    const assigned = new Map();
    let bestAssigned = new Map();
    let bestGrid = grid.map(row => [...row]);
    let nodes = 0;

    function chooseSlot() {
      let best = null;
      for (const slot of feasibleSlots) {
        if (assigned.has(slot.id)) continue;
        const pool = candidatesFor(grid, slot, words, used);
        if (!pool.length) continue;
        if (!best || pool.length < best.pool.length) best = { slot, pool };
      }
      return best;
    }

    function visit() {
      if (++nodes > cfg.nodeLimit) return;
      if (assigned.size > bestAssigned.size) {
        bestAssigned = new Map(assigned);
        bestGrid = grid.map(row => [...row]);
      }
      if (assigned.size >= feasibleSlots.length) return;

      const choice = chooseSlot();
      if (!choice) return;

      const ordered = shuffle(choice.pool).sort((a, b) => {
        const wa = words[a], wb = words[b];
        const ca = slotCells(choice.slot).filter(({ r, c }, i) => grid[r][c] === wa.a[i]).length;
        const cb = slotCells(choice.slot).filter(({ r, c }, i) => grid[r][c] === wb.a[i]).length;
        return cb - ca;
      });

      for (const word of ordered) {
        const idx = words.indexOf(word);
        if (idx < 0 || used.has(idx)) continue;
        const changed = writeWord(grid, choice.slot, word.a);
        used.add(idx);
        assigned.set(choice.slot.id, { slot: choice.slot, word });
        visit();
        assigned.delete(choice.slot.id);
        used.delete(idx);
        undo(grid, changed);
        if (nodes > cfg.nodeLimit) return;
      }
    }

    visit();
    if (bestAssigned.size < cfg.minWords) return null;

    // Las casillas blancas no utilizadas se convierten en bloques negros.
    const usedCells = new Set();
    const placed = [];
    for (const { slot, word } of bestAssigned.values()) {
      slotCells(slot).forEach(({ r, c }) => usedCells.add(`${r}:${c}`));
      placed.push({ ...word, row: slot.row, col: slot.col, dir: slot.dir });
    }

    const finalGrid = bestGrid.map((row, r) => row.map((cell, c) => {
      if (cell === '#') return null;
      return usedCells.has(`${r}:${c}`) ? cell : null;
    }));

    const h = placed.filter(w => w.dir === 'H').length;
    const v = placed.length - h;
    return {
      grid: finalGrid,
      words: placed,
      size: cfg.size,
      stats: {
        words: placed.length,
        horizontal: h,
        vertical: v,
        templateSlots: slots.length,
        fillRatio: placed.length / slots.length,
      },
    };
  }

  function build(items, level = 'facil') {
    const cfg = CONFIG[level] || CONFIG.facil;
    let best = null;

    for (const lines of shuffle(TEMPLATES[level] || TEMPLATES.facil)) {
      const result = fillTemplate(items, lines, cfg);
      if (!result) continue;
      if (!best || result.words.length > best.words.length ||
          (result.words.length === best.words.length && Math.abs(result.stats.horizontal - result.stats.vertical) < Math.abs(best.stats.horizontal - best.stats.vertical))) {
        best = result;
      }
    }

    return best;
  }

  return { build };
})();
