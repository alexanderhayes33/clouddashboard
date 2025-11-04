import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase } from '@/lib/supabase'

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

    const body = await request.json()
    const { transaction_id, payment_method } = body

    // อัพเดท billing status เป็น completed
    const { data: billing, error: billingError } = await supabase
      .from('cloud_billing')
      .update({
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
        transaction_id: transaction_id || undefined,
        payment_method: payment_method || undefined,
      })
      .eq('id', params.id)
      .eq('user_id', auth.userId)
      .select()
      .single()

    if (billingError || !billing) {
      console.error('Error updating billing:', billingError)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการอัพเดท billing' },
        { status: 500 }
      )
    }

    // ถ้ามี subscription_id ให้อัพเดท subscription status
    if (billing.subscription_id) {
      const { error: subError } = await supabase
        .from('cloud_subscriptions')
        .update({ status: 'active' })
        .eq('id', billing.subscription_id)
        .eq('user_id', auth.userId)

      if (subError) {
        console.error('Error updating subscription:', subError)
      }
    }

    return NextResponse.json(
      { message: 'อัพเดท billing สำเร็จ', billing },
      { status: 200 }
    )
  } catch (error) {
    console.error('Complete billing API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

