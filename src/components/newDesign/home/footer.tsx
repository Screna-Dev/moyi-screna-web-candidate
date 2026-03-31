import { Linkedin, Mail } from 'lucide-react';
import Logo from '@/assets/Navbar.png';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const linkClass =
  'text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors text-sm';

const headingClass = 'font-semibold text-[hsl(222,22%,15%)] text-sm mb-4';

const PRODUCT_LINKS = [
  { label: 'Personalized Practice', href: '/personalized-practice' },
];

const COMMUNITY_LINKS = [
  { label: 'Interview Insights', href: '/interview-insights' },
  { label: 'Join our Discord', href: 'https://discord.gg/bujmRBnU' },
];

const SUPPORT_LINKS = [
  { label: 'Help Center', href: '/help' },
  { label: 'Contact', href: '/contact' },
];

const SOCIAL_LINKS = [
  { icon: XIcon, label: 'X', href: 'https://x.com/ScrenaAI' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/company/screnaai/' },
  { icon: DiscordIcon, label: 'Discord', href: 'https://discord.gg/bujmRBnU' },
  { icon: Mail, label: 'Email', href: 'mailto:operations@screna.ai' },
];

function FooterLinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className={headingClass}>{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={linkClass}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[hsl(220,16%,90%)] bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand block — 4 cols */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-3">
              <img src={Logo} alt="Screna" className="h-7 w-auto" />
            </div>
            <p className="text-[hsl(222,12%,45%)] text-sm leading-relaxed mb-5 max-w-xs">
              An AI-driven tech career community where you can share real interview experiences and practice role-specific question sets with explainable, actionable feedback.
            </p>
            <div className="flex items-center gap-1">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] hover:bg-[hsl(220,20%,96%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors"
                >
                  <Icon className="w-[18px] h-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns — 8 cols, split into 3 equal parts */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <FooterLinkColumn title="Product" links={PRODUCT_LINKS} />
            <FooterLinkColumn title="Community" links={COMMUNITY_LINKS} />
            <FooterLinkColumn title="Support" links={SUPPORT_LINKS} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[hsl(220,16%,90%)] mt-10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[hsl(222,12%,55%)] text-xs">
              © 2026 Screna AI. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-[hsl(222,12%,55%)]">
              <a href="/privacy" className="hover:text-[hsl(221,91%,60%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors px-1.5 py-0.5">
                Privacy
              </a>
              <span className="text-[hsl(220,16%,85%)]">·</span>
              <a href="#" className="hover:text-[hsl(221,91%,60%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors px-1.5 py-0.5">
                Terms
              </a>
              <span className="text-[hsl(220,16%,85%)]">·</span>
              <a href="/cookies" className="hover:text-[hsl(221,91%,60%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors px-1.5 py-0.5">
                Cookies
              </a>
              <span className="text-[hsl(220,16%,85%)]">·</span>
              <a href="#" className="hover:text-[hsl(221,91%,60%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors px-1.5 py-0.5">
                Data
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}