// server.mjs — Enhanced with timezone validation and conversion support + Bot API Endpoint
// Builds on existing server with timezone awareness and dedicated bot authentication

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// TIMEZONE: Server timezone configuration
const SERVER_TIMEZONE = process.env.SERVER_TIMEZONE || 'America/New_York'; // EST/EDT

// TIMEZONE: Timezone utility functions
const timezoneUtils = {
  // Validate timezone string
  isValidTimezone(tz) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Convert date to server timezone
  toServerTimezone(date, fromTimezone = null) {
    try {
      const dateObj = new Date(date);
      if (fromTimezone && this.isValidTimezone(fromTimezone)) {
        // Convert from specific timezone to server timezone
        return new Date(dateObj.toLocaleString('en-US', { timeZone: SERVER_TIMEZONE }));
      }
      return dateObj;
    } catch (e) {
      console.warn('[server] Error converting to server timezone:', e);
      return new Date(date);
    }
  },
  
  // Format date for database storage (always in server timezone)
  formatForDB(date) {
    try {
      const serverDate = this.toServerTimezone(date);
      return serverDate.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (e) {
      console.warn('[server] Error formatting date for DB:', e);
      return new Date().toISOString().split('T')[0];
    }
  },
  
  // Validate date string
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },
  
  // Get timezone abbreviation
  getTimezoneAbbr(timezone) {
    try {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      return timeZonePart ? timeZonePart.value : timezone;
    } catch (e) {
      return timezone;
    }
  }
};

console.log(`[server] Server timezone configured: ${SERVER_TIMEZONE} (${timezoneUtils.getTimezoneAbbr(SERVER_TIMEZONE)})`);

// FIXED: Database Connection with correct field name
const db = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  // TIMEZONE: Configure MySQL timezone
  timezone: '+00:00' // Store everything in UTC, convert in application
});

// Test database connection
try {
  const connection = await db.getConnection();
  console.log('✅ Database connected successfully');
  
  // TIMEZONE: Set MySQL session timezone
  await connection.execute(`SET time_zone = '+00:00'`);
  console.log('✅ Database timezone set to UTC');
  
  connection.release();
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// TIMEZONE: Middleware to log timezone info from requests
app.use((req, res, next) => {
  // Extract timezone from client if provided
  const clientTimezone = req.headers['x-timezone'] || req.body?.timezone || req.query?.timezone;
  
  if (clientTimezone && timezoneUtils.isValidTimezone(clientTimezone)) {
    req.clientTimezone = clientTimezone;
    console.log(`[server] Request from timezone: ${clientTimezone} (${timezoneUtils.getTimezoneAbbr(clientTimezone)})`);
  }
  
  next();
});

// FIXED: Auth Strategy with proper error handling
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('[AUTH] Discord user authenticating:', profile.username);
    await db.execute(
      `INSERT INTO users (id, username, global_name, avatar)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         global_name = VALUES(global_name),
         avatar = VALUES(avatar)`,
      [profile.id, profile.username, profile.global_name, profile.avatar]
    );
    console.log('[AUTH] User upserted successfully');
    return done(null, profile);
  } catch (err) {
    console.error('[AUTH] Database error during authentication:', err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser(async (user, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [user.id]);
    if (rows.length === 0) return done(null, false);
    return done(null, rows[0]);
  } catch (err) {
    console.error('[AUTH] Error deserializing user:', err);
    return done(err, null);
  }
});

// MIDDLEWARE: Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// MIDDLEWARE: Check if user is admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.is_admin === 1) {
    return next();
  }
  res.status(403).json({ error: 'Admin privileges required' });
}

