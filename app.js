/* ===================== НАСТРОЙКИ (меняй тут) ===================== */
const CONFIG = {
  SUPABASE_URL: 'https://nmcvlutvqnxqrzlstmkr.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tY3ZsdXR2cW54cXJ6bHN0bWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzYzOTAsImV4cCI6MjEwNzU1MjM5MH0.j_yWB5POvBEBP1LMBD9TQMR28e23sI1joch3dxu-yUM',

  welcomeTitle: 'Привет радасть:)',
  welcomeText: 'я короче посидел потерпел и сделал тебе тирлист на гавнальные.. гадальные* карты, именно. вооот ну короче проходи:)',
  memeImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQYLlmLvniXIIHjYJ6xvRX88AP6qpl0qhzw1v4Z-GdDw&s',
  testTries: 3,
};
const DEFAULT_TIERS = [
  {name:'S', color:'#ff5c7a'}, {name:'A', color:'#ff9f4a'}, {name:'B', color:'#ffd84d'},
  {name:'C', color:'#7ee0a4'}, {name:'D', color:'#6ec3ff'},
];
const TEST_OPTIONS = [
  { text:'Слон весит 5 тонн', ok:true },
  { text:'Григорий поел 4 часа назад' },
  { text:'Будильник моросит хлебная паста' },
];
const TEST_MSGS = ['Попробуйте ещё раз, с кем не бывает', 'Даю последний шанс', 'Тяжело да? Сократим варианты ответов'];
/* ================================================================== */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const ONB_KEY = 'blini:onboarded';
const state = { owner:false, current:null, edit:null };

function h(tag, props={}, ...kids){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(props)){
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function plural(n, a, b, c){ const m=n%100, d=n%10; return (m>10&&m<20)?c : d===1?a : (d>1&&d<5)?b : c; }

let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function show(id){
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  document.body.dataset.screen = id;
  window.scrollTo(0, 0);
}
function nav(hash){ if (location.hash === hash) route(); else location.hash = hash; }
function ready(fn){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
  else fn();
}
/* клики по кнопкам, нарисованным скриптом: работает и после любого перерисовывания */
function delegate(root, type, selector, fn){
  $(root).addEventListener(type, e => {
    const el = e.target.closest(selector);
    if (el && $(root).contains(el)) fn(e, el);
  });
}

function applyOwner(){
  $$('.owner-only').forEach(e => e.hidden = !state.owner);
  $('#authBtn').textContent = state.owner ? 'Выйти' : 'Админочка:3';
}
async function initAuth(){
  const { data } = await sb.auth.getSession();
  state.owner = !!data.session; applyOwner();
  sb.auth.onAuthStateChange((_e, session) => {
    const was = state.owner; state.owner = !!session; applyOwner();
    if (was !== state.owner && localStorage.getItem(ONB_KEY)) route();
  });
}
function bindAuth(){
  $('#authBtn').addEventListener('click', async () => {
    if (state.owner){ await sb.auth.signOut(); toast('Выход из Админочки'); if (location.hash.startsWith('#/edit')) nav('#/'); return; }
    $('#lErr').hidden = true; $('#loginDlg').showModal();
  });
  $('#lCancel').addEventListener('click', () => $('#loginDlg').close());
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email:$('#lEmail').value.trim(), password:$('#lPass').value });
    if (error){ $('#lErr').textContent = 'Не удалось войти: ' + error.message; $('#lErr').hidden = false; return; }
    $('#loginDlg').close(); $('#lPass').value = ''; toast('Админочка приветствует вас:)');
  });
}

/* ---------- 1. приветствие ---------- */
function bindWelcome(){
  const img = $('#memeImg'), ph = $('#memePh');
  img.addEventListener('load', () => { img.hidden = false; ph.hidden = true; });
  img.addEventListener('error', () => { img.hidden = true; ph.hidden = false; });
  const src = new URLSearchParams(location.search).get('img') || CONFIG.memeImage;
  if (src){ img.src = src; } else { img.hidden = true; ph.hidden = false; }

  $('#wTitle').textContent = CONFIG.welcomeTitle;
  $('#wText').textContent  = CONFIG.welcomeText;
  $('#agree').addEventListener('change', e => {
    $('#startBtn').setAttribute('aria-disabled', String(!e.target.checked));
    if (e.target.checked) $('#startWarn').hidden = true;
  });
  $('#startBtn').addEventListener('click', () => {
    if (!$('#agree').checked){ $('#startWarn').hidden = false; return; }
    startTest();
  });
}
function startOnboarding(){
  $('#agree').checked = false; $('#startBtn').setAttribute('aria-disabled','true'); $('#startWarn').hidden = true;
  show('s-welcome');
}

