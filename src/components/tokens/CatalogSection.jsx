/** A titled, horizontally scrollable shelf of catalog cards. */
export default function CatalogSection({ title, right, children }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-[15px] font-extrabold leading-none text-foreground">{title}</h3>
        {right ? <span className="text-[9px] font-black uppercase tracking-widest">{right}</span> : null}
      </div>
      <div
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </section>
  );
}