'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { CloudServicePackage } from '@/lib/supabase'
import { ShoppingCart, Check, Loader2 } from 'lucide-react'

export default function PurchasePage() {
  return (
    <ProtectedRoute>
      <PurchaseContent />
    </ProtectedRoute>
  )
}

function PurchaseContent() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [packages, setPackages] = useState<CloudServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState<CloudServicePackage | null>(null)
  const [creatingInvoice, setCreatingInvoice] = useState(false)

  useEffect(() => {
    if (token) {
      fetchPackages()
    }
  }, [token])

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages')
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (package_: CloudServicePackage) => {
    if (!token) {
      router.push('/login')
      return
    }

    setSelectedPackage(package_)
    setCreatingInvoice(true)

    try {
      // คำนวณวันครบกำหนด
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + package_.duration_months)

      // สร้าง invoice
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: useAuthStore.getState().user?.id,
          amount: package_.price,
          currency: package_.currency,
          due_date: dueDate.toISOString(),
          description: package_.description || `แพ็กเกจ ${package_.name}`,
          machine_specs: package_.machine_specs,
          usage_limit_per_month: package_.usage_limit_per_month,
          machine_info: {
            type: package_.machine_type,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างบิล')
        setCreatingInvoice(false)
        setSelectedPackage(null)
        return
      }

      // Redirect ไปหน้า invoices เพื่อชำระเงิน
      router.push('/invoices')
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('เกิดข้อผิดพลาดในการสร้างบิล')
      setCreatingInvoice(false)
      setSelectedPackage(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">สั่งซื้อบริการใหม่</h1>
          <p className="mt-2 text-gray-600">เลือกแพ็กเกจบริการที่เหมาะกับคุณ</p>
        </div>

        {packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium text-lg">ยังไม่มีแพ็กเกจบริการ</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ชื่อแพ็กเกจ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        รายละเอียด
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        สเปคเครื่อง
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                        การใช้งาน/เดือน
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ระยะเวลา
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ราคา
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((package_) => (
                      <tr key={package_.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {package_.name}
                          </div>
                          <div className="md:hidden text-xs text-gray-500 mt-1">
                            {package_.description}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                          {package_.description || '-'}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs text-gray-600 space-y-1">
                            {package_.machine_specs?.cpu && (
                              <div>CPU: <span className="font-medium">{package_.machine_specs.cpu}</span></div>
                            )}
                            {package_.machine_specs?.ram && (
                              <div>RAM: <span className="font-medium">{package_.machine_specs.ram}</span></div>
                            )}
                            {package_.machine_specs?.storage && (
                              <div>Storage: <span className="font-medium">{package_.machine_specs.storage}</span></div>
                            )}
                            {package_.machine_specs?.bandwidth && (
                              <div>Bandwidth: <span className="font-medium">{package_.machine_specs.bandwidth}</span></div>
                            )}
                            {package_.machine_specs?.os && (
                              <div>OS: <span className="font-medium">{package_.machine_specs.os}</span></div>
                            )}
                            {package_.machine_specs?.gpu && (
                              <div>GPU: <span className="font-medium">{package_.machine_specs.gpu}</span></div>
                            )}
                            <div className="text-gray-400">Type: {package_.machine_type}</div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          {package_.usage_limit_per_month > 0
                            ? package_.usage_limit_per_month.toLocaleString() + ' ครั้ง'
                            : 'ไม่จำกัด'}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {package_.duration_months === 1
                              ? '1 เดือน'
                              : package_.duration_months === 3
                              ? '3 เดือน'
                              : package_.duration_months === 12
                              ? '1 ปี'
                              : `${package_.duration_months} เดือน`}
                          </div>
                          <div className="lg:hidden text-xs text-gray-500 mt-1">
                            {package_.usage_limit_per_month > 0
                              ? package_.usage_limit_per_month.toLocaleString() + ' ครั้ง/เดือน'
                              : 'ไม่จำกัด'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-bold text-primary-600">
                            {package_.price.toLocaleString()} {package_.currency}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handlePurchase(package_)}
                            disabled={creatingInvoice && selectedPackage?.id === package_.id}
                            className="flex items-center gap-2 bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm"
                          >
                            {creatingInvoice && selectedPackage?.id === package_.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="hidden sm:inline">กำลังสร้างบิล...</span>
                                <span className="sm:hidden">กำลัง...</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                <span className="hidden sm:inline">สั่งซื้อ</span>
                                <span className="sm:hidden">ซื้อ</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