function startTest(){
  const box = $('#answers'), msg = $('#testMsg');
  box.replaceChildren(); msg.textContent = '';
  let tries = 0, solved = false;
  const pairs = [];
  for (const o of TEST_OPTIONS){
    const b = h('button', { class:'answer', type:'button' }, o.text);
    b.addEventListener('click', () => {
      if (solved || b.disabled) return;
      tries++;
      if (o.ok){
        solved = true;
        b.classList.add('right');
        msg.textContent = 'Верно!';
        pairs.forEach(p => p.b.disabled = true);
        setTimeout(startTutorial, 800);
        return;
      }
      b.classList.add('wrong');
      msg.textContent = TEST_MSGS[Math.min(tries, TEST_MSGS.length) - 1];
      if (tries < CONFIG.testTries){
        setTimeout(() => b.classList.remove('wrong'), 700);
      } else {
        msg.textContent += ', всё, оставляю только правильный';
        pairs.forEach(p => {
          if (p.o.ok) return;
          p.b.disabled = true;
          p.b.classList.add('gone');
          setTimeout(() => { p.b.hidden = true; }, 500);
        });
      }
    });
    box.append(b); pairs.push({ o, b });
  }
  show('s-test');
}

/* ---------- 3. обучение ---------- */
let demoToken = 0, countTimer;
function startTutorial(){
  show('s-tutorial');
  const btn = $('#gotIt'); let n = 5;
  btn.disabled = true; btn.textContent = `(${n}) Понятно`;
  clearInterval(countTimer);
  countTimer = setInterval(() => {
    n--;
    if (n > 0) btn.textContent = `(${n}) Понятно`;
    else { clearInterval(countTimer); btn.disabled = false; btn.textContent = 'Понятно'; }
  }, 1000);
  runDemo();
}
async function runDemo(){
  const tok = ++demoToken;
  const stage = $('#demo'), cur = $('#cursor'), card = $('#demoCard');
  while (tok === demoToken){
    card.classList.remove('flipped');
    const s = stage.getBoundingClientRect(), c = card.getBoundingClientRect();
    const start = `translate(${s.width - 50}px, ${s.height - 40}px)`;
    const end   = `translate(${c.left - s.left + c.width/2 - 6}px, ${c.top - s.top + c.height/2 - 4}px)`;
    cur.style.transition = 'none'; cur.style.transform = start; void cur.offsetWidth;
    cur.style.transition = ''; cur.style.transform = end;
    await sleep(1300); if (tok !== demoToken) return;
    await sleep(500);  if (tok !== demoToken) return;
    card.classList.add('flipped');
    await sleep(2600); if (tok !== demoToken) return;
    card.classList.remove('flipped');
    cur.style.transform = start;
    await sleep(1500);
  }
}
function bindTutorial(){
  $('#gotIt').addEventListener('click', () => {
    demoToken++; clearInterval(countTimer);
    localStorage.setItem(ONB_KEY, '1'); route();
  });
  $('#again').addEventListener('click', () => { demoToken++; clearInterval(countTimer); localStorage.removeItem(ONB_KEY); startOnboarding(); });
}

