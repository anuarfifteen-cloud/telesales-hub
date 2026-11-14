/** One illustrated game card in the Tokens catalog shelf. */
export default function CatalogTile({ name, sub, cost, icon: Icon, from, to, onClick }) {
  return (
    <button
      type="button"
      data-card
      draggable={false}
      onClick={onClick}
      className="catalog-tile relative w-[155px] shrink-0 snap-start overflow-hidden rounded-3xl text-left select-none transition-transform active:scale-[0.97] md:w-[210px]"
      style={{
        background: `linear-gradient(165deg, ${from} 0%, ${to} 100%)`,
        boxShadow: "0 10px 22px -10px rgba(58, 30, 96, 0.55)",
      }}
    >
      {/* watermark icon */}
      {Icon ? (
        <Icon
          size={92}
          strokeWidth={1.4}
          className="pointer-events-none absolute -bottom-4 -right-4"
          style={{ color: "rgba(255,255,255,0.16)" }}
        />
      ) : null}

      <div className="relative flex min-h-[132px] flex-col justify-between p-3 md:min-h-[164px] md:p-4">
        <div>
          <span
            className="block text-[12px] font-black uppercase leading-tight tracking-wide md:text-[14px]"
            style={{ color: "#ffffff" }}
          >
            {name}
          </span>
          {sub ? (
            <span
              className="mt-0.5 block text-[9px] font-semibold leading-tight md:text-[10px]"
              style={{ color: "rgba(255,255,255,0.66)" }}
            >
              {sub}
            </span>
          ) : null}
        </div>

        <span
          className="mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide md:text-[10px]"
          style={{ background: "linear-gradient(90deg, #fecf6a 0%, #d4a34b 100%)", color: "#3a2405" }}
        >
          {cost}
        </span>
      </div>
    </button>
  );
}