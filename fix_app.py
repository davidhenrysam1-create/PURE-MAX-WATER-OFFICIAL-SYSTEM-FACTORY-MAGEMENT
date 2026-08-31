with open('src/App.tsx', 'r') as f:
    content = f.read()

import re
content = re.sub(r'overflow-x-hidden`\}', r'`}', content)
# line 209
content = re.sub(r'overflow-x-hidden min-w-0">', r'min-w-0">', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
