import { useState } from "react";
import { Settings, X, Check, Plus, Trash2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function AdminBookingSettings({ slots, unlockHour, unlockMinute, onSlotsChange, onUnlockTimeChange }) {
  const [open, setOpen] = useState(false);
  const [localSlots, setLocalSlots] = useState(slots);
  const [localHour, setLocalHour] = useState(String(unlockHour).padStart(2, "0"));
  const [localMinute, setLocalMinute] = useState(String(unlockMinute).padStart(2, "0"));

  // Game records deletion state
  const [deletingCoinFlip, setDeletingCoinFlip] = useState(false);
  const [deletingPerfect10, setDeletingPerfect10] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // "coinflip" | "perfect10" | null

  const handleSave = () => {
    onSlotsChange(localSlots);
    onUnlockTimeChange(Number(localHour), Number(localMinute));
    setOpen(false);
  };

  const updateSlot = (idx, field, value) => {
    setLocalSlots(s => s.map((slot, i) => i === idx ? { ...slot, [field]: field === "maxBookings" ? Number(value) : value } : slot));
  };

  const removeSlot = (idx) => {
    setLocalSlots(s => s.filter((_, i) => i !== idx));
  };

  const addSlot = (shift) => {
    const newSlot = {
      id: `CUSTOM_${Date.now()}`,
      shift,
      label: shift === "AM" ? "12:00pm – 1:00pm" : "5:00pm – 6:00pm",
      maxBookings: 2,
    };
    setLocalSlots(s => [...s, newSlot]);
  };

  const handleDeleteAllCoinFlip = async () => {
    setDeletingCoinFlip(true);
    const all = await base44.entities.CoinFlipGame.list("-created_date", 500);
    await Promise.all(all.map(g => base44.entities.CoinFlipGame.delete(g.id)));
    setDeletingCoinFlip(false);
    setConfirmDelete(null);
  };

  const handleDeleteAllPerfect10 = async () => {
    setDeletingPerfect10(true);
    const all = await base44.entities.PerfectTenGame.list("-created_date", 500);
    await Promise.all(all.map(g => base44.entities.PerfectTenGame.delete(g.id)));
    setDeletingPerfect10(false);
    setConfirmDelete(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setLocalSlots(slots); setLocalHour(String(unlockHour).padStart(2,"0")); setLocalMinute(String(unlockMinute).padStart(2,"0")); setOpen(true); }}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Settings className="w-3.5 h-3.5" /> Booking Settings
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Settings className="w-4 h-4 text-blue-500" /> Booking Settings</span>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Unlock Time */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Bookings Open At (previous day)</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="23" value={localHour}
            onChange={e => setLocalHour(e.target.value.padStart(2,"0"))}
            className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-slate-500 font-bold">:</span>
          <input
            type="number" min="0" max="59" value={localMinute}
            onChange={e => setLocalMinute(e.target.value.padStart(2,"0"))}
            className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-xs text-slate-400">24h format</span>
        </div>
      </div>

      {/* Slots */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Break Slots</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {localSlots.map((slot, idx) => (
            <div key={slot.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-200">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.shift === "AM" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                {slot.shift}
              </span>
              <input
                value={slot.label}
                onChange={e => updateSlot(idx, "label", e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              />
              <input
                type="number" min="1" max="10" value={slot.maxBookings}
                onChange={e => updateSlot(idx, "maxBookings", e.target.value)}
                className="w-10 text-xs border border-slate-200 rounded px-1 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                title="Max bookings"
              />
              <button onClick={() => removeSlot(idx)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => addSlot("AM")} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg transition-colors">
            <Plus className="w-3 h-3" /> AM Slot
          </button>
          <button onClick={() => addSlot("PM")} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg transition-colors">
            <Plus className="w-3 h-3" /> PM Slot
          </button>
        </div>
      </div>

      {/* Game Records */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /> Game Records</p>
        <div className="space-y-2">

          {/* Coin Flip */}
          {confirmDelete === "coinflip" ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-700 flex-1">Delete ALL Coin Flip records?</span>
              <button
                onClick={handleDeleteAllCoinFlip}
                disabled={deletingCoinFlip}
                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded disabled:opacity-50"
              >
                {deletingCoinFlip ? "Deleting…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete("coinflip")}
              className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs hover:bg-red-50 hover:border-red-200 transition-colors group"
            >
              <span className="text-slate-600 group-hover:text-red-700 font-medium">🪙 Coin Flip — Delete All Records</span>
              <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-400" />
            </button>
          )}

          {/* Perfect 10 */}
          {confirmDelete === "perfect10" ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-700 flex-1">Delete ALL Perfect 10 records?</span>
              <button
                onClick={handleDeleteAllPerfect10}
                disabled={deletingPerfect10}
                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded disabled:opacity-50"
              >
                {deletingPerfect10 ? "Deleting…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete("perfect10")}
              className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs hover:bg-red-50 hover:border-red-200 transition-colors group"
            >
              <span className="text-slate-600 group-hover:text-red-700 font-medium">⏱️ Perfect 10 — Delete All Records</span>
              <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-400" />
            </button>
          )}

        </div>
      </div>

      <Button className="w-full h-9 text-sm font-semibold" onClick={handleSave}>
        <Check className="w-4 h-4 mr-1" /> Save Changes
      </Button>
    </div>
  );
}