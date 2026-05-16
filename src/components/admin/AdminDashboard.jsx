import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard({ onBack }) {
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
            <p className="text-sm text-slate-500 mt-0.5">Upload the monthly Excel schedule exported as a CSV file to update the team roster.</p>
          </div>

          <Button className="w-full h-12 text-sm font-semibold gap-2 rounded-xl">
            <Upload className="w-4 h-4" />
            Upload Monthly Roster (CSV)
          </Button>
        </div>
      </main>
    </div>
  );
}