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
    const users = await sql`SELECT user_id AS id, name, email, password_hash, created_at FROM users WHERE email = ${email}`
    
    if (users.length && users[0].password_hash === password) {
      const { password_hash, ...userWithoutPassword } = users[0]
      res.json({ success: true, user: userWithoutPassword })
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
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (${name}, ${email}, ${password}, NOW())
      RETURNING user_id AS id, name, email, created_at
    `
    res.json({ success: true, user: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.post('/api/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body
    const result = await sql `
      SELECT * FROM users WHERE email = ${email} 
    `
    
    if (result.length > 0) {
      // User found - send success response
      // In production, you'd send and actual email here
      res.json({ success: true, message: 'Password reset instructions sent to email' })
    } else {
      res.json({ success: false, error: 'Email not found'})
    }
  } catch (error) {
    res.json({ success: false, error: error.message})
  }
})

app.post('/api/messages', async (req, res) => {
  try {
    const { message } = req.body
    
    if (!message || !message.trim()) {
      return res.json({ success: false, error: 'Message is required' })
    }
    
    const result = await sql`
      INSERT INTO messages (message, created_at)
      VALUES (${message}, NOW())
      RETURNING id, message, created_at
    `
    
    res.json({ success: true, message: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.listen(3000, () => console.log('Server running on http://localhost:3000'))