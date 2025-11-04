import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // ดึงข้อมูลแพ็กเกจที่ active ทั้งหมด เรียงตาม display_order
    const { data: packages, error } = await supabase
      .from('cloud_service_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
        { status: 500 }
      )
    }

    return NextResponse.json({ packages: packages || [] }, { status: 200 })
  } catch (error) {
    console.error('Get packages API error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

