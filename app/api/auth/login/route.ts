import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email และ password จำเป็นต้องมี' },
        { status: 400 }
      )
    }

    const result = await loginUser(email, password)

    if (!result) {
      return NextResponse.json(
        { error: 'Email หรือ password ไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        message: 'เข้าสู่ระบบสำเร็จ',
        user: result.user,
        token: result.token,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    )
  }
}

