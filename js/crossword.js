window.Crossword = (() => {
  const LEVELS = {
    facil: { size: 6, target: 5, attempts: 320, minLen: 3, maxLen: 6 },
    medio: { size: 8, target: 8, attempts: 520, minLen: 4, maxLen: 8 },
    pro: { size: 15, target: 14, attempts: 900, minLen: 4, maxLen: 11 },
  };

  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const makeGrid = size => Array.from({ length: size }, () => Array(size).fill(null));
  const makeDirs = size => Array.from({ length: size }, () => Array.from({ length: size }, () => ({ H: false, V: false })));

  function cellsFor(word, row, col, dir) {
    return [...word.a].map((letter, i) => ({
      r: row + (dir === 'V' ? i : 0),
      c: col + (dir === 'H' ? i : 0),
      letter,
    }));
  }

  function boundsOf(grid) {
    const used = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) if (grid[r][c]) used.push([r, c]);
    }
    if (!used.length) return null;
    const rows = used.map(x => x[0]);
    const cols = used.map(x => x[1]);
    return {
      r0: Math.min(...rows), r1: Math.max(...rows),
      c0: Math.min(...cols), c1: Math.max(...cols),
    };
  }

  function canPlace(grid, dirs, word, row, col, dir, requireCross = true) {
    const size = grid.length;
    const cells = cellsFor(word, row, col, dir);
    let crosses = 0;
    let newCells = 0;

    for (const { r, c, letter } of cells) {
      if (r < 0 || c < 0 || r >= size || c >= size) return null;
      const current = grid[r][c];
      if (current && current !== letter) return null;
      if (dirs[r][c][dir]) return null;
      if (current === letter) crosses++;
      else newCells++;
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

    return { crosses, newCells };
  }

  function place(grid, dirs, word, row, col, dir) {
    for (const { r, c, letter } of cellsFor(word, row, col, dir)) {
      grid[r][c] = letter;
      dirs[r][c][dir] = true;
    }
    return { ...word, row, col, dir };
  }

  function placementScore(grid, placed, word, placement) {
    const { row, col, dir, crosses, newCells } = placement;
    const size = grid.length;
    const center = (size - 1) / 2;
    const midR = row + (dir === 'V' ? (word.a.length - 1) / 2 : 0);
    const midC = col + (dir === 'H' ? (word.a.length - 1) / 2 : 0);
    const distance = Math.abs(midR - center) + Math.abs(midC - center);

    const h = placed.filter(w => w.dir === 'H').length;
    const v = placed.length - h;
    const balanceBonus = dir === 'H' ? Math.max(0, v - h) * 18 : Math.max(0, h - v) * 18;

    const before = boundsOf(grid);
    let expansion = 0;
    if (before) {
      const cells = cellsFor(word, row, col, dir);
      const r0 = Math.min(before.r0, ...cells.map(x => x.r));
      const r1 = Math.max(before.r1, ...cells.map(x => x.r));
      const c0 = Math.min(before.c0, ...cells.map(x => x.c));
      const c1 = Math.max(before.c1, ...cells.map(x => x.c));
      const oldArea = (before.r1 - before.r0 + 1) * (before.c1 - before.c0 + 1);
      const newArea = (r1 - r0 + 1) * (c1 - c0 + 1);
      expansion = newArea - oldArea;
    }

    return crosses * 130 + newCells * 5 + balanceBonus - distance * 3 - expansion * 2;
  }

  function candidatePlacements(grid, dirs, placed, word) {
    const out = [];
    const seen = new Set();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        const letter = grid[r][c];
        if (!letter) continue;

        for (let i = 0; i < word.a.length; i++) {
          if (word.a[i] !== letter) continue;
          for (const dir of ['H', 'V']) {
            const row = r - (dir === 'V' ? i : 0);
            const col = c - (dir === 'H' ? i : 0);
            const key = `${row}:${col}:${dir}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const valid = canPlace(grid, dirs, word, row, col, dir, true);
            if (!valid) continue;
            out.push({ row, col, dir, ...valid });
          }
        }
      }
    }

    return out
      .map(p => ({ ...p, score: placementScore(grid, placed, word, p) }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5);
  }

  function layoutScore(grid, dirs, placed) {
    let occupied = 0;
    let intersections = 0;
    const usedRows = new Set();
    const usedCols = new Set();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        if (!grid[r][c]) continue;
        occupied++;
        usedRows.add(r);
        usedCols.add(c);
        if (dirs[r][c].H && dirs[r][c].V) intersections++;
      }
    }

    const bounds = boundsOf(grid);
    const area = bounds ? (bounds.r1 - bounds.r0 + 1) * (bounds.c1 - bounds.c0 + 1) : grid.length * grid.length;
    const density = area ? occupied / area : 0;
    const h = placed.filter(w => w.dir === 'H').length;
    const v = placed.length - h;
    const balancePenalty = Math.abs(h - v) * 45;
    const spread = usedRows.size + usedCols.size;

    return placed.length * 250 + intersections * 95 + density * 500 + spread * 18 - balancePenalty;
  }

  function pickFirst(usable, cfg, attempt) {
    const preferred = usable.filter(w => w.a.length >= Math.max(cfg.minLen, Math.floor(cfg.size * 0.35)) && w.a.length <= Math.min(cfg.maxLen, Math.ceil(cfg.size * 0.72)));
    const pool = preferred.length ? preferred : usable;
    return shuffle(pool)[attempt % pool.length];
  }

  function build(items, level = 'facil') {
    const cfg = LEVELS[level] || LEVELS.facil;
    const usable = items
      .filter(w => w?.a && w.a.length >= cfg.minLen && w.a.length <= cfg.maxLen)
      .filter((w, index, arr) => arr.findIndex(x => x.a === w.a) === index);
    if (!usable.length) return null;

    let best = null;

    for (let attempt = 0; attempt < cfg.attempts; attempt++) {
      const grid = makeGrid(cfg.size);
      const dirs = makeDirs(cfg.size);
      const first = pickFirst(usable, cfg, attempt);
      const firstDir = attempt % 2 ? 'V' : 'H';
      const firstRow = firstDir === 'H' ? Math.floor(cfg.size / 2) : Math.floor((cfg.size - first.a.length) / 2);
      const firstCol = firstDir === 'H' ? Math.floor((cfg.size - first.a.length) / 2) : Math.floor(cfg.size / 2);
      const placed = [place(grid, dirs, first, firstRow, firstCol, firstDir)];
      const used = new Set([first.a]);

      while (placed.length < cfg.target) {
        const options = [];
        for (const word of usable) {
          if (used.has(word.a)) continue;
          const placements = candidatePlacements(grid, dirs, placed, word);
          for (const placement of placements.slice(0, 3)) {
            options.push({ word, placement, score: placement.score });
          }
        }

        if (!options.length) break;
        options.sort((a, b) => b.score - a.score || Math.random() - 0.5);
        const topCount = Math.min(level === 'pro' ? 8 : 5, options.length);
        const choice = options[Math.floor(Math.random() * topCount)];
        placed.push(place(grid, dirs, choice.word, choice.placement.row, choice.placement.col, choice.placement.dir));
        used.add(choice.word.a);
      }

      const score = layoutScore(grid, dirs, placed);
      if (!best || score > best.score) best = { grid, dirs, words: placed, score, size: cfg.size };

      if (best.words.length >= cfg.target && attempt > Math.floor(cfg.attempts * 0.35)) break;
    }

    return best ? { grid: best.grid, words: best.words, size: best.size } : null;
  }

  return { build };
})();