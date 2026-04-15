import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db, initDb } from './db.js'
import { seedDatabase } from './seed.js'

const app = express()
const PORT = Number(globalThis.process?.env?.PORT || 3001)
const JWT_SECRET = globalThis.process?.env?.JWT_SECRET || 'keystone-dev-secret'

initDb()
const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
if (!userCount) {
  seedDatabase()
}

app.use(cors())
app.use(express.json())

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    memberSince: user.memberSince,
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.slice('Bearer '.length)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.sub)
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    req.user = user
    return next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

app.post('/api/auth/signup', (req, res) => {
  const { firstName, lastName, email, password } = req.body || {}

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
  if (existing) {
    return res.status(409).json({ message: 'Email already exists' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  const memberSince = String(new Date().getFullYear())

  const result = db
    .prepare(
      'INSERT INTO users (firstName, lastName, email, passwordHash, memberSince, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(firstName, lastName, normalizedEmail, passwordHash, memberSince, now)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid))
  const token = signToken(user)

  return res.status(201).json({ token, user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail)
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = signToken(user)
  return res.json({ token, user: publicUser(user) })
})

app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/auth/signup') {
    return next()
  }
  return authMiddleware(req, res, next)
})

app.get('/api/auth/me', (req, res) => {
  return res.json({ user: publicUser(req.user) })
})

app.get('/api/accounts', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, number, balance, ytdReturn, type, category, employerMatchPct, contributedPct
       FROM accounts
       WHERE userId = ?
       ORDER BY category, name`,
    )
    .all(req.user.id)

  const accounts = rows.map((row) => ({
    id: row.id,
    name: row.name,
    number: row.number,
    balance: row.balance,
    ytdReturn: row.ytdReturn,
    type: row.type,
    category: row.category,
    employerMatch:
      row.employerMatchPct != null && row.contributedPct != null
        ? { pct: row.employerMatchPct, contributedPct: row.contributedPct }
        : undefined,
  }))

  return res.json(accounts)
})

app.get('/api/insurance', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, icon, status, detailLabel, detailValue, subLabel, subValue, premium, policyNumber
       FROM insurance_policies WHERE userId = ? ORDER BY id`,
    )
    .all(req.user.id)
  return res.json(rows)
})

app.get('/api/activity', (req, res) => {
  const rows = db
    .prepare(
      'SELECT date, account, description, amount, type FROM activity WHERE userId = ? ORDER BY id DESC',
    )
    .all(req.user.id)
  return res.json(rows)
})

app.get('/api/profile', (req, res) => {
  const profile = db
    .prepare(
      'SELECT netWorth, netWorthDelta, advisorName, advisorTitle, nextReview FROM user_profile WHERE userId = ?',
    )
    .get(req.user.id)

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' })
  }

  const netWorthSeries = db
    .prepare('SELECT month, value FROM net_worth_series WHERE userId = ? ORDER BY id')
    .all(req.user.id)
  const allocation = db
    .prepare('SELECT name, value, color FROM allocation WHERE userId = ? ORDER BY id')
    .all(req.user.id)

  return res.json({
    netWorth: profile.netWorth,
    netWorthDelta: profile.netWorthDelta,
    advisor: {
      name: profile.advisorName,
      title: profile.advisorTitle,
      nextReview: profile.nextReview,
    },
    netWorthSeries,
    allocation,
  })
})

app.listen(PORT, () => {
  console.log(`Keystone API server running on http://localhost:${PORT}`)
})