// NEW: MIDDLEWARE: Validate bot secret
function validateBotSecret(req, res, next) {
  const botSecret = req.headers['x-bot-secret'];
  
  if (!process.env.BOT_API_SECRET) {
    console.error('[BOT] BOT_API_SECRET not configured in environment');
    return res.status(500).json({ error: 'Bot authentication not configured' });
  }
  
  if (!botSecret) {
    console.warn('[BOT] Bot request missing x-bot-secret header');
    return res.status(401).json({ error: 'Bot secret required' });
  }
  
  if (botSecret !== process.env.BOT_API_SECRET) {
    console.warn('[BOT] Invalid bot secret provided');
    return res.status(401).json({ error: 'Invalid bot secret' });
  }
  
  console.log('[BOT] Bot authenticated successfully');
  next();
}

// TIMEZONE: Middleware to validate and process timezone data
function processTimezoneData(req, res, next) {
  const { date, timezone } = req.body;
  
  // Validate timezone if provided
  if (timezone && !timezoneUtils.isValidTimezone(timezone)) {
    return res.status(400).json({ 
      error: 'Invalid timezone',
      providedTimezone: timezone,
      serverTimezone: SERVER_TIMEZONE
    });
  }
  
  // Process date with timezone conversion
  if (date) {
    if (!timezoneUtils.isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Convert to server timezone and store in request
    req.serverDate = timezoneUtils.formatForDB(date);
    req.originalDate = date;
    req.sourceTimezone = timezone || req.clientTimezone || 'UTC';
    
    console.log(`[server] Date conversion: ${date} (${req.sourceTimezone}) -> ${req.serverDate} (${SERVER_TIMEZONE})`);
  }
  
  next();
}

// ===== AUTHENTICATION ROUTES =====

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    console.log('[AUTH] User logged in successfully:', req.user.username);
    res.redirect('/');
  }
);

// FIXED: Proper logout implementation
app.get('/logout', (req, res) => {
  console.log('[AUTH] User logging out');
  req.logout((err) => {
    if (err) {
      console.error('[AUTH] Logout error:', err);
      return res.redirect('/');
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('[AUTH] Session destroy error:', err);
        return res.redirect('/');
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      res.redirect('/');
    });
  });
});

// ===== BOT API ROUTES (NEW) =====

// NEW: Bot-only callout endpoint - NO USER AUTHENTICATION REQUIRED
app.post('/api/bot/callouts', validateBotSecret, async (req, res) => {
  const { user, status, reason, date, delay } = req.body;
  
  try {
    console.log('[BOT] Processing callout from Discord bot:', { user, status, date, reason, delay });
    
    // Validate required fields
    if (!user || !status || !date) {
      console.warn('[BOT] Missing required fields:', { user, status, date });
      return res.status(400).json({ error: 'Missing required fields: user, status, date' });
    }
    
    // Validate status
    if (!['LATE', 'OUT'].includes(status.toUpperCase())) {
      console.warn('[BOT] Invalid status:', status);
      return res.status(400).json({ error: 'Status must be LATE or OUT' });
    }
    
    // Validate date format (should be YYYY-MM-DD from AI parsing)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.warn('[BOT] Invalid date format:', date);
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }
    
    // TIMEZONE: Convert date to server timezone for storage
    const serverDate = timezoneUtils.formatForDB(date);
    
    // Check if date is not in the past (server timezone)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: SERVER_TIMEZONE });
    if (serverDate < today) {
      console.warn('[BOT] Attempt to create callout for past date:', { serverDate, today });
      return res.status(400).json({ 
        error: 'Cannot create callouts for past dates',
        providedDate: date,
        serverDate,
        serverTimezone: SERVER_TIMEZONE
      });
    }
    
    // Insert into database - using 'bot' as the did (Discord ID) since we don't have user auth
    const [result] = await db.execute(
      'INSERT INTO callouts (user, status, reason, delay_minutes, date, did, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [user, status.toUpperCase(), reason || null, delay || null, serverDate, 'bot']
    );
    
    console.log('[BOT] Callout created successfully:', {
      id: result.insertId,
      user,
      status: status.toUpperCase(),
      serverDate,
      reason: reason || 'None',
      delay: delay || 'N/A'
    });
    
    res.json({ 
      success: true, 
      id: result.insertId,
      message: `Callout logged for ${user}: ${status.toUpperCase()} on ${serverDate}`,
      serverTimezone: SERVER_TIMEZONE
    });
    
  } catch (err) {
    console.error('[BOT] Error creating callout:', err);
    res.status(500).json({ error: 'Failed to create callout' });
  }
});

