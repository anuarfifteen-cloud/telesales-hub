import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CORRECT_PIN = "030525";

export default function AdminPinModal({ onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
    setError(false);
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">⚙️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Admin Access</h2>
          <p className="text-sm text-slate-500 mt-0.5">Enter your 6-digit PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                i < pin.length ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <p className={`text-center text-xs text-red-500 font-medium mb-4 h-4 ${error ? "opacity-100" : "opacity-0"}`}>
          Incorrect PIN. Please try again.
        </p>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {digits.map((d, i) => {
            if (d === null) return <div key={i} />;
            if (d === "del") {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="h-14 rounded-xl text-slate-500 font-semibold text-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(String(d))}
                className="h-14 rounded-xl text-slate-800 font-semibold text-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all"
              >
                {d}
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-4 h-11 text-sm font-semibold"
          onClick={handleSubmit}
          disabled={pin.length < 6}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}