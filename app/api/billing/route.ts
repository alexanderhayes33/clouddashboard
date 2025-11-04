import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase, CloudBilling } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต' },
        { status: 401 }
      )
    }

    const { data: billing, error } = await supabase
      .from('cloud_billing')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching billing:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
        { status: 500 }
      )
    }

    return NextResponse.json({ billing }, { status: 200 })
  } catch (error) {
    console.error('Get billing API error:', error)
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

    const body = await request.json()
    const {
      subscription_id,
      amount,
      currency,
      payment_method,
      transaction_id,
      description,
    } = body

    if (!amount) {
      return NextResponse.json(
        { error: 'จำนวนเงินจำเป็นต้องมี' },
        { status: 400 }
      )
    }

    // สร้าง billing record
    const { data: billing, error: billingError } = await supabase
      .from('cloud_billing')
      .insert({
        user_id: auth.userId,
        subscription_id,
        amount,
        currency: currency || 'THB',
        payment_method,
        payment_status: 'pending',
        transaction_id,
        description,
      })
      .select()
      .single()

    if (billingError) {
      console.error('Error creating billing:', billingError)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้าง billing' },
        { status: 500 }
      )
    }

    // ถ้ามี subscription_id ให้อัพเดท subscription status
    if (subscription_id) {
      const { error: subError } = await supabase
        .from('cloud_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription_id)
        .eq('user_id', auth.userId)

      if (subError) {
        console.error('Error updating subscription:', subError)
      }
    }

    return NextResponse.json(
      { message: 'สร้าง billing สำเร็จ', billing },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create billing API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

