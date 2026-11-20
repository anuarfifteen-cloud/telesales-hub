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
  PAYMENT_STATUSES,
  PICKUP_ITEMS,
  PICKUP_TIMES,
  buildBcaeNote,
  infinityDefaultQuotaFor,
  mobiQuotaFor,
} from "@/lib/workspaceTemplates";
import WorkspacePills from "./WorkspacePills";
import WorkspaceField from "./WorkspaceField";
import DateDotInput from "./DateDotInput";
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
  pickupItem: "",
  pickupDate: "",
  pickupTime: "",
  pickupStatus: "",
  mobiCurrentPlan: MOBI_PLANS[0],
  mobiUpgradePlan: MOBI_PLANS[0],
  mobiContract: CONTRACT_TYPES[0],
  mobiEffectiveDate: "",
  infinityCurrentPlan: INFINITY_PLANS[0],
  infinityUpgradePlan: INFINITY_PLANS[0],
  infinityContract: INFINITY_CONTRACTS[0],
  infinityDataQuota: String(infinityDefaultQuotaFor(INFINITY_PLANS[0])),
  infinitySpeed: INFINITY_SPEEDS[0],
  infinityEffectiveDate: "",
};

/** Card titles for the category-specific card. */
const DETAILS_TITLES = {
  pickup: "Pick-Up Details",
  // Branch, item, date, time and payment status all live in this card.
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
  // The Mobi quota follows the chosen plan and contract type, never typed.
  const mobiDataQuota = mobiQuotaFor(fields.mobiUpgradePlan, fields.mobiContract);
  const note = buildBcaeNote(category, { ...fields, branch, mobiDataQuota });

  // Every pick-up detail must be chosen before the ticket may be copied.
  const missingPickup = [
    !fields.pickupItem && "Item for Pick Up",
    !fields.pickupDate && "Pick-Up Date",
    !fields.pickupTime && "Pick-Up Time",
    !fields.pickupStatus && "Payment Status",
  ].filter(Boolean);
  const missing = category === "pickup" ? missingPickup : [];
  const [showMissing, setShowMissing] = useState(false);
  useEffect(() => {
    if (missing.length === 0) setShowMissing(false);
  }, [missing.length]);

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
            <DateDotInput
              value={fields.date}
              onChange={(iso) => setFields((prev) => ({ ...prev, date: iso }))}
              label="Call Date"
            />
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
              <>
                <WorkspaceField label="Branch">
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} className={INPUT}>
                    {BRANCHES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </WorkspaceField>

                <WorkspaceField label="Item for Pick Up">
                  <select value={fields.pickupItem} onChange={set("pickupItem")} className={INPUT}>
                    <option value="">Select item</option>
                    {PICKUP_ITEMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </WorkspaceField>

                <WorkspaceField label="Pick-Up Date">
                  <DateDotInput
                    value={fields.pickupDate}
                    onChange={(iso) => setFields((prev) => ({ ...prev, pickupDate: iso }))}
                    label="Pick-Up Date"
                  />
                </WorkspaceField>

                <WorkspaceField label="Pick-Up Time">
                  <select value={fields.pickupTime} onChange={set("pickupTime")} className={INPUT}>
                    <option value="">Select time</option>
                    {PICKUP_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </WorkspaceField>

                <div className="sm:col-span-2">
                  <WorkspaceField label="Payment Status">
                    <select
                      value={fields.pickupStatus}
                      onChange={set("pickupStatus")}
                      className={INPUT}
                    >
                      <option value="">Select payment status</option>
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </WorkspaceField>
                </div>
              </>
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
          <CopyButton text={draft} blocked={missing.length > 0} onBlocked={() => setShowMissing(true)} />
          {showMissing && missing.length > 0 && (
            <p className="mt-2 text-[11px] font-bold leading-snug text-destructive">
              Complete these first: {missing.join(", ")}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}