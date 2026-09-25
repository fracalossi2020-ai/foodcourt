let mounted = false;

export function mountHeaderMotion() {
  if (mounted) return;
  const header = document.querySelector('.header');
  const nav = header?.querySelector('.desktop-links');
  if (!nav) return;
  mounted = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const indicator = document.createElement('span');
  indicator.className = 'nav-glider';
  indicator.setAttribute('aria-hidden', 'true');
  nav.prepend(indicator);
  const position = (link = nav.querySelector('a.active')) => {
    indicator.style.opacity = link ? '1' : '0';
    if (!link) return;
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.height = `${link.offsetHeight}px`;
    indicator.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
  };
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('pointerenter', () => position(link));
    link.addEventListener('focus', () => position(link));
  });
  nav.addEventListener('pointerleave', () => position());
  nav.addEventListener('focusout', () => requestAnimationFrame(() => position()));
  new MutationObserver(() => position()).observe(nav, {
    subtree: true, attributes: true, attributeFilter: ['class'],
  });
  new ResizeObserver(() => position()).observe(nav);
  document.fonts.ready.then(() => position());
  requestAnimationFrame(() => position());
  header.querySelectorAll('button, .partner-header-link, .avatar-btn').forEach(control => {
    control.addEventListener('pointermove', event => {
      if (reduced.matches || event.pointerType !== 'mouse') return;
      const rect = control.getBoundingClientRect();
      control.style.setProperty('--light-x', `${event.clientX - rect.left}px`);
      control.style.setProperty('--light-y', `${event.clientY - rect.top}px`);
    });
    control.addEventListener('pointerdown', () => {
      if (reduced.matches) return;
      control.animate([
        { transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' },
      ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  });
}
