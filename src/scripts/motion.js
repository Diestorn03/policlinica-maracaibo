/*
  Motor de movimiento — GSAP 3.15 (ScrollTrigger, SplitText) + Lenis. Reciclado del rediseño de ExpertsDDT.
  Todo se maneja con atributos, así las páginas quedan declarativas:
    data-reveal="up|down|left|right|scale|blur|clip|drop|iris" (+ data-delay, data-start)   aparición al entrar
    data-stagger[=".1"]          hijos en cascada            data-split="lines|words|chars"   texto que entra por partes
    data-parallax="0.3"          capa con parallax           data-lit                          texto que se ilumina palabra a palabra
    data-count="125"             contador                    data-tilt / data-magnetic / data-glow   efectos de puntero (escritorio)
    .marquee > .marquee__track   cinta infinita que acelera con el scroll
  Sin JS o con movimiento reducido todo está visible (html.motion-ready + CSS; red de seguridad de 2.5 s en el <head>).
  Las páginas pueden importar { gsap, ScrollTrigger, SplitText, reduced, coarse } para escenas propias.
*/
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
export { gsap, ScrollTrigger, SplitText };

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = window.matchMedia('(pointer: coarse)').matches;
const isMobile = () => window.matchMedia('(max-width: 1100px)').matches;

let lenis;
export const getLenis = () => lenis;

/* ---------------- Lenis (solo puntero fino) ---------------- */
function initLenis() {
  if (reduced || coarse || lenis) return;
  lenis = new Lenis({ lerp: 0.14, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -90 });
  });
}

/* ---------------- Nav: sombra al bajar + menú móvil circular ---------------- */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  ScrollTrigger.create({ start: 40, onEnter: () => nav.classList.add('is-solid'), onLeaveBack: () => nav.classList.remove('is-solid') });
  const burger = nav.querySelector('.burger');
  const menu = document.querySelector('.menu');
  if (!burger || !menu) return;
  const toggle = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    nav.classList.toggle('is-menu', open);
    lenis ? (open ? lenis.stop() : lenis.start()) : (document.body.style.overflow = open ? 'hidden' : '');
  };
  menu.inert = true;
  burger.addEventListener('click', () => toggle(burger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true' && (toggle(false), burger.focus()));
}

/* ---------------- Apariciones ---------------- */
const REVEALS = {
  up: { y: 48, opacity: 0 },
  down: { y: -48, opacity: 0 },
  left: { x: -64, opacity: 0 },
  right: { x: 64, opacity: 0 },
  scale: { scale: 0.88, opacity: 0 },
  blur: { y: 26, opacity: 0, filter: 'blur(10px)' },
  clip: { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
  drop: { clipPath: 'inset(0 0 100% 0)', opacity: 1 },
  iris: { clipPath: 'circle(0% at 50% 50%)', opacity: 1 },
};

function initReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const type = el.dataset.reveal || 'up';
    const from = REVEALS[type] || REVEALS.up;
    const wipe = type === 'clip' || type === 'drop' || type === 'iris';
    const to = { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: wipe ? 1.25 : 0.9, ease: type === 'scale' ? 'back.out(1.5)' : 'power3.out', delay: +(el.dataset.delay || 0), clearProps: 'filter' };
    if (type === 'clip') to.clipPath = 'inset(0 0% 0 0)';
    if (type === 'drop') to.clipPath = 'inset(0 0 0% 0)';
    if (type === 'iris') to.clipPath = 'circle(75% at 50% 50%)';
    gsap.fromTo(el, from, { ...to, scrollTrigger: { trigger: el, start: el.dataset.start || 'top 96%', once: true, onEnter: () => el.classList.add('is-inview') } });
  });
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    gsap.fromTo(group.children, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: +(group.dataset.stagger || 0.08), clearProps: 'transform', scrollTrigger: { trigger: group, start: group.dataset.start || 'top 94%', once: true } });
  });
}

