import { useState } from "react";
import { NotebookPen, Ticket } from "lucide-react";
import CrmNoteBuilder from "./CrmNoteBuilder";
import BcaeTickets from "./BcaeTickets";
import { GOLD_BG } from "./workspaceStyles";

const TABS = [
  { key: "crm", label: "CRM Notes", icon: NotebookPen },
  { key: "bcae", label: "BCAE Tickets", icon: Ticket },
];

/** Workspace tab: its own two-tab header in place of the Tokens pills. */
export default function WorkspaceView() {
  const [tab, setTab] = useState("crm");

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-14 z-20 -mx-4 -mt-3 border-b border-[#d4af37]/25 bg-[#080f2c]/95 px-4 pb-2.5 pt-3 backdrop-blur-md">
        <div className="flex gap-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={isActive}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[11px] font-extrabold transition active:scale-[0.98] ${
                  isActive
                    ? "text-[#20180a] shadow-[0_6px_16px_-8px_rgba(212,175,55,0.95)]"
                    : "border border-[#d4af37]/30 bg-[#0d1740] text-[#e9cf8f]"
                }`}
                style={isActive ? GOLD_BG : undefined}
              >
                <Icon size={13} strokeWidth={2.6} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "crm" ? <CrmNoteBuilder /> : <BcaeTickets />}
    </div>
  );
}