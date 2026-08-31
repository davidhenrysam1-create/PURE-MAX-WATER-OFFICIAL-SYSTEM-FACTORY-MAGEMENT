const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

const routeToAdd = `
app.post('/api/attendance-reset', async (req, res) => {
  try {
    await db.delete(attendance);
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting attendance:', err);
    res.status(500).json({ error: String(err) });
  }
});
`;

if (!serverContent.includes('/api/attendance-reset')) {
  serverContent = serverContent.replace("app.post('/api/attendance',", routeToAdd + "\napp.post('/api/attendance',");
  fs.writeFileSync('server.ts', serverContent);
  console.log("Added /api/attendance-reset route");
} else {
  console.log("Route already exists");
}
