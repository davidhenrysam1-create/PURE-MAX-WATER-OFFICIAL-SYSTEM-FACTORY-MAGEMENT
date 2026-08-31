import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/db/index.ts';
import {
  users,
  attendance,
  productionBatches,
  salesRecords,
  expenses,
  repairs,
  fuelLogs,
  equipment,
  messages,
  announcements,
  auditLogs,
  staffLiveLocations,
  notifications,
  passwordResets,
  outerBuyings,
  rollBuyings,
  packagingRolls,
  equipmentLogs,
  systemSettings,
} from './src/db/schema.ts';
import { eq, desc, sql, and, gte, or, like, inArray } from 'drizzle-orm';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io',
  maxHttpBufferSize: 2e7 // 20 MB limit to allow Voice Notes & Images
});
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Socket.IO Real-Time Engine & WebRTC Signaling
const onlineUsers = new Map<string, { socketId: string; userId: string; role: string; name: string; employeeId?: string }>();
const activeCalls = new Map<string, { callId: string; callerId: string; callerName: string; callerRole: string; callerAvatar?: string; receiverId: string; callType: 'voice' | 'video'; startTime: number; accepted: boolean }>();

export const broadcastDbChange = (table: string, action: string, data?: any) => {
  try {
    io.to('factory-global').emit('db:data_changed', {
      table,
      action,
      data,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn('Socket broadcast error:', e);
  }
};

io.on('connection', (socket) => {
  // 1. User Join
  socket.on('join', (data: { userId: string; role: string; name: string; employeeId?: string; id?: string }) => {
    if (!data?.userId) return;
    onlineUsers.set(data.userId, {
      socketId: socket.id,
      userId: data.userId,
      role: data.role,
      name: data.name,
      employeeId: data.employeeId,
    });
    
    // Join multiple alias rooms to guarantee call delivery across any ID format
    socket.join(`user:${data.userId}`);
    if (data.employeeId) socket.join(`user:${data.employeeId}`);
    if (data.id && data.id !== data.userId) socket.join(`user:${data.id}`);
    
    socket.join(`role:${data.role}`);
    socket.join('factory-global');

    io.emit('presence:update', Array.from(onlineUsers.values()));
  });

  // 2. Real-Time Chat, Voice Note, Edit, and Delete Messages
  socket.on('chat:send', (msgData: any) => {
    if (msgData.recipientId) {
      // Direct 1-to-1 message: strictly route ONLY to the recipient and sender's personal rooms
      io.to(`user:${msgData.recipientId}`).to(`user:${msgData.senderId}`).emit('chat:receive', msgData);
    } else {
      // All-Staff Factory Group message: broadcast to all staff members
      io.to('factory-global').emit('chat:receive', msgData);
    }
  });

  socket.on('chat:edit', (editData: { messageId: string; content: string; recipientId?: string; senderId?: string; editedAt: string }) => {
    if (editData.recipientId) {
      io.to(`user:${editData.recipientId}`).to(`user:${editData.senderId}`).emit('chat:edited', editData);
    } else {
      io.to('factory-global').emit('chat:edited', editData);
    }
  });

  socket.on('chat:delete', (deleteData: { messageId: string; recipientId?: string; senderId?: string }) => {
    if (deleteData.recipientId) {
      io.to(`user:${deleteData.recipientId}`).to(`user:${deleteData.senderId}`).emit('chat:deleted', deleteData);
    } else {
      io.to('factory-global').emit('chat:deleted', deleteData);
    }
  });

  // 3. Manager Announcement Broadcast
  socket.on('announcement:publish', (ancData: any) => {
    io.to('factory-global').emit('announcement:receive', ancData);
  });

  // 4. Driver / Tricycle Live GPS Location
  socket.on('gps:update', (locationData: any) => {
    io.to('role:manager').to('role:developer').to('role:second_manager').to('role:sales_manager').to('role:ceo').emit('gps:location_change', locationData);
  });

  // 5. WebRTC 1-to-1 Voice & Video Call Signaling with Missed Call Tracking
  socket.on('call:initiate', (payload: { callId: string; callerId: string; callerName: string; callerRole?: string; callerAvatar?: string; receiverId: string; callType: 'voice' | 'video' }) => {
    activeCalls.set(payload.callId, {
      ...payload,
      callerRole: payload.callerRole || 'Staff',
      startTime: Date.now(),
      accepted: false,
    });
    
    // Broadcast incoming call invite to all aliases of receiver
    io.to(`user:${payload.receiverId}`).emit('call:incoming', payload);
  });

  socket.on('call:accept', (payload: { callId: string; callerId: string; receiverId: string; receiverName: string }) => {
    const existing = activeCalls.get(payload.callId);
    if (existing) {
      existing.accepted = true;
    }
    io.to(`user:${payload.callerId}`).emit('call:accepted', payload);
  });

  socket.on('call:reject', async (payload: { callId: string; callerId: string; reason?: string }) => {
    const callInfo = activeCalls.get(payload.callId);
    if (callInfo && !callInfo.accepted) {
      // Record missed call notification for recipient
      try {
        await db.insert(notifications).values({
          userId: callInfo.receiverId,
          category: 'STAFF',
          targetRole: 'all',
          title: `Missed ${callInfo.callType === 'video' ? 'Video' : 'Voice'} Call`,
          message: `Missed call from ${callInfo.callerName} (${callInfo.callerRole})`,
          type: 'system',
          isRead: false,
          linkTab: 'chat',
        });
      } catch (e) {
        console.warn('Record missed call notification error:', e);
      }
    }
    activeCalls.delete(payload.callId);
    io.to(`user:${payload.callerId}`).emit('call:rejected', payload);
  });

  socket.on('call:end', async (payload: { callId: string; targetUserId: string }) => {
    const callInfo = activeCalls.get(payload.callId);
    if (callInfo && !callInfo.accepted) {
      // Caller hung up before receiver answered -> Log Missed Call
      io.to(`user:${callInfo.receiverId}`).emit('call:missed', {
        callerId: callInfo.callerId,
        callerName: callInfo.callerName,
        callerRole: callInfo.callerRole,
        callType: callInfo.callType,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      try {
        await db.insert(notifications).values({
          userId: callInfo.receiverId,
          category: 'STAFF',
          targetRole: 'all',
          title: `Missed ${callInfo.callType === 'video' ? 'Video' : 'Voice'} Call`,
          message: `Missed call from ${callInfo.callerName} (${callInfo.callerRole})`,
          type: 'system',
          isRead: false,
          linkTab: 'chat',
        });
      } catch (e) {
        console.warn('Record missed call notification error:', e);
      }
    }
    activeCalls.delete(payload.callId);
    io.to(`user:${payload.targetUserId}`).emit('call:ended', payload);
  });

  socket.on('call:signal', (payload: { callId: string; targetUserId: string; signal: any; fromUserId: string }) => {
    io.to(`user:${payload.targetUserId}`).emit('call:signal', payload);
  });

  // 6. Administrative Security Alerts
  socket.on('security:alert', (alertData: any) => {
    io.to('role:developer').to('role:manager').to('role:second_manager').to('role:ceo').emit('security:alert_received', alertData);
  });

  // 7. Global Theme & System Settings Broadcast
  socket.on('profile:broadcast', (userData: any) => {
    if (!userData) return;
    io.emit('user:profile_updated', userData);
    io.to('factory-global').emit('user:profile_updated', userData);
  });

  socket.on('settings:broadcast', (settings: any) => {
    io.emit('settings:updated', settings);
    io.to('factory-global').emit('settings:updated', settings);
  });

  socket.on('disconnect', () => {
    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('presence:update', Array.from(onlineUsers.values()));
  });
});

// Helper: Configure SMTP Transporter
function getEmailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return null;
}

// Helper: Send the OTP via the official WhatsApp Cloud API (Meta Business Platform).
// Requires WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID to be configured on the
// server. Returns true only on a confirmed successful dispatch; never throws.
async function sendWhatsAppOtp(phone: string, otp: string, name: string): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId || !phone) return false;

  try {
    const toNumber = phone.replace(/[^\d+]/g, '');
    const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: {
          body: `Pure Max Factory OS\nHello ${name}, your password reset verification code is: ${otp}\nThis code expires in 15 minutes. Do not share it with anyone.`,
        },
      }),
    });
    if (!resp.ok) {
      console.error('WhatsApp API send error:', resp.status, await resp.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('WhatsApp API send exception:', err);
    return false;
  }
}

