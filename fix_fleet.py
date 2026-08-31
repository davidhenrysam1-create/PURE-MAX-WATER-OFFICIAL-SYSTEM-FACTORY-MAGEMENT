with open('src/components/fleet/FleetMapModule.tsx', 'r') as f:
    content = f.read()
import re
content = re.sub(r'    /\* Simulation disabled \*/\n    return \(\) => clearInterval\(timer\);', r'    /* Simulation disabled */\n    return () => {};', content)
with open('src/components/fleet/FleetMapModule.tsx', 'w') as f:
    f.write(content)
