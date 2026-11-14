import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A titled, horizontally scrollable shelf of catalog cards.
 *
 * Mobile pans natively; on desktop the whole shelf can be mouse-dragged (a drag
 * past a few pixels swallows the click so a card is never opened by accident).
 * The ‹ › arrows advance the row by roughly one card.
 */
export default function CatalogSection({ title, right, children }) {
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const didDrag = useRef(false);

  const syncEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return undefined;
    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      observer.disconnect();
    };
  }, [syncEdges]);

  const step = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const amount = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const handlePointerDown = (event) => {
    if (event.pointerType !== "mouse") return;
    const el = rowRef.current;
    if (!el) return;
    drag.current = { down: true, startX: event.clientX, startScroll: el.scrollLeft, moved: false };
  };

  const handlePointerMove = (event) => {
    const state = drag.current;
    if (!state.down) return;
    const el = rowRef.current;
    if (!el) return;
    const dx = event.clientX - state.startX;
    if (!state.moved && Math.abs(dx) > 6) {
      state.moved = true;
      el.style.cursor = "grabbing";
      el.setPointerCapture?.(event.pointerId);
    }
    if (state.moved) el.scrollLeft = state.startScroll - dx;
  };

  const handlePointerUp = (event) => {
    const state = drag.current;
    if (!state.down) return;
    didDrag.current = state.moved;
    drag.current.down = false;
    const el = rowRef.current;
    if (!el) return;
    el.style.cursor = "";
    el.releasePointerCapture?.(event.pointerId);
  };

  // A drag must not open the card it finished over.
  const handleClickCapture = (event) => {
    if (!didDrag.current) return;
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 whitespace-nowrap text-[14px] font-extrabold leading-none text-foreground">{title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {right ? (
            <span className="catalog-badge whitespace-nowrap rounded-full border border-border bg-card/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-foreground/80">
              {right}
            </span>
          ) : null}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={!edges.left}
              aria-label={`Scroll ${title} left`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition disabled:opacity-30"
            >
              <ChevronLeft size={13} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={!edges.right}
              aria-label={`Scroll ${title} right`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition disabled:opacity-30"
            >
              <ChevronRight size={13} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClickCapture={handleClickCapture}
        className="no-scrollbar -mx-4 scroll-pl-4 flex min-w-0 touch-auto cursor-grab scroll-smooth snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-1 select-none"
        style={{ flexWrap: "nowrap", WebkitOverflowScrolling: "touch", scrollPaddingLeft: "16px" }}
      >
        {children}
      </div>
    </section>
  );
}