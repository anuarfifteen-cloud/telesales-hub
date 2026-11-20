import { useEffect, useState } from "react";
import { todayInBrunei } from "@/lib/slots";
import {
  CRM_AGENTS,
  INFINITY_PLAN_TYPES,
  MOBI_PLAN_TYPES,
  PLAN_AMOUNTS,
  buildCrmNote,
} from "@/lib/workspaceTemplates";
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

/** CRM Notes: plan picker, agent, date and a live, editable registration note. */
export default function CrmNoteBuilder() {
  const [plan, setPlan] = useState("easi");
  const [amount, setAmount] = useState("");
  const [mobiPlanType, setMobiPlanType] = useState(MOBI_PLAN_TYPES[0]);
  const [infinityPlanType, setInfinityPlanType] = useState(INFINITY_PLAN_TYPES[0]);
  const [agent, setAgent] = useState("");
  const [date, setDate] = useState(() => todayInBrunei());
  const [includeMigration, setIncludeMigration] = useState(true);

  const amounts = PLAN_AMOUNTS[plan] || [];
  const note = buildCrmNote({
    plan,
    amount,
    mobiPlanType,
    infinityPlanType,
    agent,
    date,
    includeMigration,
  });

  // The generated note seeds an editable draft. Changing any input re-seeds it,
  // so a manual tweak always belongs to the note currently on screen.
  const [draft, setDraft] = useState(note);
  useEffect(() => {
    setDraft(note);
  }, [note]);

  const choosePlan = (key) => {
    setPlan(key);
    setAmount(PLAN_AMOUNTS[key]?.[0] ?? "");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={CARD}>
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Plan
        </p>
        <WorkspacePills options={PLANS} value={plan} onChange={choosePlan} />
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {plan === "mobi" && (
            <WorkspaceField label="Mobi Plan Type">
              <select
                value={mobiPlanType}
                onChange={(e) => setMobiPlanType(e.target.value)}
                className={`${INPUT} text-xs`}
              >
                {MOBI_PLAN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </WorkspaceField>
          )}

          {plan === "infinity" && (
            <WorkspaceField label="Infinity Plan Type">
              <select
                value={infinityPlanType}
                onChange={(e) => setInfinityPlanType(e.target.value)}
                className={`${INPUT} text-xs`}
              >
                {INFINITY_PLAN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </WorkspaceField>
          )}

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
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-secondary px-3 py-2.5">
            <input
              type="checkbox"
              checked={includeMigration}
              onChange={(e) => setIncludeMigration(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
            />
            <span className="text-[11px] font-semibold leading-snug text-secondary-foreground">
              Include Easi Migration Credit Terms
            </span>
          </label>
        )}
      </div>

      <div className={CARD}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Note Preview
          </p>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Editable
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          aria-label="Editable CRM note preview"
          className={PREVIEW}
        />
        <div className="mt-3">
          <CopyButton text={draft} />
        </div>
      </div>
    </div>
  );
}