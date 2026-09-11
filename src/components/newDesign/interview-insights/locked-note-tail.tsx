import { Lock } from 'lucide-react';

/**
 * A server-trimmed note: the sentence the public endpoint returned, then a
 * blurred continuation and the sign-in CTA.
 *
 * The public endpoints return one sentence per question and withhold the rest
 * server-side, so without an affordance the reader cannot tell a genuinely
 * short note from a trimmed one — the sentence reads as the whole thing. The
 * continuation runs on from that sentence in the same paragraph so it reads as
 * prose that got cut off, blurred with the same `blur-sm` the locked note
 * cards use, so the two gated states on this surface look like one system.
 *
 * ── What the blurred text is, and is not ──────────────────────────────────
 *
 * It is a true description of what the full note contains, built from facts
 * already visible on the page (company / role / round). It is NOT the withheld
 * text, and it is NOT invented note content:
 *
 *   • The real remainder never reaches the browser. The backend truncates, so
 *     there is nothing here to un-blur — which is the whole point. Shipping
 *     the full note and hiding it with a CSS filter is the implementation
 *     Google's paywall guidance rules out, and it leaks to anyone with
 *     devtools.
 *   • Counterfeit note text would be worse than useless. Blur is recoverable
 *     by selecting the text or turning the filter off, and a reader who does
 *     that should find an honest description, not filler we wrote and dressed
 *     up as somebody's interview notes.
 *
 * `paywallClass` is applied to the blurred span alone. On the company page it
 * carries `paywalled-note`, the selector the page's JSON-LD names in
 * hasPart.cssSelector — so the element declared as gated is exactly the gated
 * part, and the freely-readable first sentence sits outside it.
 */
export function LockedNoteTail({
  text,
  company,
  role,
  round,
  onUnlock,
  label = 'Create a free account to read the full note',
  paywallClass,
  quoted = false,
  compact = false,
}: {
  /** The sentence the API actually returned. Rendered plainly, always readable. */
  text: string;
  company?: string;
  role?: string;
  round?: string;
  /** Routes to /auth with a way back. */
  onUnlock: () => void;
  label?: string;
  /** Class for the blurred span — `paywalled-note` where JSON-LD names it. */
  paywallClass?: string;
  /** Wrap the visible sentence in quotes (the company-page card style). */
  quoted?: boolean;
  compact?: boolean;
}) {
  // Assembled from what the page already states, so every clause is true of
  // this note. Deliberately one plain sentence: a keyword pile-up would be
  // hidden text written for a crawler, which is a different thing from a
  // description that happens to contain the words the page is about.
  const subject = [role, company].filter(Boolean).join(' interview at ') || 'this interview';
  const continuation =
    `The rest of the author's notes on ${subject}` +
    (round ? `, ${round} round` : '') +
    `, covers how they worked through the question, what the panel pushed back on, and what they would do differently.`;

  return (
    <div className={compact ? 'mt-0.5' : 'mt-1'}>
      <p
        className={`leading-relaxed text-[hsl(222,12%,35%)] ${compact ? 'text-sm' : 'text-sm'} ${quoted ? 'italic' : ''}`}
      >
        {quoted ? `“${text}”` : text}{' '}
        <span
          className={`${paywallClass ?? ''} select-none blur-sm`}
          // Out of the a11y tree: a screen reader would otherwise read the
          // description as though it were the note, which is the one audience
          // the blur cannot signal to.
          aria-hidden="true"
        >
          {continuation}
        </span>
      </p>

      <button
        type="button"
        onClick={onUnlock}
        className={`mt-2 inline-flex items-center gap-1.5 font-semibold text-[hsl(221,91%,60%)] transition-colors hover:text-[hsl(221,91%,50%)] hover:underline ${compact ? 'text-xs' : 'text-[13px]'}`}
      >
        <Lock className={compact ? 'size-3' : 'size-3.5'} />
        {label}
      </button>
    </div>
  );
}
