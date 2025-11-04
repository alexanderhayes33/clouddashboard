import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase, CloudInvoice } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต' },
        { status: 401 }
      )
    }

    // ตรวจสอบ role
    const { data: user } = await supabase
      .from('cloud_users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      )
    }

    // Admin เห็นทุก invoice, User เห็นเฉพาะของตัวเอง
    let query = supabase
      .from('cloud_invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (user.role !== 'admin') {
      query = query.eq('user_id', auth.userId)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoices }, { status: 200 })
  } catch (error) {
    console.error('Get invoices API error:', error)
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

    // ตรวจสอบ role (เฉพาะ admin เท่านั้น)
    const { data: user } = await supabase
      .from('cloud_users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ในการสร้างบิล' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      user_id,
      amount,
      currency,
      due_date,
      description,
      machine_specs,
      usage_limit_per_month,
      machine_info,
    } = body

    if (!user_id || !amount || !due_date) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน (user_id, amount, due_date จำเป็น)' },
        { status: 400 }
      )
    }

    // สร้าง invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number')

    const { data: invoice, error } = await supabase
      .from('cloud_invoices')
      .insert({
        user_id,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        amount,
        currency: currency || 'THB',
        due_date,
        description,
        status: 'pending',
        created_by: auth.userId,
        machine_specs: machine_specs || null,
        usage_limit_per_month: usage_limit_per_month || null,
        machine_info: machine_info || null,
        usage_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้างบิล' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'สร้างบิลสำเร็จ', invoice },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create invoice API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