// NEW: Bot health check endpoint
app.get('/api/bot/health', validateBotSecret, (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    serverTimezone: SERVER_TIMEZONE,
    message: 'Bot API is operational'
  });
});

// ===== TIMEZONE API ROUTES =====

// GET server timezone info
app.get('/api/timezone/info', (req, res) => {
  res.json({
    serverTimezone: SERVER_TIMEZONE,
    serverAbbr: timezoneUtils.getTimezoneAbbr(SERVER_TIMEZONE),
    currentServerTime: new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE }),
    utcTime: new Date().toISOString(),
    supportedOperations: ['conversion', 'validation', 'formatting']
  });
});

// POST validate timezone
app.post('/api/timezone/validate', (req, res) => {
  const { timezone } = req.body;
  
  if (!timezone) {
    return res.status(400).json({ error: 'Timezone parameter required' });
  }
  
  const isValid = timezoneUtils.isValidTimezone(timezone);
  
  res.json({
    timezone,
    valid: isValid,
    abbreviation: isValid ? timezoneUtils.getTimezoneAbbr(timezone) : null,
    serverTimezone: SERVER_TIMEZONE
  });
});

// POST convert date between timezones
app.post('/api/timezone/convert', (req, res) => {
  const { date, fromTimezone, toTimezone } = req.body;
  
  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }
  
  if (!timezoneUtils.isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  
  if (fromTimezone && !timezoneUtils.isValidTimezone(fromTimezone)) {
    return res.status(400).json({ error: 'Invalid source timezone' });
  }
  
  if (toTimezone && !timezoneUtils.isValidTimezone(toTimezone)) {
    return res.status(400).json({ error: 'Invalid target timezone' });
  }
  
  try {
    const sourceDate = new Date(date);
    const targetTimezone = toTimezone || SERVER_TIMEZONE;
    
    const convertedDate = sourceDate.toLocaleString('en-US', { 
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    res.json({
      originalDate: date,
      fromTimezone: fromTimezone || 'UTC',
      toTimezone: targetTimezone,
      convertedDate,
      serverTimezone: SERVER_TIMEZONE
    });
  } catch (error) {
    console.error('[server] Timezone conversion error:', error);
    res.status(500).json({ error: 'Timezone conversion failed' });
  }
});

// ===== USER API ROUTES =====

// TIMEZONE: Enhanced user info with timezone context
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      ...req.user,
      isAdmin: req.user.is_admin === 1,
      // TIMEZONE: Add server timezone info
      serverTimezone: SERVER_TIMEZONE,
      serverAbbr: timezoneUtils.getTimezoneAbbr(SERVER_TIMEZONE),
      currentServerTime: new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE })
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// ===== CALLOUT API ROUTES =====

// TIMEZONE: Enhanced GET all callouts with timezone context
app.get('/api/callouts', async (req, res) => {
  try {
    console.log('[API] Fetching all callouts with timezone info');
    const [rows] = await db.query(
      'SELECT *, DATE_FORMAT(timestamp, "%Y-%m-%d %H:%i:%s") as formatted_timestamp FROM callouts ORDER BY date DESC, timestamp DESC'
    );
    
    // Add timezone context to response
    const calloutsWithTimezone = rows.map(callout => ({
      ...callout,
      serverTimezone: SERVER_TIMEZONE,
      // Keep original date (server timezone)
      originalDate: callout.date
    }));
    
    console.log(`[API] Retrieved ${rows.length} callouts with timezone context`);
    res.json(calloutsWithTimezone);
  } catch (err) {
    console.error('[API] Error fetching callouts:', err);
    res.status(500).json({ error: 'Failed to fetch callouts' });
  }
});