/* ---------- 4. выбор тирлиста ---------- */
async function openHome(){
  show('s-home');
  const grid = $('#listGrid');
  grid.replaceChildren(h('p', { class:'muted' }, 'Загружаю…'));
  const { data, error } = await sb.from('tierlists')
    .select('id,title,description,tiers,cards(count)').order('created_at', { ascending:false });
  if (error){ grid.replaceChildren(h('p', { class:'error' }, 'Не получилось загрузить тирлисты: ' + error.message)); return; }
  if (!data.length){
    grid.replaceChildren(h('p', { class:'muted' }, state.owner ? 'Пока пусто. Нажми «Создать тирлист».' : 'Тирлистов пока нет. Загляни позже.'));
    return;
  }
  grid.replaceChildren(...data.map(listCard));
}
function listCard(t){
  const n = t.cards?.[0]?.count ?? 0;
  const owner = h('div', { class:'owner-row' },
    h('button', { class:'btn ghost small', type:'button', onclick:() => nav('#/edit/' + t.id) }, 'Изменить'),
    h('button', { class:'btn jam small', type:'button', onclick: async () => {
      if (!confirm(`Удалить «${t.title}» вместе с карточками?`)) return;
      const { error } = await sb.from('tierlists').delete().eq('id', t.id);
      if (error) toast('Не удалось удалить: ' + error.message); else { toast('Удалено'); openHome(); }
    }}, 'Удалить'));
  owner.hidden = !state.owner; owner.classList.add('owner-only');
  return h('article', { class:'list' },
    h('div', { class:'chips' }, (t.tiers || []).map(x => h('span', { class:'chip', style:`background:${x.color}` }, x.name))),
    h('h3', {}, h('a', { href:'#/t/' + t.id }, t.title)),
    t.description ? h('p', {}, t.description) : null,
    h('div', { class:'meta' }, `${n} ${plural(n, 'карточка', 'карточки', 'карточек')}`),
    owner);
}
function bindHome(){
  $('#newBtn').addEventListener('click', () => nav('#/edit/new'));
  $('#brand').addEventListener('click', () => { if (localStorage.getItem(ONB_KEY)) nav('#/'); });
}

/* ---------- 5. составление тирлиста ---------- */
const drag = { active:false, pending:null };
const placeKey = id => 'blini:place:' + id;

/* карточка-картинка живёт в колонке cards.image_url.
   Если её ещё нет в базе — работаем на текстовых карточках и предупреждаем в редакторе. */
let IMAGE_COL = null;
async function imageColReady(){
  if (IMAGE_COL !== null) return IMAGE_COL;
  const { error } = await sb.from('cards').select('image_url').limit(1);
  IMAGE_COL = !error;
  return IMAGE_COL;
}
async function loadCards(tierlistId){
  let r = await sb.from('cards').select('*').eq('tierlist_id', tierlistId).order('position');
  if (r.error && /image_url|42703/i.test(r.error.message || '')){
    IMAGE_COL = false;
    r = await sb.from('cards').select('id,tierlist_id,name,description,position').eq('tierlist_id', tierlistId).order('position');
  } else if (!r.error){
    IMAGE_COL = true;
  }
  return r;
}

async function openPlay(id){
  show('s-play');
  $('#pTitle').textContent = ''; $('#tiers').replaceChildren(); $('#pool').replaceChildren();
  const [a, b] = await Promise.all([
    sb.from('tierlists').select('*').eq('id', id).single(),
    loadCards(id),
  ]);
  if (a.error || b.error || !a.data){ toast('Тирлист не найден'); nav('#/'); return; }
  state.current = { tl:a.data, cards:b.data };
  renderPlay();
}
function renderPlay(){
  const { tl, cards } = state.current;
  $('#pTitle').textContent = tl.title;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(placeKey(tl.id)) || '{}'); } catch {}
  const byId = new Map(cards.map(c => [c.id, c])), placed = new Set();

  const tiersBox = $('#tiers'); tiersBox.replaceChildren();
  (tl.tiers || []).forEach(t => {
    const zone = h('div', { class:'zone', 'data-zone':t.id });
    (saved[t.id] || []).forEach(cid => {
      if (byId.has(cid) && !placed.has(cid)){ placed.add(cid); zone.append(makeCard(byId.get(cid))); }
    });
    tiersBox.append(h('div', { class:'tier' },
      h('div', { class:'tier-label', style:`background:${t.color}` }, t.name), zone));
  });
  const pool = $('#pool'); pool.replaceChildren();
  cards.filter(c => !placed.has(c.id)).forEach(c => pool.append(makeCard(c)));
  updateCount();
}
function updateCount(){
  const n = $$('.card', $('#pool')).length;
  $('#poolCount').textContent = n ? `Осталось: ${n}` : '';
}
function readPlacement(){
  const out = {};
  $$('#s-play [data-zone]').forEach(z => { out[z.dataset.zone] = $$(':scope > .card', z).map(c => c.dataset.id); });
  return out;
}
function persistPlacement(){
  if (!state.current) return;
  localStorage.setItem(placeKey(state.current.tl.id), JSON.stringify(readPlacement()));
  updateCount();
}
function bindPlay(){
  $('#playBack').addEventListener('click', () => nav('#/'));
  $('#playReset').addEventListener('click', () => {
    if (!state.current) return;
    localStorage.removeItem(placeKey(state.current.tl.id)); renderPlay(); toast('Сброшено');
  });
  $('#playSave').addEventListener('click', async () => {
    if (!state.current) return;
    const { error } = await sb.from('submissions').insert({ tierlist_id:state.current.tl.id, placement:readPlacement() });
    toast(error ? 'Не отправилось: ' + error.message : 'Блиниальные данные отправлены 🥞');
  });
}

