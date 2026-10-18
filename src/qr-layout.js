import QRCode from 'qrcode';

export const qrColors = { dark: '#30232b', light: '#ffffff' };
export const qrFilename = d => `sulyap-${String(d.id).padStart(2, '0')}-${d.slug}-qr.png`;

export function qrLayout(url, margin) {
  const code = QRCode.create(url, { errorCorrectionLevel: 'H' });
  // Keep the logo plate small and align its edges to whole QR modules.
  let plateSize = Math.floor(code.modules.size * 0.2);
  if (plateSize % 2 === 0) plateSize -= 1;
  const start = margin + (code.modules.size - plateSize) / 2;
  return { version: code.version, size: code.modules.size + margin * 2, plateSize, start };
}
