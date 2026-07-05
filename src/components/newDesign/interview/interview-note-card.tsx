import { useState } from "react";
import { Link, useNavigate } from "react-router";
import svgPaths from "./svg-article-margin";
import { getCompanyLogoUrl } from "@/components/newDesign/ui/company-logo";
import { useAuth } from "@/contexts/AuthContext";
import { likePost, unlikePost, savePost, unsavePost } from "@/services/CommunityService";
import { SharePopover } from "@/components/newDesign/share-popover";
import { toast } from "sonner";

export interface InterviewNote {
  id: string;
  company: string;
  role: string;
  round: string;
  level: string;
  outcome: "Offer" | "Rejected" | "Pending" | "No Offer";
  date: string;
  author: string;
  excerpt: string;
  questions: string[];
  upvotes: number;
  comments: number;
  saves: number;
  liked?: boolean;
  saved?: boolean;
  createdAtMs?: number;
  featured?: boolean;
}

function CompanyAvatar({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name?.[0] ?? "?";
  const url = getCompanyLogoUrl(name);
  const showLogo = url && !failed;
  return (
    <div
      className={`shrink-0 flex items-center justify-center overflow-hidden size-[32px] rounded-[12px] ${
        showLogo ? "bg-white" : "bg-secondary border border-border"
      }`}
    >
      {showLogo ? (
        <img
          src={url}
          alt={`${name} logo`}
          className="size-full rounded-[inherit] object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-sans text-[14px] font-bold leading-[20px] text-foreground">{initial}</span>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: InterviewNote["outcome"] }) {
  if (outcome === "Offer") {
    return (
      <span className="shrink-0 inline-flex items-center rounded-full bg-[#ecfdf5] px-[10px] py-[2px] font-sans text-[11px] font-semibold leading-[16.5px] text-[#007a55]">
        Offer
      </span>
    );
  }
  if (outcome === "Rejected" || outcome === "No Offer") {
    return (
      <span className="shrink-0 inline-flex items-center rounded-full bg-[#fef2f2] px-[10px] py-[2px] font-sans text-[11px] font-semibold leading-[16.5px] text-[#b91c1c]">
        {outcome}
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center rounded-full bg-secondary px-[10px] py-[2px] font-sans text-[11px] font-semibold leading-[16.5px] text-muted-foreground">
      {outcome}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg className="size-[12px] shrink-0" fill="none" viewBox="0 0 12 12">
      <g clipPath="url(#clock-clip)">
        <path d={svgPaths.p3e7757b0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 3V6L8 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="clock-clip"><rect width="12" height="12" fill="white" /></clipPath>
      </defs>
    </svg>
  );
}

function UpvoteIcon() {
  return (
    <svg className="size-[14px] shrink-0" fill="none" viewBox="0 0 14 14">
      <g clipPath="url(#upvote-clip)">
        <path d="M4.08333 5.83333V12.8333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        <path d={svgPaths.p339cc5a0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
      </g>
      <defs>
        <clipPath id="upvote-clip"><rect width="14" height="14" fill="white" /></clipPath>
      </defs>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="size-[14px] shrink-0" fill="none" viewBox="0 0 14 14">
      <path d={svgPaths.pff358a0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="size-[14px] shrink-0" fill="none" viewBox="0 0 14 14">
      <g clipPath="url(#save-clip)">
        <path d={svgPaths.p21315100} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
      </g>
      <defs>
        <clipPath id="save-clip"><rect width="14" height="14" fill="white" /></clipPath>
      </defs>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="size-[12px] shrink-0" fill="none" viewBox="0 0 12 12">
      <path d={svgPaths.pd38a270} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d={svgPaths.p21de3c80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d={svgPaths.p36cd3c0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.295 6.755L7.71 8.745" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.705 3.255L4.295 5.245" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InterviewNoteCard({ note }: { note: InterviewNote }) {
  const visibleQuestions = note.questions.slice(0, 3);
  const extraCount = note.questions.length - visibleQuestions.length;

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!note.liked);
  const [saved, setSaved] = useState(!!note.saved);
  const [upvotes, setUpvotes] = useState(note.upvotes);
  const [saves, setSaves] = useState(note.saves);

  const isAlreadyError = (err: any) => err?.response?.data?.errorCode === "BAD_REQUEST";

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate("/auth"); return; }
    const next = !liked;
    setLiked(next);
    setUpvotes((v) => Math.max(0, v + (next ? 1 : -1)));
    (next ? likePost(note.id) : unlikePost(note.id)).catch((err: any) => {
      if (isAlreadyError(err)) return;
      setLiked(!next);
      setUpvotes((v) => Math.max(0, v + (next ? -1 : 1)));
      toast.error("Something went wrong. Please try again.");
    });
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate("/auth"); return; }
    const next = !saved;
    setSaved(next);
    setSaves((v) => Math.max(0, v + (next ? 1 : -1)));
    (next ? savePost(note.id) : unsavePost(note.id)).catch((err: any) => {
      if (isAlreadyError(err)) return;
      setSaved(!next);
      setSaves((v) => Math.max(0, v + (next ? -1 : 1)));
      toast.error("Something went wrong. Please try again.");
    });
  };

  return (
    <div
      className={`relative w-full rounded-[16px] bg-white p-[0.667px] ${
        note.featured
          ? "shadow-[0px_10px_7.5px_rgba(60,119,246,0.04),0px_4px_3px_rgba(60,119,246,0.04)] border border-[rgba(60,119,246,0.25)]"
          : "border border-border"
      }`}
    >
      <div className="flex flex-col items-start p-[24px]">
        {/* Header: avatar + meta + outcome */}
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-[8px]">
            <CompanyAvatar name={note.company} />
            <div className="flex min-w-0 flex-wrap items-center gap-x-[6px] gap-y-1">
              <span className="font-sans text-[14px] font-semibold leading-[20px] text-foreground whitespace-nowrap">
                {note.company}
              </span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-border/80 select-none">·</span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-muted-foreground whitespace-nowrap">
                {note.role}
              </span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-border/80 select-none">·</span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-muted-foreground whitespace-nowrap">
                {note.round}
              </span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-border/80 select-none">·</span>
              <span className="font-sans text-[14px] font-normal leading-[20px] text-muted-foreground whitespace-nowrap">
                {note.level}
              </span>
            </div>
          </div>
          <OutcomeBadge outcome={note.outcome} />
        </div>

        {/* Date + Author */}
        <div className="mt-[12px] flex items-center gap-[12px] text-muted-foreground">
          <div className="flex items-center gap-[4px]">
            <ClockIcon />
            <span className="font-sans text-[12px] font-normal leading-[16px]">{note.date}</span>
          </div>
          <span className="font-sans text-[12px] font-normal leading-[16px]">by {note.author}</span>
        </div>

        {/* Excerpt */}
        <div className="mt-[12px] w-full">
          <p className="line-clamp-2 font-sans text-[14px] font-normal leading-[22.75px] text-[#4f5564]">
            {note.excerpt}
          </p>
        </div>

        {/* Question chips */}
        <div className="mt-[16px] flex w-full flex-wrap gap-[8px]">
          {visibleQuestions.map((q) => (
            <div
              key={q}
              className="flex items-center gap-0 rounded-[12px] bg-secondary border border-border px-[10.667px] py-[4.667px] overflow-hidden max-w-[220px]"
            >
              <div className="mr-[8px] shrink-0 size-[4px] rounded-full bg-primary" />
              <span className="truncate font-sans text-[12px] font-normal leading-[16px] text-foreground/80">
                {q}
              </span>
            </div>
          ))}
          {extraCount > 0 && (
            <div className="rounded-[12px] bg-primary/8 px-[10px] py-[4.667px]">
              <span className="font-sans text-[12px] font-medium leading-[16px] text-primary">
                +{extraCount} more
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative mt-[20px] flex w-full items-center justify-between pt-[16.667px]">
          <div className="absolute inset-x-0 top-0 border-t border-border" />
          <div className="flex items-center gap-[16px] text-muted-foreground">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={liked}
              className={`flex items-center gap-[6px] transition-colors ${liked ? "text-primary" : "hover:text-foreground"}`}
            >
              <UpvoteIcon />
              <span className="font-sans text-[12px] font-medium leading-[16px]">{upvotes}</span>
            </button>
            <Link
              to={`/experience/${note.id}`}
              className="flex items-center gap-[6px] transition-colors hover:text-foreground"
            >
              <CommentIcon />
              <span className="font-sans text-[12px] font-normal leading-[16px]">{note.comments}</span>
            </Link>
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={saved}
              className={`flex items-center gap-[6px] transition-colors ${saved ? "text-primary" : "hover:text-foreground"}`}
            >
              <SaveIcon />
              <span className="font-sans text-[12px] font-medium leading-[16px]">{saves}</span>
            </button>
            <SharePopover
              data={{
                title: `${note.company} · ${note.role}`,
                subtitle: note.round,
                summary: note.excerpt,
                url: `${window.location.origin}/experience/${note.id}`,
              }}
            >
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="flex items-center justify-center size-[24px] rounded-full bg-primary transition-opacity hover:opacity-80"
              >
                <span className="text-white"><ShareIcon /></span>
              </button>
            </SharePopover>
          </div>
          <Link
            to={`/experience/${note.id}`}
            className="rounded-[12px] bg-foreground px-[16px] py-[6px] font-sans text-[12px] font-medium leading-[16px] text-white transition-opacity hover:opacity-80"
          >
            View Post
          </Link>
        </div>
      </div>
    </div>
  );
}
