import { useState } from "react";
import { todayInBrunei } from "@/lib/slots";
import { CRM_AGENTS, PLAN_AMOUNTS, buildCrmNote } from "@/lib/workspaceTemplates";
import WorkspacePills from "./WorkspacePills";
import WorkspaceField from "./WorkspaceField";
import CopyButton from "./CopyButton";
import { CARD, INPUT, PREVIEW } from "./workspaceStyles";

const PLANS = [
  { key: "easi", label: "EASI" },
  { key: "mobi", label: "MOBI" },
  { key: "freedom", label: "FREEDOM" },
  { key: "infinity", label: "INFINITY" },
];

/** CRM Notes: plan picker, agent, date and a live copyable registration note. */
export default function CrmNoteBuilder() {
  const [plan, setPlan] = useState("easi");
  const [amount, setAmount] = useState("");
  const [agent, setAgent] = useState("");
  const [date, setDate] = useState(() => todayInBrunei());
  const [includeMigration, setIncludeMigration] = useState(true);

  const amounts = PLAN_AMOUNTS[plan] || [];
  const note = buildCrmNote({ plan, amount, agent, date, includeMigration });

  const choosePlan = (key) => {
    setPlan(key);
    setAmount(PLAN_AMOUNTS[key]?.[0] ?? "");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={CARD}>
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#e9cf8f]">
          Plan
        </p>
        <WorkspacePills options={PLANS} value={plan} onChange={choosePlan} />
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {amounts.length > 0 && (
            <WorkspaceField label="Plan Amount">
              <select
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={INPUT}
              >
                {amounts.map((value) => (
                  <option key={value} value={value}>
                    ${value}
                  </option>
                ))}
              </select>
            </WorkspaceField>
          )}

          <WorkspaceField label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT}
            />
          </WorkspaceField>
        </div>

        <WorkspaceField label="Telesales Agent">
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className={`${INPUT} text-xs`}
          >
            <option value="">Select agent</option>
            {CRM_AGENTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </WorkspaceField>

        {plan === "mobi" && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#d4af37]/25 bg-[#0d1740] px-3 py-2.5">
            <input
              type="checkbox"
              checked={includeMigration}
              onChange={(e) => setIncludeMigration(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#e3c46a]"
            />
            <span className="text-[11px] font-semibold leading-snug text-[#f7f1df]">
              Include Easi Migration Credit Terms
            </span>
          </label>
        )}
      </div>

      <div className={CARD}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#e9cf8f]">
            Note Preview
          </p>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#e9cf8f]/50">
            Live
          </span>
        </div>
        <pre className={PREVIEW}>{note}</pre>
        <div className="mt-3">
          <CopyButton text={note} />
        </div>
      </div>
    </div>
  );
}