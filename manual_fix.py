with open('src/components/dashboard/DashboardModule.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">\n                {(activeRole === "manager" || activeRole === "developer") && (</h3>',
    '                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">\n                  <Clock className="w-4 h-4 text-emerald-500" />\n                  TODAY\'S SUMMARY (24-Hour Period)\n                </h3>\n                {(activeRole === "manager" || activeRole === "developer") && ('
)

with open('src/components/dashboard/DashboardModule.tsx', 'w') as f:
    f.write(content)
