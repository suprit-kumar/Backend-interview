/* Fuzzy search over titles, descriptions, tags and category names. */
(function (A) {
  // Returns { score, hits } where hits are matched character positions (for highlighting), or null.
  function match(term, text) {
    const t = text.toLowerCase();
    const at = t.indexOf(term);
    if (at !== -1) {
      const hits = [];
      for (let i = 0; i < term.length; i++) hits.push(at + i);
      const wordStart = at === 0 || /[\s/(&-]/.test(t.charAt(at - 1));
      return { score: 100 - Math.min(at, 40) + (wordStart ? 30 : 0), hits };
    }
    const hits = [];
    let pos = 0;
    let streak = 0;
    let score = 0;
    for (let i = 0; i < term.length; i++) {
      const found = t.indexOf(term.charAt(i), pos);
      if (found === -1) return null;
      streak = found === pos && i > 0 ? streak + 1 : 0;
      score += 4 + streak * 3;
      hits.push(found);
      pos = found + 1;
    }
    return term.length < 3 ? null : { score: Math.min(score, 70), hits };
  }

  function haystack(e) {
    const full = A.catalog.data(e.id);
    return {
      title: e.t,
      tags: full && full.tags ? full.tags.join(' ') : '',
      desc: e.d,
      cat: A.catalog.cat(e.c).name,
    };
  }

  A.search = {
    query(q, limit) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      const out = [];
      A.index.forEach(e => {
        const h = haystack(e);
        let total = 0;
        let titleHits = [];
        for (let i = 0; i < terms.length; i++) {
          const m = match(terms[i], h.title);
          const best = m ? { s: m.score * 3, hits: m.hits } : null;
          const other = [match(terms[i], h.tags), match(terms[i], h.desc), match(terms[i], h.cat)];
          const weights = [2, 1, 1];
          let alt = 0;
          other.forEach((o, k) => { if (o && o.score * weights[k] > alt) alt = o.score * weights[k]; });
          const s = Math.max(best ? best.s : 0, alt);
          if (!s) return;
          total += s;
          if (best) titleHits = titleHits.concat(best.hits);
        }
        if (total) out.push({ entry: e, score: total, hits: titleHits });
      });
      out.sort((a, b) => b.score - a.score);
      return out.slice(0, limit || 10);
    },
  };
})(window.Atlas);
