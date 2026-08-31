with open('src/components/fleet/FleetMapModule.tsx', 'r') as f:
    content = f.read()

import re

# Find the useEffect for simulation timer
# const simInterval = setInterval(() => { updateSimulatedLocations(); }, ...
content = re.sub(r'const simInterval = setInterval\(\(\) => \{[^}]*updateSimulatedLocations\(\);[^}]*\}, 2000 / simulationSpeedMultiplier\);', '/* Mock simulation disabled by management: const simInterval = setInterval(() => { updateSimulatedLocations(); }, 2000 / simulationSpeedMultiplier); */', content, flags=re.DOTALL)

with open('src/components/fleet/FleetMapModule.tsx', 'w') as f:
    f.write(content)
