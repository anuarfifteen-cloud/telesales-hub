import { useState } from "react";
import { Loader2, Landmark, AlertTriangle } from "lucide-react";
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

        <Button
          onClick={() => setOpen(true)}
          disabled={running}
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
            : "Run Monthly Tax"}
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
            <DialogDescription>
              This will tax every user's active wallet for {getCurrentMonth()} based on the
              progressive brackets. 20% is burned to the Hub Treasury and 80% is moved into each
              user's TAP Savings Vault. Users already taxed this month are skipped. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
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