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

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      )
    }

    let query = supabase
      .from('cloud_invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    const { data: invoice, error } = await query

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'ไม่พบบิล' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์ (Admin หรือเจ้าของบิล)
    if (user.role !== 'admin' && invoice.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    return NextResponse.json({ invoice }, { status: 200 })
  } catch (error) {
    console.error('Get invoice API error:', error)
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
        { error: 'ไม่มีสิทธิ์ในการแก้ไขบิล' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      amount,
      currency,
      due_date,
      description,
      status,
      machine_specs,
      usage_limit_per_month,
      machine_info,
    } = body

    const updateData: any = {}
    if (amount !== undefined) updateData.amount = amount
    if (currency !== undefined) updateData.currency = currency
    if (due_date !== undefined) updateData.due_date = due_date
    if (description !== undefined) updateData.description = description
    // ดึงข้อมูล invoice เดิมก่อนอัพเดท
    const { data: oldInvoice } = await supabase
      .from('cloud_invoices')
      .select('paid_at, status')
      .eq('id', params.id)
      .single()

    if (status !== undefined) {
      updateData.status = status
      // ถ้าเปลี่ยนสถานะเป็น paid และยังไม่มี paid_at ให้ set paid_at
      if (status === 'paid' && !oldInvoice?.paid_at) {
        updateData.paid_at = new Date().toISOString()
        updateData.payment_method = 'manual' // admin เปลี่ยนสถานะเอง
      }
    }
    if (machine_specs !== undefined) updateData.machine_specs = machine_specs
    if (usage_limit_per_month !== undefined)
      updateData.usage_limit_per_month = usage_limit_per_month
    if (machine_info !== undefined) updateData.machine_info = machine_info

    const { data: invoice, error } = await supabase
      .from('cloud_invoices')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการอัพเดทบิล' },
        { status: 500 }
      )
    }

    // ถ้าอัพเดท status เป็น paid และมี machine_specs ให้สร้าง cloud_machine_services
    const hasMachineSpecs = invoice?.machine_specs && 
      typeof invoice.machine_specs === 'object' && 
      Object.keys(invoice.machine_specs).length > 0
    
    if (status === 'paid' && hasMachineSpecs && invoice?.status === 'paid') {
      console.log('Creating machine service for invoice:', invoice.invoice_number)
      console.log('Machine specs:', invoice.machine_specs)
      // ตรวจสอบว่ามี service อยู่แล้วหรือไม่
      const { data: existingService } = await supabase
        .from('cloud_machine_services')
        .select('id')
        .eq('invoice_id', params.id)
        .single()

      if (!existingService) {
        // ใช้ paid_at ที่อัพเดทแล้ว หรือ invoice.paid_at หรือวันปัจจุบัน
        const paidAt = invoice.paid_at || updateData.paid_at || new Date().toISOString()
        
        // คำนวณวันหมดอายุ (+1 เดือนจากวันชำระ)
        const expiryDate = new Date(paidAt)
        expiryDate.setMonth(expiryDate.getMonth() + 1)

        const { error: machineError } = await supabase
          .from('cloud_machine_services')
          .insert({
            user_id: invoice.user_id,
            invoice_id: invoice.id,
            service_name: invoice.description || `บริการจาก ${invoice.invoice_number}`,
            machine_type: invoice.machine_info?.type || 'cloud-vm',
            machine_specs: invoice.machine_specs,
            usage_limit_per_month: invoice.usage_limit_per_month || 0,
            usage_count: 0,
            start_date: paidAt,
            expiry_date: expiryDate.toISOString(),
            status: 'active',
          })

        if (machineError) {
          console.error('Error creating machine service:', machineError)
          // ไม่ return error เพราะ invoice อัพเดทสำเร็จแล้ว
        } else {
          console.log('Machine service created successfully for invoice:', invoice.invoice_number)
        }
      } else {
        console.log('Machine service already exists for invoice:', invoice.invoice_number)
      }
    }

    return NextResponse.json(
      { message: 'อัพเดทบิลสำเร็จ', invoice },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update invoice API error:', error)
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
        { error: 'ไม่มีสิทธิ์ในการลบบิล' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('cloud_invoices')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting invoice:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการลบบิล' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'ลบบิลสำเร็จ' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete invoice API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

