import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { errorData, startCreditsCheckout, unlockApplication } from './employerApi';
import { REPORT_CHECKOUT_KEY, useEmployerCredits } from './creditsContext';

// Figma 2451:4352 ("Unlock report"), on Report Credits: 1 credit per
// candidate and job (POST .../unlock, idempotent). With none left it offers to
// buy more (Stripe; the return lands back on this job's board).

export type UnlockTarget = { applicationId: string; label: string };

export function EmployerUnlockDialog({
  target,
  jobId,
  jobTitle,
  onClose,
  onUnlocked,
}: {
  target: UnlockTarget | null;
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onUnlocked: (applicationId: string) => void;
}) {
  const { credits, refresh } = useEmployerCredits();
  const [busy, setBusy] = useState(false);
  // Set when the server says there are no credits (the badge may be stale).
  const [shortOf, setShortOf] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('5');

  useEffect(() => {
    if (target) {
      setShortOf(null);
      setQuantity('5');
    }
  }, [target]);

  const available = shortOf ?? credits?.report ?? null;
  const blocked = available !== null && available < 1;
  const n = Math.round(Number(quantity));
  const validQty = Number.isFinite(n) && n >= 1 && n <= 100;

  const unlock = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      await unlockApplication(target.applicationId);
      refresh();
      toast.success(`${target.label} unlocked`);
      onUnlocked(target.applicationId);
      onClose();
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'INSUFFICIENT_CREDITS') {
        setShortOf(errorData<{ available?: number }>(err)?.available ?? 0);
        refresh();
      } else if (code === 'INVALID_STATE') toast.error(authErrorMessage(err) || "This candidate hasn't finished the interview yet.");
      else toast.error(authErrorMessage(err) || 'Could not unlock this report.');
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (!validQty || busy) return;
    setBusy(true);
    try {
      const url = await startCreditsCheckout({ creditType: 'EMPLOYER_REPORT', quantity: n, jobId });
      try {
        sessionStorage.setItem(REPORT_CHECKOUT_KEY, jobId);
      } catch {
        /* storage blocked: the return opens the wizard instead */
      }
      window.location.href = url;
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not start checkout.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      serifTitle
      width={560}
      title={target ? `Unlock ${target.label}’s report?` : ''}
      actions={
        <>
          <Button onClick={onClose} className="!rounded-lg h-10 font-semibold text-[#5a6172]">
            Cancel
          </Button>
          {blocked ? (
            <Button variant="primary" className="!rounded-lg h-10 font-semibold" disabled={!validQty || busy} onClick={() => void buy()}>
              {busy ? 'Opening checkout…' : 'Buy Report Credits'}
            </Button>
          ) : (
            <Button variant="primary" className="!rounded-lg h-10 font-semibold" disabled={busy} onClick={() => void unlock()}>
              {busy ? 'Unlocking…' : 'Unlock Report'}
            </Button>
          )}
        </>
      }
    >
      <p className="-mt-2 text-[14px] leading-5 text-[#5a6172]">
        Unlock this candidate&rsquo;s resume, full interview report, and contact email for {jobTitle || 'this role'}.
      </p>
      <div className="h-px bg-[#e1e4ea] my-2" />
      <div className="bg-[#f3f4f7] rounded-xl p-4 flex flex-col">
        <p className="text-[12px] leading-[18px] font-semibold text-[#3c77f6]">{blocked ? 'No Report Credits left' : 'Uses your Report Credits'}</p>
        <div className="flex flex-col gap-3 pt-4 text-[13px] leading-[19.5px]">
          <SummaryRow label="Report Credits remaining" value={available ?? '—'} />
          <SummaryRow label="This action" value={blocked ? 'Not available' : 'Uses 1 Report Credit'} />
          <div className="h-px bg-[#e1e4ea]" />
          {blocked ? (
            <>
              <p className="font-semibold text-[#dc2626]">You&rsquo;ve used all your Report Credits. Buy more to keep unlocking.</p>
              <label className="flex items-center justify-between gap-4">
                <span className="text-[#5a6172]">Credits to buy</span>
                <TextInput type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="!w-24" aria-label="Report Credits to buy" />
              </label>
              {!validQty && <span className="text-[12px] text-[#dc2626]">Enter 1 to 100</span>}
            </>
          ) : (
            <SummaryRow strong label="Remaining after unlock" value={available === null ? '—' : available - 1} />
          )}
        </div>
      </div>
      <p className="text-[11px] leading-4 text-[#5a6172]">
        This unlock applies only to this candidate and role. Unlocking this candidate&rsquo;s report for another role uses another Report Credit.
      </p>
    </Dialog>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-semibold text-[#1e232f]' : 'text-[#5a6172]'}>{label}</span>
      <span className={cx('text-[#1e232f]', strong ? 'font-bold' : 'font-semibold')}>{value}</span>
    </div>
  );
}
