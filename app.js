'use strict';

(() => {
  const HABITS_KEY = 'habitTracker.habits.v1';
  const LOG_KEY = 'habitTracker.log.v1';

  const DEFAULT_HABITS = [
    { name: '喝水', emoji: '🥤' },
    { name: '运动', emoji: '🏃' },
    { name: '读书', emoji: '📖' },
  ];

  const EMOJIS = ['🥤', '🏃', '📖', '💧', '💪', '🧘', '🥗', '✍️', '🎯', '🚶', '🛌', '🎸', '🖌️', '🧹', '☀️', '🌙'];

  const PALETTE = [
    { bg: '#dcfce7', fg: '#15803d' },
    { bg: '#dbeafe', fg: '#1d4ed8' },
    { bg: '#fef3c7', fg: '#b45309' },
    { bg: '#fce7f3', fg: '#be185d' },
    { bg: '#ede9fe', fg: '#6d28d9' },
    { bg: '#cffafe', fg: '#0e7490' },
    { bg: '#ffedd5', fg: '#c2410c' },
  ];

  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const SVG_CHECK =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.8l5 5 10-11.5"/></svg>';

  let habits = [];
  let log = {};
  let today = todayKey();
  let pendingDelete = null;
  let lastDoneCount = null;

  /* ---------- 工具 ---------- */
  const $ = (sel) => document.querySelector(sel);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (err) {
      console.warn('读取数据失败', err);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('保存失败（可能处于隐私模式，数据不会保留）', err);
      return false;
    }
  }

  function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayKey() { return dateKey(new Date()); }

  function doneSet(key) {
    const arr = log[key];
    return arr && Array.isArray(arr) ? new Set(arr) : new Set();
  }

  function isValidHabit(h) {
    return h && typeof h.id === 'string' && typeof h.name === 'string' && h.name.length > 0;
  }

  function makeHabit(name, emoji, colorIdx) {
    return { id: uid(), name, emoji, color: colorIdx % PALETTE.length, createdAt: Date.now() };
  }

  function loadHabits() {
    let arr = loadJSON(HABITS_KEY, null);
    if (arr == null) {
      // 第一次打开：放上几个示例习惯
      arr = DEFAULT_HABITS.map((d, i) => makeHabit(d.name, d.emoji, i));
      saveJSON(HABITS_KEY, arr);
    }
    return Array.isArray(arr) ? arr.filter(isValidHabit) : [];
  }

  /* ---------- 数据操作 ---------- */
  function toggleHabit(id) {
    const s = doneSet(today);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    const arr = [...s];
    if (arr.length) log[today] = arr;
    else delete log[today];
    saveJSON(LOG_KEY, log);
  }

  function addHabit(name, emoji) {
    const h = makeHabit(name, emoji || EMOJIS[habits.length % EMOJIS.length], habits.length);
    habits.push(h);
    saveJSON(HABITS_KEY, habits);
    return h;
  }

  function removeHabit(id) {
    habits = habits.filter((h) => h.id !== id);
    saveJSON(HABITS_KEY, habits);
    let changed = false;
    Object.keys(log).forEach((key) => {
      if (Array.isArray(log[key]) && log[key].includes(id)) {
        log[key] = log[key].filter((x) => x !== id);
        if (!log[key].length) delete log[key];
        changed = true;
      }
    });
    if (changed) saveJSON(LOG_KEY, log);
  }

  function cycleEmoji(id) {
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    const idx = EMOJIS.indexOf(h.emoji);
    h.emoji = EMOJIS[(idx + 1 + EMOJIS.length) % EMOJIS.length];
    saveJSON(HABITS_KEY, habits);
  }

  /* 从输入中拆出 emoji 图标与文字，例如「喝水 💧」或「💧 喝水」 */
  function splitEmoji(raw) {
    const input = raw.trim();
    if (!input) return null;
    let parts;
    try {
      parts = [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(input)].map((s) => s.segment);
    } catch (err) {
      parts = [...input];
    }
    const isEmo = (s) => /\p{Extended_Pictographic}/u.test(s) && !/[\p{Letter}\p{Number}]/u.test(s);
    let name = input;
    let emoji = null;
    if (parts.length && isEmo(parts[0])) {
      emoji = parts[0];
      name = parts.slice(1).join('').trim();
    } else if (parts.length > 1 && isEmo(parts[parts.length - 1])) {
      emoji = parts[parts.length - 1];
      name = parts.slice(0, -1).join('').trim();
    }
    if (!name) name = input;
    return { name, emoji };
  }

  /* ---------- 文案 ---------- */
  function fmtDate(d = new Date()) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEK[d.getDay()]}`;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了，早点休息 🌙';
    if (h < 11) return '早上好，从打卡开始 ☀️';
    if (h < 13) return '中午好，记得多喝水 🥤';
    if (h < 18) return '下午好，继续保持 📝';
    if (h < 23) return '晚上好，回顾一下今天 🌆';
    return '夜深了，早点休息 🌙';
  }

  function counts() {
    const s = doneSet(today);
    return { done: habits.filter((h) => s.has(h.id)).length, total: habits.length };
  }

  /* ---------- 渲染 ---------- */
  function renderStats() {
    const { done, total } = counts();
    const hero = $('#hero');
    const doneEl = $('#doneCount');
    const totalEl = $('#totalCount');
    const bar = $('#progressBar');
    const track = $('#track');
    const sub = $('#subText');

    if (lastDoneCount !== null && done !== lastDoneCount) {
      doneEl.classList.remove('bump');
      void doneEl.offsetWidth;
      doneEl.classList.add('bump');
    }
    lastDoneCount = done;

    if (total === 0) {
      doneEl.textContent = '–';
      totalEl.textContent = '–';
      bar.style.width = '0%';
      track.setAttribute('aria-valuenow', '0');
      sub.textContent = '先添加几个想坚持的习惯吧';
      hero.classList.remove('all-done');
      return;
    }

    const pct = Math.round((done / total) * 100);
    doneEl.textContent = done;
    totalEl.textContent = total;
    bar.style.width = pct + '%';
    track.setAttribute('aria-valuenow', String(pct));
    if (done === total) {
      sub.textContent = '🎉 太棒了！今天的习惯全部完成';
      hero.classList.add('all-done');
    } else {
      sub.textContent = `已完成 ${done} 项，还差 ${total - done} 项完成今日目标`;
      hero.classList.remove('all-done');
    }
  }

  function renderWeek() {
    const wrap = $('#weekStrip');
    wrap.textContent = '';
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      const key = dateKey(d);
      const s = doneSet(key);
      const done = habits.filter((h) => s.has(h.id)).length;
      const total = habits.length;
      const ratio = total ? done / total : 0;
      const isToday = i === 0;

      const cell = el('div', 'day' + (isToday ? ' today' : ''));
      cell.title = `${d.getMonth() + 1}月${d.getDate()}日 · 完成 ${done}/${total}${isToday ? '（今天）' : ''}`;

      const bars = el('div', 'bars');
      const bar = el('div', 'hbar');
      bar.style.height = (total === 0 ? 0 : Math.max(ratio * 100, 6)) + '%';
      if (total === 0) bar.classList.add('zero');
      else if (ratio >= 1) bar.classList.add('full');
      else if (ratio > 0) bar.classList.add('part');
      else bar.classList.add('zero');
      bars.appendChild(bar);
      cell.appendChild(bars);

      const label = el('span', 'day-label', isToday ? '今' : String(d.getDate()));
      cell.appendChild(label);
      wrap.appendChild(cell);
    }
  }

  function buildRow(h, done) {
    const pal = PALETTE[h.color % PALETTE.length] || PALETTE[0];
    const li = el('li', 'habit' + (done ? ' done' : ''));
    li.dataset.id = h.id;
    li.dataset.name = h.name;

    const icon = el('button', 'icon');
    icon.type = 'button';
    icon.title = '点击更换图标';
    icon.style.background = pal.bg;
    const emoji = el('span', 'emoji', h.emoji || '✅');
    icon.appendChild(emoji);
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleEmoji(h.id);
      const cur = icon.querySelector('.emoji');
      cur.textContent = h.emoji;
      icon.classList.remove('bounce');
      void icon.offsetWidth;
      icon.classList.add('bounce');
    });

    li.appendChild(icon);
    li.appendChild(el('span', 'name', h.name));

    const actions = el('div', 'actions');

    const check = el('button', 'check' + (done ? ' checked' : ''));
    check.type = 'button';
    check.setAttribute('aria-label', done ? `取消完成：${h.name}` : `完成：${h.name}`);
    check.innerHTML = SVG_CHECK;
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUI(h.id);
    });

    const del = el('button', 'delete', '✕');
    del.type = 'button';
    del.title = '删除习惯';
    del.setAttribute('aria-label', `删除：${h.name}`);
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(e, h.id, del);
    });

    actions.appendChild(check);
    actions.appendChild(del);
    li.appendChild(actions);

    li.addEventListener('click', () => toggleUI(h.id));
    return li;
  }

  function renderList() {
    const list = $('#habitList');
    list.textContent = '';
    const s = doneSet(today);
    habits.forEach((h) => list.appendChild(buildRow(h, s.has(h.id))));
    $('#emptyState').hidden = habits.length !== 0;
    $('#listHint').textContent = habits.length ? '点击圆圈或整行打卡' : '';
  }

  function renderAll() {
    $('#dateText').textContent = fmtDate();
    $('#greetingText').textContent = greeting();
    renderStats();
    renderWeek();
    renderList();
  }

  /* ---------- 交互 ---------- */
  function toggleUI(id) {
    if (!habits.some((h) => h.id === id)) return;
    toggleHabit(id);
    const li = document.querySelector(`.habit[data-id="${CSS.escape(id)}"]`);
    if (li) {
      const nowDone = !li.classList.contains('done');
      li.classList.toggle('done', nowDone);
      const chk = li.querySelector('.check');
      chk.classList.toggle('checked', nowDone);
      chk.setAttribute('aria-label', nowDone ? `取消完成：${li.dataset.name}` : `完成：${li.dataset.name}`);
      chk.classList.remove('pop');
      void chk.offsetWidth;
      chk.classList.add('pop');
    }
    renderStats();
    renderWeek();
  }

  function cancelPendingDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    const btn = document.querySelector(`.habit[data-id="${CSS.escape(pendingDelete.id)}"] .delete`);
    if (btn) {
      btn.classList.remove('confirm');
      btn.textContent = '✕';
    }
    pendingDelete = null;
  }

  function handleDelete(e, id, btn) {
    e.stopPropagation();
    if (pendingDelete && pendingDelete.id === id) {
      const toRemove = pendingDelete.id;
      cancelPendingDelete();
      removeHabit(toRemove);
      renderStats();
      renderWeek();
      renderList();
      return;
    }
    cancelPendingDelete();
    btn.classList.add('confirm');
    btn.textContent = '确认删除';
    pendingDelete = {
      id,
      btn,
      timer: setTimeout(cancelPendingDelete, 3000),
    };
  }

  function setupEvents() {
    $('#addForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#nameInput');
      const parsed = splitEmoji(input.value);
      if (!parsed || !parsed.name) {
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        input.focus();
        return;
      }
      const h = addHabit(parsed.name, parsed.emoji);
      input.value = '';
      renderStats();
      renderWeek();
      renderList();
      const li = document.querySelector(`.habit[data-id="${CSS.escape(h.id)}"]`);
      if (li) {
        li.classList.add('flash');
        li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => li.classList.remove('flash'), 1200);
      }
      input.focus();
    });

    // 点击其他地方取消「确认删除」状态
    document.addEventListener('click', (e) => {
      if (!pendingDelete) return;
      if (pendingDelete.btn && pendingDelete.btn.contains(e.target)) return;
      cancelPendingDelete();
    });

    // 跨标签页同步
    window.addEventListener('storage', (e) => {
      if (e.key === null || e.key === HABITS_KEY || e.key === LOG_KEY) {
        habits = loadHabits();
        log = loadJSON(LOG_KEY, {});
        today = todayKey();
        renderAll();
      }
    });

    // 跨天自动刷新（页面一直开着到第二天）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const k = todayKey();
        if (k !== today) {
          today = k;
          renderAll();
        }
      }
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    habits = loadHabits();
    log = loadJSON(LOG_KEY, {});
    today = todayKey();
    setupEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();