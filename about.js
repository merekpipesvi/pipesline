(() => {
  const { EMAIL } = window.PIPESLINE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $$('[data-email]').forEach(a => { a.href = `mailto:${EMAIL}`; a.textContent = EMAIL; });
  $('#askStarter').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Sourdough starter')}`;

  /* ---------- explorer tabs ---------- */
  const tabs = $$('[role="tab"]');
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const ids = panels.map(p => p.id);
  const paneCmd = $('#paneCmd');
  const explorer = $('#explore');
  const timers = new Set();
  let current = null;

  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const cancel = () => { timers.forEach(clearTimeout); timers.clear(); };

  const commands = {
    roots: 'cd ~/merek/roots',
    hockey: 'cd ~/merek/hockey',
    academic: 'cd ~/merek/academic',
    work: 'cd ~/merek/work',
    built: 'cd ~/merek/built',
    offline: 'cd ~/merek/offline',
  };

  function type(el, text, speed, done) {
    if (reduce) { el.textContent = text; return done?.(); }
    el.textContent = '';
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) later(tick, speed + Math.random() * speed);
      else done?.();
    };
    tick();
  }

  function show(id, { focus = false, scroll = false, record = true } = {}) {
    const i = ids.indexOf(id);
    if (i < 0 || id === current) return;
    current = id;
    cancel();
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      panels[j].classList.remove('enter');
    });
    void panels[i].offsetWidth; // restart the entrance animation
    panels[i].classList.add('enter');
    if (focus) tabs[i].focus();
    if (scroll) explorer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (record) history.replaceState(null, '', `#${id}`);
    type(paneCmd, commands[id], 18);
    enter[id]?.(panels[i]);
  }

  tabs.forEach(t => t.addEventListener('click', () => show(t.getAttribute('aria-controls'))));

  $('.tree').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let next = step ? (i + step + tabs.length) % tabs.length : null;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    show(ids[next], { focus: true });
  });

  // 1 to 6 jumps straight to a directory
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= ids.length) show(ids[n - 1], { scroll: true });
  });

  $$('[data-goto]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    show(el.dataset.goto, { scroll: true });
  }));

  /* ---------- per-directory effects ---------- */
  const settle = el => { el.textContent = Number(el.dataset.count).toFixed(Number(el.dataset.decimals || 0)) + (el.dataset.suffix || ''); };
  let printing = false;
  addEventListener('beforeprint', () => { printing = true; $$('[data-count]').forEach(settle); });
  addEventListener('afterprint', () => { printing = false; });

  function countUp(el) {
    const end = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    if (reduce) return;
    const t0 = performance.now();
    const dur = 1100;
    const frame = now => {
      const k = Math.min(1, (now - t0) / dur);
      const v = end * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(dec) + (k === 1 ? suffix : '');
      if (printing) return settle(el);
      if (k < 1 && el.closest('.panel').id === current) requestAnimationFrame(frame);
      else settle(el);
    };
    requestAnimationFrame(frame);
  }

  const route = $('.route');
  const stops = $$('.route li');
  let tripRun = 0;
  function trip() {
    const run = ++tripRun;
    const at = (fn, ms) => later(() => run === tripRun && fn(), ms);
    stops.forEach(s => s.classList.remove('reached'));
    route.style.setProperty('--p', 0);
    const last = stops.length - 1;
    const step = reduce ? 0 : 520;
    stops.forEach((s, i) => at(() => {
      route.style.setProperty('--p', i / last);
      at(() => s.classList.add('reached'), reduce ? 0 : 380);
    }, 200 + i * step));
  }
  $('[data-replay]').addEventListener('click', trip);

  const entry = $('#entry');
  const flow = $('.flow');
  function fillEntry() {
    const fields = $$('dd', entry);
    fields.forEach(f => { f.textContent = ''; f.classList.remove('typing'); });
    flow.classList.add('run');
    let i = 0;
    const next = () => {
      const f = fields[i++];
      if (!f) return;
      f.classList.add('typing');
      type(f, f.dataset.v, 28, () => later(() => { f.classList.remove('typing'); next(); }, 220));
    };
    later(next, 700);
  }

  const enter = {
    roots: p => $$('[data-count]', p).forEach(countUp),
    hockey: trip,
    academic: p => { $$('[data-count]', p).forEach(countUp); chaos.run(); },
    work: fillEntry,
  };

  /* ---------- chaos: two Lorenz signals, one millionth apart ---------- */
  const chaos = (() => {
    const canvas = $('#chaos');
    const ctx = canvas.getContext('2d');
    const N = 3200, DT = 0.01;
    let a = [], b = [], raf = 0;

    function lorenz(x0) {
      const s = 10, r = 28, beta = 8 / 3;
      let [x, y, z] = [x0, 1, 20];
      const f = (x, y, z) => [s * (y - x), x * (r - z) - y, x * y - beta * z];
      const out = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const k1 = f(x, y, z);
        const k2 = f(x + DT / 2 * k1[0], y + DT / 2 * k1[1], z + DT / 2 * k1[2]);
        const k3 = f(x + DT / 2 * k2[0], y + DT / 2 * k2[1], z + DT / 2 * k2[2]);
        const k4 = f(x + DT * k3[0], y + DT * k3[1], z + DT * k3[2]);
        x += DT / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        y += DT / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        z += DT / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        out[i] = x;
      }
      return out;
    }

    function seed() {
      const x0 = Math.random() * 10 - 5;
      a = lorenz(x0);
      b = lorenz(x0 + 1e-6);
    }

    function draw(upto) {
      const dpr = devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const css = getComputedStyle(document.documentElement);
      const X = i => (i / (N - 1)) * w;
      const Y = v => h / 2 - (v / 22) * (h / 2 - 6);
      ctx.strokeStyle = css.getPropertyValue('--line').trim();
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      const line = (data, color, width) => {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < upto; i += 2) i ? ctx.lineTo(X(i), Y(data[i])) : ctx.moveTo(X(i), Y(data[i]));
        ctx.stroke();
      };
      line(b, css.getPropertyValue('--muted').trim(), 1.2);
      line(a, css.getPropertyValue('--accent').trim(), 1.6);
    }

    function run() {
      seed();
      cancelAnimationFrame(raf);
      if (reduce) return draw(N);
      const t0 = performance.now();
      const frame = now => {
        const k = Math.min(1, (now - t0) / 3200);
        draw(Math.floor(k * N));
        if (k < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    addEventListener('resize', () => { if (current === 'academic' && a.length) draw(N); });
    $('[data-rerun]').addEventListener('click', run);
    return { run };
  })();

  /* ---------- sourdough ---------- */
  const states = ['hungry', 'waking up', 'a few bubbles', 'rising', 'bubbly and ready'];
  const dough = $('.dough');
  const state = $('#starterState');
  const feed = $('#feed');
  let fed = 0;
  feed.addEventListener('click', () => {
    fed = Math.min(states.length - 1, fed + 1);
    dough.style.setProperty('--lvl', fed);
    state.textContent = `status: ${states[fed]}`;
    if (fed === states.length - 1) {
      feed.hidden = true;
      $('#askStarter').hidden = false;
    }
  });

  /* ---------- start ---------- */
  const fromHash = location.hash.slice(1);
  if (ids.includes(fromHash)) show(fromHash, { scroll: true });
  else show('work', { record: false });
  addEventListener('hashchange', () => show(location.hash.slice(1), { scroll: true }));
})();
