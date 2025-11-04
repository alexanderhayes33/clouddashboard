import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'
import { checkPaymentStatus } from '@/lib/qr-payment'

export async function POST(
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

    // ดึงข้อมูล invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('cloud_invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'ไม่พบบิล' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์ (เจ้าของบิลหรือ Admin)
    const { data: user } = await supabase
      .from('cloud_users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user || (user.role !== 'admin' && invoice.user_id !== auth.userId)) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    if (!invoice.payment_id) {
      return NextResponse.json(
        { error: 'บิลนี้ยังไม่มี payment_id' },
        { status: 400 }
      )
    }

    // ตรวจสอบสถานะการชำระเงิน
    try {
      const paymentStatus = await checkPaymentStatus(invoice.payment_id)

      if (paymentStatus.status === 'PAID') {
        // อัพเดท invoice เป็น paid
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('cloud_invoices')
          .update({
            status: 'paid',
            transaction_id: paymentStatus.transaction_id,
            paid_at: paymentStatus.paid_at || new Date().toISOString(),
            payment_method: 'promptpay',
          })
          .eq('id', params.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating invoice:', updateError)
        }

        // ถ้ามี machine_specs ให้สร้าง cloud_machine_services
        if (updatedInvoice?.machine_specs && updatedInvoice?.status === 'paid') {
          // ตรวจสอบว่ามี service อยู่แล้วหรือไม่
          const { data: existingService } = await supabase
            .from('cloud_machine_services')
            .select('id')
            .eq('invoice_id', updatedInvoice.id)
            .single()

          if (!existingService) {
            // คำนวณวันหมดอายุ (ใช้ due_date หรือ +1 เดือนจากวันชำระ)
            const expiryDate = new Date(updatedInvoice.paid_at || new Date())
            expiryDate.setMonth(expiryDate.getMonth() + 1)

            const { error: machineError } = await supabase
              .from('cloud_machine_services')
              .insert({
                user_id: updatedInvoice.user_id,
                invoice_id: updatedInvoice.id,
                service_name: updatedInvoice.description || `บริการจาก ${updatedInvoice.invoice_number}`,
                machine_type: updatedInvoice.machine_info?.type || 'cloud-vm',
                machine_specs: updatedInvoice.machine_specs,
                usage_limit_per_month: updatedInvoice.usage_limit_per_month || 0,
                usage_count: 0,
                start_date: updatedInvoice.paid_at || new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                status: 'active',
              })

            if (machineError) {
              console.error('Error creating machine service:', machineError)
            }
          }
        }

        return NextResponse.json(
          {
            status: 'paid',
            invoice: updatedInvoice,
            payment_status: paymentStatus,
          },
          { status: 200 }
        )
      } else if (
        paymentStatus.status === 'TIMEOUT' ||
        paymentStatus.status === 'CANCELLED'
      ) {
        return NextResponse.json(
          {
            status: paymentStatus.status.toLowerCase(),
            message: 'QR Code หมดอายุหรือถูกยกเลิก',
          },
          { status: 200 }
        )
      } else {
        return NextResponse.json(
          {
            status: 'pending',
            message: 'รอการชำระเงิน',
          },
          { status: 200 }
        )
      }
    } catch (qrError) {
      console.error('QR Payment check error:', qrError)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Check payment API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}
