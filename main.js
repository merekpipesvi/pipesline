(() => {
  const { EMAIL, BOOK_URL } = window.PIPESLINE; // edit these in config.js

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- typed tagline ---------- */
  const typed = $('#typed');
  if (!reduce) {
    const full = typed.textContent;
    typed.textContent = '';
    let i = 0;
    const tick = () => {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(tick, 35 + Math.random() * 45);
    };
    setTimeout(tick, 450);
  }

  /* ---------- the pipe ---------- */
  const svg = $('#pipe');
  const maskEl = $('#flowMask');
  const part = name => $(`.p-${name}`, svg);
  const measure = part('measure');
  const shaped = ['edge', 'body', 'glow', 'fill', 'flow', 'mask'].map(part);
  const dashed = ['glow', 'fill', 'mask'].map(part);
  const head = part('head');
  const headGlow = part('head-glow');
  const anchors = $$('[data-pipe-point]'); // inlet, one node per stage, sink
  const stages = $$('[data-stage]');
  const output = $('#output');
  const gauge = $('#flowPct');

  const RADIUS = 28;  // corner radius of each bend
  const BEND = 80;    // horizontal runs sit this far above the next joint
  const FRONT = 0.62; // flow front tracks this fraction down the viewport

  let pts = [];
  let lens = [];      // path length from the inlet to each anchor
  let total = 0;

  const center = el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2 };
  };

  // Down, across, down, with rounded corners. Straight if the joints line up (mobile).
  function segment(a, b) {
    const dx = b.x - a.x;
    if (Math.abs(dx) < 1) return ` L${b.x},${b.y}`;
    const dir = Math.sign(dx);
    const by = Math.max(a.y + (b.y - a.y) / 2, b.y - BEND);
    const r = Math.max(0, Math.min(RADIUS, Math.abs(dx) / 2, by - a.y, b.y - by));
    return ` L${a.x},${by - r} Q${a.x},${by} ${a.x + dir * r},${by}` +
           ` L${b.x - dir * r},${by} Q${b.x},${by} ${b.x},${by + r} L${b.x},${b.y}`;
  }

  function layout() {
    pts = anchors.map(center);
    const w = document.documentElement.clientWidth;
    const h = Math.ceil(pts[pts.length - 1].y + 40);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    maskEl.setAttribute('width', w);
    maskEl.setAttribute('height', h);

    let d = `M${pts[0].x},${pts[0].y}`;
    lens = [0];
    for (let i = 1; i < pts.length; i++) {
      d += segment(pts[i - 1], pts[i]);
      measure.setAttribute('d', d);
      lens.push(measure.getTotalLength());
    }
    total = lens[lens.length - 1];
    shaped.forEach(p => p.setAttribute('d', d));
    update();
  }

  // Each stretch between two joints fills while the flow front travels between their heights,
  // so horizontal runs fill smoothly instead of all at once.
  function flowLength() {
    const front = scrollY + innerHeight * FRONT;
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    const last = pts.length - 1;
    if (atBottom || front >= pts[last].y) return total;
    if (front <= pts[0].y) return 0;
    let i = 0;
    while (i < last - 1 && front >= pts[i + 1].y) i++;
    const f = (front - pts[i].y) / Math.max(1, pts[i + 1].y - pts[i].y);
    return lens[i] + (lens[i + 1] - lens[i]) * f;
  }

  let booted = false;
  let queued = false;

  function update() {
    queued = false;
    if (!total) return;
    const fill = flowLength();

    const dash = `${fill} ${total + 200}`;
    dashed.forEach(p => { p.style.strokeDasharray = dash; });
    document.body.classList.toggle('flowing', fill > 0.5);

    const moving = fill > 0.5 && fill < total - 0.5;
    document.body.classList.toggle('has-head', moving);
    if (moving) {
      const p = measure.getPointAtLength(fill);
      for (const c of [head, headGlow]) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); }
    }

    stages.forEach((s, i) => {
      const on = fill >= lens[i + 1] - 0.5;
      s.classList.toggle('on', on);
      if (on) s.classList.add('seen');
    });

    const full = fill >= total - 0.5;
    output.classList.toggle('on', full);
    if (full && !booted) { booted = true; boot(); }

    gauge.textContent = String(Math.round((fill / total) * 100)).padStart(3, '0');
  }

  addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', layout);
  new ResizeObserver(layout).observe($('main'));
  document.fonts?.ready.then(layout);

  // Keyboard users tabbing ahead shouldn't land on invisible content.
  stages.forEach(s => s.addEventListener('focusin', () => s.classList.add('seen')));

  layout();

  /* ---------- terminal ---------- */
  const bookHref = BOOK_URL || `mailto:${EMAIL}?subject=${encodeURIComponent('Intro call')}`;
  $$('[data-email]').forEach(a => { a.href = `mailto:${EMAIL}`; a.textContent = EMAIL; });
  $('[data-book]').href = bookHref;

  const body = $('#termBody');
  const out = $('#termOut');
  const form = $('#termForm');
  const input = $('#termIn');

  function print({ t = '', c, href, label }) {
    const p = document.createElement('p');
    if (c) p.className = c;
    p.append(t);
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label || href;
      p.append(a);
    }
    out.append(p);
    body.scrollTop = body.scrollHeight;
  }

  const contact = [
    { t: 'email  ', c: 'dim', href: `mailto:${EMAIL}`, label: EMAIL },
    { t: 'call   ', c: 'dim', href: bookHref, label: 'book a free intro call' },
  ];

  const commands = {
    help: () => [
      { t: 'available commands:', c: 'dim' },
      { t: '  whoami     who is behind this' },
      { t: '  about      more about me (opens a page)' },
      { t: '  shipped    things I have built' },
      { t: '  pipeline   how working together usually goes' },
      { t: '  contact    get in touch' },
      { t: '  clear      flush the pipes' },
    ],
    whoami: () => [
      { t: 'Merek Pipes' , c: 'ok' },
      { t: 'full-stack software engineer · 3+ years in Silicon Valley' },
      { t: 'AI systems · Azure · distributed systems' },
      { t: 'builds AI systems that thousands of people use' },
      { t: 'likes: solving problems in ways that take the thinking off the user', c: 'dim' },
      { t: 'more   ', c: 'dim', href: 'about.html', label: 'about.html ↗' },
    ],
    about: () => {
      setTimeout(() => { location.href = 'about.html'; }, 600);
      return [{ t: 'cd ~/merek …', c: 'ok' }];
    },
    pipeline: () => [
      { t: '01  intro       a free call about your business' },
      { t: '02  discovery   the systems, tools, and data you use' },
      { t: '03  plan        what is worth building, with an estimate' },
      { t: '04  build       weekly check-ins and marked deliverables' },
      { t: "05  rollout     getting it into your team's hands" },
      { t: '06  support     paid monthly retainer, optional' },
      { t: "every business is different, so this changes with each one.", c: 'dim' },
    ],
    shipped: () => [
      { t: 'rentive         ', href: 'https://rentive.ca', label: 'rentive.ca ↗' },
      { t: 'graph-rag       time entry prediction · thousands of users' },
      { t: 'chatbot         sandboxed reporting + timesheet approvals' },
      { t: 'qcl-booking     ', href: 'https://qclstaffboats.com', label: 'qclstaffboats.com ↗' },
    ],
    contact: () => contact,
    hire: () => [{ t: 'here is how to reach me:', c: 'ok' }, ...contact],
    sudo: () => [{ t: 'no sudo here, but you can email me:', c: 'dim' }, contact[0]],
    exit: () => [{ t: "nothing to exit. try 'help'.", c: 'dim' }],
    ping: () => [{ t: 'pong', c: 'ok' }],
    clear: () => { out.replaceChildren(); return []; },
  };
  const aliases = { ls: 'shipped', projects: 'shipped', work: 'shipped', email: 'contact', book: 'contact', '?': 'help', services: 'pipeline', process: 'pipeline', cd: 'about', me: 'about', resume: 'about' };

  const history = [];
  let hIndex = 0;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = '';
    if (!raw) return;
    history.push(raw);
    hIndex = history.length;
    print({ t: raw, c: 'cmdline' });
    const name = raw.split(/\s+/)[0].toLowerCase();
    const cmd = commands[aliases[name] || name];
    const lines = cmd ? cmd() : [{ t: `command not found: ${name}. try 'help'`, c: 'err' }];
    lines.forEach(print);
  });

  input.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    hIndex = Math.max(0, Math.min(history.length, hIndex + (e.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[hIndex] || '';
  });

  body.addEventListener('click', e => {
    if (e.target.closest('a') || !getSelection().isCollapsed) return;
    input.focus({ preventScroll: true });
  });

  function boot() {
    const lines = [
      { t: 'pipesline --status', c: 'cmdline' },
      { t: '● flow: nominal', c: 'ok' },
      { t: '● accepting new projects', c: 'ok' },
      { t: 'step 01 is a free intro call.', c: 'dim' },
      { t: "type 'help' to look around, or just say hi ↓", c: 'dim' },
    ];
    if (reduce) return lines.forEach(print);
    lines.forEach((l, i) => setTimeout(() => print(l), 250 + i * 380));
  }
})();
