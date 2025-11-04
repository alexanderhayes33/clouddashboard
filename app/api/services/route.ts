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

    // Admin เห็นทุก service, User เห็นเฉพาะของตัวเอง
    // ดึงข้อมูล services พร้อม invoice information
    let query = supabase
      .from('cloud_machine_services')
      .select('*')
      .order('created_at', { ascending: false })

    if (user.role !== 'admin') {
      query = query.eq('user_id', auth.userId)
    }

    const { data: services, error: servicesError } = await query

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล', details: servicesError },
        { status: 500 }
      )
    }

    // ดึงข้อมูล invoices สำหรับแต่ละ service
    if (services && services.length > 0) {
      const invoiceIds = services.map((s: any) => s.invoice_id).filter(Boolean)
      
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from('cloud_invoices')
          .select('id, invoice_number, amount, currency')
          .in('id', invoiceIds)

        // รวม invoice data เข้ากับ service
        const servicesWithInvoices = services.map((service: any) => {
          const invoice = invoices?.find((inv: any) => inv.id === service.invoice_id)
          return {
            ...service,
            cloud_invoices: invoice || null,
          }
        })

        return NextResponse.json({ services: servicesWithInvoices }, { status: 200 })
      }
    }

    // ถ้าไม่มี services ให้ return array ว่าง
    return NextResponse.json({ services: services || [] }, { status: 200 })
  } catch (error) {
    console.error('Get services API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

