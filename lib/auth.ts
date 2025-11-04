import bcrypt from 'bcryptjs'
import { supabase, CloudUser } from './supabase'
import { generateToken, JWTPayload } from './jwt'

export type UserWithoutPassword = Omit<CloudUser, 'password_hash'>

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function registerUser(
  email: string,
  password: string,
  fullName?: string,
  phone?: string
): Promise<{ user: UserWithoutPassword; token: string } | null> {
  try {
    // ตรวจสอบว่ามี email นี้อยู่แล้วหรือไม่
    const { data: existingUser } = await supabase
      .from('cloud_users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return null // Email ถูกใช้งานแล้ว
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // สร้าง user ใหม่
    const { data: newUser, error } = await supabase
      .from('cloud_users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
      })
      .select()
      .single()

    if (error || !newUser) {
      console.error('Error creating user:', error)
      return null
    }

    // สร้าง JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
    })

    // ลบ password_hash ออกก่อน return
    const { password_hash, ...userWithoutPassword } = newUser

    return {
      user: userWithoutPassword as Omit<CloudUser, 'password_hash'>,
      token,
    }
  } catch (error) {
    console.error('Register error:', error)
    return null
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; token: string } | null> {
  try {
    // หา user จาก email
    const { data: user, error } = await supabase
      .from('cloud_users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return null // ไม่พบ user
    }

    // ตรวจสอบ password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return null // Password ไม่ถูกต้อง
    }

    // สร้าง JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // ลบ password_hash ออกก่อน return
    const { password_hash, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token,
    }
  } catch (error) {
    console.error('Login error:', error)
    return null
  }
}

export async function getUserById(userId: string): Promise<UserWithoutPassword | null> {
  try {
    const { data: user, error } = await supabase
      .from('cloud_users')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

