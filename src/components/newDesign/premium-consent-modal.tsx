import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

interface PremiumConsentModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
}

type SectionKey = 'authorization' | 'representations' | 'scope' | 'subscription';

interface Section {
  key: SectionKey;
  number: string;
  title: string;
  // Each section ends with its own checkbox label. The body is the agreement
  // text the user must read; the checkbox label is what they affirm.
  checkboxLabel: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    key: 'authorization',
    number: '1',
    title: 'Authorization Granted',
    checkboxLabel:
      'I authorize Screna AI to submit job applications, operate third-party application accounts on my behalf, and attach my resume and cover letter as described above.',
    body: (
      <>
        <p className="mb-4">
          By confirming your acceptance below, you expressly authorize Screna AI
          ("Screna," "we," "us") to:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Submit job applications to prospective employers on your behalf;</li>
          <li>
            Create, access, and operate application accounts on third-party platforms
            &mdash; including but not limited to Workday, LinkedIn, and company-operated
            career portals &mdash; using credentials you have provided;
          </li>
          <li>
            Complete employment application forms using the personal information, job
            preferences, and compliance disclosures stored in your Application Profile;
            and
          </li>
          <li>
            Attach and submit your resume and, where required, a cover letter, as part
            of such applications.
          </li>
        </ul>
        <p className="mb-4">
          This authorization shall remain in effect for the duration of your active
          Premium Membership subscription, unless earlier revoked by you in accordance
          with Section 6 of this Agreement.
        </p>
      </>
    ),
  },
  {
    key: 'representations',
    number: '2',
    title: 'Member Representations and Responsibilities',
    checkboxLabel:
      'I confirm that all information in my Application Profile is accurate, complete, and truthful, and I accept sole legal responsibility for the information submitted on my behalf.',
    body: (
      <>
        <p className="mb-2"><strong>2.1 Accuracy of Information.</strong> You represent and warrant that all information contained in your Application Profile is accurate, complete, and truthful. You acknowledge that you bear sole legal responsibility for the accuracy of all information submitted to prospective employers on your behalf, including without limitation: personal and contact information; work authorization status and visa sponsorship requirements; employment history; non-compete, non-solicitation, non-disclosure, or other restrictive covenant agreements; familial or personal relationships with employees of any company to which an application is submitted; and any current or former government employment or affiliations that may give rise to a conflict of interest.</p>
        <p className="mb-4">Screna transmits your information to prospective employers as provided by you, without independent verification. <strong>You are solely and legally responsible for the truthfulness of all submitted information.</strong></p>
        <p className="mb-2"><strong>2.2 Monitoring of Applications.</strong> You acknowledge that you have the ability to review all applications submitted on your behalf through the Jobs &rarr; Applied panel within your account dashboard. You are responsible for monitoring submitted applications and for notifying Screna promptly via Discord if any submission contains an error or inaccuracy.</p>
        <p className="mb-4"><strong>2.3 Application Credentials.</strong> You are responsible for the Application Password you provide to Screna. Screna will use such credentials solely for the purpose of submitting job applications on your behalf. You agree to designate a password that is not used for any other personal or financial accounts.</p>
      </>
    ),
  },
  {
    key: 'scope',
    number: '3',
    title: 'Scope and Limitations of the Managed Apply Service',
    checkboxLabel:
      'I understand Managed Apply is an application-submission service only, that Screna does not guarantee any interview or offer, and that my plan includes up to 200 managed applications per calendar month.',
    body: (
      <>
        <p className="mb-2"><strong>3.1 Service Description.</strong> The Managed Apply service is a <strong>job application submission service only</strong>. Screna will match open roles to your Job Search Filter and submit applications accordingly. Screna does not negotiate compensation, represent you in any interview or hiring process, guarantee any response or offer, or modify your resume or application materials without your express instruction.</p>
        <p className="mb-2"><strong>3.2 No Guarantee of Outcomes.</strong> Screna makes no representations or warranties, express or implied, regarding the likelihood or occurrence of any particular job search outcome. Results are subject to factors beyond Screna's control, including your qualifications, employer requirements, and labor market conditions.</p>
        <p className="mb-4"><strong>3.3 Monthly Application Volume.</strong> Your Premium Membership includes up to <strong>200 managed applications per calendar month</strong>. Unused application capacity does not roll over to subsequent months. Applications are submitted at Screna's operational discretion in accordance with your Job Search Filter.</p>
      </>
    ),
  },
  {
    key: 'subscription',
    number: '4',
    title: 'Subscription Terms, Billing, and Refunds',
    checkboxLabel:
      'I understand the subscription auto-renews until cancelled, that refunds are available within 3 calendar days of any payment, and I agree to the cancellation and refund process described.',
    body: (
      <>
        <p className="mb-2"><strong>4.1 Automatic Renewal.</strong> Your Premium Membership is a <strong>recurring subscription</strong> that renews automatically at the conclusion of each billing period (monthly, quarterly, or annual). By subscribing, you authorize Screna to charge the payment method on file at the then-applicable renewal rate, unless you cancel prior to the renewal date.</p>
        <p className="mb-2"><strong>4.2 Cancellation.</strong> You may cancel auto-renewal at any time via Settings &rarr; Billing &rarr; Membership &rarr; Request cancellation. Cancellation stops future charges; Premium benefits remain accessible through the end of the then-current paid billing period. Cancellation of auto-renewal is not a refund request.</p>
        <p className="mb-4"><strong>4.3 Refund Policy.</strong> Screna offers a <strong>full refund within three (3) calendar days</strong> of any subscription payment, including renewals. Refund requests must be submitted through the designated entry point on the Billing page. Approved refunds are processed within five (5) to ten (10) business days. Pay-as-you-go credits purchased separately are non-refundable.</p>
      </>
    ),
  },
];

