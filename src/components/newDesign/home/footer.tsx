import { Linkedin, Twitter, Github, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/assets/logo.png';

const linkClass = 'text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] transition-colors text-sm';

export function Footer() {
  return (
    <footer className="border-t border-[hsl(220,16%,90%)] bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={Logo} alt="Screna AI" className="w-8 h-8 object-contain" />
              <span className="text-xl font-semibold text-[hsl(222,22%,15%)]">
                Screna AI
              </span>
            </Link>
            <p className="text-[hsl(222,12%,45%)] text-sm leading-relaxed mb-6">
              AI-powered interview practice and job search platform designed to
              help you succeed with confidence.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="mailto:support@screna.ai" className="text-[hsl(222,12%,45%)] hover:text-[hsl(221,91%,60%)] transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-[hsl(222,22%,15%)] mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/mock-interview" className={linkClass}>AI Interview Coach</Link></li>
              <li><Link to="/job-board" className={linkClass}>Job Matching</Link></li>
              <li><Link to="/question-bank" className={linkClass}>Question Bank</Link></li>
              <li><Link to="/pricing" className={linkClass}>Pricing</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-[hsl(222,22%,15%)] mb-4">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/career" className={linkClass}>Careers</Link></li>
              <li><a href="mailto:support@screna.ai" className={linkClass}>Contact Us</a></li>
              <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-[hsl(222,22%,15%)] mb-4">Support</h4>
            <ul className="space-y-3">
              <li><a href="mailto:support@screna.ai" className={linkClass}>Help Center</a></li>
              <li><Link to="/auth" className={linkClass}>Get Started</Link></li>
              <li><a href="#" className={linkClass}>Privacy Policy</a></li>
              <li><a href="#" className={linkClass}>Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[hsl(220,16%,90%)] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[hsl(222,12%,45%)] text-sm">
              © {new Date().getFullYear()} Screna AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className={linkClass}>Privacy</a>
              <a href="#" className={linkClass}>Terms</a>
              <a href="#" className={linkClass}>Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