function makeCard(c){
  const url = (c.image_url || '').trim();
  const label = (c.name || '').trim();
  const front = h('div', { class: url ? 'face front img' : 'face front' });
  if (url){
    const img = h('img', { src:url, alt:label, loading:'lazy', decoding:'async' });
    img.addEventListener('error', () => {
      front.classList.remove('img');
      front.replaceChildren(h('span', {}, label || 'картинка не загрузилась'));
    });
    front.append(img);
    if (label) front.append(h('span', { class:'cap' }, label));
  } else {
    front.append(h('span', {}, label || 'без названия'));
  }
  const el = h('div', { class:'card' + (url ? ' card--img' : ''), tabindex:'0', 'data-id':c.id, 'aria-label':label || url },
    h('div', { class:'flip' },
      front,
      h('div', { class:'face back' }, h('span', {}, c.description || (url ? 'Описания нет' : label || 'Описания нет')))));
  let t;
  el.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse' || drag.active) return;
    t = setTimeout(() => { if (!drag.active) el.classList.add('flipped'); }, 450);
  });
  el.addEventListener('pointerleave', () => { clearTimeout(t); el.classList.remove('flipped'); });
  el.addEventListener('focus', () => el.classList.add('flipped'));
  el.addEventListener('blur', () => el.classList.remove('flipped'));
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag.pending = { el, x:e.clientX, y:e.clientY, type:e.pointerType };
  });
  return el;
}

function startDrag(e){
  const { el } = drag.pending;
  const r = el.getBoundingClientRect();
  el.classList.remove('flipped');
  const ghost = el.cloneNode(true);
  ghost.classList.add('ghost-drag'); ghost.removeAttribute('tabindex');
  ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
  document.body.append(ghost);
  Object.assign(drag, { active:true, el, ghost, offX:drag.pending.x - r.left, offY:drag.pending.y - r.top, x:e.clientX, y:e.clientY });
  el.classList.add('dragging'); document.body.classList.add('is-dragging');
  moveGhost(); loop();
}
function moveGhost(){
  drag.ghost.style.left = (drag.x - drag.offX) + 'px';
  drag.ghost.style.top  = (drag.y - drag.offY) + 'px';
}
function updateTarget(){
  if (!drag.active) return;
  const under = document.elementFromPoint(drag.x, drag.y);
  const zone = under && under.closest('#s-play [data-zone]');
  $$('.zone.over').forEach(z => { if (z !== zone) z.classList.remove('over'); });
  if (!zone) return;
  zone.classList.add('over');
  const kids = $$(':scope > .card', zone).filter(c => c !== drag.el);
  let before = null;
  for (const c of kids){
    const r = c.getBoundingClientRect();
    if (drag.y < r.top || (drag.y <= r.bottom && drag.x < r.left + r.width / 2)){ before = c; break; }
  }
  if (before){
    if (drag.el.parentNode !== zone || drag.el.nextElementSibling !== before) zone.insertBefore(drag.el, before);
  } else if (drag.el.parentNode !== zone || zone.lastElementChild !== drag.el){
    zone.append(drag.el);
  }
}
function loop(){
  if (!drag.active) return;
  const trayTop = $('#tray').getBoundingClientRect().top;
  let dy = 0;
  if (drag.y < 90) dy = -Math.ceil((90 - drag.y) / 5);
  else if (drag.y < trayTop && drag.y > trayTop - 70) dy = Math.ceil((drag.y - (trayTop - 70)) / 5);
  if (dy){ window.scrollBy(0, dy); updateTarget(); }
  drag.raf = requestAnimationFrame(loop);
}
function endDrag(){
  const p = drag.pending; drag.pending = null;
  if (!drag.active){
    if (p && p.type !== 'mouse'){ // тап на телефоне: перевернуть карточку
      const was = p.el.classList.contains('flipped');
      $$('.card.flipped').forEach(c => c.classList.remove('flipped'));
      if (!was) p.el.classList.add('flipped');
    }
    return;
  }
  cancelAnimationFrame(drag.raf);
  drag.ghost.remove(); drag.el.classList.remove('dragging');
  $$('.zone.over').forEach(z => z.classList.remove('over'));
  document.body.classList.remove('is-dragging');
  drag.active = false; persistPlacement();
}
function bindDrag(){
  window.addEventListener('pointermove', e => {
    const p = drag.pending;
    if (p && !drag.active){
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      startDrag(e);
    }
    if (!drag.active) return;
    drag.x = e.clientX; drag.y = e.clientY;
    moveGhost(); updateTarget();
  });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // колёсико и прокрутка во время перетаскивания: цель под курсором пересчитывается
  window.addEventListener('scroll', () => drag.active && updateTarget(), true);
  window.addEventListener('wheel', () => drag.active && requestAnimationFrame(updateTarget), { passive:true });
}

