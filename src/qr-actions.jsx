import React, { useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Download, Printer } from 'lucide-react';
import { destinationUrl } from './destinations';
import { prepareQrExport } from './qr-code';
import { qrFilename } from './qr-layout.js';

const embeddedBrowser = () => /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger|Instagram/i.test(navigator.userAgent);

function canShareFile(file) {
  try {
    return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

export function useQrExport(d) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const url = destinationUrl(d);
  const filename = qrFilename(d);

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

  return { asset, error, setError, filename, retry: () => setAttempt(value => value + 1) };
}

export default function QRActions({ destination: d, qr }) {
  const { asset, error, setError, filename, retry } = qr;
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const inApp = embeddedBrowser();

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
        setError('Printing did not open. Download the QR and print the saved PNG.');
      }
    } finally {
      setSharing(false);
    }
  }

  function download() {
    if (!asset || sharing) return;
    setError('');
    const link = document.createElement('a');
    // A normal HTTP attachment lets the host's download manager receive the file.
    link.href = `/api/qr-download?id=${d.id}`;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } catch {
      setError('The QR download could not start. Please try again.');
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
      else setError('Printing is not supported in this app. Download the QR and print the saved PNG.');
      return;
    }
    try {
      flushSync(() => setPrinting(true));
      document.body.classList.add('sulyap-printing');
      window.print();
    } catch {
      setPrinting(false);
      document.body.classList.remove('sulyap-printing');
      setError('Printing did not open. Download the QR and print the saved PNG.');
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
    {!asset && error && <button type="button" className="button outline small" onClick={retry}>Try again</button>}
    {asset && createPortal(<div className={`qr-print-sheet${printing ? ' is-active' : ''}`}>
      <h1>{d.name}</h1>
      <p>SCAN TO LEARN MORE &middot; DESTINATION {String(d.id).padStart(2, '0')}</p>
      <img src={asset.imageUrl} alt={`QR code for ${d.name}`} width="1000" height="1000"/>
    </div>, document.body)}
  </>;
}
