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
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + package_.duration_months)

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {package_.name}
                      </h3>
                      {package_.description && (
                        <p className="text-sm text-gray-600">{package_.description}</p>
                      )}
                    </div>

                    {/* Price */}
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

                    {/* Specs */}
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

                    {/* Usage Limit */}
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

                    {/* Action Button */}
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
        )}
      </main>
    </div>
  )
}
