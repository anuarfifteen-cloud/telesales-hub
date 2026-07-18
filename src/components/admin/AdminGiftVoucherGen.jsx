import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Gem, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

function genCode() {
  return `DG-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

export default function AdminGiftVoucherGen() {
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const all = await base44.entities.Voucher.filter({ reward_tokens: 999 }) || [];
      setHistory(all.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));
    } catch (e) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    const n = parseInt(count, 10);
    if (isNaN(n) || n <= 0) return toast.error("Enter a valid number.");
    if (n > 500) return toast.error("Max 500 at a time.");
    setGenerating(true);
    setResults([]);
    try {
      const now = new Date().toISOString();
      const codes = Array.from({ length: n }, genCode);
      const records = codes.map(code => ({
        user_id: "",
        user_name: "",
        code,
        reward_tokens: 999,
        status: "active",
        created_at: now,
      }));
      await base44.entities.Voucher.bulkCreate(records);
      setResults(codes);
      toast.success(`🎉 Generated ${n} diamond voucher${n !== 1 ? "s" : ""}!`);
      await loadHistory();
    } catch (e) {
      toast.error("Failed to generate vouchers.");
    } finally {
      setGenerating(false);
    }
  };

  const copy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success("Copied!");
  };

  const copyAll = () => {
    navigator.clipboard.writeText(results.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
    toast.success("All codes copied!");
  };

  const deleteOne = async (id) => {
    try {
      await base44.entities.Voucher.delete(id);
      setHistory(h => h.filter(v => v.id !== id));
      toast.success("Voucher deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2">
        <Gem className="w-5 h-5 text-cyan-500" />
        <div>
          <h3 className="font-bold text-slate-900 text-base">💎 Diamond Gift Vouchers</h3>
          <p className="text-sm text-slate-500">Generate public codes — any agent can claim one once from their Profile tab.</p>
        </div>
      </div>

      {/* Generator */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">How many vouchers?</label>
          <input
            type="number"
            min="1"
            max="500"
            value={count}
            onChange={e => setCount(e.target.value)}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gem className="w-4 h-4" />}
          Generate
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest">✨ Generated Codes ({results.length})</p>
            <button onClick={copyAll} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
            {results.map((code, i) => (
              <div key={code} className="bg-cyan-50 border border-cyan-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-800 select-all">{code}</span>
                <button onClick={() => copy(code, code)} className="text-cyan-500 hover:text-cyan-700">
                  {copiedId === code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">All Diamond Vouchers</p>
          <button onClick={loadHistory} disabled={loadingHistory} className="text-[11px] font-semibold text-primary hover:underline">
            {loadingHistory ? "Loading…" : history.length === 0 ? "Load history" : "Refresh"}
          </button>
        </div>
        {history.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {history.map(v => (
              <div key={v.id} className="flex items-center gap-2 bg-slate-50 border border-border rounded-lg px-2.5 py-1.5">
                <span className="font-mono text-xs font-bold text-slate-700 flex-1 select-all">{v.code}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  v.status === "redeemed"
                    ? "bg-slate-200 text-slate-500"
                    : "bg-amber-100 text-amber-700"
                }`}>{v.status === "redeemed" ? "Claimed" : "Active"}</span>
                <button onClick={() => copy(v.code, v.id)} className="text-slate-400 hover:text-primary">
                  {copiedId === v.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteOne(v.id)} className="text-slate-300 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}