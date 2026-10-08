import {useSearchParams} from 'react-router-dom';
import {MapPin, Phone, Utensils, Wine, ShoppingBag, ExternalLink} from 'lucide-react';
import {establishments} from './establishments.js';

const categories = [['all', 'All Establishments'], ['bars', 'Bars & Clubs'], ['restaurants', 'Restaurants'], ['malls', 'Malls']];

export default function Establishments() {
  const [params, setParams] = useSearchParams();
  const selected = categories.some(([key]) => key === params.get('type')) ? params.get('type') : 'all';
  const visible = establishments.filter(place => selected === 'all' || place.category === selected);

  return <>
    <section className="page-intro container">
      <p className="eyebrow"><span/>EAT, SHOP & UNWIND</p>
      <h1>Establishments <em>in Calapan.</em></h1>
      <p>Find restaurants, bars, nightlife venues, and malls to complete your Calapan visit. Choose a category and discover a place to dine, shop, or unwind.</p>
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
          const Icon = place.category === 'bars' ? Wine : place.category === 'malls' ? ShoppingBag : Utensils;
          const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
          return <article className="establishment-card" key={place.id}>
            <div className="establishment-heading"><span className="establishment-icon"><Icon size={25} aria-hidden="true"/></span><span className="establishment-type">{place.type}</span></div>
            <h2>{place.name}</h2>
            <p className="establishment-description">{place.description}</p>
            <div className="establishment-details">
              <p><MapPin size={17} aria-hidden="true"/><span>{place.address}</span></p>
              {place.phone && <a href={`tel:${place.telephone}`} aria-label={`Call ${place.name}: ${place.phone}`}><Phone size={17} aria-hidden="true"/>{place.phone}</a>}
            </div>
            <div className="establishment-actions"><a className="button outline small" href={map} target="_blank" rel="noreferrer" aria-label={`Find ${place.name} on Google Maps`}>View Map <ExternalLink size={14}/></a>{place.source && <a className="establishment-source" href={place.source} target="_blank" rel="noreferrer" aria-label={`Tourism listing for ${place.name}`}>Tourism listing <ExternalLink size={12}/></a>}</div>
          </article>;
        })}
      </div>
      <div className="establishments-note"><p>Planning a visit? Check current opening hours, store availability, menus, rates, and reservations with the establishment.</p><p>Tourism reference: <a href="https://www.travelorientalmindoro.ph/municipality/calapan-city" target="_blank" rel="noreferrer">Travel Oriental Mindoro <ExternalLink size={12}/></a>.</p></div>
    </section>
  </>;
}
