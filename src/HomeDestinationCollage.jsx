import {getDestination} from './destinations';

const selections = [
  {id: '9', image: 1, label: 'Baco Island', featured: true},
  {id: '1', image: 0, position: '55% 40%'},
  {id: '2', image: 0, label: 'Silonay Mangroves'},
  {id: '3', image: 1, label: 'Heritage Museum', position: '65% 50%'},
  {id: '8', image: 0, position: '50% 70%'},
  {id: '10', image: 1, position: '50% 60%'},
];

function animatePhoto(event) {
  const tile = event.currentTarget;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !tile.animate) return;

  // Restart the feedback on every tap, including rapid repeated taps.
  tile.getAnimations().forEach(animation => animation.cancel());
  tile.animate([
    {transform: 'scale(1)'},
    {transform: 'scale(.95)', offset: .25},
    {transform: 'scale(1.025)', offset: .65},
    {transform: 'scale(1)'},
  ], {duration: 540, easing: 'cubic-bezier(.22, 1, .36, 1)'});

  const ripple = tile.querySelector('.hero-collage-ripple');
  ripple.getAnimations().forEach(animation => animation.cancel());
  ripple.animate([
    {opacity: .7, transform: 'scale(.15)'},
    {opacity: 0, transform: 'scale(1.2)'},
  ], {duration: 620, easing: 'ease-out'});
}

export default function HomeDestinationCollage() {
  return <figure className="hero-destination-collage" aria-label="Photos from six Calapan destinations">
    <div className="hero-collage-grid">
      {selections.map(({id, image, label, position, featured}) => {
        const destination = getDestination(id);
        const photo = destination.images[image];
        return <button type="button" className={`hero-collage-tile${featured ? ' hero-collage-featured' : ''}`} key={id} onClick={animatePhoto} aria-label={`Animate ${label || destination.name} photo`}>
          <img src={photo.src} alt={photo.alt} decoding="async" fetchPriority={featured ? 'high' : 'auto'} style={{objectPosition: position || '50% 50%'}}/>
          <span className="hero-collage-label" aria-hidden="true">{label || destination.name}</span>
          <span className="hero-collage-ripple" aria-hidden="true"/>
        </button>;
      })}
    </div>
    <figcaption><span>Islands, nature &amp; heritage.</span><a href="/photo-credits.html">Photo credits <span aria-hidden="true">↗</span></a></figcaption>
  </figure>;
}