/* ---------- 6. редактор ---------- */
async function openEdit(id){
  if (!state.owner){ toast('Редактировать может только владелец. Нужен вход.'); nav('#/'); return; }
  show('s-edit');
  if (id === 'new'){
    state.edit = { id:uid(), isNew:true, title:'', description:'', orig:[],
      tiers:DEFAULT_TIERS.map(t => ({ ...t, id:uid() })), cards:[] };
  } else {
    const [a, b] = await Promise.all([
      sb.from('tierlists').select('*').eq('id', id).single(),
      loadCards(id),
    ]);
    if (a.error || b.error || !a.data){ toast('Тирлист не найден'); nav('#/'); return; }
    state.edit = { id, isNew:false, title:a.data.title, description:a.data.description || '',
      tiers:a.data.tiers || [],
      cards:b.data.map(c => ({ id:c.id, name:c.name || '', description:c.description || '',
        imageUrl:c.image_url || '', mode:c.image_url ? 'image' : 'text' })),
      orig:b.data.map(c => c.id) };
  }
  await imageColReady();
  $('#eHeading').textContent = state.edit.isNew ? 'Новый тирлист' : 'Редактирование';
  $('#eTitle').value = state.edit.title; $('#eDesc').value = state.edit.description;
  $('#imgWarn').hidden = IMAGE_COL !== false;
  renderTiersEdit(); renderCardsEdit();
}