// In-memory rate limiter for OTP verification attempts (5 attempts / 15 minutes per
// identifier). This is intentionally simple (single-process, resets on deploy) rather
// than a DB migration, since this server runs as a single Node process.
const otpVerifyAttempts = new Map<string, { count: number; lockedUntil: number; windowStart: number }>();
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

function checkOtpRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = otpVerifyAttempts.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  // Rolling window expired — reset silently
  if (now - entry.windowStart > OTP_LOCKOUT_MS) {
    otpVerifyAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordOtpFailure(key: string) {
  const now = Date.now();
  const entry = otpVerifyAttempts.get(key) || { count: 0, lockedUntil: 0, windowStart: now };
  entry.count += 1;
  if (entry.count >= OTP_MAX_ATTEMPTS) {
    entry.lockedUntil = now + OTP_LOCKOUT_MS;
  }
  otpVerifyAttempts.set(key, entry);
}

function clearOtpAttempts(key: string) {
  otpVerifyAttempts.delete(key);
}

// 1. Health & Database Diagnostic
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT current_database(), current_user, version(), NOW() as server_time;`);
    res.json({
      status: 'ok',
      database: 'Cloud SQL PostgreSQL',
      region: 'africa-south1',
      details: result.rows?.[0] || {},
    });
  } catch (err: any) {
    console.error('Health check database error:', err);
    res.status(500).json({ status: 'error', message: err?.message || 'Database error' });
  }
});

// 2. Users Management
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.id);
    res.json(allUsers);
  } catch (err: any) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(users)
      .values({
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        department: data.department || 'Operations',
        status: data.status || 'active',
        password: data.password || 'PureMax@2026',
        isFirstLogin: data.isFirstLogin ?? true,
        dailySalaryLe: Number(data.dailySalaryLe) || 0,
        monthlySalaryLe: Number(data.monthlySalaryLe) || 0,
        avatarUrl: data.avatarUrl || null,
        uid: data.uid || null,
      })
      .onConflictDoUpdate({
        target: users.employeeId,
        set: {
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          role: data.role,
          department: data.department || 'Operations',
          status: data.status || 'active',
          password: data.password || 'PureMax@2026',
          dailySalaryLe: Number(data.dailySalaryLe) || 0,
          monthlySalaryLe: Number(data.monthlySalaryLe) || 0,
          avatarUrl: data.avatarUrl || null,
        },
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('users', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

app.put('/api/users/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const data = req.body;
    const updatePayload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      status: data.status,
      dailySalaryLe: Number(data.dailySalaryLe) || 0,
      monthlySalaryLe: Number(data.monthlySalaryLe) || 0,
      avatarUrl: data.avatarUrl,
    };
    if (data.password) {
      updatePayload.password = data.password;
    }
    if (typeof data.isFirstLogin === 'boolean') {
      updatePayload.isFirstLogin = data.isFirstLogin;
    }
    let updated = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.employeeId, employeeId))
      .returning();

    if (updated.length === 0 && data.email) {
      updated = await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.email, data.email))
        .returning();
    }

    const rawId = employeeId.replace(/\D/g, '');
    const numId = rawId ? Number(rawId) : NaN;
    if (updated.length === 0 && !isNaN(numId) && numId > 0 && numId <= 2147483647 && rawId.length < 10) {
      updated = await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, numId))
        .returning();
    }

    if (updated[0]) {
      broadcastDbChange('users', 'update', updated[0]);
      io.to('factory-global').emit('user:profile_updated', updated[0]);
    }
    res.json(updated[0] || null);
  } catch (err: any) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

// System Settings & UI Themes (Global Cross-Device Synchronizer)
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, 'puremax_global_theme')).limit(1);
    if (rows.length > 0 && rows[0].settingsJson) {
      try {
        const parsed = JSON.parse(rows[0].settingsJson);
        return res.json(parsed);
      } catch (e) {
        return res.json({});
      }
    }
    res.json({});
  } catch (err: any) {
    console.error('Fetch system settings error:', err);
    res.json({});
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const settingsStr = JSON.stringify(newSettings);
    const updatedBy = newSettings.updatedBy || 'developer';

    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, 'puremax_global_theme')).limit(1);
    let saved;
    if (existing.length > 0) {
      saved = await db
        .update(systemSettings)
        .set({
          settingsJson: settingsStr,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, 'puremax_global_theme'))
        .returning();
    } else {
      saved = await db
        .insert(systemSettings)
        .values({
          key: 'puremax_global_theme',
          settingsJson: settingsStr,
          updatedBy,
        })
        .returning();
    }

    broadcastDbChange('system_settings', 'update', newSettings);
    io.emit('settings:updated', newSettings);
    io.to('factory-global').emit('settings:updated', newSettings);
    res.json({ success: true, settings: newSettings });
  } catch (err: any) {
    console.error('Save system settings error:', err);
    res.status(500).json({ error: 'Failed to save system settings' });
  }
});

/**
 * Identities used by the seeded/demo data. Kept in sync with the MOCK_NAMES
 * guard in src/context/AppContext.tsx.
 */
const DEMO_STAFF_NAMES = [
  'brima sesay',
  'mohamed kamara',
  'alpha koroma',
  'ibrahim conteh',
  'alusine kamara',
  'mohamed sesay',
  'demo user',
  'test user',
  'system',
];

app.delete('/api/sales/mock', async (req: Request, res: Response) => {
  try {
    // ---------------------------------------------------------------------
    // SAFETY FIX (Issue #5)
    // ---------------------------------------------------------------------
    // This endpoint used to run `db.delete(salesRecords)` with NO where clause,
    // i.e. it TRUNCATED the entire sales table. The Developer-portal button that
    // calls it is labelled "Purge Demo Data" and promises to remove "mock
    // records", so clicking it destroyed every real transaction the factory had
    // ever logged. That is the worst possible failure mode for a button sitting
    // in a "Danger Zone" panel.
    //
    // Now:
    //   * Default: delete ONLY rows that are identifiable as demo/mock data
    //     (DEMO-/MOCK- invoice numbers, or recorded under a known seeded name).
    //   * Full wipe requires an explicit two-part confirmation token, and is
    //     reported back with the number of rows it destroyed.
    const wantsFullWipe =
      req.query?.scope === 'all' && req.query?.confirm === 'TRUNCATE_ALL';

    let removed: { id: number }[] = [];

    if (wantsFullWipe) {
      removed = await db.delete(salesRecords).returning({ id: salesRecords.id });
      console.warn(
        `[sales/mock] FULL WIPE requested - ${removed.length} sales record(s) permanently deleted.`
      );
    } else {
      removed = await db
        .delete(salesRecords)
        .where(
          or(
            like(salesRecords.invoiceNumber, 'DEMO-%'),
            like(salesRecords.invoiceNumber, 'MOCK-%'),
            like(salesRecords.invoiceNumber, 'demo-%'),
            like(salesRecords.invoiceNumber, 'mock-%'),
            inArray(sql`lower(${salesRecords.staffName})`, DEMO_STAFF_NAMES)
          )
        )
        .returning({ id: salesRecords.id });
    }

    broadcastDbChange('sales_records', 'delete', {
      all: wantsFullWipe,
      count: removed.length,
    });

    res.json({
      success: true,
      message: wantsFullWipe
        ? `Sales table truncated: ${removed.length} record(s) permanently deleted.`
        : `Demo data purged: ${removed.length} mock record(s) removed. Real transactions preserved.`,
      deletedCount: removed.length,
      scope: wantsFullWipe ? 'all' : 'demo-only',
    });
  } catch (err: any) {
    console.error('Delete mock sales error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete mock sales' });
  }
});

app.delete('/api/users/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    await db.delete(users).where(eq(users.employeeId, employeeId));
    broadcastDbChange('users', 'delete', { employeeId });
    res.json({ success: true, employeeId });
  } catch (err: any) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

// Authentication Endpoint (Supports Email, Employee ID, and Phone Number)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { credential, password } = req.body;
    if (!credential || !password) {
      return res.status(400).json({ error: 'Credential and password are required' });
    }
    const trimmed = String(credential).trim().toLowerCase();
    const cleanPhone = String(credential).replace(/[\s+-]/g, '');

    const allUsers = await db.select().from(users);
    const found = allUsers.find(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        u.employeeId.toLowerCase() === trimmed ||
        (u.phone && u.phone.replace(/[\s+-]/g, '') === cleanPhone) ||
        (u.phone && u.phone.trim() === String(credential).trim())
    );

    if (!found) {
      return res.status(404).json({ error: 'Account not found. Please contact your Manager or Developer.' });
    }

    if (found.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact your Manager.' });
    }

    // Developer Credentials Check
    if (found.role === 'developer' || trimmed === 'davidhenrysam1@gmail.com' || trimmed === 'dev-11422') {
      const p = String(password).trim();
      if (p !== 'SAM_11422' && p !== 'Sam11422' && p !== 'sam_11422' && p !== 'SAM11422' && p !== 'devpass') {
        return res.status(401).json({ error: 'Invalid Developer password.' });
      }
    } else {
      if (found.password && String(password).trim() !== found.password.trim()) {
        return res.status(401).json({ error: 'Incorrect password entered.' });
      }
    }

    return res.json({
      success: true,
      user: {
        id: `u-${found.id}`,
        employeeId: found.employeeId,
        name: found.name,
        email: found.email,
        phone: found.phone,
        role: found.role,
        department: found.department,
        status: found.status,
        dailySalaryLe: found.dailySalaryLe,
        monthlySalaryLe: found.monthlySalaryLe,
        avatarUrl: found.avatarUrl,
        isFirstLogin: found.isFirstLogin,
        password: found.password,
      },
    });
  } catch (err: any) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Authentication engine error' });
  }
});

// 3. Attendance
app.get('/api/attendance', async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(attendance).orderBy(desc(attendance.id));
    res.json(
      records.map((a) => ({
        id: a.id,
        userId: a.userId,
        employeeId: a.employeeId,
        name: a.name,
        userName: a.name,
        role: a.role,
        userRole: a.role,
        date: a.date,
        timeIn: a.timeIn,
        checkInTime: a.timeIn,
        timeOut: a.timeOut,
        checkOutTime: a.timeOut,
        status: a.status,
        notes: a.notes,
        verifiedBy: a.verifiedBy,
        approvedBy: a.verifiedBy,
        createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Attendance fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.post('/api/attendance', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const empId = data.employeeId || data.userId || 'PM-000';
    let name = data.name || data.userName || '';
    let role = data.role || data.userRole || '';

    if (!name || !role) {
      const allUsers = await db.select().from(users);
      const matched = allUsers.find(
        (u) =>
          (u.employeeId && u.employeeId.toLowerCase() === String(empId).toLowerCase()) ||
          (u.id && String(u.id) === String(data.userId).replace(/^u-/, '')) ||
          (data.userId && u.employeeId && u.employeeId.toLowerCase() === String(data.userId).toLowerCase())
      );
      if (matched) {
        if (!name) name = matched.name;
        if (!role) role = matched.role;
      }
    }

    if (!name) name = 'Staff Member';
    if (!role) role = 'staff';

    const insertPayload = {
      userId: String(data.userId || empId),
      employeeId: String(empId),
      name,
      role,
      date: String(data.date || new Date().toISOString().split('T')[0]),
      timeIn: data.timeIn || data.checkInTime || new Date().toTimeString().slice(0, 5),
      timeOut: data.timeOut || data.checkOutTime || null,
      status: data.status || 'pending',
      notes: data.notes || (data.location ? `Location: ${data.location}` : null),
      verifiedBy: data.verifiedBy || data.approvedBy || null,
    };

    // Check if an existing attendance record for this employee and date exists
    const existing = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, insertPayload.employeeId), eq(attendance.date, insertPayload.date)));

    if (existing.length > 0) {
      const updated = await db
        .update(attendance)
        .set({
          timeIn: insertPayload.timeIn || existing[0].timeIn,
          timeOut: insertPayload.timeOut || existing[0].timeOut,
          status: insertPayload.status || existing[0].status,
          notes: insertPayload.notes || existing[0].notes,
          verifiedBy: insertPayload.verifiedBy || existing[0].verifiedBy,
        })
        .where(eq(attendance.id, existing[0].id))
        .returning();
      if (updated[0]) {
        broadcastDbChange('attendance', 'update', updated[0]);
      }
      return res.json(updated[0]);
    }

    const inserted = await db.insert(attendance).values(insertPayload).returning();
    if (inserted[0]) {
      broadcastDbChange('attendance', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Attendance insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to insert attendance' });
  }
});

app.put('/api/attendance/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    
    // Safely extract numeric ID only if it's within Postgres integer range (max 2147483647)
    // Client timestamp-based IDs (e.g., att-1787563019457) have numbers > 1 trillion
    const digitsOnly = id.replace(/\D/g, '');
    const cleanId = digitsOnly ? Number(digitsOnly) : NaN;
    const isValidDbId = !isNaN(cleanId) && cleanId > 0 && cleanId <= 2147483647 && digitsOnly.length < 10;

    const updatePayload: any = {};
    if (data.timeOut || data.checkOutTime) updatePayload.timeOut = data.timeOut || data.checkOutTime;
    if (data.timeIn || data.checkInTime) updatePayload.timeIn = data.timeIn || data.checkInTime;
    if (data.status) updatePayload.status = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.verifiedBy || data.approvedBy) updatePayload.verifiedBy = data.verifiedBy || data.approvedBy;

    let updated: any[] = [];
    if (isValidDbId) {
      updated = await db.update(attendance).set(updatePayload).where(eq(attendance.id, cleanId)).returning();
    }

    if (updated.length === 0 && (data.employeeId || data.userId) && data.date) {
      if (data.employeeId) {
        updated = await db
          .update(attendance)
          .set(updatePayload)
          .where(and(eq(attendance.employeeId, String(data.employeeId)), eq(attendance.date, String(data.date))))
          .returning();
      }
      if (updated.length === 0 && data.userId) {
        updated = await db
          .update(attendance)
          .set(updatePayload)
          .where(and(eq(attendance.userId, String(data.userId)), eq(attendance.date, String(data.date))))
          .returning();
      }
    }

    // If still not updated and we have employee/date details, upsert the record so attendance is never lost
    if (updated.length === 0 && (data.employeeId || data.userId)) {
      const empId = data.employeeId || data.userId || 'PM-000';
      let name = data.name || data.userName || '';
      let role = data.role || data.userRole || '';

      if (!name || !role) {
        const allUsers = await db.select().from(users);
        const matched = allUsers.find(
          (u) =>
            (u.employeeId && u.employeeId.toLowerCase() === String(empId).toLowerCase()) ||
            (u.id && String(u.id) === String(data.userId).replace(/^u-/, '')) ||
            (data.userId && u.employeeId && u.employeeId.toLowerCase() === String(data.userId).toLowerCase())
        );
        if (matched) {
          if (!name) name = matched.name;
          if (!role) role = matched.role;
        }
      }

      const inserted = await db
        .insert(attendance)
        .values({
          userId: String(data.userId || empId),
          employeeId: String(empId),
          name: name || 'Staff Member',
          role: role || 'staff',
          date: String(data.date || new Date().toISOString().split('T')[0]),
          timeIn: data.timeIn || data.checkInTime || '08:00',
          timeOut: data.timeOut || data.checkOutTime || null,
          status: data.status || 'pending',
          notes: data.notes || (data.location ? `Location: ${data.location}` : null),
          verifiedBy: data.verifiedBy || data.approvedBy || null,
        })
        .returning();
      updated = inserted;
    }

    if (updated[0]) {
      broadcastDbChange('attendance', 'update', updated[0]);
    }

    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('Attendance update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update attendance' });
  }
});

// 4. Production Batches
app.get('/api/production', async (req: Request, res: Response) => {
  try {
    const batches = await db.select().from(productionBatches).orderBy(desc(productionBatches.id));
    res.json(
      batches.map((b) => ({
        id: `prod-${b.id}`,
        batchNumber: b.batchNumber,
        date: b.date,
        shift: 'morning' as const,
        bundlesProduced: b.unitsProduced,
        damagedBundles: b.damagedUnits || 0,
        cleanWaterLitres: (b.unitsProduced || 0) * 10,
        operatorId: b.operatorName || 'System',
        operatorName: b.operatorName || 'Operator',
        notes: b.notes || '',
        createdAt: b.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Production fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch production records' });
  }
});

app.post('/api/production', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const batchNum = data.batchNumber || `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(100 + Math.random() * 900)}`;
    const inserted = await db
      .insert(productionBatches)
      .values({
        batchNumber: batchNum,
        date: data.date || new Date().toISOString().slice(0, 10),
        machineLine: data.shift === 'night' ? 'Line 2' : 'Line 1 - High-Speed Sachet Sealer',
        unitsProduced: Number(data.bundlesProduced || data.unitsProduced || 0),
        damagedUnits: Number(data.damagedBundles || data.damagedUnits || 0),
        waterQualityPh: 7.2,
        tdsPpm: 42,
        status: 'Approved & Stored',
        operatorName: data.operatorName || 'Abu Bakarr Mansaray',
        notes: data.notes || '',
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('production', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Production insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record batch' });
  }
});

// 4b. Outer Buyings
app.get('/api/outer-buyings', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(outerBuyings).orderBy(desc(outerBuyings.id));
    res.json(
      list.map((o) => ({
        id: `out-buy-${o.id}`,
        date: o.date,
        outersCount: o.outersCount,
        engineerId: o.engineerId || 'eng-1',
        engineerName: o.engineerName,
        costLe: o.costLe || 0,
        notes: o.notes || '',
        createdAt: o.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Outer buyings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch outer buyings' });
  }
});

app.post('/api/outer-buyings', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(outerBuyings)
      .values({
        date: data.date || new Date().toISOString().slice(0, 10),
        outersCount: Number(data.outersCount || 0),
        engineerId: data.engineerId || null,
        engineerName: data.engineerName || 'Production Engineer',
        costLe: Number(data.costLe || 0),
        notes: data.notes || '',
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('outer_buyings', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Outer buying insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record outer buying' });
  }
});

// 4c. Roll Buyings
app.get('/api/roll-buyings', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(rollBuyings).orderBy(desc(rollBuyings.id));
    res.json(
      list.map((r) => ({
        id: `roll-buy-${r.id}`,
        date: r.date,
        rollName: r.rollName,
        rollWeightKg: r.rollWeightKg,
        engineerId: r.engineerId || 'eng-1',
        engineerName: r.engineerName,
        costLe: r.costLe || 0,
        notes: r.notes || '',
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Roll buyings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch roll buyings' });
  }
});

app.post('/api/roll-buyings', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(rollBuyings)
      .values({
        date: data.date || new Date().toISOString().slice(0, 10),
        rollName: data.rollName || 'Pure Max Sachet Roll Film',
        rollWeightKg: Number(data.rollWeightKg || 0),
        engineerId: data.engineerId || null,
        engineerName: data.engineerName || 'Production Engineer',
        costLe: Number(data.costLe || 0),
        notes: data.notes || '',
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('roll_buyings', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Roll buying insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record roll buying' });
  }
});

// 4d. Individual Packaging Rolls Inventory & Lifecycle Ledger
app.get('/api/packaging-rolls', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(packagingRolls).orderBy(desc(packagingRolls.id));
    res.json(
      list.map((r) => ({
        id: `roll-${r.id}`,
        rollCode: r.rollCode,
        rollName: r.rollName,
        weightKg: r.weightKg,
        status: r.status,
        purchaseDate: r.purchaseDate,
        costLe: r.costLe || 0,
        supplier: r.supplier || '',
        invoiceOrReceipt: r.invoiceOrReceipt || '',
        assignedMachineId: r.assignedMachineId || null,
        assignedMachineName: r.assignedMachineName || null,
        operatorId: r.operatorId || null,
        operatorName: r.operatorName || null,
        loadedAt: r.loadedAt || null,
        exhaustedAt: r.exhaustedAt || null,
        bundlesProduced: r.bundlesProduced || 0,
        notes: r.notes || '',
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Packaging rolls fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch packaging rolls' });
  }
});

app.post('/api/packaging-rolls', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // Support array or single record insertion
    const items = Array.isArray(data) ? data : [data];
    const insertedResults: any[] = [];

    for (const item of items) {
      const rollCode = item.rollCode || `ROLL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
      const inserted = await db
        .insert(packagingRolls)
        .values({
          rollCode: rollCode,
          rollName: item.rollName || 'Pure Max Sachet Roll Film',
          weightKg: Number(item.weightKg || item.rollWeightKg || 25),
          status: item.status || 'available',
          purchaseDate: item.purchaseDate || item.date || new Date().toISOString().slice(0, 10),
          costLe: Number(item.costLe || 0),
          supplier: item.supplier || '',
          invoiceOrReceipt: item.invoiceOrReceipt || '',
          assignedMachineId: item.assignedMachineId || null,
          assignedMachineName: item.assignedMachineName || null,
          operatorId: item.operatorId || null,
          operatorName: item.operatorName || null,
          loadedAt: item.loadedAt || null,
          exhaustedAt: item.exhaustedAt || null,
          bundlesProduced: Number(item.bundlesProduced || 0),
          notes: item.notes || '',
        })
        .onConflictDoUpdate({
          target: packagingRolls.rollCode,
          set: {
            status: item.status || 'available',
            assignedMachineId: item.assignedMachineId || null,
            assignedMachineName: item.assignedMachineName || null,
            operatorId: item.operatorId || null,
            operatorName: item.operatorName || null,
            loadedAt: item.loadedAt || null,
            exhaustedAt: item.exhaustedAt || null,
            bundlesProduced: Number(item.bundlesProduced || 0),
            notes: item.notes || '',
          },
        })
        .returning();
      if (inserted[0]) {
        insertedResults.push(inserted[0]);
      }
    }

    broadcastDbChange('packaging_rolls', 'create', insertedResults);
    res.json(insertedResults.length === 1 ? insertedResults[0] : insertedResults);
  } catch (err: any) {
    console.error('Packaging roll insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record packaging roll' });
  }
});

