import React, { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Download, Printer } from 'lucide-react';
import { destinationUrl } from './destinations';
import { prepareQrExport } from './qr-code';

const embeddedBrowser = () => /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger|Instagram/i.test(navigator.userAgent);
const mobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function canShareFile(file) {
  try {
    return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

function BrowserHelp({ destination }) {
  const [message, setMessage] = useState('');
  const input = useRef(null);
  const link = new URL(`${destination.qrCodeUrl}/qr`, window.location.origin).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Link copied. Paste it into Chrome or Safari.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage('Press and hold the selected link to copy it, then paste it into Chrome or Safari.');
    }
  }

  return <div className="qr-browser-help">
    <p>If saving or printing does not open, tap the app's menu (&#8943; or &#8942;) and choose <strong>Open in browser</strong>. In Chrome or Safari, tap Download QR or Print QR again.</p>
    <button type="button" className="button outline small" onClick={copyLink}>Copy QR page link</button>
    <label>Or copy this link into your browser:
      <input ref={input} aria-label="QR page link" readOnly value={link} onFocus={event => event.target.select()}/>
    </label>
    {message && <p role="status">{message}</p>}
  </div>;
}

export default function QRActions({ destination: d }) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const url = destinationUrl(d);
  const filename = `sulyap-${String(d.id).padStart(2, '0')}-${d.slug}-qr.png`;
  const inApp = embeddedBrowser();

  useEffect(() => {
    let alive = true;
    setAsset(null);
    setError('');
    setPreview('');
    prepareQrExport(url, filename).then(value => {
      if (alive) setAsset(value);
    }).catch(() => {
      if (alive) setError('The QR file could not be prepared. Please try again.');
    });
    return () => { alive = false; };
  }, [url, filename, attempt]);

  useEffect(() => {
    if (!printing) return;
    const finish = () => {
      document.body.classList.remove('sulyap-printing');
      setPrinting(false);
    };
    window.addEventListener('afterprint', finish);
    return () => {
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('sulyap-printing');
    };
  }, [printing]);

  async function shareFile() {
    setSharing(true);
    try {
      // No QR generation or other awaits before this call.
      await navigator.share({ files: [asset.file], title: `${d.name} QR code` });
    } catch (reason) {
      if (reason?.name !== 'AbortError') {
        setError('Sharing did not open. Use the QR image or the browser options below.');
      }
    } finally {
      setSharing(false);
    }
  }

  function download() {
    if (!asset || sharing) return;
    setError('');
    if (inApp || mobileBrowser()) {
      setPreview('save');
      if (canShareFile(asset.file)) {
        void shareFile();
        return;
      }
      // In-app browsers may silently ignore download links. Keep a saveable PNG visible.
      if (inApp) return;
    }
    const link = document.createElement('a');
    link.href = asset.imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } catch {
      setPreview('save');
      setError('The download did not open. Use the QR image or the browser options below.');
    } finally {
      link.remove();
    }
  }

  function print() {
    if (!asset || sharing) return;
    setError('');
    setPreview('print');
    if (inApp) {
      // Android WebViews need native host support for printing; window.print can do nothing.
      if (canShareFile(asset.file)) void shareFile();
      return;
    }
    try {
      flushSync(() => setPrinting(true));
      document.body.classList.add('sulyap-printing');
      window.print();
    } catch {
      setPrinting(false);
      document.body.classList.remove('sulyap-printing');
      setError('Printing did not open. Use the browser options below or print the saved PNG.');
    }
  }

  return <>
    <div className="qr-tools">
      <button type="button" disabled={!asset || sharing} onClick={download}><Download size={16}/> Download QR</button>
      <button type="button" disabled={!asset || sharing} onClick={print}><Printer size={16}/> Print QR</button>
    </div>
    {!asset && !error && <p className="qr-action-status" role="status">Preparing download and print&#8230;</p>}
    {sharing && <p className="qr-action-status" role="status">Choose a save or print option in your device's share menu.</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {!asset && error && <button type="button" className="button outline small" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
    {preview && asset && <section className="qr-save-preview" aria-label="Save or print QR code">
      <h4>{preview === 'print' ? 'Print your QR code' : 'Save your QR code'}</h4>
      <p>{preview === 'print'
        ? 'Choose Print in the share menu if available, or save the PNG and print it from Photos or Files.'
        : 'Choose Save Image, Save to Photos, or Save to Files if available. You can also press and hold the PNG below and choose Save Image.'}</p>
      <img src={asset.imageUrl} alt={`Saveable QR code for ${d.name}`} width="1000" height="1000"/>
      <BrowserHelp destination={d}/>
    </section>}
    {asset && createPortal(<div className={`qr-print-sheet${printing ? ' is-active' : ''}`}>
      <h1>{d.name}</h1>
      <p>SCAN TO LEARN MORE &middot; DESTINATION {String(d.id).padStart(2, '0')}</p>
      <img src={asset.imageUrl} alt={`QR code for ${d.name}`} width="1000" height="1000"/>
    </div>, document.body)}
  </>;
}
