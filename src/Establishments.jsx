import {useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {MapPin, Phone, Utensils, Wine, ShoppingBag, Gift, Hotel, Plane, ExternalLink} from 'lucide-react';
import {establishments} from './establishments.js';
import establishmentImages from './establishment-images.json';

const categories = [
  ['all', 'All Establishments'], ['bars', 'Bars & Clubs'], ['restaurants', 'Restaurants'],
  ['malls', 'Malls'], ['souvenirs', 'Souvenir Shops'], ['hotels', 'Hotels'], ['travel-agencies', 'Travel Agencies'],
];
const categoryIcons = {bars: Wine, restaurants: Utensils, malls: ShoppingBag, souvenirs: Gift, hotels: Hotel, 'travel-agencies': Plane};

function EstablishmentPhoto({place, Icon}) {
  const photo = establishmentImages[place.id];
  const [unavailable, setUnavailable] = useState(false);
  return <div className={`establishment-photo${photo?.fit === 'contain' ? ' establishment-photo-poster' : ''}`}>
    {photo && !unavailable ? <>
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" style={{objectPosition: photo.position}} onError={() => setUnavailable(true)}/>
      <a className="establishment-photo-credit" href={`/photo-credits.html#establishment-${place.id}`} aria-label={`Photo credit for ${place.name}`}>Photo credit <ExternalLink size={12}/></a>
    </> : <div className="establishment-photo-pending"><Icon size={36} aria-hidden="true"/><span>{unavailable ? 'Photo unavailable' : 'Photo coming soon'}</span></div>}
    <span className="establishment-photo-type">{place.type}{photo?.illustrative && !unavailable ? ' · Illustrative photo' : ''}</span>
    {photo?.caption && !unavailable && <span className="establishment-photo-caption">{photo.caption}</span>}
  </div>;
}

export default function Establishments() {
  const [params, setParams] = useSearchParams();
  const selected = categories.some(([key]) => key === params.get('type')) ? params.get('type') : 'all';
  const visible = establishments.filter(place => selected === 'all' || place.category === selected);

  return <>
    <section className="page-intro container">
      <p className="eyebrow"><span/>EAT, SHOP, STAY & EXPLORE</p>
      <h1>Establishments <em>in Calapan.</em></h1>
      <p>Find restaurants, bars, malls, souvenir shops, hotels, and travel agencies for your Calapan visit. Choose a category to plan where to eat, shop, stay, or arrange your trip.</p>
    </section>
    <section className="container establishments-section" aria-label="Calapan establishments directory">
      <div className="establishments-toolbar">
        <div className="establishment-filters" role="group" aria-label="Filter establishments">
          {categories.map(([key, label]) => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setParams(key === 'all' ? {} : {type: key})}>{label}<span>{establishments.filter(place => key === 'all' || place.category === key).length}</span></button>)}
        </div>
        <p className="establishments-count" role="status">{visible.length} establishments</p>
      </div>
      <div className="establishment-grid">
        {visible.map(place => {
          const Icon = categoryIcons[place.category] || ShoppingBag;
          const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
          return <article className="establishment-card" key={place.id}>
            <EstablishmentPhoto place={place} Icon={Icon}/>
            <div className="establishment-body">
            <h2>{place.name}</h2>
            <p className="establishment-description">{place.description}</p>
            <div className="establishment-details">
              <p><MapPin size={17} aria-hidden="true"/><span>{place.address}</span></p>
              {place.phone && <a href={`tel:${place.telephone}`} aria-label={`Call ${place.name}: ${place.phone}`}><Phone size={17} aria-hidden="true"/>{place.phone}</a>}
            </div>
            <div className="establishment-actions"><a className="button outline small" href={map} target="_blank" rel="noreferrer" aria-label={`Find ${place.name} on Google Maps`}>View Map <ExternalLink size={14}/></a>{place.source && <a className="establishment-source" href={place.source} target="_blank" rel="noreferrer" aria-label={`${place.sourceLabel || 'Tourism listing'} for ${place.name}`}>{place.sourceLabel || 'Tourism listing'} <ExternalLink size={12}/></a>}</div>
            </div>
          </article>;
        })}
      </div>
      <div className="establishments-note"><p>Planning a visit? Check current opening hours, store availability, menus, room rates, reservations, and travel services with the establishment.</p><p>Tourism reference: <a href="https://www.travelorientalmindoro.ph/municipality/calapan-city" target="_blank" rel="noreferrer">Travel Oriental Mindoro <ExternalLink size={12}/></a>.</p></div>
    </section>
  </>;
}
