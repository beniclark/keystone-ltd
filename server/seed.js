import bcrypt from 'bcryptjs'
import { db, initDb } from './db.js'
import { mockUser } from '../src/data/user.js'
import { investmentAccounts, retirementAccounts } from '../src/data/accounts.js'
import { insurancePolicies } from '../src/data/insurance.js'
import { recentActivity } from '../src/data/activity.js'

const DEMO_EMAIL = 'demo@keystone.com'
const DEMO_PASSWORD = 'demo123'

export function seedDatabase() {
  initDb()

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10)

  const run = db.transaction(() => {
    db.exec(`
      DELETE FROM allocation;
      DELETE FROM net_worth_series;
      DELETE FROM user_profile;
      DELETE FROM activity;
      DELETE FROM insurance_policies;
      DELETE FROM accounts;
      DELETE FROM users;
    `)

    const now = new Date().toISOString()
    const insertUser = db.prepare(`
      INSERT INTO users (firstName, lastName, email, passwordHash, memberSince, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = insertUser.run(
      mockUser.firstName,
      mockUser.lastName,
      DEMO_EMAIL,
      passwordHash,
      mockUser.memberSince,
      now,
    )
    const userId = Number(result.lastInsertRowid)

    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, userId, name, number, balance, ytdReturn, type, category, employerMatchPct, contributedPct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const account of investmentAccounts) {
      insertAccount.run(
        account.id,
        userId,
        account.name,
        account.number,
        account.balance,
        account.ytdReturn,
        account.type,
        'investment',
        null,
        null,
      )
    }

    for (const account of retirementAccounts) {
      insertAccount.run(
        account.id,
        userId,
        account.name,
        account.number,
        account.balance,
        account.ytdReturn,
        account.type,
        'retirement',
        account.employerMatch?.pct ?? null,
        account.employerMatch?.contributedPct ?? null,
      )
    }

    const insertPolicy = db.prepare(`
      INSERT INTO insurance_policies (id, userId, name, icon, status, detailLabel, detailValue, subLabel, subValue, premium, policyNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const policy of insurancePolicies) {
      insertPolicy.run(
        policy.id,
        userId,
        policy.name,
        policy.icon,
        policy.status,
        policy.detailLabel,
        policy.detailValue,
        policy.subLabel,
        policy.subValue,
        policy.premium,
        policy.policyNumber,
      )
    }

    const insertActivity = db.prepare(`
      INSERT INTO activity (userId, date, account, description, amount, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const row of recentActivity) {
      insertActivity.run(userId, row.date, row.account, row.description, row.amount, row.type)
    }

    db.prepare(`
      INSERT INTO user_profile (userId, netWorth, netWorthDelta, advisorName, advisorTitle, nextReview)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      mockUser.netWorth,
      mockUser.netWorthDelta,
      mockUser.advisor.name,
      mockUser.advisor.title,
      mockUser.advisor.nextReview,
    )

    const insertSeries = db.prepare(`
      INSERT INTO net_worth_series (userId, month, value)
      VALUES (?, ?, ?)
    `)

    for (const point of mockUser.netWorthSeries) {
      insertSeries.run(userId, point.month, point.value)
    }

    const insertAllocation = db.prepare(`
      INSERT INTO allocation (userId, name, value, color)
      VALUES (?, ?, ?, ?)
    `)

    for (const point of mockUser.allocation) {
      insertAllocation.run(userId, point.name, point.value, point.color)
    }
  })

  run()
}

if (globalThis.process?.argv?.[1] && import.meta.url === `file://${globalThis.process.argv[1]}`) {
  seedDatabase()
  console.log(`Seeded database with demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}
