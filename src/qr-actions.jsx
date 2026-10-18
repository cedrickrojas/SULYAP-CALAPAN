import React, { useEffect, useState } from 'react';
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

export default function QRActions({ destination: d }) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
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
        setError('Sharing did not open. Open this page in Chrome or Safari and try again.');
      }
    } finally {
      setSharing(false);
    }
  }

  function download() {
    if (!asset || sharing) return;
    setError('');
    if (inApp || mobileBrowser()) {
      if (canShareFile(asset.file)) {
        void shareFile();
        return;
      }
      if (inApp) {
        setError('Saving is unavailable here. Open this page in Chrome or Safari and try again.');
        return;
      }
    }
    const link = document.createElement('a');
    link.href = asset.imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } catch {
      setError('The download did not open. Open this page in Chrome or Safari and try again.');
    } finally {
      link.remove();
    }
  }

  function print() {
    if (!asset || sharing) return;
    setError('');
    if (inApp) {
      // Android WebViews need native host support for printing; window.print can do nothing.
      if (canShareFile(asset.file)) void shareFile();
      else setError('Printing is unavailable here. Open this page in Chrome or Safari and try again.');
      return;
    }
    try {
      flushSync(() => setPrinting(true));
      document.body.classList.add('sulyap-printing');
      window.print();
    } catch {
      setPrinting(false);
      document.body.classList.remove('sulyap-printing');
      setError('Printing did not open. Open this page in Chrome or Safari, or print the saved PNG.');
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
    {asset && createPortal(<div className={`qr-print-sheet${printing ? ' is-active' : ''}`}>
      <h1>{d.name}</h1>
      <p>SCAN TO LEARN MORE &middot; DESTINATION {String(d.id).padStart(2, '0')}</p>
      <img src={asset.imageUrl} alt={`QR code for ${d.name}`} width="1000" height="1000"/>
    </div>, document.body)}
  </>;
}
