'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { CloudMachineService } from '@/lib/supabase'
import { format, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'

export default function ServicesPage() {
  return (
    <ProtectedRoute>
      <ServicesContent />
    </ProtectedRoute>
  )
}

function ServicesContent() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [services, setServices] = useState<(CloudMachineService & { cloud_invoices?: any })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchServices()
    }
  }, [token])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Services data:', data)
        setServices(data.services || [])
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">บริการของฉัน</h1>
          <p className="mt-2 text-gray-600">บริการ Cloud ที่คุณชำระเงินแล้ว</p>
        </div>

        {services.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
            <p className="text-gray-700 font-medium text-lg">ยังไม่มีบริการ</p>
            <p className="text-gray-500 mt-2">ชำระเงินบิลเพื่อเริ่มใช้งานบริการ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service) => {
              const isExpired = new Date(service.expiry_date) < new Date()
              const daysRemaining = differenceInDays(
                new Date(service.expiry_date),
                new Date()
              )
              const usagePercentage =
                service.usage_limit_per_month > 0
                  ? (service.usage_count / service.usage_limit_per_month) * 100
                  : 0

              return (
                <div
                  key={service.id}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                    isExpired
                      ? 'border-l-4 border-red-500'
                      : service.status === 'active'
                      ? 'border-l-4 border-green-500'
                      : 'border-l-4 border-yellow-500'
                  }`}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {service.service_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          เลขที่บิล: {service.cloud_invoices?.invoice_number || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          service.status === 'active' && !isExpired
                            ? 'bg-green-100 text-green-800'
                            : isExpired
                            ? 'bg-red-100 text-red-800'
                            : service.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {service.status === 'active' && !isExpired
                          ? 'ใช้งานได้'
                          : isExpired
                          ? 'หมดอายุ'
                          : service.status === 'suspended'
                          ? 'ระงับ'
                          : 'ยกเลิก'}
                      </span>
                    </div>

                    {/* Machine Specs */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">สเปคเครื่อง</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {service.machine_specs?.cpu && (
                          <div>
                            <p className="text-xs text-gray-500">CPU</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.cpu}
                            </p>
                          </div>
                        )}
                        {service.machine_specs?.ram && (
                          <div>
                            <p className="text-xs text-gray-500">RAM</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.ram}
                            </p>
                          </div>
                        )}
                        {service.machine_specs?.storage && (
                          <div>
                            <p className="text-xs text-gray-500">Storage</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.storage}
                            </p>
                          </div>
                        )}
                        {service.machine_specs?.bandwidth && (
                          <div>
                            <p className="text-xs text-gray-500">Bandwidth</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.bandwidth}
                            </p>
                          </div>
                        )}
                        {service.machine_specs?.os && (
                          <div>
                            <p className="text-xs text-gray-500">OS</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.os}
                            </p>
                          </div>
                        )}
                        {service.machine_specs?.gpu && (
                          <div>
                            <p className="text-xs text-gray-500">GPU</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_specs.gpu}
                            </p>
                          </div>
                        )}
                        {service.machine_type && (
                          <div>
                            <p className="text-xs text-gray-500">ประเภท</p>
                            <p className="text-sm font-medium text-gray-900">
                              {service.machine_type}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage */}
                    {service.usage_limit_per_month > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            การใช้งานรายเดือน
                          </span>
                          <span className="text-sm text-gray-600">
                            {service.usage_count.toLocaleString()} /{' '}
                            {service.usage_limit_per_month.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usagePercentage >= 90
                                ? 'bg-red-500'
                                : usagePercentage >= 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">วันเริ่มใช้งาน:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {format(new Date(service.start_date), 'dd MMMM yyyy', { locale: th })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">วันหมดอายุ:</span>
                        <span
                          className={`text-sm font-medium ${
                            isExpired
                              ? 'text-red-600'
                              : daysRemaining <= 7
                              ? 'text-yellow-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {format(new Date(service.expiry_date), 'dd MMMM yyyy', { locale: th })}
                        </span>
                      </div>
                      {!isExpired && daysRemaining > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">เหลืออีก:</span>
                          <span
                            className={`text-sm font-bold ${
                              daysRemaining <= 7
                                ? 'text-red-600'
                                : daysRemaining <= 30
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {daysRemaining} วัน
                          </span>
                        </div>
                      )}
                    </div>
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

