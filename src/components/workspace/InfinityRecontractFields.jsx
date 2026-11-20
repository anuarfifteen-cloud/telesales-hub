import {
  INFINITY_CONTRACTS,
  INFINITY_DATA_QUOTAS,
  INFINITY_PLANS,
  INFINITY_SPEEDS,
  formatDotDate,
  infinityDefaultQuotaFor,
} from "@/lib/workspaceTemplates";
import WorkspaceField from "./WorkspaceField";
import { INPUT } from "./workspaceStyles";

/** Infinity-only recontract inputs. Kept separate from the Mobi field set. */
export default function InfinityRecontractFields({ fields, set }) {
  // Switching the plan pre-selects that plan's official quota, which the agent
  // can still change to any of the six allowed quotas.
  const onCurrentPlanChange = (e) => {
    set("infinityCurrentPlan")(e);
    set("infinityDataQuota")({ target: { value: String(infinityDefaultQuotaFor(e.target.value)) } });
  };

  return (
    <>
      <WorkspaceField label="Infinity Current Plan">
        <select
          value={fields.infinityCurrentPlan}
          onChange={onCurrentPlanChange}
          className={INPUT}
        >
          {INFINITY_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Infinity Upgrade Plan">
        <select
          value={fields.infinityUpgradePlan}
          onChange={set("infinityUpgradePlan")}
          className={INPUT}
        >
          {INFINITY_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Infinity Contract">
        <select
          value={fields.infinityContract}
          onChange={set("infinityContract")}
          className={INPUT}
        >
          {INFINITY_CONTRACTS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Infinity Data Quota (GB)">
        <select
          value={fields.infinityDataQuota}
          onChange={set("infinityDataQuota")}
          className={INPUT}
        >
          {INFINITY_DATA_QUOTAS.map((quota) => (
            <option key={quota} value={quota}>
              {quota}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <WorkspaceField label="Infinity Speed">
        <select value={fields.infinitySpeed} onChange={set("infinitySpeed")} className={INPUT}>
          {INFINITY_SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}
            </option>
          ))}
        </select>
      </WorkspaceField>

      <div className="sm:col-span-2">
        <WorkspaceField label="Effective Date">
          <input
            type="date"
            value={fields.infinityEffectiveDate}
            onChange={set("infinityEffectiveDate")}
            className={INPUT}
          />
        </WorkspaceField>
        <p className="mt-1 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
          {formatDotDate(fields.infinityEffectiveDate) || "DD.MM.YYYY"}
        </p>
      </div>
    </>
  );
}