import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;

export const db = await mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 5
});

// Attendance channel+message persistence
export async function setAttendanceChannel(guildId, channelId, messageId = null) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance_channel (
      guild_id VARCHAR(32) PRIMARY KEY,
      channel_id VARCHAR(32) NOT NULL,
      message_id VARCHAR(32) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  if (messageId) {
    await db.execute(
      `INSERT INTO attendance_channel (guild_id, channel_id, message_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), message_id = VALUES(message_id)`,
      [guildId, channelId, messageId]
    );
  } else {
    await db.execute(
      `INSERT INTO attendance_channel (guild_id, channel_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id)`,
      [guildId, channelId]
    );
  }
}

export async function getAttendanceConfig(guildId) {
  const [rows] = await db.execute(
    'SELECT channel_id, message_id FROM attendance_channel WHERE guild_id = ? LIMIT 1', [guildId]
  );
  return rows[0] || null;
}

// User sync logic (unchanged)
export async function syncRoleUsers(client, ROLE_MAIN, ROLE_OFFICER, cb) {
  try {
    const guilds = client.guilds.cache;
    let totalSynced = 0;
    for (const [guildId, guild] of guilds) {
      await guild.members.fetch();
      const mainRole = guild.roles.cache.find(r => r.name === ROLE_MAIN);
      const officerRole = guild.roles.cache.find(r => r.name === ROLE_OFFICER);
      if (!mainRole) {
        cb(`[Bot] Role '${ROLE_MAIN}' not found in guild ${guild.name}`);
        continue;
      }
      const members = guild.members.cache.filter(m => m.roles.cache.has(mainRole.id));
      for (const member of members.values()) {
        const user = member.user;
        const isAdmin = officerRole && member.roles.cache.has(officerRole.id) ? 1 : 0;
        await db.execute(
          `INSERT INTO users (id, username, global_name, avatar, is_admin) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE username=VALUES(username), global_name=VALUES(global_name), avatar=VALUES(avatar), is_admin=VALUES(is_admin)`,
          [user.id, user.username, user.globalName || user.global_name || null, user.avatar || null, isAdmin]
        );
        totalSynced++;
      }
    }
    cb(`[Bot] Synced ${totalSynced} users with '${ROLE_MAIN}' role.`);
  } catch (err) {
    cb('[Bot] Error syncing users: ' + err.message);
  }
}