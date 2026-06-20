import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function QuizMaintenanceToggle() {
  const [settingsId, setSettingsId] = useState(null);
  const [quizEnabled, setQuizEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.list().then((settings) => {
      if (settings[0]) {
        setSettingsId(settings[0].id);
        setQuizEnabled(settings[0].quiz_enabled !== false);
      }
    });
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    const newVal = !quizEnabled;
    setQuizEnabled(newVal);
    if (settingsId) {
      await base44.entities.AppSettings.update(settingsId, { quiz_enabled: newVal });
    } else {
      const created = await base44.entities.AppSettings.create({ quiz_enabled: newVal });
      setSettingsId(created.id);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between gap-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div>
        <h3 className="font-bold text-slate-900 text-base">🧠 Daily Quiz</h3>
        <p className="text-sm text-slate-500 mt-0.5">Turn off to put Daily Quiz under maintenance.</p>
        <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${quizEnabled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
          {quizEnabled ? "Active" : "Under Maintenance"}
        </span>
      </div>
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`relative inline-flex h-7 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${quizEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
        style={{ width: "52px" }}
      >
        {saving
          ? <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
          : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${quizEnabled ? "translate-x-7" : "translate-x-1"}`} />
        }
      </button>
    </div>
  );
}