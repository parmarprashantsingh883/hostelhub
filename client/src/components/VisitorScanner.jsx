import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Keyboard, CameraOff, LogIn } from 'lucide-react';
import { api, errMsg } from '../api/client';
import { Modal, Button, Field, Input } from './ui';

const REGION_ID = 'qr-scan-region';

/**
 * Gate check-in by QR pass. Reads the visitor's pass code from the camera
 * (html5-qrcode) and checks them in; always offers a manual code entry as a
 * fallback for when the camera is unavailable or blocked.
 */
export default function VisitorScanner({ open, onClose, onChecked }) {
  const [mode, setMode] = useState('scan'); // scan | manual
  const [camError, setCamError] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef(null);
  const lockRef = useRef(false);

  const submit = async (raw) => {
    const c = String(raw || '').trim().toUpperCase();
    if (!c || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/visitors/check-in-by-code', { code: c });
      toast.success(`${data.data.visitor.visitorName} checked in`);
      onChecked?.();
      onClose?.();
    } catch (e) {
      toast.error(errMsg(e));
      lockRef.current = false; // allow another scan after a failure
    } finally {
      setBusy(false);
    }
  };

  // Camera lifecycle — start when the scan tab is open, stop on close/switch.
  useEffect(() => {
    if (!open || mode !== 'scan') return undefined;
    setCamError(false);
    lockRef.current = false;
    const html5 = new Html5Qrcode(REGION_ID, { verbose: false });
    scannerRef.current = html5;
    html5
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (lockRef.current) return;
          lockRef.current = true;
          submit(decoded);
        },
        () => {},
      )
      .catch(() => setCamError(true));

    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && s.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Reset to camera mode whenever the modal is (re)opened.
  useEffect(() => {
    if (open) { setMode('scan'); setCode(''); }
  }, [open]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Check in by pass">
      {/* Tabs */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { id: 'scan', label: 'Scan QR', icon: ScanLine },
          { id: 'manual', label: 'Enter code', icon: Keyboard },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              mode === t.id
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {mode === 'scan' ? (
        camError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-white/15">
            <CameraOff className="h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Camera unavailable</p>
            <p className="mt-1 text-xs text-slate-400">Allow camera access, or switch to “Enter code”.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setMode('manual')}>
              <Keyboard className="h-3.5 w-3.5" /> Enter code instead
            </Button>
          </div>
        ) : (
          <div>
            <div id={REGION_ID} className="overflow-hidden rounded-2xl bg-slate-900 [&_video]:rounded-2xl" />
            <p className="mt-3 text-center text-xs text-slate-400">Point the camera at the visitor’s QR pass.</p>
          </div>
        )
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); submit(code); }}
          className="space-y-4"
        >
          <Field label="Pass code" hint="Printed on the visitor’s pass — e.g. QV-9F3A21">
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="QV-XXXXXX"
              className="font-mono tracking-widest"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!code.trim()}>
            <LogIn className="h-4 w-4" /> Check in
          </Button>
        </form>
      )}
    </Modal>
  );
}
