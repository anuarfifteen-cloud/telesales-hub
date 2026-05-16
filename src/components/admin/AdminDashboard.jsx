import { useState, useRef } from "react";
import { ArrowLeft, Upload, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { EMPLOYEE_MAP } from "@/lib/employeeMap";
import { toast } from "sonner";

/**
 * Parses a CSV file into RosterDatabase records.
 * Expected CSV columns (case-insensitive): Date, ShiftType, EmployeeNumber, DailyTask
 */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV has no data rows.");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));

  const idxDate     = headers.findIndex((h) => h.includes("date"));
  const idxShift    = headers.findIndex((h) => h.includes("shift"));
  const idxEmpNum   = headers.findIndex((h) => h.includes("employee") && h.includes("num") || h === "employeenumber" || h === "empno" || h === "emp#" || h === "no");
  const idxTask     = headers.findIndex((h) => h.includes("task") || h.includes("daily"));

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.every((c) => !c)) continue; // skip blank rows

    const rawDate   = idxDate  >= 0 ? cols[idxDate]   : "";
    const rawShift  = idxShift >= 0 ? cols[idxShift]  : "";
    const rawEmpNum = idxEmpNum >= 0 ? cols[idxEmpNum] : "";
    const rawTask   = idxTask  >= 0 ? cols[idxTask]   : "";

    const empNum = parseInt(rawEmpNum, 10);
    const empName = EMPLOYEE_MAP[empNum] || `Employee ${empNum}`;

    // Normalise shift value
    const shiftUpper = rawShift.trim().toUpperCase();
    const shiftType = ["AM", "PM", "OFF"].includes(shiftUpper)
      ? shiftUpper === "OFF" ? "Off" : shiftUpper
      : rawShift || "AM";

    records.push({
      date: rawDate,
      shift_type: shiftType,
      employee_number: isNaN(empNum) ? 0 : empNum,
      employee_name: empName,
      daily_task: rawTask || "",
    });
  }

  return records;
}

export default function AdminDashboard({ onBack }) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      toast.error("Please upload a valid .csv file.");
      return;
    }

    setUploading(true);
    setSuccess(false);

    const text = await file.text();
    const records = parseCsv(text);

    if (records.length === 0) {
      toast.error("No valid rows found in the CSV.");
      setUploading(false);
      return;
    }

    // Clear existing data for dates in this upload (sequentially to avoid rate limits)
    const uniqueDates = [...new Set(records.map((r) => r.date))];
    for (const d of uniqueDates) {
      const existing = await base44.entities.RosterDatabase.filter({ date: d });
      for (const e of existing) {
        try { await base44.entities.RosterDatabase.delete(e.id); } catch (_) {}
      }
    }

    // Bulk create in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      await base44.entities.RosterDatabase.bulkCreate(records.slice(i, i + BATCH_SIZE));
    }

    setUploadedCount(records.length);
    setSuccess(true);
    setUploading(false);
    toast.success(`✅ ${records.length} roster entries uploaded successfully!`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10" style={{ boxShadow: "0 1px 12px 0 rgba(0,0,0,0.08)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="font-bold text-base text-slate-900">Admin Dashboard</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8 pb-10 space-y-8">
        {/* Welcome banner */}
        <div className="rounded-2xl bg-blue-600 text-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">Admin Panel</p>
          <h2 className="text-xl font-bold">Telesales Hub</h2>
          <p className="text-sm opacity-80 mt-0.5">Manage team data and settings below.</p>
        </div>

        {/* Roster upload card */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Monthly Roster</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload the monthly Excel schedule exported as a CSV file to update the team roster.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600">Uploading roster…</p>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-700">Upload Successful!</p>
                <p className="text-xs text-slate-500">{uploadedCount} entries saved to database.</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-blue-400" />
                <p className="text-sm font-medium text-slate-600">Drop CSV here or click to browse</p>
                <p className="text-xs text-slate-400">.csv files only</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <Button
            className="w-full h-12 text-sm font-semibold gap-2 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Monthly Roster (CSV)
          </Button>
        </div>
      </main>
    </div>
  );
}