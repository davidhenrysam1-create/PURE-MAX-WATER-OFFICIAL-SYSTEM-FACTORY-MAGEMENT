import re
with open('src/components/dashboard/DashboardModule.tsx', 'r') as f:
    content = f.read()

def replace_h3(match):
    inner = match.group(2)
    return f'{match.group(1)}{inner}</h3>'

# Let's just find each <h3 and where it should end
content = re.sub(r'(<h3[^>]*>.*?)(</h3)?(\s*<p|\s*<div|\s*<button|\s*<span[^>]*>Read-Only|\s*<span[^>]*>Quick Actions)', r'\1</h3>\3', content, flags=re.DOTALL)

with open('src/components/dashboard/DashboardModule.tsx', 'w') as f:
    f.write(content)
