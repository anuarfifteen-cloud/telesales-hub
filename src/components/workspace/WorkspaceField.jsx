import { LABEL } from "./workspaceStyles";

/** Label plus its control, so every Workspace input lines up the same way. */
export default function WorkspaceField({ label, children }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}