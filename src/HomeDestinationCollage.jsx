import {useEffect, useRef, useState} from 'react';
import {getDestination} from './destinations';

const selections = [
  {id: '9', image: 1, label: 'Baco Islands'},
  {id: '1', image: 0, position: '55% 40%'},
  {id: '2', image: 0, label: 'Silonay Mangroves'},
  {id: '3', image: 1, label: 'Heritage Museum', position: '65% 50%'},
  {id: '8', image: 0, position: '50% 70%'},
  {id: '10', image: 1, position: '50% 60%'},
];
const landscapes = selections.map(({id, image, label, position}) => {
  const destination = getDestination(id);
  return {...destination.images[image], label: label || destination.name, position: position || '50% 50%'};
});

const culturePhotos = [
  {
    src: '/images/culture/mangyan-smile.webp',
    alt: 'Smiling Alangan Mangyan woman in traditional attire, from the Mangyan Heritage Center collection',
    label: 'Mga ngiting Mindoreño', position: '50% 28%',
  },
  {
    src: '/images/culture/kalap-2.webp',
    alt: 'Kalap Festival street dancers in yellow and turquoise costumes, from the Calapan festival gallery',
    label: 'Kalap Festival', position: '45% 50%',
  },
  {
    src: '/images/culture/kalap-3.webp',
    alt: 'Kalap Festival performers in blue and orange raising carabao-themed props, from the Calapan festival gallery',
    label: 'Sayaw ng Calapan', position: '50% 45%',
  },
  {
    src: '/images/culture/mangyan-handicrafts.webp',
    alt: 'Woven Mangyan baskets and bamboo with indigenous script displayed at the Mangyan Heritage Center in Calapan',
    label: 'Kulturang Calapeño', position: '42% 50%',
  },
  {
    src: '/images/culture/calapan-corn-vendor.webp',
    alt: 'Chella Baraquel, a Calapan corn vendor, behind her food cart with corn and peanuts',
    label: 'Mga mukha ng Calapan', position: '50% 35%',
  },
  {
    src: '/images/culture/pandang-gitab-lights.webp',
    alt: 'Pandang Gitab performers dancing with glowing lanterns in green and white costumes, from the tourism portal gallery',
    label: 'Pandang Gitab', position: '50% 50%',
  },
];

const scenes = [landscapes, culturePhotos];

export default function HomeDestinationCollage() {
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(!document.hidden);
  const [inView, setInView] = useState(true);
  const figure = useRef(null);
  const playing = !reducedMotion && visible && inView;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    preference.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting)) : null;
    observer?.observe(figure.current);
    return () => {
      preference.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep(current => (current + 1) % scenes.length), 2500);
    return () => window.clearInterval(timer);
  }, [playing]);

  return <figure ref={figure} className="hero-destination-collage" data-playing={playing} data-scene={step === 0 ? 'places' : 'culture'} aria-label="Calapan destinations, Mangyan smiles and handicrafts, Kalap Festival and Pandang Gitab dancers">
    <div className="hero-collage-grid">
      {landscapes.map((_, index) => <div className={`hero-collage-tile${index === 0 ? ' hero-collage-featured' : ''}`} key={index}>
        {scenes.map((scene, frame) => {
          const photo = scene[index];
          return <span key={frame} className={`hero-collage-frame${step === frame ? ' is-active' : ''}`} aria-hidden={step !== frame}>
            <img src={photo.src} alt={photo.alt} decoding="async" fetchPriority={index === 0 && frame === 0 ? 'high' : 'auto'} style={{objectPosition: photo.position}}/>
            <span className="hero-collage-label" aria-hidden="true">{photo.label}</span>
          </span>;
        })}
      </div>)}
    </div>
    <figcaption><a href="/photo-credits.html">Photo credits <span aria-hidden="true">↗</span></a></figcaption>
  </figure>;
}
