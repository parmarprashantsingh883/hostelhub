import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';

/**
 * Themed QR tile. The code itself stays dark-on-white (required for reliable
 * scanning) on a rounded white card that reads well in light and dark mode.
 *  • value     — the string/URL to encode
 *  • caption   — small helper line under the code
 *  • download  — when set, shows a "Download" button saving "<download>.png"
 */
export default function QRCode({ value, size = 176, caption, download, className = '' }) {
  const wrapRef = useRef(null);

  const doDownload = () => {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${download || 'quarters-qr'}.png`;
    a.click();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div ref={wrapRef} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200">
        <QRCodeCanvas value={value || ' '} size={size} level="M" marginSize={2} fgColor="#0f172a" bgColor="#ffffff" />
      </div>
      {caption && <p className="mt-2.5 max-w-[15rem] text-center text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
      {download && (
        <button
          type="button"
          onClick={doDownload}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/5"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      )}
    </div>
  );
}
