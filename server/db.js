import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'keystone.db')

export const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      memberSince TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      balance REAL NOT NULL,
      ytdReturn REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      employerMatchPct REAL,
      contributedPct REAL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance_policies (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      status TEXT NOT NULL,
      detailLabel TEXT NOT NULL,
      detailValue TEXT NOT NULL,
      subLabel TEXT NOT NULL,
      subValue TEXT NOT NULL,
      premium TEXT NOT NULL,
      policyNumber TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      account TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      netWorth REAL NOT NULL,
      netWorthDelta REAL NOT NULL,
      advisorName TEXT NOT NULL,
      advisorTitle TEXT NOT NULL,
      nextReview TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS net_worth_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      month TEXT NOT NULL,
      value REAL NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS allocation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      color TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
}
