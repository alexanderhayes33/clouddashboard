import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: package_, error } = await supabase
      .from('cloud_service_packages')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (error || !package_) {
      return NextResponse.json(
        { error: 'ไม่พบแพ็กเกจ' },
        { status: 404 }
      )
    }

    return NextResponse.json({ package: package_ }, { status: 200 })
  } catch (error) {
    console.error('Get package API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

