function Icon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M3.33333 8H12.6667" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 3.33333V12.6667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

export default function Button() {
  return (
    <div className="bg-[#3c77f6] content-stretch drop-shadow-[0px_10px_7.5px_rgba(60,119,246,0.2),0px_4px_3px_rgba(60,119,246,0.2)] flex gap-[8px] items-center justify-center px-[12px] py-[8px] relative rounded-[12px] size-full" data-name="Button">
      <Icon />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Share Your Experience</p>
    </div>
  );
}
