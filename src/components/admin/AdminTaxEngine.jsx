import { useState, useEffect } from "react";
import { Loader2, Landmark, AlertTriangle, Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Current month as YYYY-MM in the app's local timezone (Asia/Singapore).
function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Progressive wealth tax brackets (applied to the portion in each bracket).
//   0–100   : 0%
//   101–500 : 10% on the portion over 100
//   501–5000: 50% on the portion over 500
//   5001+   : 85% on the portion over 5000
function computeTax(tokens) {
  const t = Math.max(0, Number(tokens) || 0);
  let bill = 0;
  if (t > 100) bill += Math.min(t - 100, 400) * 0.10;
  if (t > 500) bill += Math.min(t - 500, 4500) * 0.50;
  if (t > 5000) bill += (t - 5000) * 0.85;
  return Math.floor(bill);
}

export default function AdminTaxEngine() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null); // { i, n }
  const [lastRun, setLastRun] = useState(null);

  // Live preview state
  const [previewRows, setPreviewRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const buildPreview = async () => {
    setLoadingPreview(true);
    const currentMonth = getCurrentMonth();
    let users = [];
    try {
      users = await base44.entities.User.list();
    } catch (e) {
      setPreviewRows([]);
      setLoadingPreview(false);
      return;
    }
    const rows = users
      .map((u) => {
        const tokens = Number(u.earlyAccessTokens) || 0;
        const bill = computeTax(tokens);
        const treasuryCut = Math.floor(bill * 0.20);
        const vaultDeposit = Math.floor(bill * 0.80);
        return {
          id: u.id,
          name: u.full_name || u.email?.split("@")[0] || "Unknown",
          balance: tokens,
          bill,
          treasuryCut,
          vaultDeposit,
          postTax: tokens - bill,
          highRoller: tokens > 5000,
        };
      })
      .filter((r) => r.bill > 0); // excludes already-taxed & ≤100 brackets (bill = 0)
    setPreviewRows(rows);
    setLoadingPreview(false);
  };

  useEffect(() => {
    buildPreview();
  }, []);

  // Grand totals for the preview table
  const totals = previewRows.reduce(
    (acc, r) => {
      acc.balance += r.balance;
      acc.bill += r.bill;
      acc.treasuryCut += r.treasuryCut;
      acc.vaultDeposit += r.vaultDeposit;
      acc.postTax += r.postTax;
      return acc;
    },
    { balance: 0, bill: 0, treasuryCut: 0, vaultDeposit: 0, postTax: 0 }
  );

  const runTax = async () => {
    setOpen(false);
    setRunning(true);
    setProgress(null);

    const currentMonth = getCurrentMonth();

    let users = [];
    try {
      users = await base44.entities.User.list();
    } catch (e) {
      toast.error("Failed to load users: " + (e?.message || "Unknown error"));
      setRunning(false);
      return;
    }

    let processed = 0;
    let skipped = 0;
    let totalBurned = 0;
    let totalVaulted = 0;
    const n = users.length;

    for (let i = 0; i < n; i++) {
      const u = users[i];
      setProgress({ i: i + 1, n });

      const tokens = Number(u.earlyAccessTokens) || 0;

      // Double-tax guard + no-tax bracket
      if (u.lastTaxDate === currentMonth || tokens <= 100) {
        skipped++;
        await sleep(40);
        continue;
      }

      const totalTaxBill = computeTax(tokens);
      if (totalTaxBill <= 0) {
        skipped++;
        continue;
      }

      const treasuryCut = Math.floor(totalTaxBill * 0.20); // burned, not re-credited
      const vaultDeposit = Math.floor(totalTaxBill * 0.80);

      try {
        await base44.entities.User.update(u.id, {
          earlyAccessTokens: tokens - totalTaxBill,
          tapVaultBalance: (u.tapVaultBalance || 0) + vaultDeposit,
          lastTaxDate: currentMonth,
        });
        processed++;
        totalBurned += treasuryCut;
        totalVaulted += vaultDeposit;
      } catch (e) {
        console.error("Tax update failed for user", u.id, e);
      }

      // gentle on rate limits between writes
      await sleep(120);
    }

    setProgress(null);
    setRunning(false);
    setLastRun({ processed, skipped, totalBurned, totalVaulted, month: currentMonth });
    toast.success(
      `Tax Run Complete! Processed ${processed} users. Total tokens burned: ${totalBurned}. Total Vaulted: ${totalVaulted}.`
    );
    // Refresh preview after the run
    buildPreview();
  };

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-border p-5 space-y-3"
        style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}
      >
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-600" /> 🏛️ Run Monthly Progressive Tax
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Applies the progressive wealth tax to every user's active wallet: 20% burned to the Hub
            Treasury, 80% moved into their TAP Savings Vault. One run per month — already-taxed
            users are skipped automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">0–100: 0%</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">101–500: 10%</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">501–5000: 50%</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">5001+: 85%</span>
        </div>

        {/* Live preview table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-slate-900 px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
              Pre-Execution Breakdown
            </span>
            <span className="text-[11px] font-semibold text-slate-300">
              {previewRows.length} user{previewRows.length === 1 ? "" : "s"} owe tax
            </span>
          </div>
          {loadingPreview ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : previewRows.length === 0 ? (
            <div className="px-3 py-5 text-center text-xs text-slate-500">
              No users owe tax this month (all ≤100, or already taxed).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-2 py-2 whitespace-nowrap">User Name</th>
                    <th className="text-right font-semibold px-2 py-2 whitespace-nowrap">Active Balance</th>
                    <th className="text-right font-semibold px-2 py-2 whitespace-nowrap">Tax Bill</th>
                    <th className="text-right font-semibold px-2 py-2 whitespace-nowrap">20% Burn</th>
                    <th className="text-right font-semibold px-2 py-2 whitespace-nowrap">80% Vault</th>
                    <th className="text-right font-semibold px-2 py-2 whitespace-nowrap">Post-Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-border ${r.highRoller ? "bg-rose-50" : ""}`}
                    >
                      <td className="px-2 py-1.5 font-semibold text-slate-800 flex items-center gap-1">
                        {r.highRoller && (
                          <Flame className="w-3 h-3 text-rose-500 flex-shrink-0" />
                        )}
                        <span className={r.highRoller ? "text-rose-600" : ""}>{r.name}</span>
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums text-slate-700">
                        {r.balance.toLocaleString()}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums font-bold text-amber-600">
                        {r.bill.toLocaleString()}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums text-rose-500">
                        {r.treasuryCut.toLocaleString()}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums text-emerald-600">
                        {r.vaultDeposit.toLocaleString()}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums text-slate-600">
                        {r.postTax.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white">
                  <tr className="font-bold">
                    <td className="px-2 py-2 uppercase tracking-wide text-[10px] text-slate-300">
                      Total Taxes to Collect
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums text-amber-200">
                      {totals.balance.toLocaleString()}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums text-amber-300">
                      {totals.bill.toLocaleString()}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums text-rose-300">
                      {totals.treasuryCut.toLocaleString()}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums text-emerald-300">
                      {totals.vaultDeposit.toLocaleString()}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums text-slate-200">
                      {totals.postTax.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="text-[10px] text-slate-400">
                    <td className="px-2 pb-2 uppercase tracking-wide">Total Tokens to Burn</td>
                    <td colSpan={2} className="text-right px-2 pb-2 text-rose-300 font-bold">
                      {totals.treasuryCut.toLocaleString()} 🪙
                    </td>
                    <td className="px-2 pb-2 uppercase tracking-wide">Total Tokens to Vault</td>
                    <td colSpan={2} className="text-right px-2 pb-2 text-emerald-300 font-bold">
                      {totals.vaultDeposit.toLocaleString()} 🪙
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <Button
          onClick={() => setOpen(true)}
          disabled={running || loadingPreview}
          className="w-full gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Landmark className="w-4 h-4" />
          )}
          {running
            ? progress
              ? `Processing ${progress.i}/${progress.n} users…`
              : "Starting…"
            : "Run Monthly Progressive Tax"}
        </Button>

        {lastRun && !running && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 space-y-0.5">
            <p className="font-bold">Last run — {lastRun.month}</p>
            <p>Processed: {lastRun.processed} · Skipped: {lastRun.skipped}</p>
            <p>Total burned (Treasury): {lastRun.totalBurned} 🪙</p>
            <p>Total vaulted (TAP Vault): {lastRun.totalVaulted} 🪙</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Run Monthly Progressive Tax?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                This will tax every user's active wallet for{" "}
                <strong>{getCurrentMonth()}</strong> based on the progressive brackets. 20% is
                burned to the Hub Treasury and 80% is moved into each user's TAP Savings Vault.
                Users already taxed this month are skipped. This cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Total Users to Process
              </p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                {previewRows.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-amber-50 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                Total Active Tokens Taxed
              </p>
              <p className="text-2xl font-black text-amber-700 tabular-nums">
                {totals.balance.toLocaleString()}
              </p>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-800 text-center">
            Are you sure you want to execute the monthly tax engine for all listed users?
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
              Cancel
            </Button>
            <Button
              onClick={runTax}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Landmark className="w-4 h-4" /> Yes, Run Tax
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}