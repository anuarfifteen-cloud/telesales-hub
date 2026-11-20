import { CONTRACT_TYPES, MOBI_PLANS, formatDotDate } from "@/lib/workspaceTemplates";
import WorkspaceField from "./WorkspaceField";
import { INPUT } from "./workspaceStyles";

/** Recontract-only inputs, shared by the Infinity and Mobi ticket templates. */
export default function BcaeRecontractFields({ fields, set }) {
  return (
    <>
      <WorkspaceField label="Current Plan">
        <select value={fields.currentPlan} onChange={set("currentPlan")} className={INPUT}>
          {MOBI_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Upgrade Plan">
        <select value={fields.upgradePlan} onChange={set("upgradePlan")} className={INPUT}>
          {MOBI_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Contract Type">
        <select value={fields.contractType} onChange={set("contractType")} className={INPUT}>
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Data Quota (GB)">
        <input
          value={fields.dataQuota}
          onChange={set("dataQuota")}
          placeholder="20"
          inputMode="numeric"
          className={INPUT}
        />
      </WorkspaceField>

      <div className="sm:col-span-2">
        <WorkspaceField label="Effective Date">
          <input
            type="date"
            value={fields.effectiveDate}
            onChange={set("effectiveDate")}
            className={INPUT}
          />
        </WorkspaceField>
        <p className="mt-1 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
          {formatDotDate(fields.effectiveDate) || "DD.MM.YYYY"}
        </p>
      </div>
    </>
  );
}