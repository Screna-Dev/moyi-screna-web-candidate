import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, X as XIcon, Check } from 'lucide-react';
import LinkedInIcon from '../../imports/LinkedIn';
import XLogo from '../../imports/X';
import RedditIcon from '../../imports/Group1';
import screnaLogo from '@/assets/Navbar.png';
import { useShareReward, ShareRewardToast } from './share-reward-toast';
import PaymentService from '../../services/PaymentServices';

export interface ShareData {
  title: string;
  subtitle?: string;
  tags?: string[];
  summary?: string;
  url?: string;
}

interface SharePopoverProps {
  data: ShareData;
  children: React.ReactNode;
}

export function SharePopover({ data, children }: SharePopoverProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast, dismiss, recordShare } = useShareReward();

  const shareUrl = data.url || window.location.href;
  const shareText = `${data.title}${data.subtitle ? ` — ${data.subtitle}` : ''}`;
  const fullShareText = `${shareText}\n\nCheck out this interview insight on Screna!`;

  useEffect(() => {
    if (!open) return;
    
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle clicked, setting open to:', !open);
    setOpen(!open);
  };

  const handleCopy = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        recordShare();
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch { /* silent */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordShare();
  };

  const openX = () => {
    const tweetText = `${shareText}\n\n`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
    recordShare();
    setOpen(false);
  };

  const openLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
    recordShare();
    setOpen(false);
  };

  const openDiscord = () => {
    const discordMessage = `${fullShareText}\n\n${shareUrl}`;
    navigator.clipboard.writeText(discordMessage).then(() => {
      setDiscordCopied(true);
      setTimeout(() => setDiscordCopied(false), 2000);
      window.open('https://discord.com/channels/@me', '_blank', 'noopener,noreferrer');
    });
    recordShare();
    setTimeout(() => setOpen(false), 500);
  };

  const openReddit = () => {
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    recordShare();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      {/* Clone the child and attach the click handler directly */}
      <div onClick={handleToggle} className="cursor-pointer">
        {children}
      </div>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-[9999]">
          <div
            className="w-[340px] bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl shadow-black/8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <span className="text-sm font-semibold text-[hsl(222,22%,15%)]">Share this interview insight</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }} 
                className="p-0.5 rounded-md hover:bg-[hsl(220,20%,96%)] text-[hsl(222,12%,55%)] transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Preview card */}
            <div className="mx-4 mb-3 p-3 rounded-lg bg-[hsl(220,20%,97.5%)] border border-[hsl(220,16%,92%)]">
              <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] leading-snug mb-1.5 line-clamp-2">
                {data.title}
              </p>
              {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {data.tags.slice(0, 3).map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {data.summary && (
                <p className="text-[11px] text-[hsl(222,12%,45%)] leading-relaxed line-clamp-2">
                  {data.summary}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2.5">
                <img src={screnaLogo} alt="Screna" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[10px] font-medium text-[hsl(222,12%,55%)]">Screna AI</span>
              </div>
            </div>

            {/* Share actions */}
            <div className="px-4 pb-4 grid grid-cols-5 gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all duration-200 ${
                  copied
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-[hsl(222,12%,45%)] hover:bg-[hsl(221,91%,60%)]/5 hover:text-[hsl(221,91%,60%)]'
                }`}
              >
                {copied ? <Check className="w-[18px] h-[18px]" /> : <Link2 className="w-[18px] h-[18px]" />}
                <span className="text-[10px] font-medium">{copied ? 'Copied!' : 'Copy link'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openX();
                }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-[hsl(222,12%,45%)] hover:bg-black/5 transition-all duration-200"
              >
                <XLogo className="w-[18px] h-[18px] overflow-clip relative" />
                <span className="text-[10px] font-medium">X</span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openLinkedIn();
                }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-[hsl(222,12%,45%)] hover:bg-[#0A66C2]/5 transition-all duration-200"
              >
                <LinkedInIcon className="w-[18px] h-[18px] overflow-clip relative" />
                <span className="text-[10px] font-medium">LinkedIn</span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDiscord();
                }}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all duration-200 ${
                  discordCopied
                    ? 'bg-[#5865F2]/10 text-[#5865F2]'
                    : 'text-[hsl(222,12%,45%)] hover:bg-[#5865F2]/5 hover:text-[#5865F2]'
                }`}
              >
                <div className="w-[18px] h-[18px] relative">
                  <DiscordIcon />
                </div>
                <span className="text-[10px] font-medium">{discordCopied ? 'Copied!' : 'Discord'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openReddit();
                }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg text-[hsl(222,12%,45%)] hover:bg-[#FF4500]/5 hover:text-[#FF4500] transition-all duration-200"
              >
                <div className="w-[18px] h-[18px] relative">
                  <RedditIcon />
                </div>
                <span className="text-[10px] font-medium">Reddit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareRewardToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}