// TIMEZONE: Enhanced POST new callout with timezone processing
app.post('/api/callouts', isAuthenticated, processTimezoneData, async (req, res) => {
  const { user, status, reason, delay } = req.body;
  const did = req.user?.id || 'anonymous';
  
  // Use processed server date from middleware
  const serverDate = req.serverDate;
  
  try {
    console.log('[API] Creating new callout with timezone processing:', { 
      user, 
      status, 
      originalDate: req.originalDate,
      serverDate,
      sourceTimezone: req.sourceTimezone
    });
    
    // Validate required fields
    if (!user || !status || !serverDate) {
      return res.status(400).json({ error: 'Missing required fields: user, status, date' });
    }
    
    if (!['LATE', 'OUT'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be LATE or OUT' });
    }
    
    // TIMEZONE: Validate date is not in the past (server timezone)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: SERVER_TIMEZONE });
    if (serverDate < today) {
      return res.status(400).json({ 
        error: 'Cannot create callouts for past dates',
        serverDate,
        serverTimezone: SERVER_TIMEZONE
      });
    }
    
    const [result] = await db.execute(
      'INSERT INTO callouts (user, status, reason, delay_minutes, date, did, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [user, status.toUpperCase(), reason || null, delay || null, serverDate, did]
    );
    
    console.log('[API] Callout created with timezone conversion:', {
      id: result.insertId,
      originalDate: req.originalDate,
      serverDate,
      sourceTimezone: req.sourceTimezone,
      serverTimezone: SERVER_TIMEZONE
    });
    
    res.json({ 
      success: true, 
      id: result.insertId,
      dateProcessing: {
        originalDate: req.originalDate,
        serverDate,
        sourceTimezone: req.sourceTimezone,
        serverTimezone: SERVER_TIMEZONE
      }
    });
  } catch (err) {
    console.error('[API] Error creating callout:', err);
    res.status(500).json({ error: 'Failed to create callout' });
  }
});

// TIMEZONE: Enhanced PUT update callout with timezone processing
app.put('/api/callouts/:id', isAuthenticated, processTimezoneData, async (req, res) => {
  const { status, reason, delay } = req.body;
  const { id } = req.params;
  const userId = req.user.id;
  const isUserAdmin = req.user.is_admin === 1;
  
  // Use processed server date from middleware
  const serverDate = req.serverDate;
  
  try {
    console.log('[API] Updating callout with timezone processing:', {
      id,
      originalDate: req.originalDate,
      serverDate,
      sourceTimezone: req.sourceTimezone
    });
    
    // Check if user owns this callout or is admin
    const [existing] = await db.query('SELECT * FROM callouts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Callout not found' });
    }
    
    if (!isUserAdmin && existing[0].did !== userId) {
      return res.status(403).json({ error: 'You can only edit your own callouts' });
    }
    
    // Validate status
    if (status && !['LATE', 'OUT'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Status must be LATE or OUT' });
    }
    
    // TIMEZONE: Validate date is not in the past if being updated
    if (serverDate) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: SERVER_TIMEZONE });
      if (serverDate < today) {
        return res.status(400).json({ 
          error: 'Cannot update to past dates',
          serverDate,
          serverTimezone: SERVER_TIMEZONE
        });
      }
    }
    
    await db.execute(
      'UPDATE callouts SET status = ?, reason = ?, delay_minutes = ?, date = ?, last_updated = NOW() WHERE id = ?',
      [
        status?.toUpperCase() || existing[0].status, 
        reason !== undefined ? reason : existing[0].reason, 
        delay !== undefined ? delay : existing[0].delay_minutes, 
        serverDate || existing[0].date, 
        id
      ]
    );
    
    console.log('[API] Callout updated successfully with timezone conversion');
    res.json({ 
      success: true,
      dateProcessing: serverDate ? {
        originalDate: req.originalDate,
        serverDate,
        sourceTimezone: req.sourceTimezone,
        serverTimezone: SERVER_TIMEZONE
      } : null
    });
  } catch (err) {
    console.error('[API] Error updating callout:', err);
    res.status(500).json({ error: 'Failed to update callout' });
  }
});

