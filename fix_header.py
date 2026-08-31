with open('src/components/common/Header.tsx', 'r') as f:
    content = f.read()
import re
content = re.sub(r'overflow-x-hidden relative', r'relative', content)
content = re.sub(r'h-14 sm:h-16 flex items-center justify-between gap-2 overflow-hidden', r'h-14 sm:h-16 flex items-center justify-between gap-2', content)

with open('src/components/common/Header.tsx', 'w') as f:
    f.write(content)
