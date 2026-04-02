import imgRectangle from "figma:asset/a7264fd48ee44c90a6ee1d9d5f038a62ea570b04.png";
import imgRectangle1 from "figma:asset/f732d80ecbfbfe6b5423595467b11cc0b1c073b9.png";

export default function Mash() {
  return (
    <div className="bg-white relative shadow-[0px_80px_250px_0px_rgba(0,0,0,0.1)] size-full" data-name="Mash 17">
      <div className="absolute left-0 size-[2560px] top-0" data-name="Rectangle">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgRectangle} />
      </div>
      <div className="absolute bg-size-[394.99999046325684px_394.99999046325684px] bg-top-left left-0 mix-blend-soft-light size-[2560px] top-0" data-name="Rectangle" style={{ backgroundImage: `url('${imgRectangle1}')` }} />
    </div>
  );
}