import React,{useEffect,useRef,useState} from 'react';
import {Camera,X,QrCode,MapPin} from 'lucide-react';
import SwipeablePhotoStage from './SwipeablePhotoStage';
import {brandedQrDataUrl} from './qr-code';
import QRActions,{useQrExport} from './qr-actions';
import {destinationUrl} from './destinations';
const num=id=>String(id).padStart(2,'0');
export function PhotoGallery({destination:d,embedded=false}){
 const [active,setActive]=useState(null);
 const dialog=useRef(null),slider=useRef(null);
 useEffect(()=>{if(active!==null&&!dialog.current?.open)dialog.current?.showModal();},[active]);
 const close=()=>{dialog.current?.close();setActive(null);};
 const next=step=>slider.current?.next(step);
 return <section className={embedded?'detail-gallery':'section gallery-section container'} id="gallery">
  <div className="section-heading"><div><p className="eyebrow"><span/>A GLIMPSE OF THE EXPERIENCE</p><h2>Destination <em>Gallery</em></h2><p>{d.slug==='aganhao-islet'?'Anaganahao aerial and detail views, plus regional Calapan reef photos from Dive Mindoro. The reef photos are not identified with a specific island. Tap a photo to explore.':d.images.some(img=>img.placeholder)?'Confirmed photos are shown where available; remaining slots are marked Photo coming soon.':'A few perspectives on '+d.name+'. Tap a photo to take a closer look.'}</p></div></div>
  <div className="gallery-grid">{d.images.map((img,i)=><button className="gallery-thumb" key={img.src} onClick={()=>setActive(i)} aria-label={`View photo ${i+1} of ${d.name}`}><img src={img.src} alt={img.alt} loading="lazy"/><span><Camera size={18}/> {img.placeholder?'Photo coming soon':img.context==='regional'?'Regional reef photo':'View photo'}</span></button>)}</div>
  <dialog ref={dialog} className="lightbox" aria-label={`${d.name} photo gallery`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();next(e.key==='ArrowRight'?1:-1);}}}>
   <button className="lightbox-close icon-button" aria-label="Close gallery" onClick={close}><X/></button>
   {active!==null&&<>
    <SwipeablePhotoStage images={d.images} initialIndex={active} onChange={setActive} controllerRef={slider}/>
    <p className="lightbox-caption" role="status" aria-atomic="true">{d.images[active].alt} <span>{active+1} / {d.images.length}</span></p>
    <div className="gallery-indicators" role="group" aria-label="Choose a photo">{d.images.map((img,i)=><button type="button" key={img.src} aria-label={`Show photo ${i+1}`} aria-pressed={active===i} onClick={()=>slider.current?.goTo(i)}><span/></button>)}</div>
    <p className="gallery-hint">Swipe or use the arrows to explore</p>
   </>}
  </dialog>
 </section>;
}
export function QRCodeImage({destination:d}){
 const[src,setSrc]=useState(''),[error,setError]=useState(false);const url=destinationUrl(d);
 useEffect(()=>{let alive=true;brandedQrDataUrl(url,{width:360,margin:4}).then(value=>{if(alive){setSrc(value);setError(false);}}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[url]);
 if(error)return <p role="alert">The QR code could not be generated. Refresh the page to try again.</p>;
 return src?<img className="qr-image" src={src} alt={`QR code linking directly to ${d.name}`}/>:<div className="qr-loading" role="status">Preparing QR code…</div>;
}
export function QRCodeCard({destination:d,compact=false}){
 const qr=useQrExport(d);
 return <article className={`qr-card ${compact?'modal-qr-card':''}`}><div className="qr-card-heading"><span>QR CODE {num(d.id)}</span><QrCode size={18}/></div><h3>{d.name}</h3><p className="location-line"><MapPin size={14}/>{d.province}</p>
  {qr.asset?<img className="qr-image" src={qr.asset.imageUrl} alt={`QR code linking directly to ${d.name}`}/>:!qr.error&&<div className="qr-loading" role="status">Preparing QR code&#8230;</div>}
  <p className="scan-label">Scan to Explore</p><QRActions key={d.id} destination={d} qr={qr}/>
 </article>;
}
export function QRModal({destination:d,onClose}){
 const ref=useRef(null);
 useEffect(()=>{const node=ref.current;node.showModal();return()=>node.close();},[]);
 const close=()=>{ref.current?.close();onClose();};
 return <dialog ref={ref} className="qr-dialog" aria-label={`QR code for ${d.name}`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <button className="icon-button modal-close" aria-label="Close QR code" onClick={close}><X/></button><QRCodeCard destination={d} compact/>
 </dialog>;
}