// DELETE callout (unchanged but with timezone logging)
app.delete('/api/callouts/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isUserAdmin = req.user.is_admin === 1;
  
  try {
    console.log('[API] Deleting callout:', id);
    
    // Check if user owns this callout or is admin
    const [existing] = await db.query('SELECT * FROM callouts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Callout not found' });
    }
    
    if (!isUserAdmin && existing[0].did !== userId) {
      return res.status(403).json({ error: 'You can only delete your own callouts' });
    }
    
    // TIMEZONE: Log deletion with timezone context
    const deletionTime = new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE });
    console.log(`[API] Callout ${id} deleted at ${deletionTime} (${SERVER_TIMEZONE})`);
    
    await db.execute('DELETE FROM callouts WHERE id = ?', [id]);
    
    console.log('[API] Callout deleted successfully');
    res.json({ 
      success: true,
      deletedAt: deletionTime,
      serverTimezone: SERVER_TIMEZONE
    });
  } catch (err) {
    console.error('[API] Error deleting callout:', err);
    res.status(500).json({ error: 'Failed to delete callout' });
  }
});

// ===== ADMIN API ROUTES (Enhanced with timezone context) =====

// GET all users (admin only) - with timezone context
app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Fetching all users with timezone context');
    const [rows] = await db.query(
      'SELECT id, username, global_name, avatar, is_admin FROM users ORDER BY username'
    );
    console.log(`[ADMIN] Retrieved ${rows.length} users`);
    res.json({
      users: rows,
      serverTimezone: SERVER_TIMEZONE,
      retrievedAt: new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE })
    });
  } catch (err) {
    console.error('[ADMIN] Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT promote user to admin (unchanged)
app.put('/api/admin/promote/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('[ADMIN] Promoting user to admin:', id);
    
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (existing[0].is_admin === 1) {
      return res.status(400).json({ error: 'User is already an admin' });
    }
    
    await db.execute('UPDATE users SET is_admin = 1 WHERE id = ?', [id]);
    
    console.log('[ADMIN] User promoted successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] Error promoting user:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// PUT demote user from admin (unchanged)
app.put('/api/admin/demote/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('[ADMIN] Demoting user from admin:', id);
    
    // Prevent self-demotion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot demote yourself' });
    }
    
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (existing[0].is_admin === 0) {
      return res.status(400).json({ error: 'User is not an admin' });
    }
    
    await db.execute('UPDATE users SET is_admin = 0 WHERE id = ?', [id]);
    
    console.log('[ADMIN] User demoted successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] Error demoting user:', err);
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

// NEW: DELETE user (admin only) - with DarkSparrow protection
app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('[ADMIN] Deleting user:', id);
    
    // Protect DarkSparrow from deletion
    if (id === '232260865452146688') {
      return res.status(403).json({ error: 'Cannot delete protected user (DarkSparrow)' });
    }
    
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }
    
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete all callouts by this user first
      const [calloutResult] = await connection.execute('DELETE FROM callouts WHERE did = ?', [id]);
      console.log(`[ADMIN] Deleted ${calloutResult.affectedRows} callouts for user ${id}`);
      
      // Delete the user
      const [userResult] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
      console.log(`[ADMIN] Deleted user ${id}`);
      
      // Commit transaction
      await connection.commit();
      
      // TIMEZONE: Log deletion with timezone context
      const deletionTime = new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE });
      console.log(`[ADMIN] User ${id} and ${calloutResult.affectedRows} callouts deleted at ${deletionTime} (${SERVER_TIMEZONE})`);
      
      res.json({ 
        success: true,
        deletedCallouts: calloutResult.affectedRows,
        deletedAt: deletionTime,
        serverTimezone: SERVER_TIMEZONE
      });
      
    } catch (err) {
      // Rollback transaction on error
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (err) {
    console.error('[ADMIN] Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// TIMEZONE: Enhanced admin info with timezone statistics
app.get('/api/admin/info', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] Fetching admin info with timezone statistics');
    
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [adminCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
    const [calloutCount] = await db.query('SELECT COUNT(*) as count FROM callouts');
    const [recentCallouts] = await db.query(
      'SELECT COUNT(*) as count FROM callouts WHERE date >= CURDATE() - INTERVAL 7 DAY'
    );
    
    // TIMEZONE: Add timezone-specific statistics
    const today = new Date().toLocaleDateString('en-CA', { timeZone: SERVER_TIMEZONE });
    const [todayCallouts] = await db.query(
      'SELECT COUNT(*) as count FROM callouts WHERE date = ?', [today]
    );
    
    const currentTime = new Date();
    const serverTime = currentTime.toLocaleString('en-US', { timeZone: SERVER_TIMEZONE });
    
    res.json({
      totalUsers: userCount[0].count,
      totalAdmins: adminCount[0].count,
      totalCallouts: calloutCount[0].count,
      recentCallouts: recentCallouts[0].count,
      todayCallouts: todayCallouts[0].count,
      serverInfo: {
        timezone: SERVER_TIMEZONE,
        abbreviation: timezoneUtils.getTimezoneAbbr(SERVER_TIMEZONE),
        currentTime: serverTime,
        currentDate: today,
        utcTime: currentTime.toISOString()
      }
    });
  } catch (err) {
    console.error('[ADMIN] Error fetching admin info:', err);
    res.status(500).json({ error: 'Failed to fetch admin info' });
  }
});

// ===== STATIC FILE SERVING =====

// Serve static files from public_html
app.use(express.static(path.join(__dirname, '../public_html')));

// Catch-all route - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public_html/index.html'));
});

