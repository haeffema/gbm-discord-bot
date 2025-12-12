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