/* ---------------- Texto por partes ---------------- */
function initSplits() {
  gsap.utils.toArray('[data-split]').forEach((el) => {
    const mode = coarse && el.dataset.split === 'chars' ? 'words' : el.dataset.split || 'lines';
    el.style.visibility = 'visible';
    const split = new SplitText(el, { type: mode === 'chars' ? 'chars,words' : mode, mask: mode === 'lines' ? 'lines' : undefined });
    const targets = mode === 'chars' ? split.chars : mode === 'words' ? split.words : split.lines;
    const trig = { trigger: el, start: el.dataset.start || 'top 92%', once: true, onEnter: () => (el.closest('[data-reveal-scope]') || el).classList.add('is-inview') };
    const delay = +(el.dataset.delay || 0);
    if (mode === 'chars') gsap.from(targets, { yPercent: 100, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.02, delay, scrollTrigger: trig });
    else if (mode === 'words') gsap.from(targets, { y: '0.8em', opacity: 0, duration: 0.8, ease: 'power4.out', stagger: 0.045, delay, scrollTrigger: trig });
    // al terminar se deshace la división: la máscara de cada línea recortaba los trazos bajo la línea (g, y, p) y algunos acentos
    else gsap.from(targets, { yPercent: 110, duration: 0.95, ease: 'power4.out', stagger: 0.1, delay, scrollTrigger: trig, onComplete: () => split.revert() });
  });
}

/* ---------------- Parallax ---------------- */
function initParallax() {
  if (coarse) return;
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax || '0.2');
    gsap.fromTo(el, { yPercent: amt * 30 }, { yPercent: -amt * 30, ease: 'none', scrollTrigger: { trigger: el.closest('[data-scene], section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------------- Texto que se ilumina ---------------- */
function initLit() {
  // palabras en <span> conservando los espacios (SplitText en modo palabras los perdía y las pegaba); solo texto plano, con nodos, sin innerHTML
  gsap.utils.toArray('[data-lit]').forEach((el) => {
    const words = [];
    const frag = document.createDocumentFragment();
    el.textContent.split(/(\s+)/).forEach((t) => {
      if (!t) return;
      if (/^\s+$/.test(t)) return frag.append(t);
      const s = document.createElement('span');
      s.textContent = t;
      words.push(s);
      frag.append(s);
    });
    el.replaceChildren(frag);
    el.style.visibility = 'visible';
    gsap.fromTo(words, { opacity: 0.2 }, { opacity: 1, stagger: 0.02, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.6 } });
  });
}

/* ---------------- Marquesina (acelera con el scroll; quieta fuera de pantalla) ---------------- */
function initMarquee() {
  const items = gsap.utils.toArray('.marquee').map((m) => {
    const track = m.querySelector('.marquee__track');
    if (!track) return null;
    track.innerHTML += track.innerHTML;
    track.lastElementChild && [...track.children].slice(track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    const it = { track, x: 0, half: track.scrollWidth / 2, visible: false, dir: m.dataset.dir === 'right' ? 1 : -1 };
    new IntersectionObserver(([e]) => { it.visible = e.isIntersecting; }).observe(m);
    return it;
  }).filter(Boolean);
  if (!items.length) return;
  ScrollTrigger.addEventListener('refresh', () => items.forEach((it) => { it.half = it.track.scrollWidth / 2; }));
  let vel = 0, last = window.scrollY;
  gsap.ticker.add(() => {
    const dy = window.scrollY - last; last = window.scrollY;
    vel = Math.min(14, Math.abs(dy) * 0.3 + vel * 0.9);
    items.forEach((it) => {
      if (!it.visible) return;
      it.x += it.dir * (0.6 + vel);
      if (-it.x >= it.half) it.x += it.half;
      if (it.x > 0) it.x -= it.half;
      it.track.style.transform = `translate3d(${it.x}px,0,0)`;
    });
  });
}

/* ---------------- Contadores ---------------- */
function initCounters() {
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true }, onUpdate: () => { el.textContent = String(Math.round(o.v)); }, onComplete: () => { el.textContent = String(Math.round(parseFloat(el.dataset.count))); } });
  });
}

/* ---------------- Puntero: tilt 3D, botones magnéticos, brillo ---------------- */
function initPointerFx() {
  if (coarse) return;
  gsap.utils.toArray('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    card.style.transformStyle = 'preserve-3d';
    card.parentElement.style.perspective = '1000px';
    card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); rx(((e.clientX - r.left) / r.width - 0.5) * 10); ry(-((e.clientY - r.top) / r.height - 0.5) * 10); });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
  gsap.utils.toArray('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.3); my((e.clientY - r.top - r.height / 2) * 0.3); });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
  gsap.utils.toArray('[data-glow]').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', `${e.clientX - r.left}px`);
    el.style.setProperty('--gy', `${e.clientY - r.top}px`);
  }));
}

/* ---------------- Arranque ---------------- */
document.documentElement.classList.add('motion-ready');
initNav();
if (!reduced) {
  initLenis();
  initSplits();
  initReveals();
  initParallax();
  initLit();
  initMarquee();
  initCounters();
  initPointerFx();
}
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