// ===== ERROR HANDLING MIDDLEWARE =====

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    serverTimezone: SERVER_TIMEZONE,
    errorTime: new Date().toLocaleString('en-US', { timeZone: SERVER_TIMEZONE })
  });
});

// ===== START SERVER =====

app.listen(PORT, () => {
  console.log('✅ Server running at http://127.0.0.1:' + PORT);
  console.log(`🌍 Server timezone: ${SERVER_TIMEZONE} (${timezoneUtils.getTimezoneAbbr(SERVER_TIMEZONE)})`);
  console.log('✅ Enhanced API routes with timezone support:');
  console.log('   🤖 POST /api/bot/callouts (NEW - Bot authentication)');
  console.log('   🤖 GET  /api/bot/health (NEW - Bot health check)');
  console.log('   🌍 GET  /api/timezone/info');
  console.log('   🌍 POST /api/timezone/validate');
  console.log('   🌍 POST /api/timezone/convert');
  console.log('   📅 GET  /api/user (with timezone context)');
  console.log('   📅 GET  /api/callouts (with timezone context)');
  console.log('   📅 POST /api/callouts (with timezone processing)');
  console.log('   📅 PUT  /api/callouts/:id (with timezone processing)');
  console.log('   📅 DELETE /api/callouts/:id (with timezone logging)');
  console.log('   🔧 GET  /api/admin/users (with timezone context)');
  console.log('   🔧 PUT  /api/admin/promote/:id');
  console.log('   🔧 PUT  /api/admin/demote/:id');
  console.log('   🔧 DELETE /api/admin/users/:id (NEW - with protection)');
  console.log('   🔧 GET  /api/admin/info (with timezone statistics)');
  console.log('✅ Authentication routes loaded');
  console.log('✅ Admin middleware active');
  console.log('✅ Timezone middleware active');
  console.log('✅ Bot API endpoints active');
});