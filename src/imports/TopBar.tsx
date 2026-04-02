import svgPaths from "./svg-ra92a0sdry";

export default function TopBar() {
  return (
    <div className="bg-[#2b7aef] content-stretch flex items-center justify-between px-[48px] py-[8px] relative size-full" data-name="Top Bar">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">
        <p className="leading-[20px]">LIMITED TIME 🎁: Register now to get 60 minutes of AI Mock Interviewing for FREE!</p>
      </div>
      <div className="bg-[#f0f0f0] content-stretch flex gap-[4px] items-center justify-center p-[6px] relative rounded-[16px] shrink-0" data-name="Buttons">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#242424] text-[14px] whitespace-nowrap">Join</p>
        <div className="relative shrink-0 size-[20px]" data-name="Icons/ Line /Right Arrow">
          <div className="absolute inset-[29.17%_20.83%]" data-name="Vector">
            <div className="absolute inset-[-9%_-6.43%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.1667 9.83333">
                <path d={svgPaths.p378e8500} id="Vector" stroke="var(--stroke-0, #242424)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}