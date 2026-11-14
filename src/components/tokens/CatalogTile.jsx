/** One illustrated game card in the Tokens catalog shelf. */
export default function CatalogTile({ name, sub, cost, image, icon: Icon, from, to, onClick, artClass = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="catalog-tile relative flex-shrink-0 w-[45%] min-w-[138px] snap-start overflow-hidden rounded-3xl text-left transition-transform active:scale-[0.97]"
      style={{
        background: `linear-gradient(165deg, ${from} 0%, ${to} 100%)`,
        boxShadow: "0 10px 22px -10px rgba(58, 30, 96, 0.55)",
      }}
    >
      {/* artwork */}
      {image ? (
        <img
          src={image}
          alt=""
          className={`pointer-events-none absolute -bottom-2 -right-2 h-[74px] w-[74px] object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] ${artClass}`}
        />
      ) : Icon ? (
        <Icon
          size={78}
          strokeWidth={1.4}
          className="pointer-events-none absolute -bottom-3 -right-3"
          style={{ color: "rgba(255,255,255,0.16)" }}
        />
      ) : null}

      <div className="relative flex min-h-[126px] flex-col justify-between p-3">
        <div>
          <span className="block text-[12px] font-black uppercase leading-tight tracking-wide" style={{ color: "#ffffff" }}>
            {name}
          </span>
          {sub ? (
            <span className="mt-0.5 block text-[9px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.66)" }}>
              {sub}
            </span>
          ) : null}
        </div>

        <span
          className="mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
          style={{ background: "linear-gradient(90deg, #fecf6a 0%, #d4a34b 100%)", color: "#3a2405" }}
        >
          {cost}
        </span>
      </div>
    </button>
  );
}