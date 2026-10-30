'use strict';
(() => {
  const screen = document.getElementById('welcomeScreen');
  let closeTimer, exitTimer, wasHidden = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clearTimers() { clearTimeout(closeTimer); clearTimeout(exitTimer); }
  function finish() {
    clearTimers();
    if (!screen.open) return;
    screen.classList.add('is-leaving');
    exitTimer = setTimeout(() => { screen.close(); screen.classList.remove('is-leaving'); }, reducedMotion.matches ? 0 : 280);
  }
  function welcome() {
    clearTimers();
    screen.classList.remove('is-leaving');
    // Re-enter the top layer so the welcome screen also covers an unfinished form on resume.
    if (screen.open) screen.close();
    screen.showModal();
    closeTimer = setTimeout(finish, reducedMotion.matches ? 350 : 1700);
  }
  screen.querySelector('button').addEventListener('click', finish);
  screen.addEventListener('cancel', e => { e.preventDefault(); finish(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { wasHidden = true; clearTimers(); if (screen.open) screen.close(); }
    else if (wasHidden) { wasHidden = false; welcome(); }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) welcome(); });
  window.addEventListener('pagehide', () => { clearTimers(); if (screen.open) screen.close(); });
  // Prevent pinch and double-tap zoom without blocking single-finger vertical or horizontal scrolling.
  for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  welcome();
})();
