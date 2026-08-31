const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardModule.tsx', 'utf8');

// Replace known h3 structures missing closing tags
content = content.replace(/<h3 className="text-xs font-bold text-white flex items-center gap-2">\s*(.*?)\s*(.*?)/g, '<h3 className="text-xs font-bold text-white flex items-center gap-2">$1 $2</h3>');
// I should just find the original file if I can, but I can't.
