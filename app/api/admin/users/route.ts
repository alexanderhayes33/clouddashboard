import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต' },
        { status: 401 }
      )
    }

    // ตรวจสอบ role (เฉพาะ admin)
    const { data: user } = await supabase
      .from('cloud_users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const { data: users, error } = await supabase
      .from('cloud_users')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('Get users API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต' },
        { status: 401 }
      )
    }

    const { data: user } = await supabase
      .from('cloud_users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์สร้างผู้ใช้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, full_name, phone, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email และ password จำเป็นต้องมี' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามี email นี้อยู่แล้วหรือไม่
    const { data: existingUser } = await supabase
      .from('cloud_users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 10)

    // สร้าง user
    const { data: newUser, error } = await supabase
      .from('cloud_users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name,
        phone,
        role: role || 'user',
      })
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'สร้างผู้ใช้สำเร็จ', user: newUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

