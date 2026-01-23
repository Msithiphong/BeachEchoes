import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const sql = neon(process.env.DATABASE_URL)

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const users = await sql`SELECT * FROM users WHERE email = ${email}`
    
    if (users.length && users[0].password === password) {
      res.json({ success: true, user: users[0] })
    } else {
      res.json({ success: false, error: 'Invalid credentials' })
    }
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const result = await sql`
      INSERT INTO users (name, email, password, created_at)
      VALUES (${name}, ${email}, ${password}, NOW())
      RETURNING id, name, email, created_at
    `
    res.json({ success: true, user: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.listen(3000, () => console.log('Server running on http://localhost:3000'))