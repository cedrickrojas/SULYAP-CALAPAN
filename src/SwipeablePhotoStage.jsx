import {useEffect, useImperativeHandle, useLayoutEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';

const wrap = (index, count) => (index % count + count) % count;
const easing = 'cubic-bezier(.22, .72, .12, 1)';

export default function SwipeablePhotoStage({images, initialIndex, onChange, controllerRef}) {
  const viewport = useRef(null), track = useRef(null);
  const slot = useRef(initialIndex + 1), width = useRef(0), drag = useRef(0);
  const gesture = useRef(null), frame = useRef(null), animation = useRef(null);
  const queued = useRef(null), destination = useRef(initialIndex), reduced = useRef(false);
  const [currentSlot, setCurrentSlot] = useState(initialIndex + 1);
  const [state, setState] = useState('idle');
  const count = images.length;
  // Boundary copies make last-to-first swipes travel just one photo's width.
  const slides = [images[count - 1], ...images, images[0]];
  const transform = (position, offset = 0) => `translate3d(${-position * width.current + offset}px, 0, 0)`;

  function stopFrame() {
    cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  function settle(targetSlot, duration = 420) {
    stopFrame();
    const start = transform(slot.current, drag.current);
    const end = transform(targetSlot);
    const finish = () => {
      const normalized = wrap(targetSlot - 1, count) + 1;
      slot.current = normalized;
      drag.current = 0;
      track.current.style.transform = transform(normalized);
      const finished = animation.current;
      animation.current = null;
      finished?.cancel();
      setCurrentSlot(normalized);
      setState('idle');
      const pending = queued.current;
      queued.current = null;
      if (pending !== null && pending !== normalized - 1) navigate({index: pending});
    };
    if (reduced.current || !track.current.animate || Math.abs(targetSlot - slot.current) * width.current + Math.abs(drag.current) < 1) {
      finish();
      return;
    }
    setState('sliding');
    const movement = track.current.animate([{transform: start}, {transform: end}], {duration, easing, fill: 'forwards'});
    animation.current = movement;
    movement.finished.then(() => {if (animation.current === movement) finish();}, () => {});
  }

  function navigate({step, index, duration}) {
    const targetIndex = index ?? wrap((queued.current ?? destination.current) + step, count);
    if (animation.current) {
      queued.current = targetIndex;
      return;
    }
    const current = slot.current - 1;
    if (targetIndex === current && !drag.current) return;
    let targetSlot = targetIndex + 1;
    if (current === count - 1 && targetIndex === 0) targetSlot = count + 1;
    if (current === 0 && targetIndex === count - 1) targetSlot = 0;
    destination.current = targetIndex;
    onChange(targetIndex);
    setCurrentSlot(targetSlot);
    settle(targetSlot, duration);
  }

  useImperativeHandle(controllerRef, () => ({next: step => navigate({step}), goTo: index => navigate({index})}));

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = preference.matches;
    const reset = () => {
      stopFrame();
      animation.current?.cancel();
      animation.current = null;
      queued.current = null;
      gesture.current = null;
      drag.current = 0;
      slot.current = destination.current + 1;
      width.current = viewport.current.getBoundingClientRect().width;
      track.current.style.transform = transform(slot.current);
      setCurrentSlot(slot.current);
      setState('idle');
    };
    const preferenceChanged = () => {reduced.current = preference.matches; reset();};
    const observer = new ResizeObserver(reset);
    observer.observe(viewport.current);
    preference.addEventListener('change', preferenceChanged);
    reset();
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', preferenceChanged);
      stopFrame();
      animation.current?.cancel();
      animation.current = null;
    };
  }, []);

  // Request all gallery photos when opened, before visitors swipe to them.
  useEffect(() => {
    images.forEach(photo => {
      const image = new Image();
      image.src = photo.src;
      image.decode?.().catch(() => {});
    });
  }, [images]);

  function release(event, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    const horizontal = start.axis === 'horizontal' && Math.abs(x) > Math.abs(y) * 1.2;
    const threshold = Math.min(80, width.current * .18);
    const velocity = event.timeStamp - start.time < 80 ? start.velocity : 0;
    const flick = Math.abs(velocity) > .55 && Math.abs(x) > 20;
    if (!cancelled && horizontal && (Math.abs(x) > threshold || flick)) {
      const remaining = Math.max(0, width.current - Math.abs(drag.current));
      navigate({step: x < 0 ? 1 : -1, duration: Math.max(280, Math.min(420, remaining / Math.max(Math.abs(velocity), .85)))});
    } else settle(slot.current, 300);
  }

  return <div className={`lightbox-main gallery-stage${state === 'dragging' ? ' is-dragging' : ''}`} data-state={state}
    onPointerDown={event => {
      if (event.target.closest('button') || !event.isPrimary || event.button !== 0 || animation.current) return;
      gesture.current = {id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: event.timeStamp, velocity: 0, axis: null};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const x = event.clientX - start.x, y = event.clientY - start.y;
      if (!start.axis && Math.max(Math.abs(x), Math.abs(y)) > 8) {
        start.axis = Math.abs(x) > Math.abs(y) * 1.2 ? 'horizontal' : 'vertical';
        if (start.axis === 'horizontal') setState('dragging');
      }
      const elapsed = Math.max(1, event.timeStamp - start.time);
      start.velocity = start.velocity * .4 + (event.clientX - start.lastX) / elapsed * .6;
      start.lastX = event.clientX;
      start.time = event.timeStamp;
      if (start.axis !== 'horizontal' || reduced.current) return;
      const limit = width.current * .95;
      drag.current = Math.sign(x) * (Math.abs(x) <= limit ? Math.abs(x) : limit + (Math.abs(x) - limit) * .15);
      if (frame.current === null) frame.current = requestAnimationFrame(() => {
        frame.current = null;
        track.current.style.transform = transform(slot.current, drag.current);
      });
    }}
    onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)}
    onLostPointerCapture={event => release(event, true)}>
    <div ref={viewport} className="gallery-viewport">
      <div ref={track} className="gallery-track">
        {slides.map((photo, index) => <div className={`gallery-slide${index === currentSlot ? ' is-current' : ''}`} key={index} aria-hidden={index !== currentSlot}>
          <img src={photo.src} alt={photo.alt} draggable={false} decoding="async"/>
        </div>)}
      </div>
    </div>
    <button className="lightbox-prev icon-button" aria-label="Previous photo" onClick={() => navigate({step: -1})}><ChevronLeft/></button>
    <button className="lightbox-next icon-button" aria-label="Next photo" onClick={() => navigate({step: 1})}><ChevronRight/></button>
  </div>;
}
