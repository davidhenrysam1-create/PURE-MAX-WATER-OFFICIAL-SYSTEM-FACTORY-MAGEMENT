with open('src/components/dashboard/DashboardModule.tsx', 'r') as f:
    content = f.read()

target = """              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Factory Announcements
              {(activeRole === 'manager' || activeRole === 'developer') && (</h3>"""

replacement = """              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Factory Announcements
              </h3>
              {(activeRole === 'manager' || activeRole === 'developer') && ("""

content = content.replace(target, replacement)

with open('src/components/dashboard/DashboardModule.tsx', 'w') as f:
    f.write(content)