export function PremiumConsentModal({
  open,
  onCancel,
  onConfirm,
  isConfirming = false,
}: PremiumConsentModalProps) {
  const [checked, setChecked] = useState<Record<SectionKey, boolean>>({
    authorization: false,
    representations: false,
    scope: false,
    subscription: false,
  });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setChecked({
        authorization: false,
        representations: false,
        scope: false,
        subscription: false,
      });
      // Reset scroll position when reopening.
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const allChecked = SECTIONS.every((s) => checked[s.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!isConfirming) onCancel();
        }}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              className="text-lg font-semibold text-slate-900"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Screna AI Premium Membership Agreement
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Effective May 2026 &middot; Please read each section and confirm
              separately below.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-600 leading-relaxed prose prose-slate prose-sm max-w-none"
        >
          <p className="mb-4">
            Before your Managed Apply service is activated, please read this
            Agreement in its entirety and confirm your authorization at the bottom of
            this page. Your Managed Apply service activates only after you have
            checked all four boxes below.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.key}>
              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
                {section.number}) {section.title}
              </h3>
              {section.body}
              <label
                htmlFor={`consent-${section.key}`}
                className="mt-2 mb-2 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <Checkbox
                  id={`consent-${section.key}`}
                  checked={checked[section.key]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [section.key]: v === true }))
                  }
                  className="mt-0.5"
                />
                <span className="text-[13px] leading-snug text-slate-700">
                  {section.checkboxLabel}
                </span>
              </label>
            </div>
          ))}

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
            5) Data Sharing and Privacy
          </h3>
          <p className="mb-4">
            In order to perform the Managed Apply service, Screna will share
            information contained in your Application Profile &mdash; including your
            personal information, employment history, and compliance disclosures
            &mdash; with prospective employers and third-party application platforms
            as necessary to complete the application submission process. By
            confirming this Agreement, you expressly consent to such disclosure. For
            a complete description of how Screna collects, stores, uses, and protects
            your personal information, please refer to our Privacy Policy.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
            6) Revocation of Authorization
          </h3>
          <p className="mb-4">
            You may revoke the authorization granted under this Agreement at any time
            by notifying your dedicated client manager via Discord, or by pausing or
            disabling the Managed Apply feature within your account settings.
            Revocation shall apply to applications not yet submitted at the time of
            such notice. Applications already submitted on your behalf prior to
            revocation cannot be withdrawn by Screna.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
            7) Limitation of Liability
          </h3>
          <p className="mb-4 uppercase text-xs">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, SCRENA'S AGGREGATE
            LIABILITY TO YOU ARISING OUT OF OR IN CONNECTION WITH THE MANAGED APPLY
            SERVICE SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU FOR YOUR CURRENT
            BILLING PERIOD. IN NO EVENT SHALL SCRENA BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
            8) Governing Law and Dispute Resolution
          </h3>
          <p className="mb-4">
            This Agreement shall be governed by and construed in accordance with the
            laws of the State of Delaware, without regard to its conflict of laws
            principles. Any dispute arising out of or relating to this Agreement
            shall be resolved by binding arbitration administered by the American
            Arbitration Association in accordance with its Consumer Arbitration
            Rules.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
            9) Modifications to This Agreement
          </h3>
          <p className="mb-4">
            Screna reserves the right to modify this Agreement at any time. In the
            event of any material modification, Screna will provide you with prior
            notice and will require your re-confirmation before the Managed Apply
            service continues.
          </p>

          <p className="italic text-slate-500 text-xs border-t border-slate-200 pt-3 mt-6">
            By checking the four boxes above and clicking "Confirm &amp; Activate
            Managed Apply," you acknowledge that you have read, understood, and agree
            to be bound by this Agreement in its entirety; that you are at least
            eighteen (18) years of age; and that you accept full legal responsibility
            for the accuracy of all information submitted to prospective employers on
            your behalf.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!allChecked || isConfirming}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {isConfirming && <Loader2 className="size-4 animate-spin" />}
            Confirm &amp; Activate Managed Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PremiumConsentModal;
