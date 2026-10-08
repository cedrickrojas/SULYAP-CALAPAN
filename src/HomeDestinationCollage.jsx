import {getDestination} from './destinations';

const selections = [
  {id: '9', image: 1, label: 'Baco Island', featured: true},
  {id: '1', image: 0, position: '55% 40%'},
  {id: '2', image: 0, label: 'Silonay Mangroves'},
  {id: '3', image: 1, label: 'Heritage Museum', position: '65% 50%'},
  {id: '8', image: 0, position: '50% 70%'},
  {id: '10', image: 1, position: '50% 60%'},
];

export default function HomeDestinationCollage() {
  return <figure className="hero-destination-collage" aria-label="Photos from six Calapan destinations">
    <div className="hero-collage-grid">
      {selections.map(({id, image, label, position, featured}) => {
        const destination = getDestination(id);
        const photo = destination.images[image];
        return <div className={`hero-collage-tile${featured ? ' hero-collage-featured' : ''}`} key={id}>
          <img src={photo.src} alt={photo.alt} decoding="async" fetchPriority={featured ? 'high' : 'auto'} style={{objectPosition: position || '50% 50%'}}/>
          <span aria-hidden="true">{label || destination.name}</span>
        </div>;
      })}
    </div>
    <figcaption><span>Islands, nature &amp; heritage.</span><a href="/photo-credits.html">Photo credits <span aria-hidden="true">↗</span></a></figcaption>
  </figure>;
}