function renderTiersEdit(){
  const box = $('#eTiers'); box.replaceChildren();
  const tiers = state.edit.tiers;
  tiers.forEach((t, i) => {
    box.append(h('div', { class:'row tier-row', 'data-index':i },
      h('input', { type:'color', value:t.color, 'data-field':'color', 'aria-label':'Цвет тира' }),
      h('input', { class:'t', value:t.name, maxlength:'24', placeholder:'Название тира', 'data-field':'name', 'aria-label':'Название тира' }),
      h('button', { class:'btn ghost small icon', type:'button', 'data-act':'up', 'aria-label':'Выше', title:'Выше' }, '↑'),
      h('button', { class:'btn ghost small icon', type:'button', 'data-act':'down', 'aria-label':'Ниже', title:'Ниже' }, '↓'),
      h('button', { class:'btn jam small', type:'button', 'data-act':'del', 'aria-label':'Убрать тир' }, 'Убрать')));
  });
}
function renderCardsEdit(){
  const box = $('#eCards'); box.replaceChildren();
  const cards = state.edit.cards;
  $('#eCount').textContent = cards.length ? `(${cards.length})` : '';
  cards.forEach((c, i) => {
    const url = (c.imageUrl || '').trim();
    const mode = c.mode === 'image' ? 'image' : 'text';
    const thumb = h('span', { class:'f-thumb' + (url ? '' : ' empty') });
    if (url){
      const im = h('img', { src:url, alt:'' });
      im.addEventListener('error', () => thumb.classList.add('broken'));
      thumb.append(im);
    }
    const type = h('select', { class:'t f-mode', 'data-field':'mode', 'aria-label':'Тип карточки' },
      h('option', { value:'text' }, 'Текст'),
      h('option', { value:'image' }, 'Картинка'));
    type.value = mode;
    box.append(h('div', { class:'row card-row', 'data-index':i, 'data-mode':mode },
      type,
      h('input', { class:'t f-name', value:c.name, maxlength:'60', placeholder:'Название', 'data-field':'name', 'aria-label':'Название карточки' }),
      h('input', { class:'t f-desc', value:c.description, maxlength:'400', placeholder:'Описание', 'data-field':'description', 'aria-label':'Описание карточки' }),
      h('input', { class:'t f-url', value:url, placeholder:'Ссылка на картинку (https://…)', 'data-field':'imageUrl', 'aria-label':'Ссылка на картинку' }),
      thumb,
      h('button', { class:'btn jam small', type:'button', 'data-act':'del', 'aria-label':'Убрать карточку' }, 'Убрать')));
  });
}
function addCardFromForm(){
  if (!state.edit) return;
  const name = $('#cName').value.trim(); if (!name){ $('#cName').focus(); return; }
  state.edit.cards.push({ id:uid(), name, description:$('#cDesc').value.trim(), imageUrl:'', mode:'text' });
  $('#cName').value = ''; $('#cDesc').value = '';
  renderCardsEdit(); $('#cName').focus();
}
function updateThumb(row, url){
  const thumb = row.querySelector('.f-thumb'); if (!thumb) return;
  const u = (url || '').trim();
  thumb.classList.toggle('empty', !u);
  thumb.classList.remove('broken');
  thumb.replaceChildren();
  if (!u) return;
  const im = h('img', { src:u, alt:'' });
  im.addEventListener('error', () => thumb.classList.add('broken'));
  thumb.append(im);
}
function parseBulkLine(l){
  const parts = l.split('|');
  const head = (parts[0] || '').trim();
  const tail = parts.slice(1).map(s => s.trim());
  const url = tail.find(isUrl) || (isUrl(head) ? head : '');
  const description = tail.filter(s => !isUrl(s)).join(' | ').trim();
  return { id:uid(), name:isUrl(head) ? '' : head, description, imageUrl:url, mode:url ? 'image' : 'text' };
}
const isUrl = s => /^https?:\/\/\S+$/i.test((s || '').trim());
function bindEdit(){
  $('#editBack').addEventListener('click', () => nav('#/'));
  $('#eTitle').addEventListener('input', e => { if (state.edit) state.edit.title = e.target.value; });
  $('#eDesc').addEventListener('input',  e => { if (state.edit) state.edit.description = e.target.value; });

  $('#addTier').addEventListener('click', () => {
    if (!state.edit) return;
    state.edit.tiers.push({ id:uid(), name:'', color:'#c8b6ff' });
    renderTiersEdit();
    const ins = $$('#eTiers input[data-field="name"]'); ins[ins.length - 1]?.focus();
  });

  delegate('#eTiers', 'input', 'input[data-field]', (e, el) => {
    const i = Number(el.closest('[data-index]').dataset.index);
    const t = state.edit?.tiers[i]; if (t) t[el.dataset.field] = el.value;
  });
  delegate('#eTiers', 'click', 'button[data-act]', (e, btn) => {
    if (!state.edit) return;
    const i = Number(btn.closest('[data-index]').dataset.index);
    const tiers = state.edit.tiers, act = btn.dataset.act;
    if (act === 'up' && i > 0) [tiers[i-1], tiers[i]] = [tiers[i], tiers[i-1]];
    else if (act === 'down' && i < tiers.length - 1) [tiers[i+1], tiers[i]] = [tiers[i], tiers[i+1]];
    else if (act === 'del') tiers.splice(i, 1);
    else return;
    renderTiersEdit();
    const again = act === 'del' ? null : $$(`#eTiers [data-index="${i}"] button[data-act="${act}"]`)[0];
    if (again) again.focus(); else if (act === 'del') $('#addTier').focus();
  });

  delegate('#eCards', 'input', 'input[data-field]', (e, el) => {
    const row = el.closest('[data-index]');
    const i = Number(row.dataset.index);
    const c = state.edit?.cards[i]; if (!c) return;
    c[el.dataset.field] = el.value;
    if (el.dataset.field === 'imageUrl') updateThumb(row, el.value);
  });
  delegate('#eCards', 'change', 'select[data-field="mode"]', (e, el) => {
    if (!state.edit) return;
    const i = Number(el.closest('[data-index]').dataset.index);
    const c = state.edit.cards[i]; if (!c) return;
    c.mode = el.value;
    if (c.mode === 'text') c.imageUrl = '';
    else if (!c.imageUrl) c.imageUrl = '';
    renderCardsEdit();
    const sel = $$(`#eCards [data-index="${i}"] select[data-field="mode"]`)[0];
    if (sel) sel.focus();
    if (c.mode === 'image'){
      const url = $$(`#eCards [data-index="${i}"] input[data-field="imageUrl"]`)[0];
      if (url) url.focus();
    }
  });
  delegate('#eCards', 'click', 'button[data-act="del"]', (e, btn) => {
    if (!state.edit) return;
    const i = Number(btn.closest('[data-index]').dataset.index);
    state.edit.cards.splice(i, 1);
    renderCardsEdit();
    const next = $$(`#eCards [data-index="${i}"] button[data-act="del"]`)[0] || $('#cName');
    next.focus();
  });

  $('#addCard').addEventListener('click', addCardFromForm);
  [$('#cName'), $('#cDesc')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); addCardFromForm(); } }));
  $('#bulkAdd').addEventListener('click', () => {
    if (!state.edit) return;
    const lines = $('#bulk').value.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(l => state.edit.cards.push(parseBulkLine(l)));
    $('#bulk').value = ''; renderCardsEdit(); if (lines.length) toast(`Добавлено: ${lines.length}`);
  });

  $('#editSave').addEventListener('click', async () => {
    const e = state.edit; if (!e) return;
    const title = e.title.trim();
    const tiers = e.tiers.filter(t => t.name.trim()).map(t => ({ id:t.id, name:t.name.trim(), color:t.color }));
    if (!title){ toast('Напиши название тирлиста'); $('#eTitle').focus(); return; }
    if (!tiers.length){ toast('Нужен хотя бы один тир'); return; }
    const btn = $('#editSave'); btn.disabled = true; btn.textContent = 'Сохраняю…';
    try {
      const imgOk = await imageColReady();
      let r = await sb.from('tierlists').upsert({ id:e.id, title, description:e.description.trim(), tiers });
      if (r.error) throw r.error;
      const rows = e.cards
        .filter(c => c.name.trim() || (imgOk && (c.imageUrl || '').trim()))
        .map((c, i) => {
          const row = { id:c.id, tierlist_id:e.id, name:c.name.trim(), description:c.description.trim(), position:i };
          if (imgOk) row.image_url = (c.imageUrl || '').trim() || null;
          return row;
        });
      if (rows.length){ r = await sb.from('cards').upsert(rows); if (r.error) throw r.error; }
      const keep = new Set(rows.map(c => c.id));
      const removed = e.orig.filter(id => !keep.has(id));
      if (removed.length){ r = await sb.from('cards').delete().in('id', removed); if (r.error) throw r.error; }
      if (!imgOk && e.cards.some(c => (c.imageUrl || '').trim())) toast('Сохранено, но картинки не вышли: нужна колонка cards.image_url');
      else toast('Сохранено');
      nav('#/');
    } catch (err) {
      toast('Не сохранилось: ' + (err.message || err));
    } finally {
      btn.disabled = false; btn.textContent = 'Сохранить';
    }
  });
}

/* ---------- маршрутизация ---------- */
function route(){
  if (!localStorage.getItem(ONB_KEY)){ startOnboarding(); return; }
  const m = location.hash.match(/^#\/(t|edit)\/(.+)$/);
  if (m && m[1] === 't') return openPlay(m[2]);
  if (m && m[1] === 'edit') return openEdit(m[2]);
  return openHome();
}

/* ---------- старт ---------- */
ready(async () => {
  bindAuth(); bindWelcome(); bindTutorial(); bindHome(); bindPlay(); bindDrag(); bindEdit();
  window.addEventListener('hashchange', () => { if (localStorage.getItem(ONB_KEY)) route(); });
  await initAuth();
  route();
});
