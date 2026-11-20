import { CONTRACT_TYPES, MOBI_PLANS, formatDotDate } from "@/lib/workspaceTemplates";
import WorkspaceField from "./WorkspaceField";
import { INPUT } from "./workspaceStyles";

/** Mobi-only recontract inputs. Kept separate from the Infinity field set. */
export default function MobiRecontractFields({ fields, set }) {
  return (
    <>
      <WorkspaceField label="Current Plan">
        <select value={fields.mobiCurrentPlan} onChange={set("mobiCurrentPlan")} className={INPUT}>
          {MOBI_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Upgrade Plan">
        <select value={fields.mobiUpgradePlan} onChange={set("mobiUpgradePlan")} className={INPUT}>
          {MOBI_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Contract Type">
        <select value={fields.mobiContract} onChange={set("mobiContract")} className={INPUT}>
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Data Quota (GB)">
        <input
          value={fields.mobiDataQuota}
          onChange={set("mobiDataQuota")}
          placeholder="20"
          inputMode="numeric"
          className={INPUT}
        />
      </WorkspaceField>

      <div className="sm:col-span-2">
        <WorkspaceField label="Effective Date">
          <input
            type="date"
            value={fields.mobiEffectiveDate}
            onChange={set("mobiEffectiveDate")}
            className={INPUT}
          />
        </WorkspaceField>
        <p className="mt-1 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
          {formatDotDate(fields.mobiEffectiveDate) || "DD.MM.YYYY"}
        </p>
      </div>
    </>
  );
}