import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { supabase, CloudSubscription } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต' },
        { status: 401 }
      )
    }

    const { data: subscriptions, error } = await supabase
      .from('cloud_subscriptions')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscriptions }, { status: 200 })
  } catch (error) {
    console.error('Get subscriptions API error:', error)
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
    const { plan_name, plan_type, amount, currency, expiry_date } = body

    if (!plan_name || !plan_type || !amount || !expiry_date) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      )
    }

    const { data: subscription, error } = await supabase
      .from('cloud_subscriptions')
      .insert({
        user_id: auth.userId,
        plan_name,
        plan_type,
        amount,
        currency: currency || 'THB',
        expiry_date,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้าง subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'สร้าง subscription สำเร็จ', subscription },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create subscription API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

