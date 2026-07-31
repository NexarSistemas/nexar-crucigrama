window.Crossword = (() => {
  const LEVELS = {
    facil: { size: 6, target: 5, maxWord: 6, ideal: 4.5, seeds: 18, nodeLimit: 2600, branch: 4 },
    medio: { size: 8, target: 8, maxWord: 8, ideal: 5.5, seeds: 26, nodeLimit: 5200, branch: 5 },
    pro: { size: 15, target: 14, maxWord: 11, ideal: 7, seeds: 40, nodeLimit: 18000, branch: 6 },
  };

  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const cloneGrid = grid => grid.map(row => row.map(cell => cell ? { letter: cell.letter, dirs: new Set(cell.dirs) } : null));

  function cellsFor(word, row, col, dir) {
    return [...word.a].map((letter, i) => ({
      r: row + (dir === 'V' ? i : 0),
      c: col + (dir === 'H' ? i : 0),
      letter,
    }));
  }

  function inspectPlacement(grid, word, row, col, dir, requireCross = true) {
    const size = grid.length;
    const cells = cellsFor(word, row, col, dir);
    let crosses = 0;
    let fresh = 0;

    for (const { r, c, letter } of cells) {
      if (r < 0 || c < 0 || r >= size || c >= size) return null;
      const cell = grid[r][c];
      if (!cell) {
        fresh++;
        continue;
      }
      if (cell.letter !== letter) return null;
      if (cell.dirs.has(dir)) return null;
      crosses++;
    }

    if (requireCross && crosses === 0) return null;

    const before = dir === 'H' ? [row, col - 1] : [row - 1, col];
    const after = dir === 'H' ? [row, col + word.a.length] : [row + word.a.length, col];
    for (const [r, c] of [before, after]) {
      if (r >= 0 && c >= 0 && r < size && c < size && grid[r][c]) return null;
    }

    for (const { r, c } of cells) {
      if (grid[r][c]) continue;
      if (dir === 'H') {
        if ((r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])) return null;
      } else {
        if ((c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1])) return null;
      }
    }

    return { crosses, fresh };
  }

  function place(grid, word, row, col, dir) {
    for (const { r, c, letter } of cellsFor(word, row, col, dir)) {
      if (!grid[r][c]) grid[r][c] = { letter, dirs: new Set([dir]) };
      else grid[r][c].dirs.add(dir);
    }
    return { ...word, row, col, dir };
  }

  function placementsFor(grid, word) {
    const size = grid.length;
    const out = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        for (let i = 0; i < word.a.length; i++) {
          if (word.a[i] !== cell.letter) continue;
          for (const dir of ['H', 'V']) {
            if (cell.dirs.has(dir)) continue;
            const row = dir === 'V' ? r - i : r;
            const col = dir === 'H' ? c - i : c;
            const info = inspectPlacement(grid, word, row, col, dir, true);
            if (!info) continue;

            const center = (size - 1) / 2;
            const endR = row + (dir === 'V' ? word.a.length - 1 : 0);
            const endC = col + (dir === 'H' ? word.a.length - 1 : 0);
            const midR = (row + endR) / 2;
            const midC = (col + endC) / 2;
            const centerDistance = Math.abs(midR - center) + Math.abs(midC - center);
            const score = info.crosses * 60 + info.fresh * 1.5 - centerDistance * 1.3;
            out.push({ row, col, dir, ...info, score });
          }
        }
      }
    }

    const dedup = new Map();
    for (const p of out) dedup.set(`${p.row}:${p.col}:${p.dir}`, p);
    return [...dedup.values()].sort((a, b) => b.score - a.score || Math.random() - 0.5);
  }

  function metrics(grid, words) {
    let occupied = 0;
    let intersections = 0;
    let minR = grid.length, maxR = -1, minC = grid.length, maxC = -1;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        occupied++;
        if (cell.dirs.size > 1) intersections++;
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
    }

    if (!occupied) return { score: -Infinity };
    const spanR = maxR - minR + 1;
    const spanC = maxC - minC + 1;
    const bbox = spanR * spanC;
    const density = occupied / bbox;
    const coverage = bbox / (grid.length * grid.length);
    const h = words.filter(w => w.dir === 'H').length;
    const v = words.length - h;
    const balance = words.length ? 1 - Math.abs(h - v) / words.length : 0;

    const score = words.length * 520
      + intersections * 95
      + balance * 220
      + density * 130
      + coverage * 80
      + occupied;

    return { score, occupied, intersections, density, coverage, balance };
  }

  function orderedForSeed(words, cfg) {
    return shuffle(words).sort((a, b) => {
      const da = Math.abs(a.a.length - cfg.ideal);
      const db = Math.abs(b.a.length - cfg.ideal);
      return da - db || Math.random() - 0.5;
    });
  }

  function seedState(words, cfg, seedIndex) {
    const grid = Array.from({ length: cfg.size }, () => Array(cfg.size).fill(null));
    const candidates = orderedForSeed(words, cfg);
    const first = candidates[seedIndex % candidates.length];
    if (!first) return null;

    const dir = seedIndex % 2 ? 'V' : 'H';
    const row = dir === 'H' ? Math.floor(cfg.size / 2) : Math.floor((cfg.size - first.a.length) / 2);
    const col = dir === 'H' ? Math.floor((cfg.size - first.a.length) / 2) : Math.floor(cfg.size / 2);
    if (!inspectPlacement(grid, first, row, col, dir, false)) return null;

    return {
      grid,
      placed: [place(grid, first, row, col, dir)],
      remaining: candidates.filter(w => w !== first),
    };
  }

  function search(seed, cfg) {
    let best = seed;
    let bestMetrics = metrics(seed.grid, seed.placed);
    let nodes = 0;

    function visit(state) {
      if (++nodes > cfg.nodeLimit) return;

      const currentMetrics = metrics(state.grid, state.placed);
      if (currentMetrics.score > bestMetrics.score) {
        best = state;
        bestMetrics = currentMetrics;
      }
      if (state.placed.length >= cfg.target) return;

      const ranked = [];
      for (const word of state.remaining) {
        const placements = placementsFor(state.grid, word);
        if (!placements.length) continue;
        const lengthFit = 18 - Math.abs(word.a.length - cfg.ideal) * 2;
        ranked.push({
          word,
          placements,
          potential: placements[0].score + placements.length * 3 + lengthFit,
        });
      }

      ranked.sort((a, b) => b.potential - a.potential || Math.random() - 0.5);

      for (const choice of ranked.slice(0, cfg.branch)) {
        for (const p of choice.placements.slice(0, cfg.branch)) {
          const grid = cloneGrid(state.grid);
          const placedWord = place(grid, choice.word, p.row, p.col, p.dir);
          visit({
            grid,
            placed: [...state.placed, placedWord],
            remaining: state.remaining.filter(w => w !== choice.word),
          });
          if (nodes > cfg.nodeLimit) return;
        }
      }
    }

    visit(seed);
    return { state: best, metrics: bestMetrics };
  }

  function build(items, level = 'facil') {
    const cfg = LEVELS[level] || LEVELS.facil;
    const usable = items
      .filter(w => w?.a && w.a.length >= 3 && w.a.length <= cfg.maxWord)
      .filter((w, i, arr) => arr.findIndex(x => x.a === w.a) === i);
    if (!usable.length) return null;

    let globalBest = null;
    const seedCount = Math.min(cfg.seeds, usable.length * 2);

    for (let seedIndex = 0; seedIndex < seedCount; seedIndex++) {
      const seed = seedState(usable, cfg, seedIndex);
      if (!seed) continue;
      const result = search(seed, cfg);
      if (!globalBest || result.metrics.score > globalBest.metrics.score) globalBest = result;
      if (result.state.placed.length >= cfg.target && result.metrics.balance >= 0.7) break;
    }

    if (!globalBest) return null;
    const outGrid = globalBest.state.grid.map(row => row.map(cell => cell?.letter || null));
    return {
      grid: outGrid,
      words: globalBest.state.placed,
      size: cfg.size,
      stats: globalBest.metrics,
    };
  }

  return { build };
})();
