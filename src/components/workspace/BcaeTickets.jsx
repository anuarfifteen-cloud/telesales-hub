import { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { todayInBrunei } from "@/lib/slots";
import {
  BCAE_CATEGORIES,
  BRANCHES,
  CONTRACT_TYPES,
  INFINITY_CONTRACTS,
  INFINITY_PLANS,
  INFINITY_SPEEDS,
  MOBI_PLANS,
  buildBcaeNote,
  infinityQuotasFor,
} from "@/lib/workspaceTemplates";
import WorkspacePills from "./WorkspacePills";
import WorkspaceField from "./WorkspaceField";
import InfinityRecontractFields from "./InfinityRecontractFields";
import MobiRecontractFields from "./MobiRecontractFields";
import CopyButton from "./CopyButton";
import { CARD, INPUT, PREVIEW } from "./workspaceStyles";

const EMPTY_FIELDS = {
  ref: "",
  date: "",
  subId: "",
  customerName: "",
  ic: "",
  contact: "",
  mobiCurrentPlan: MOBI_PLANS[0],
  mobiUpgradePlan: MOBI_PLANS[0],
  mobiContract: CONTRACT_TYPES[0],
  mobiDataQuota: "",
  mobiEffectiveDate: "",
  infinityCurrentPlan: INFINITY_PLANS[0],
  infinityUpgradePlan: INFINITY_PLANS[0],
  infinityContract: INFINITY_CONTRACTS[0],
  infinityDataQuota: String(infinityQuotasFor(INFINITY_PLANS[0])[0]),
  infinitySpeed: INFINITY_SPEEDS[0],
  infinityEffectiveDate: "",
};

/** Card titles for the category-specific card. */
const DETAILS_TITLES = {
  pickup: "Pick-Up Details",
  activation: "Activation Details",
  infinity: "Plan Details",
  mobi: "Plan Details",
};

/** BCAE Tickets: quick inputs feeding one live, editable ticket template. */
export default function BcaeTickets() {
  const [category, setCategory] = useState("pickup");
  const [fields, setFields] = useState(() => {
    const today = todayInBrunei();
    return { ...EMPTY_FIELDS, date: today, mobiEffectiveDate: today, infinityEffectiveDate: today };
  });
  const [branch, setBranch] = useState(BRANCHES[0]);

  const set = (key) => (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const active = BCAE_CATEGORIES.find((c) => c.key === category);
  const note = buildBcaeNote(category, { ...fields, branch });

  // The generated ticket seeds an editable draft. Changing the category or any
  // field re-seeds it, so a manual tweak always belongs to the ticket on screen.
  const [draft, setDraft] = useState(note);
  useEffect(() => {
    setDraft(note);
  }, [note]);

  return (
    <div className="flex flex-col gap-3">
      <div className={CARD}>
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Category
        </p>
        <WorkspacePills
          options={BCAE_CATEGORIES.map(({ key, label }) => ({ key, label }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      <div className={CARD}>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Customer Details
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <WorkspaceField label="BCAE Ref">
            <input value={fields.ref} onChange={set("ref")} placeholder="BCAE reference" className={INPUT} />
          </WorkspaceField>
          <WorkspaceField label="Call Date">
            <input type="date" value={fields.date} onChange={set("date")} className={INPUT} />
          </WorkspaceField>
          <WorkspaceField label="Sub ID / Order ID">
            <input value={fields.subId} onChange={set("subId")} placeholder="Sub or order ID" className={INPUT} />
          </WorkspaceField>
          <WorkspaceField label="Customer Name">
            <input
              value={fields.customerName}
              onChange={set("customerName")}
              placeholder="Full name"
              className={INPUT}
            />
          </WorkspaceField>
          <WorkspaceField label="IC No">
            <input value={fields.ic} onChange={set("ic")} placeholder="IC number" className={INPUT} />
          </WorkspaceField>
          <WorkspaceField label="Contact No">
            <input value={fields.contact} onChange={set("contact")} placeholder="Contact number" className={INPUT} />
          </WorkspaceField>
        </div>
      </div>

      {category !== "activation" && (
        <div className={CARD}>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {DETAILS_TITLES[category]}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {category === "infinity" && <InfinityRecontractFields fields={fields} set={set} />}

            {category === "mobi" && <MobiRecontractFields fields={fields} set={set} />}

            {category === "pickup" && (
              <div className="sm:col-span-2">
                <WorkspaceField label="Branch">
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} className={INPUT}>
                    {BRANCHES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </WorkspaceField>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={CARD}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {active.title}
          </p>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Editable
          </span>
        </div>

        {/* Routing guidance is for the agent only — never part of the copied ticket. */}
        <div className="mb-2.5 flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2">
          <Pin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.06em] text-primary">
            Guideline: {active.guideline}
          </span>
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          aria-label="Editable BCAE ticket preview"
          className={PREVIEW}
        />
        <div className="mt-3">
          <CopyButton text={draft} />
        </div>
      </div>
    </div>
  );
}