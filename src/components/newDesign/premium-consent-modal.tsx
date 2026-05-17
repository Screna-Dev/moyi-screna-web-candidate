import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { Checkbox } from '@/components/newDesign/ui/checkbox';

interface PremiumConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function PremiumConsentModal({ open, onClose, onConfirm, loading = false }: PremiumConsentModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setScrolledToBottom(false);
      setAgreed(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolledToBottom(true);
    }
  };

  if (!open) return null;

  const canConfirm = scrolledToBottom && agreed && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!loading) onClose(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Premium Membership — Managed Apply Authorization & Service Agreement
          </h2>
          <button onClick={onClose} disabled={loading} className="p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0 ml-2">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-600 leading-relaxed prose prose-slate prose-sm max-w-none"
        >
          <p className="text-slate-500 text-xs mb-4">Effective May 2026 · Screna AI Premium Membership</p>
          <p className="mb-4">
            Before your Managed Apply service is activated, please read this Agreement in its entirety and confirm your authorization at the bottom of this page.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">1) Authorization Granted</h3>
          <p className="mb-2">By confirming your acceptance below, you expressly authorize Screna AI ("Screna," "we," "us") to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Submit job applications to prospective employers on your behalf;</li>
            <li>Create, access, and operate application accounts on third-party platforms — including but not limited to Workday, LinkedIn, and company-operated career portals — using credentials you have provided;</li>
            <li>Complete employment application forms using the personal information, job preferences, and compliance disclosures stored in your Application Profile; and</li>
            <li>Attach and submit your resume and, where required, a cover letter, as part of such applications.</li>
          </ul>
          <p className="mb-4">This authorization shall remain in effect for the duration of your active Premium Membership subscription, unless earlier revoked by you in accordance with Section 6 of this Agreement.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">2) Member Representations and Responsibilities</h3>
          <p className="mb-2"><strong>2.1 Accuracy of Information.</strong> You represent and warrant that all information contained in your Application Profile is accurate, complete, and truthful. You acknowledge that you bear sole legal responsibility for the accuracy of all information submitted to prospective employers on your behalf, including without limitation:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Personal and contact information;</li>
            <li>Work authorization status and visa sponsorship requirements;</li>
            <li>Employment history, including any prior employment with or termination by any employer to which an application is submitted;</li>
            <li>The existence and scope of any non-compete, non-solicitation, non-disclosure, or other restrictive covenant agreements to which you are subject;</li>
            <li>The existence of any familial or personal relationships with employees of any company to which an application is submitted; and</li>
            <li>Any current or former government employment or affiliations that may give rise to a conflict of interest.</li>
          </ul>
          <p className="mb-4">Screna transmits your information to prospective employers as provided by you, without independent verification. <strong>You are solely and legally responsible for the truthfulness of all submitted information.</strong></p>

          <p className="mb-2"><strong>2.2 Monitoring of Applications.</strong> You acknowledge that you have the ability to review all applications submitted on your behalf through the Jobs → Applied panel within your account dashboard. You are responsible for monitoring submitted applications and for notifying Screna promptly via Discord if any submission contains an error or inaccuracy.</p>

          <p className="mb-4"><strong>2.3 Application Credentials.</strong> You are responsible for the Application Password you provide to Screna. Screna will use such credentials solely for the purpose of submitting job applications on your behalf. You agree to designate a password that is not used for any other personal or financial accounts.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">3) Scope and Limitations of the Managed Apply Service</h3>
          <p className="mb-2"><strong>3.1 Service Description.</strong> The Managed Apply service is a <strong>job application submission service only</strong>. Screna will match open roles to your Job Search Filter and submit applications accordingly. Screna does not, and shall not be understood to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Negotiate compensation or employment terms on your behalf;</li>
            <li>Represent you in any interview, assessment, or hiring process;</li>
            <li>Guarantee any response, interview invitation, or employment offer from any prospective employer; or</li>
            <li>Modify your resume or application materials without your express instruction.</li>
          </ul>
          <p className="mb-2"><strong>3.2 No Guarantee of Outcomes.</strong> Screna makes no representations or warranties, express or implied, regarding the likelihood or occurrence of any particular job search outcome. Results are subject to factors beyond Screna's control, including your individual qualifications, employer requirements, and prevailing labor market conditions.</p>
          <p className="mb-4"><strong>3.3 Monthly Application Volume.</strong> Your Premium Membership includes up to <strong>200 managed applications per calendar month</strong>. Unused application capacity does not roll over to subsequent months. Applications are submitted at Screna's operational discretion in accordance with your Job Search Filter.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">4) Subscription Terms, Billing, and Refunds</h3>
          <p className="mb-2"><strong>4.1 Automatic Renewal.</strong> Your Premium Membership is a <strong>recurring subscription</strong> that renews automatically at the conclusion of each billing period (monthly, quarterly, or annual, as elected at the time of purchase). By subscribing, you authorize Screna to charge the payment method on file at the then-applicable renewal rate, unless you cancel prior to the renewal date in accordance with Section 4.2.</p>
          <p className="mb-2"><strong>4.2 Cancellation.</strong> You may cancel the automatic renewal of your subscription at any time by navigating to <strong>Settings → Billing → Membership → Request cancellation</strong>. Cancellation will stop future charges. Your Premium membership benefits will remain accessible through the end of the then-current paid billing period. Cancellation of auto-renewal does not constitute a request for a refund.</p>
          <p className="mb-2"><strong>4.3 Refund Policy.</strong> Screna offers a <strong>full refund within three (3) calendar days</strong> of any subscription payment, including renewal payments. Refund requests must be submitted through the designated entry point on the Billing page. Requests submitted within the three-day window will be honored in full, regardless of the extent to which the service has been used during that period. Refund requests submitted after the expiration of the three-day window will not be accepted.</p>
          <p className="mb-4">Approved refunds will be processed within <strong>five (5) to ten (10) business days</strong>, depending on your payment method and financial institution. Pay-as-you-go credits purchased separately are non-refundable.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">5) Data Sharing and Privacy</h3>
          <p className="mb-4">In order to perform the Managed Apply service, Screna will share information contained in your Application Profile — including your personal information, employment history, and compliance disclosures — with prospective employers and third-party application platforms as necessary to complete the application submission process. By confirming this Agreement, you expressly consent to such disclosure. For a complete description of how Screna collects, stores, uses, and protects your personal information, please refer to our Privacy Policy.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">6) Revocation of Authorization</h3>
          <p className="mb-2">You may revoke the authorization granted under this Agreement at any time by:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Notifying your dedicated client manager via Discord; or</li>
            <li>Pausing or disabling the Managed Apply feature within your account settings.</li>
          </ul>
          <p className="mb-4">Revocation shall apply to applications not yet submitted at the time of such notice. Applications already submitted on your behalf prior to revocation cannot be withdrawn by Screna. If you wish to withdraw a previously submitted application, you must contact the relevant employer directly.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">7) Limitation of Liability</h3>
          <p className="mb-4 uppercase text-xs">TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, SCRENA'S AGGREGATE LIABILITY TO YOU ARISING OUT OF OR IN CONNECTION WITH THE MANAGED APPLY SERVICE SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU FOR YOUR CURRENT BILLING PERIOD. IN NO EVENT SHALL SCRENA BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOST EMPLOYMENT OPPORTUNITIES, LOSS OF INCOME, OR ADVERSE EMPLOYER DECISIONS, ARISING FROM OR RELATED TO APPLICATIONS SUBMITTED UNDER THIS AGREEMENT.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">8) Governing Law and Dispute Resolution</h3>
          <p className="mb-4">This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws principles. Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Consumer Arbitration Rules, except that either party may seek emergency injunctive or other equitable relief in a court of competent jurisdiction where necessary to prevent irreparable harm.</p>

          <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">9) Modifications to This Agreement</h3>
          <p className="mb-4">Screna reserves the right to modify this Agreement at any time. In the event of any material modification, Screna will provide you with prior notice and will require your re-confirmation before the Managed Apply service continues. Your continued use of the Managed Apply service following re-confirmation constitutes your acceptance of the modified Agreement.</p>

          <p className="mb-2 italic text-slate-500 text-xs border-t border-slate-200 pt-4 mt-6">
            By checking the box below and clicking "Confirm &amp; Continue to Payment," you acknowledge that you have read, understood, and agree to be bound by this Agreement in its entirety; that you are at least eighteen (18) years of age; and that you accept full legal responsibility for the accuracy of all information submitted to prospective employers on your behalf.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 space-y-3">
          {!scrolledToBottom && (
            <p className="text-xs text-slate-500 text-center">
              Please scroll to the bottom of the agreement to continue.
            </p>
          )}
          <div className={`flex items-start gap-2.5 ${scrolledToBottom ? '' : 'opacity-50 pointer-events-none'}`}>
            <Checkbox
              id="premium-consent-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              disabled={!scrolledToBottom || loading}
              className="mt-0.5"
            />
            <label htmlFor="premium-consent-agree" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
              I have read, understood, and agree to the Premium Membership Managed Apply Authorization &amp; Service Agreement, and I authorize Screna AI to submit job applications on my behalf.
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!canConfirm}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
              {loading ? 'Processing…' : 'Confirm & Continue to Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
