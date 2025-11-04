import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'
import { createQRPayment } from '@/lib/qr-payment'

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

    // ตรวจสอบสิทธิ์ (เจ้าของบิลเท่านั้น)
    if (invoice.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ชำระบิลนี้' },
        { status: 403 }
      )
    }

    // ตรวจสอบสถานะ
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'บิลนี้ชำระแล้ว' },
        { status: 400 }
      )
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'บิลนี้ถูกยกเลิกแล้ว' },
        { status: 400 }
      )
    }

    // สร้าง QR Payment
    try {
      const qrPayment = await createQRPayment(
        invoice.amount,
        invoice.invoice_number
      )

      if (qrPayment.status !== 1 || !qrPayment.id_pay) {
        return NextResponse.json(
          { error: qrPayment.message || 'ไม่สามารถสร้าง QR Payment ได้' },
          { status: 400 }
        )
      }

      // อัพเดท invoice ด้วย payment_id
      const { error: updateError } = await supabase
        .from('cloud_invoices')
        .update({
          payment_id: qrPayment.id_pay,
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error updating invoice:', updateError)
      }

      return NextResponse.json(
        {
          message: 'สร้าง QR Payment สำเร็จ',
          qr_image_base64: qrPayment.qr_image_base64,
          payment_id: qrPayment.id_pay,
          amount: qrPayment.amount,
          time_out: qrPayment.time_out,
        },
        { status: 200 }
      )
    } catch (qrError) {
      console.error('QR Payment error:', qrError)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้าง QR Payment' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Pay invoice API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

