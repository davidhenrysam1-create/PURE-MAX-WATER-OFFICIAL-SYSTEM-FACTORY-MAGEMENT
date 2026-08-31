import { db } from './src/db/db.js';
import { attendance } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function fix() {
  const records = await db.select().from(attendance).where(eq(attendance.userName, 'TWEEN'));
  const todayRecords = records.filter(r => r.date === '2026-08-31');
  if (todayRecords.length > 1) {
    // delete one of the pending ones
    const pending = todayRecords.filter(r => r.status === 'pending');
    if (pending.length > 1) {
      await db.delete(attendance).where(eq(attendance.id, pending[0].id));
      console.log('Deleted duplicate TWEEN record');
    }
  }
}
fix().catch(console.error);
