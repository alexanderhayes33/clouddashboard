import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email และ password จำเป็นต้องมี' },
        { status: 400 }
      )
    }

    const result = await registerUser(email, password, fullName, phone)

    if (!result) {
      return NextResponse.json(
        { error: 'Email นี้ถูกใช้งานแล้ว หรือเกิดข้อผิดพลาด' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message: 'สมัครสมาชิกสำเร็จ',
        user: result.user,
        token: result.token,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    )
  }
}