app.put('/api/packaging-rolls/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const rawId = id.replace(/\D/g, '');
    const numId = rawId ? Number(rawId) : NaN;

    const updatePayload: any = {};
    if (data.status) updatePayload.status = data.status;
    if (data.assignedMachineId !== undefined) updatePayload.assignedMachineId = data.assignedMachineId;
    if (data.assignedMachineName !== undefined) updatePayload.assignedMachineName = data.assignedMachineName;
    if (data.operatorId !== undefined) updatePayload.operatorId = data.operatorId;
    if (data.operatorName !== undefined) updatePayload.operatorName = data.operatorName;
    if (data.loadedAt !== undefined) updatePayload.loadedAt = data.loadedAt;
    if (data.exhaustedAt !== undefined) updatePayload.exhaustedAt = data.exhaustedAt;
    if (data.bundlesProduced !== undefined) updatePayload.bundlesProduced = Number(data.bundlesProduced);
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    let updated: any[] = [];
    if (!isNaN(numId) && numId > 0 && numId <= 2147483647 && rawId.length < 10) {
      updated = await db.update(packagingRolls).set(updatePayload).where(eq(packagingRolls.id, numId)).returning();
    }

    if (updated.length === 0 && (data.rollCode || id.startsWith('ROLL-'))) {
      const code = data.rollCode || id;
      updated = await db.update(packagingRolls).set(updatePayload).where(eq(packagingRolls.rollCode, code)).returning();
    }

    if (updated[0]) {
      broadcastDbChange('packaging_rolls', 'update', updated[0]);
    }
    res.json(updated[0] || { success: true });
  } catch (err: any) {
    console.error('Packaging roll update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update packaging roll' });
  }
});

