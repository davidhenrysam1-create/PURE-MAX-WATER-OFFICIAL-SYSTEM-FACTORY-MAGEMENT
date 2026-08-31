with open('src/components/fleet/FleetMapModule.tsx', 'r') as f:
    content = f.read()
import re
content = re.sub(r'const timer = setInterval\(\(\) => \{.*?\n    \}, intervalMs\);', '/* Simulation disabled */', content, flags=re.DOTALL)
with open('src/components/fleet/FleetMapModule.tsx', 'w') as f:
    f.write(content)
