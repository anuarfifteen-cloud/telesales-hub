import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

function initialsOf(name, email) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email?.[0] || "?").toUpperCase();
}

export default function UserPicker({ user, allUsers, onBack, onSelect }) {
  const [search, setSearch] = useState("");

  const others = allUsers.filter((u) => u.id !== user.id);
  const filtered = others.filter((u) =>
    (u.full_name || u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <h3 className="font-bold text-base text-slate-800 dark:text-gray-100">New Message</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full text-sm border border-border rounded-xl pl-9 pr-3 py-2.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No users found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{initialsOf(u.full_name, u.email)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800 dark:text-gray-100 truncate">{u.full_name || u.email}</span>
                  {u.role === "admin" && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}