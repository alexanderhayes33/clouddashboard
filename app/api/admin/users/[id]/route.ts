import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const { data: targetUser, error } = await supabase
      .from('cloud_users')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .eq('id', params.id)
      .single()

    if (error || !targetUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: targetUser }, { status: 200 })
  } catch (error) {
    console.error('Get user API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'ไม่มีสิทธิ์แก้ไขผู้ใช้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, full_name, phone, role, password } = body

    const updateData: any = {}
    if (email !== undefined) updateData.email = email
    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (password !== undefined) {
      const bcrypt = require('bcryptjs')
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    const { data: updatedUser, error } = await supabase
      .from('cloud_users')
      .update(updateData)
      .eq('id', params.id)
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการอัพเดทผู้ใช้' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'อัพเดทผู้ใช้สำเร็จ', user: updatedUser },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'ไม่มีสิทธิ์ลบผู้ใช้' },
        { status: 403 }
      )
    }

    // ไม่ให้ลบตัวเอง
    if (params.id === auth.userId) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบตัวเองได้' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('cloud_users')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'ลบผู้ใช้สำเร็จ' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete user API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

