import { sql } from "@vercel/postgres";

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS birthdays (
      user_id VARCHAR(255) PRIMARY KEY,
      day INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS league_accounts (
      user_id VARCHAR(255) PRIMARY KEY,
      puuid VARCHAR(255) NOT NULL
    );
  `;
}

export async function setBirthday(userId, day, month, year) {
  await initDB();
  await sql`
    INSERT INTO birthdays (user_id, day, month, year)
    VALUES (${userId}, ${day}, ${month}, ${year})
    ON CONFLICT (user_id) DO UPDATE SET day = ${day}, month = ${month}, year = ${year};
  `;
}

export async function removeBirthday(userId) {
  await initDB();
  await sql`DELETE FROM birthdays WHERE user_id = ${userId}`;
}

export async function getBirthdays(day, month) {
  await initDB();
  const { rows } = await sql`SELECT user_id, year FROM birthdays WHERE day = ${day} AND month = ${month}`;
  return rows;
}

export async function addLeagueAccount(userId, puuid) {
  await initDB();
  await sql`
    INSERT INTO league_accounts (user_id, puuid)
    VALUES (${userId}, ${puuid})
    ON CONFLICT (user_id) DO UPDATE SET puuid = ${puuid};
  `;
}

export async function removeLeagueAccount(userId) {
  await initDB();
  await sql`DELETE FROM league_accounts WHERE user_id = ${userId}`;
}

export async function getLeagueAccount(userId) {
  await initDB();
  const { rows } = await sql`SELECT user_id, puuid FROM league_accounts WHERE user_id = ${userId}`;
  return rows[0];
}

export async function getAllLeagueAccounts() {
  await initDB();
  const { rows } = await sql`SELECT user_id, puuid FROM league_accounts`;
  return rows;
}
