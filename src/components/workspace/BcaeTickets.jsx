import { useState } from "react";
import { todayInBrunei } from "@/lib/slots";
import { BCAE_CATEGORIES, BRANCHES, buildBcaeNote } from "@/lib/workspaceTemplates";
import WorkspacePills from "./WorkspacePills";
import WorkspaceField from "./WorkspaceField";
import CopyButton from "./CopyButton";
import { CARD, INPUT, PREVIEW } from "./workspaceStyles";

const EMPTY_FIELDS = {
  ref: "",
  date: "",
  subId: "",
  customerName: "",
  ic: "",
  contact: "",
};

/** BCAE Tickets: quick inputs feeding one live copyable ticket template. */
export default function BcaeTickets() {
  const [category, setCategory] = useState("pickup");
  const [fields, setFields] = useState(() => ({ ...EMPTY_FIELDS, date: todayInBrunei() }));
  const [branch, setBranch] = useState(BRANCHES[0]);

  const set = (key) => (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const active = BCAE_CATEGORIES.find((c) => c.key === category);
  const note = buildBcaeNote(category, { ...fields, branch });

  return (
    <div className="flex flex-col gap-3">
      <div className={CARD}>
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#e9cf8f]">
          Category
        </p>
        <WorkspacePills
          options={BCAE_CATEGORIES.map(({ key, label }) => ({ key, label }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      <div className={`${CARD} grid gap-3 sm:grid-cols-2`}>
        <WorkspaceField label="BCAE Ref">
          <input value={fields.ref} onChange={set("ref")} placeholder="BCAE reference" className={INPUT} />
        </WorkspaceField>
        <WorkspaceField label="Date">
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

      <div className={CARD}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#e9cf8f]">
          {active.title}
        </p>
        <pre className={`${PREVIEW} mt-2.5`}>{note}</pre>
        <div className="mt-3">
          <CopyButton text={note} />
        </div>
      </div>
    </div>
  );
}