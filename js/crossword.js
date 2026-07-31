window.Crossword = (() => {
  const LEVELS = {
    facil: { size: 6, target: 5, attempts: 220 },
    medio: { size: 8, target: 9, attempts: 320 },
    pro: { size: 15, target: 18, attempts: 520 },
  };

  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function cellsFor(word, row, col, dir) {
    return [...word.a].map((letter, i) => ({
      r: row + (dir === 'V' ? i : 0),
      c: col + (dir === 'H' ? i : 0),
      letter,
    }));
  }

  function canPlace(grid, word, row, col, dir, requireCross = true) {
    const size = grid.length;
    const cells = cellsFor(word, row, col, dir);
    let crosses = 0;

    for (const { r, c, letter } of cells) {
      if (r < 0 || c < 0 || r >= size || c >= size) return null;
      const current = grid[r][c];
      if (current && current !== letter) return null;
      if (current === letter) crosses++;
    }

    if (requireCross && crosses === 0) return null;

    // Evita formar palabras paralelas pegadas accidentalmente.
    for (const { r, c } of cells) {
      if (grid[r][c]) continue;
      if (dir === 'H') {
        if ((r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])) return null;
      } else if ((c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1])) return null;
    }

    const before = dir === 'H' ? [row, col - 1] : [row - 1, col];
    const after = dir === 'H' ? [row, col + word.a.length] : [row + word.a.length, col];
    for (const [r, c] of [before, after]) {
      if (r >= 0 && c >= 0 && r < size && c < size && grid[r][c]) return null;
    }

    return crosses;
  }

  function place(grid, word, row, col, dir) {
    for (const { r, c, letter } of cellsFor(word, row, col, dir)) grid[r][c] = letter;
    return { ...word, row, col, dir };
  }

  function candidatePlacements(grid, placed, word) {
    const out = [];
    for (const p of placed) {
      for (let i = 0; i < word.a.length; i++) {
        for (let j = 0; j < p.a.length; j++) {
          if (word.a[i] !== p.a[j]) continue;
          const dir = p.dir === 'H' ? 'V' : 'H';
          const row = dir === 'V' ? p.row - i : p.row + j;
          const col = dir === 'H' ? p.col - i : p.col + j;
          const crosses = canPlace(grid, word, row, col, dir, true);
          if (crosses == null) continue;
          const center = (grid.length - 1) / 2;
          const midR = row + (dir === 'V' ? (word.a.length - 1) / 2 : 0);
          const midC = col + (dir === 'H' ? (word.a.length - 1) / 2 : 0);
          const distance = Math.abs(midR - center) + Math.abs(midC - center);
          out.push({ row, col, dir, crosses, score: crosses * 20 - distance });
        }
      }
    }
    return out.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  }

  function layoutScore(grid, placed) {
    let occupied = 0;
    let intersections = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        if (!grid[r][c]) continue;
        occupied++;
        let memberships = 0;
        for (const w of placed) {
          const on = w.dir === 'H'
            ? r === w.row && c >= w.col && c < w.col + w.a.length
            : c === w.col && r >= w.row && r < w.row + w.a.length;
          if (on) memberships++;
        }
        if (memberships > 1) intersections++;
      }
    }
    return placed.length * 100 + intersections * 18 + occupied;
  }

  function build(items, level = 'facil') {
    const cfg = LEVELS[level] || LEVELS.facil;
    const usable = items.filter(w => w?.a && w.a.length >= 3 && w.a.length <= cfg.size);
    if (!usable.length) return null;

    let best = null;
    for (let attempt = 0; attempt < cfg.attempts; attempt++) {
      const grid = Array.from({ length: cfg.size }, () => Array(cfg.size).fill(null));
      const ordered = shuffle(usable).sort((a, b) => b.a.length - a.a.length || Math.random() - 0.5);
      const first = ordered[0];
      const firstDir = attempt % 2 ? 'V' : 'H';
      const row = firstDir === 'H' ? Math.floor(cfg.size / 2) : Math.max(0, Math.floor((cfg.size - first.a.length) / 2));
      const col = firstDir === 'H' ? Math.max(0, Math.floor((cfg.size - first.a.length) / 2)) : Math.floor(cfg.size / 2);
      const placed = [place(grid, first, row, col, firstDir)];

      for (const word of ordered.slice(1)) {
        if (placed.length >= cfg.target) break;
        const candidates = candidatePlacements(grid, placed, word);
        if (!candidates.length) continue;
        const top = candidates.slice(0, Math.min(4, candidates.length));
        const chosen = top[Math.floor(Math.random() * top.length)];
        placed.push(place(grid, word, chosen.row, chosen.col, chosen.dir));
      }

      const score = layoutScore(grid, placed);
      if (!best || score > best.score) best = { grid, words: placed, score, size: cfg.size };
      if (placed.length >= cfg.target && attempt > 60) break;
    }

    return best ? { grid: best.grid, words: best.words, size: best.size } : null;
  }

  return { build };
})();