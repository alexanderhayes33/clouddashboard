'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { CloudServicePackage } from '@/lib/supabase'
import {
  ShoppingCart,
  Loader2,
  Cpu,
  HardDrive,
  Wifi,
  Monitor,
  Zap,
  Calendar,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
      // คำนวณจำนวนวันจาก duration_months (1 เดือน = 30 วัน)
      const usageDays = package_.duration_months * 30
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + usageDays)

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Mobile Card Skeleton */}
          <div className="md:hidden grid grid-cols-1 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <Skeleton className="h-10 w-40 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            สั่งซื้อบริการใหม่
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            เลือกแพ็กเกจบริการที่เหมาะกับคุณ
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium text-lg">ยังไม่มีแพ็กเกจบริการ</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4 sm:gap-6">
              {packages.map((package_) => {
                const isCreating = creatingInvoice && selectedPackage?.id === package_.id
                const isPopular = package_.name.toLowerCase().includes('standard') || 
                                 package_.name.toLowerCase().includes('premium')

                return (
                  <div
                    key={package_.id}
                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-lg ${
                      isPopular
                        ? 'border-primary-300 bg-gradient-to-br from-white to-primary-50/30'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {isPopular && (
                      <div className="bg-primary-600 text-white text-xs font-semibold px-4 py-1 text-center">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        แนะนำ
                      </div>
                    )}
                    
                    <div className="p-4 sm:p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {package_.name}
                        </h3>
                        {package_.description && (
                          <p className="text-sm text-gray-600">{package_.description}</p>
                        )}
                      </div>

                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-bold text-primary-600">
                            {package_.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600">{package_.currency}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {package_.duration_months === 1
                              ? '1 เดือน'
                              : package_.duration_months === 3
                              ? '3 เดือน'
                              : package_.duration_months === 12
                              ? '1 ปี'
                              : `${package_.duration_months} เดือน`}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          สเปคเครื่อง
                        </h4>
                        <div className="space-y-2">
                          {package_.machine_specs?.cpu && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Cpu className="h-4 w-4 text-blue-600" />
                              <span>{package_.machine_specs.cpu}</span>
                            </div>
                          )}
                          {package_.machine_specs?.ram && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Zap className="h-4 w-4 text-yellow-600" />
                              <span>{package_.machine_specs.ram}</span>
                            </div>
                          )}
                          {package_.machine_specs?.storage && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <HardDrive className="h-4 w-4 text-green-600" />
                              <span>{package_.machine_specs.storage}</span>
                            </div>
                          )}
                          {package_.machine_specs?.bandwidth && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Wifi className="h-4 w-4 text-purple-600" />
                              <span>{package_.machine_specs.bandwidth}</span>
                            </div>
                          )}
                          {package_.machine_specs?.os && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Monitor className="h-4 w-4 text-gray-600" />
                              <span>{package_.machine_specs.os}</span>
                            </div>
                          )}
                          {package_.machine_specs?.gpu && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Monitor className="h-4 w-4 text-indigo-600" />
                              <span>{package_.machine_specs.gpu}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {package_.usage_limit_per_month > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-green-600" />
                            <span>
                              การใช้งาน: {package_.usage_limit_per_month.toLocaleString()} ครั้ง/เดือน
                            </span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handlePurchase(package_)}
                        disabled={isCreating}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                          isPopular
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>กำลังสร้างบิล...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5" />
                            <span>สั่งซื้อ</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ชื่อแพ็กเกจ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        รายละเอียด
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        สเปคเครื่อง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        การใช้งาน/เดือน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ระยะเวลา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ราคา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((package_) => {
                      const isCreating = creatingInvoice && selectedPackage?.id === package_.id
                      const isPopular = package_.name.toLowerCase().includes('standard') || 
                                       package_.name.toLowerCase().includes('premium')

                      return (
                        <tr 
                          key={package_.id} 
                          className={`hover:bg-gray-50 ${isPopular ? 'bg-primary-50/30' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-900">
                                {package_.name}
                              </div>
                              {isPopular && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-primary-600 text-white rounded">
                                  แนะนำ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {package_.description || '-'}
                          </td>
                          <td className="px-6 py-4">
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
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {package_.usage_limit_per_month > 0
                              ? package_.usage_limit_per_month.toLocaleString() + ' ครั้ง'
                              : 'ไม่จำกัด'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {package_.duration_months === 1
                              ? '1 เดือน'
                              : package_.duration_months === 3
                              ? '3 เดือน'
                              : package_.duration_months === 12
                              ? '1 ปี'
                              : `${package_.duration_months} เดือน`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {package_.price.toLocaleString()} {package_.currency}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handlePurchase(package_)}
                              disabled={isCreating}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                                isPopular
                                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                                  : 'bg-gray-900 text-white hover:bg-gray-800'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isCreating ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>กำลังสร้างบิล...</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="h-4 w-4" />
                                  <span>สั่งซื้อ</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
