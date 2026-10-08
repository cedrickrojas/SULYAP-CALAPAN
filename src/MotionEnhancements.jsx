import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router-dom';

// Animate content, leaving QR images and their containers steady for scanning.
const targets = [
  '.page-intro > *', '.hero-content > *', '.destination-hero-content > *',
  '.detail-heading', '.section-heading', '.directory-meta', '.establishments-toolbar',
  '.destination-card', '.establishment-card', '.information-card', '.gallery-thumb',
  '.steps article', '.tips-section', '.how-bottom', '.visitor-note', '.practical-info',
  '.detail-content > .detail-prose', '.detail-content > .detail-list > li',
  '.qr-directory-intro', '.establishments-note',
].map(selector => `#main-content ${selector}`).concat('footer .footer-top > div').join(',');

export default function MotionEnhancements() {
  const {pathname, search} = useLocation();
  const revealed = useRef(new WeakSet());

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};

    const setup = () => {
      dispose();
      if (preference.matches || !('IntersectionObserver' in window)) return;
      const nodes = [...document.querySelectorAll(targets)];
      const enter = node => {
        node.classList.remove('motion-pending');
        node.classList.add('motion-enter');
        revealed.current.add(node);
      };
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            enter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {threshold: 0.06});

      nodes.forEach(node => {
        if (revealed.current.has(node)) return;
        const siblings = [...node.parentElement.children];
        node.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(node), 3) * 60}ms`);
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) enter(node);
        else if (rect.bottom <= 0) revealed.current.add(node);
        else {
          node.classList.add('motion-pending');
          observer.observe(node);
        }
      });

      // A keyboard user can jump directly to an offscreen link or card.
      const focus = event => {
        const node = event.target.closest('.motion-pending');
        if (node) {
          node.classList.remove('motion-pending');
          revealed.current.add(node);
          observer.unobserve(node);
        }
      };
      document.addEventListener('focusin', focus);
      dispose = () => {
        observer.disconnect();
        document.removeEventListener('focusin', focus);
        nodes.forEach(node => {
          node.classList.remove('motion-pending', 'motion-enter');
          node.style.removeProperty('--reveal-delay');
        });
      };
    };

    setup();
    preference.addEventListener('change', setup);
    return () => {
      dispose();
      preference.removeEventListener('change', setup);
    };
  }, [pathname, search]);

  return null;
}
