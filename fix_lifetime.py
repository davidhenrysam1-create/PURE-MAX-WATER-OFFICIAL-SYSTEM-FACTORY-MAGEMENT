with open('src/components/dashboard/DashboardModule.tsx', 'r') as f:
    content = f.read()

target = """              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  TODAY'S SUMMARY (24-Hour Period)
                </h3>
                {(activeRole === "manager" || activeRole === "developer") && (
                  <button onClick={() => { if(window.confirm("Are you sure you want to reset today's counters to zero? This action cannot be undone for the dashboard view.")) { if(window.confirm("Final confirmation: Reset counters?")) { localStorage.setItem("puremax_daily_reset", Date.now().toString()); window.location.reload(); } } }} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 font-bold text-[11px] rounded-lg border border-rose-500/20 transition cursor-pointer active:scale-95">
                    Reset Daily Counters
                  </button>
                )}
              </div>
                <BarChart className="w-4 h-4 text-purple-500" />
                LIFETIME METRICS (All-Time)"""

replacement = """              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <BarChart className="w-4 h-4 text-purple-500" />
                LIFETIME METRICS (All-Time)
              </h3>"""

content = content.replace(target, replacement)

with open('src/components/dashboard/DashboardModule.tsx', 'w') as f:
    f.write(content)
