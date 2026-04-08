import svgPaths from "../../imports/svg-ra92a0sdry";

export function TopBar() {
  return (
    <div id="top-bar" className="fixed top-0 left-0 right-0 z-[100] bg-[#2b7aef] flex items-center justify-between px-12 py-2">
      <p className="font-[family-name:var(--font-sans)] text-sm text-white">
        LIMITED TIME 🎁: Register now to get 60 minutes of AI Mock Interviewing for FREE!
      </p>
      <a
        href="/signup"
        className="bg-[#f0f0f0] flex gap-1 items-center justify-center px-2.5 py-1.5 rounded-2xl hover:bg-white transition-colors"
      >
        <span className="text-sm text-[#242424]">Join</span>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
          <path
            d={svgPaths.p378e8500}
            stroke="#242424"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            transform="translate(3.75, 5)"
          />
        </svg>
      </a>
    </div>
  );
}