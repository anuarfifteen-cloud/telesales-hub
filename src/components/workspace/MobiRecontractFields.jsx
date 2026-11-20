import { CONTRACT_TYPES, MOBI_PLANS } from "@/lib/workspaceTemplates";
import WorkspaceField from "./WorkspaceField";
import DateDotInput from "./DateDotInput";
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
          <DateDotInput
            value={fields.mobiEffectiveDate}
            onChange={(iso) => set("mobiEffectiveDate")({ target: { value: iso } })}
            label="Mobi Effective Date"
          />
        </WorkspaceField>
      </div>
    </>
  );
}