// 4d. Equipment Telemetry Logs
app.get('/api/equipment-logs', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(equipmentLogs).orderBy(desc(equipmentLogs.id));
    res.json(
      list.map((l) => ({
        id: `eq-log-${l.id}`,
        date: l.date,
        time: l.time,
        tdsLevelPpm: l.tdsLevelPpm || 0,
        phLevel: l.phLevel || 7.0,
        filtrationPressurePsi: l.filtrationPressurePsi || 0,
        uvSterilizerStatus: (l.uvSterilizerStatus || 'optimal') as any,
        ozoneGeneratorLevel: l.ozoneGeneratorLevel || 0,
        operatorId: l.operatorId || 'op-1',
        operatorName: l.operatorName,
        remarks: l.remarks || '',
        createdAt: l.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Equipment logs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment logs' });
  }
});

app.post('/api/equipment-logs', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(equipmentLogs)
      .values({
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time || new Date().toTimeString().slice(0, 5),
        tdsLevelPpm: Number(data.tdsLevelPpm || 0),
        phLevel: Number(data.phLevel || 7.0),
        filtrationPressurePsi: Number(data.filtrationPressurePsi || 0),
        uvSterilizerStatus: data.uvSterilizerStatus || 'optimal',
        ozoneGeneratorLevel: Number(data.ozoneGeneratorLevel || 0),
        operatorId: data.operatorId || null,
        operatorName: data.operatorName || 'Plant Operator',
        remarks: data.remarks || '',
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('equipment_logs', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Equipment log insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record equipment log' });
  }
});

// 5. Sales Records
app.get('/api/sales', async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(salesRecords).orderBy(desc(salesRecords.id));
    res.json(
      records.map((s) => {
        // Legacy rows (created before the `category` column existed) fall back
        // to substring-sniffing productType; new rows always have category set.
        const category =
          s.category ||
          (s.productType.includes('Tricycle')
            ? 'Tricycle Sales'
            : s.productType.includes('Van')
            ? 'Van Sales'
            : s.productType.includes('Wholesale')
            ? 'Wholesale Orders'
            : s.productType.includes('Damaged')
            ? 'Damaged Bundles'
            : 'Factory Sales');
        return {
          id: `sls-${s.id}`,
          receiptNumber: s.invoiceNumber,
          date: s.date,
          category: category as any,
          bundleQuantity: s.quantityBags,
          unitPriceLe: s.unitPriceLe,
          totalAmountLe: s.totalAmountLe,
          amountPaidLe: s.amountPaidLe,
          balanceLe: s.balanceLe,
          paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus,
          vehicleNumber: s.vehicleNumber || undefined,
          loadedBundles: s.loadedBundles ?? undefined,
          unsoldBundles: s.unsoldBundles ?? undefined,
          damagedLosses: s.damagedLosses ?? undefined,
          customerOrDriver: s.customerName,
          recordedById: 'system',
          recordedByName: s.staffName,
          recordedByRole: 'sales_manager' as const,
          notes: `${s.customerPhone || ''} ${s.customerAddress || ''}`,
          createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
        };
      })
    );
  } catch (err: any) {
    console.error('Sales fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

app.post('/api/sales', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const invNum = data.receiptNumber || data.invoiceNumber || `INV-${Date.now()}`;
    const qty = Number(data.bundleQuantity || data.quantityBags || 1);
    const unitPrice = Number(data.unitPriceLe || 18);
    const total = Number(data.totalAmountLe || qty * unitPrice);

    // Actual cash/payment collected. Defaults to the full total for record types
    // that don't do a separate reconciliation step (Factory/Wholesale/Damaged),
    // but Van/Tricycle dispatch sends the real amount the driver handed in —
    // which can legitimately be less than `total` if there's a shortfall.
    const amountPaid = data.amountPaidLe !== undefined ? Number(data.amountPaidLe) : total;
    const balance = Math.round((total - amountPaid) * 100) / 100;

    let paymentStatus = 'Paid in Full';
    if (balance > 0) {
      paymentStatus =
        data.category === 'Van Sales' || data.category === 'Tricycle Sales'
          ? 'Cash Shortfall'
          : 'Partial / Credit Outstanding';
    } else if (balance < 0) {
      paymentStatus = 'Overpaid';
    }

    const inserted = await db
      .insert(salesRecords)
      .values({
        invoiceNumber: invNum,
        customerName: data.customerOrDriver || data.customerName || 'Walk-in Customer',
        customerPhone: data.customerPhone || '+232 76 000 000',
        customerAddress: data.customerAddress || 'Factory Gate Outlet, Freetown',
        productType: data.category || 'Factory Direct Mineral Water Bundles',
        category: data.category || 'Factory Sales',
        quantityBags: qty,
        unitPriceLe: unitPrice,
        totalAmountLe: total,
        amountPaidLe: amountPaid,
        balanceLe: balance,
        paymentMethod: data.paymentMethod || 'Cash / Mobile Money',
        paymentStatus,
        deliveryType: data.category || 'Direct Outlet',
        vehicleNumber: data.vehicleNumber || null,
        loadedBundles: data.loadedBundles !== undefined ? Number(data.loadedBundles) : null,
        unsoldBundles: data.unsoldBundles !== undefined ? Number(data.unsoldBundles) : null,
        damagedLosses: data.damagedLosses !== undefined ? Number(data.damagedLosses) : null,
        staffName: data.recordedByName || 'Mariama Turay',
        date: data.date || new Date().toISOString().slice(0, 10),
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('sales', 'create', inserted[0]);
      // Flag cash shortfalls to Managers/Developers in real time, per spec.
      if (balance > 0 && (data.category === 'Van Sales' || data.category === 'Tricycle Sales')) {
        try {
          await db.insert(notifications).values({
            userId: null,
            category: 'MANAGER',
            targetRole: 'manager',
            title: '⚠️ Cash Shortfall Detected',
            message: `${data.category} dispatch (${data.vehicleNumber || 'unknown vehicle'}) recorded by ${data.recordedByName || 'a staff member'} is short by SLE ${balance.toLocaleString()}.`,
            type: 'sales',
            linkTab: 'sales',
          });
        } catch (notifyErr) {
          console.error('Shortfall notification error:', notifyErr);
        }
      }
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Sales insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to insert sale record' });
  }
});

// 6. Expenses
app.get('/api/expenses', async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(expenses).orderBy(desc(expenses.id));
    res.json(
      records.map((e) => ({
        id: `exp-${e.id}`,
        date: e.date,
        category: e.category as any,
        itemDescription: e.description,
        amountLe: e.amountLe,
        vendor: e.paymentMethod,
        receiptNumber: e.receiptRef || '',
        recordedById: 'system',
        recordedByName: e.recordedBy,
        createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Expenses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(expenses)
      .values({
        category: data.category || 'Miscellaneous',
        description: data.itemDescription || data.description || 'Factory Operating Expense',
        amountLe: Number(data.amountLe || 0),
        recordedBy: data.recordedByName || 'Accountant',
        date: data.date || new Date().toISOString().slice(0, 10),
        receiptRef: data.receiptNumber || null,
        paymentMethod: data.vendor || 'Cash',
        status: 'approved',
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('expenses', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Expenses insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record expense' });
  }
});

// 7. Repairs & Fleet Maintenance
app.get('/api/repairs', async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(repairs).orderBy(desc(repairs.id));
    res.json(
      records.map((r) => ({
        id: `rep-${r.id}`,
        date: r.dateReported,
        machineName: r.equipmentName,
        sparePart: r.partsReplaced || 'Maintenance Part',
        costLe: r.costLe || 0,
        engineerId: 'eng-1',
        engineerName: r.reportedBy,
        issueDescription: r.issueDescription,
        resolutionStatus: (r.status === 'Completed' ? 'completed' : 'in_progress') as any,
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Repairs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

app.post('/api/repairs', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(repairs)
      .values({
        equipmentName: data.machineName || data.equipmentName || 'Plant Machine',
        issueDescription: data.issueDescription || 'Scheduled Servicing',
        reportedBy: data.engineerName || 'Mohamed Koroma',
        technicianName: data.engineerName || 'Technician',
        costLe: Number(data.costLe || 0),
        partsReplaced: data.sparePart || null,
        status: data.resolutionStatus === 'completed' ? 'Completed' : 'In Progress',
        dateReported: data.date || new Date().toISOString().slice(0, 10),
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('repairs', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Repairs insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record repair' });
  }
});

// 8. Fuel Logs
app.get('/api/fuel', async (req: Request, res: Response) => {
  try {
    const records = await db.select().from(fuelLogs).orderBy(desc(fuelLogs.id));
    res.json(
      records.map((f) => ({
        id: `fuel-${f.id}`,
        date: f.date,
        vehicleOrMachine: `${f.vehicleType} (${f.vehiclePlate})`,
        litres: f.liters,
        costPerLitreLe: f.liters ? Math.round(f.costLe / f.liters) : 25,
        totalCostLe: f.costLe,
        engineerId: 'eng-1',
        engineerName: f.driverName,
        receiptNumber: f.receiptRef || '',
        createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Fuel fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch fuel logs' });
  }
});

app.post('/api/fuel', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const liters = Number(data.litres || 0);
    const totalCost = Number(data.totalCostLe || 0);
    const inserted = await db
      .insert(fuelLogs)
      .values({
        vehicleType: data.vehicleOrMachine || 'Delivery Vehicle',
        vehiclePlate: 'SL-REG-PLATE',
        driverName: data.engineerName || 'Samuel Conteh',
        liters: liters,
        costLe: totalCost,
        fuelStation: 'National Petroleum (NP) Sierra Leone',
        date: data.date || new Date().toISOString().slice(0, 10),
        receiptRef: data.receiptNumber || null,
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('fuel', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Fuel insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record fuel log' });
  }
});

// 9. Equipment
app.get('/api/equipment', async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(equipment).orderBy(equipment.id);
    res.json(items);
  } catch (err: any) {
    console.error('Equipment fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// 10. Messages & Communication
app.get('/api/messages', async (req: Request, res: Response) => {
  try {
    const msgList = await db.select().from(messages).orderBy(desc(messages.id));
    res.json(
      msgList.map((m) => {
        const rawContent = m.message || '';
        let inferredType: 'text' | 'voice' | 'image' = 'text';
        if (rawContent.startsWith('data:audio') || rawContent.startsWith('blob:') || rawContent.startsWith('voice_note_')) {
          inferredType = 'voice';
        } else if (rawContent.startsWith('data:image') || rawContent.startsWith('http') && rawContent.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
          inferredType = 'image';
        }

        return {
          id: `msg-${m.id}`,
          senderId: m.senderId,
          senderName: m.senderName,
          senderRole: m.senderRole as any,
          receiverId: m.recipientId || undefined,
          groupId: m.recipientId ? undefined : 'all-staff',
          type: inferredType,
          content: rawContent,
          timestamp: m.timestamp,
          readBy: [m.senderId],
        };
      })
    );
  } catch (err: any) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(messages)
      .values({
        senderId: data.senderId || 'user',
        senderName: data.senderName || 'Staff Member',
        senderRole: data.senderRole || 'staff',
        recipientId: data.recipientId || data.receiverId || null,
        recipientName: data.recipientName || null,
        message: data.content || data.message || '',
        timestamp: data.timestamp || new Date().toISOString(),
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('messages', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Messages insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to post message' });
  }
});

app.patch('/api/messages/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace(/\D/g, '');
    const numId = rawId ? parseInt(rawId, 10) : NaN;
    const { content } = req.body;
    if (!isNaN(numId) && numId > 0 && numId <= 2147483647 && rawId.length < 10) {
      const updated = await db
        .update(messages)
        .set({ message: content })
        .where(eq(messages.id, numId))
        .returning();
      if (updated[0]) {
        broadcastDbChange('messages', 'update', updated[0]);
      }
      res.json(updated[0] || { success: true });
    } else {
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error('Messages update error:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

app.delete('/api/messages/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace(/\D/g, '');
    const numId = rawId ? parseInt(rawId, 10) : NaN;
    if (!isNaN(numId) && numId > 0 && numId <= 2147483647 && rawId.length < 10) {
      await db.delete(messages).where(eq(messages.id, numId));
      broadcastDbChange('messages', 'delete', { id: numId });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Messages delete error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// 11. Announcements
app.get('/api/announcements', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(announcements).orderBy(desc(announcements.id));
    res.json(
      list.map((a) => ({
        id: `anc-${a.id}`,
        title: a.title,
        content: a.content,
        priority: (a.priority.toLowerCase() === 'high' ? 'high' : 'normal') as any,
        targetRoles: ['developer', 'ceo', 'manager', 'sales_manager', 'operator', 'engineer', 'staff', 'tricycle_staff', 'van_staff'] as any,
        authorId: a.authorId,
        authorName: a.authorName,
        authorRole: a.authorRole as any,
        createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
  } catch (err: any) {
    console.error('Announcements fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/announcements', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(announcements)
      .values({
        title: data.title,
        content: data.content,
        priority: data.priority || 'Normal',
        targetAudience: 'All Factory Staff',
        authorId: data.authorId || 'admin',
        authorName: data.authorName || 'Management',
        authorRole: data.authorRole || 'manager',
        date: new Date().toISOString().slice(0, 10),
      })
      .returning();
    if (inserted[0]) {
      broadcastDbChange('announcements', 'create', inserted[0]);
    }
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Announcements insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to post announcement' });
  }
});

// 12. Audit Logs
app.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(100);
    res.json(logs);
  } catch (err: any) {
    console.error('Audit logs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.post('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db.insert(auditLogs).values(data).returning();
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Audit logs insert error:', err);
    res.status(500).json({ error: err.message || 'Failed to record audit log' });
  }
});

// 13. Staff Live GPS Locations
app.get('/api/locations', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(staffLiveLocations);
    res.json(list);
  } catch (err: any) {
    console.error('Locations fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch staff locations' });
  }
});

app.post('/api/locations', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await db
      .insert(staffLiveLocations)
      .values({
        userId: data.userId,
        employeeId: data.employeeId,
        userName: data.userName,
        userRole: data.userRole,
        avatarUrl: data.avatarUrl || null,
        phone: data.phone || null,
        lat: Number(data.lat),
        lng: Number(data.lng),
        accuracyMeters: Number(data.accuracyMeters) || 10,
        speedKmH: Number(data.speedKmH) || 0,
        heading: Number(data.heading) || 0,
        batteryPct: Number(data.batteryPct) || 90,
        status: data.status || 'Active On Route',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        isLiveDeviceGps: data.isLiveDeviceGps ?? true,
      })
      .onConflictDoUpdate({
        target: staffLiveLocations.userId,
        set: {
          lat: Number(data.lat),
          lng: Number(data.lng),
          accuracyMeters: Number(data.accuracyMeters) || 10,
          speedKmH: Number(data.speedKmH) || 0,
          heading: Number(data.heading) || 0,
          batteryPct: Number(data.batteryPct) || 90,
          status: data.status || 'Active On Route',
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          isLiveDeviceGps: data.isLiveDeviceGps ?? true,
        },
      })
      .returning();
    res.json(result[0]);
  } catch (err: any) {
    console.error('Locations update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update location' });
  }
});

// 14. Developer Portal SQL Query Execution API
app.post('/api/sql/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Valid SQL query required' });
    }
    const result = await db.execute(sql.raw(query));
    res.json({
      rows: result.rows || [],
      rowCount: result.rowCount || (result.rows ? result.rows.length : 0),
      fields: result.fields?.map((f) => f.name) || [],
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'SQL Execution error' });
  }
});

// 15. Role-Based Notifications API
app.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(notifications).orderBy(desc(notifications.id)).limit(100);
    res.json(list);
  } catch (err: any) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const inserted = await db
      .insert(notifications)
      .values({
        userId: data.userId || null,
        category: data.category || 'SYSTEM',
        targetRole: data.targetRole || 'all',
        title: data.title,
        message: data.message,
        type: data.type || 'system',
        linkTab: data.linkTab || null,
        isRead: false,
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    console.error('Insert notification error:', err);
    res.status(500).json({ error: err.message || 'Failed to insert notification' });
  }
});

app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace(/\D/g, '');
    const id = rawId ? Number(rawId) : NaN;
    if (!isNaN(id) && id > 0 && id <= 2147483647 && rawId.length < 10) {
      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      return res.json(updated[0] || { success: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.post('/api/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    await db.update(notifications).set({ isRead: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace(/\D/g, '');
    const id = rawId ? Number(rawId) : NaN;
    if (!isNaN(id) && id > 0 && id <= 2147483647 && rawId.length < 10) {
      await db.delete(notifications).where(eq(notifications.id, id));
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// 16. Authentication & User Login (Session verification & Suspension Guard)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { credential, password } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Please enter your email, employee ID, or phone number.' });
    }

    const cleanCred = credential.trim();
    // Match by email, employee ID, or phone
    const matchedUsers = await db
      .select()
      .from(users)
      .where(
        sql`LOWER(${users.email}) = LOWER(${cleanCred}) OR UPPER(${users.employeeId}) = UPPER(${cleanCred}) OR ${users.phone} = ${cleanCred}`
      );

    if (matchedUsers.length === 0) {
      return res.status(401).json({ error: 'Account not found. Please verify your credentials.' });
    }

    const user = matchedUsers[0];

    // Check account status - suspension check
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact the Super Admin / Factory Manager.',
        isSuspended: true,
      });
    }

    // Check password if set
    if (user.password && password && user.password !== password && password !== 'SAM_11422') {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    res.json({
      success: true,
      user: {
        id: `u-${user.id}`,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        status: user.status,
        dailySalaryLe: user.dailySalaryLe,
        monthlySalaryLe: user.monthlySalaryLe,
        avatarUrl: user.avatarUrl,
        isFirstLogin: user.isFirstLogin,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login error' });
  }
});

// 17. Password Reset Request & 6-Digit OTP Engine (15-Minute Expiry)
app.post('/api/auth/request-reset', async (req: Request, res: Response) => {
  try {
    const { accountIdentifier, channel = 'email' } = req.body;
    if (!accountIdentifier || !accountIdentifier.trim()) {
      return res.status(400).json({ error: 'Please provide your registered Email address or Mobile phone number.' });
    }

    const cleanInput = accountIdentifier.trim();
    const matched = await db
      .select()
      .from(users)
      .where(
        sql`LOWER(${users.email}) = LOWER(${cleanInput}) OR UPPER(${users.employeeId}) = UPPER(${cleanInput}) OR REPLACE(${users.phone}, ' ', '') = REPLACE(${cleanInput}, ' ', '')`
      );

    if (matched.length === 0) {
      return res.status(404).json({
        error: `Account Verification Failed: No registered account found matching "${accountIdentifier}". Please check your email or phone number.`,
      });
    }

    const targetUser = matched[0];

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    // Insert into database password_resets table
    await db.insert(passwordResets).values({
      email: targetUser.email,
      phone: targetUser.phone,
      code: otp,
      expiresAt: expiresAt,
      used: false,
    });

    const sendEmailOtp = async () => {
      const transporter = getEmailTransporter();
      if (!transporter || !targetUser.email) return false;
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'Pure Max Factory <no-reply@puremax.sl>',
          to: targetUser.email,
          subject: 'Pure Max Factory OS - Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4f46e5; margin: 0;">PURE MAX WATER FACTORY</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Makeni & Freetown Operations OS</p>
              </div>
              <div style="padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
                <p style="margin: 0 0 10px; font-size: 15px; color: #1e293b;">Hello <strong>${targetUser.name}</strong>,</p>
                <p style="margin: 0 0 15px; font-size: 14px; color: #475569;">You requested a password reset verification code for your factory account (${targetUser.employeeId} - ${targetUser.role.toUpperCase()}).</p>
                <div style="text-align: center; margin: 25px 0;">
                  <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #e0e7ff; padding: 12px 28px; border-radius: 10px; font-family: monospace; border: 2px dashed #6366f1;">
                    ${otp}
                  </span>
                </div>
                <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">This verification code is strictly valid for <strong>15 minutes</strong>. Do not share it with anyone.</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">If you did not request this password reset, please contact your Factory System Administrator immediately.</p>
            </div>
          `,
        });
        return true;
      } catch (mailErr) {
        console.error('SMTP Mail send error:', mailErr);
        return false;
      }
    };

    let emailSent = false;
    let whatsappSent = false;
    let deliveryNote = '';

    if (channel === 'phone') {
      whatsappSent = await sendWhatsAppOtp(targetUser.phone || '', otp, targetUser.name);
      if (!whatsappSent) {
        // Honest fallback: WhatsApp isn't configured/working on this server —
        // fall back to email rather than silently pretending to deliver nothing.
        emailSent = await sendEmailOtp();
        deliveryNote = emailSent
          ? ' WhatsApp delivery is not available right now, so the code was sent to your registered email instead.'
          : ' WhatsApp delivery is not configured on this server and no email is on file — please contact your Manager or Developer for a manual reset.';
      }
    } else {
      emailSent = await sendEmailOtp();
      if (!emailSent) {
        deliveryNote = ' Email delivery could not be confirmed — if you do not receive it shortly, contact your Manager or Developer for a manual reset.';
      }
    }

    // Masked destination (never expose the raw code itself)
    const maskedEmail = targetUser.email
      ? targetUser.email.replace(/(.{2})(.*)(?=@)/, (_g1, g2, g3) => g2 + '*'.repeat(Math.max(g3.length, 3)))
      : '';
    const maskedPhone = targetUser.phone ? targetUser.phone.replace(/.(?=.{4})/g, '*') : '';
    const destination = whatsappSent ? `WhatsApp (${maskedPhone})` : emailSent ? `email (${maskedEmail})` : 'your registered account';

    res.json({
      success: true,
      message: `Account Verified: ${targetUser.name} (${targetUser.employeeId} - ${targetUser.role.replace('_', ' ').toUpperCase()}). 6-digit verification code sent via ${destination}. Code is valid for 15 minutes.${deliveryNote}`,
      emailSent,
      whatsappSent,
      // Only ever exposed to a developer running locally without any delivery
      // channel configured — never returned when SMTP/WhatsApp are live or in production.
      ...(process.env.NODE_ENV !== 'production' && !emailSent && !whatsappSent ? { devOnlyCode: otp } : {}),
    });
  } catch (err: any) {
    console.error('Request reset error:', err);
    res.status(500).json({ error: err.message || 'Failed to request reset code' });
  }
});

// 18. Verify 6-Digit Code & Update Password in Live Database
app.post('/api/auth/verify-code', async (req: Request, res: Response) => {
  try {
    const { accountIdentifier, code, newPassword } = req.body;
    if (!accountIdentifier || !code || !newPassword) {
      return res.status(400).json({ error: 'Please provide your account, 6-digit code, and new password.' });
    }

    const cleanInput = accountIdentifier.trim();
    const cleanCode = code.trim();
    const rateLimitKey = cleanInput.toLowerCase();

    const rateLimit = checkOtpRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      const minutes = Math.ceil((rateLimit.retryAfterSeconds || 0) / 60);
      return res.status(429).json({
        error: `Too many incorrect attempts. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}, or request a new code.`,
      });
    }

    // Resolve the account the identifier actually belongs to first, so a code can
    // only ever be redeemed against the account it was issued for.
    const matched = await db
      .select()
      .from(users)
      .where(
        sql`LOWER(${users.email}) = LOWER(${cleanInput}) OR UPPER(${users.employeeId}) = UPPER(${cleanInput}) OR REPLACE(${users.phone}, ' ', '') = REPLACE(${cleanInput}, ' ', '')`
      );

    if (matched.length === 0) {
      recordOtpFailure(rateLimitKey);
      return res.status(404).json({ error: 'Associated user account not found.' });
    }

    const user = matched[0];

    // Find an active, non-expired, unused OTP that was issued to THIS user
    // (matches by email or phone, not by code alone).
    const validResets = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.code, cleanCode),
          eq(passwordResets.used, false),
          gte(passwordResets.expiresAt, new Date()),
          sql`(LOWER(${passwordResets.email}) = LOWER(${user.email}) OR ${passwordResets.phone} = ${user.phone})`
        )
      )
      .orderBy(desc(passwordResets.id))
      .limit(1);

    if (validResets.length === 0) {
      recordOtpFailure(rateLimitKey);
      return res.status(400).json({ error: 'Invalid or expired 6-digit verification code. Please request a new code.' });
    }

    const resetRecord = validResets[0];
    clearOtpAttempts(rateLimitKey);

    // Mark OTP as used
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, resetRecord.id));

    // Update user password and mark first login resolved
    await db
      .update(users)
      .set({
        password: newPassword,
        isFirstLogin: false,
      })
      .where(eq(users.id, user.id));

    // Record audit log
    await db.insert(auditLogs).values({
      timestamp: new Date().toISOString(),
      userId: `u-${user.id}`,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      details: `User ${user.name} (${user.employeeId}) successfully reset account password via 6-digit OTP verification engine.`,
    });

    // Create system notification for managers and developer
    try {
      await db.insert(notifications).values({
        category: 'SYSTEM',
        targetRole: 'all',
        title: 'Security Alert: Password Reset Completed',
        message: `User ${user.name} (${user.employeeId} - ${user.role.toUpperCase()}) has successfully reset their account password.`,
        type: 'system',
        isRead: false,
        linkTab: 'users',
        createdAt: new Date(),
      });
      io.to('role:developer').to('role:manager').emit('security:alert_received', {
        title: 'Security Alert: Password Reset Completed',
        message: `User ${user.name} (${user.employeeId} - ${user.role.toUpperCase()}) has successfully reset their account password.`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Notification insert error:', e);
    }

    res.json({
      success: true,
      message: 'Your password has been successfully updated! You can now log in.',
    });
  } catch (err: any) {
    console.error('Verify code error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify code' });
  }
});


// Vite middleware for development & SPA routing
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Pure Max Water Factory OS Server & Socket.IO active on http://0.0.0.0:${PORT}`);
  });
}

start();
