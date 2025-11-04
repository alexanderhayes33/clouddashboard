'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { CloudSubscription, CloudBilling } from '@/lib/supabase'
import {
  Activity,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Package,
  ShoppingCart,
  FileText,
  Server,
  AlertCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const router = useRouter()
  const { user, token, clearAuth, setAuth } = useAuthStore()
  const [subscriptions, setSubscriptions] = useState<CloudSubscription[]>([])
  const [billing, setBilling] = useState<CloudBilling[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const currentToken = token || useAuthStore.getState().token
    if (!currentToken) {
      console.error('No token available')
      setLoading(false)
      return
    }

    try {
      const [subsRes, billingRes] = await Promise.all([
        fetch('/api/subscriptions', {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/billing', {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ])

      if (subsRes.ok) {
        const subsData = await subsRes.json()
        setSubscriptions(subsData.subscriptions || [])
      } else {
        console.error('Subscriptions API error:', subsRes.status, await subsRes.text())
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json()
        setBilling(billingData.billing || [])
      } else {
        console.error('Billing API error:', billingRes.status, await billingRes.text())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const currentToken = token || useAuthStore.getState().token
    const currentUser = user || useAuthStore.getState().user

    if (!currentToken) {
      router.push('/login')
      return
    }

    if (!currentUser) {
      fetchUserData()
      return
    }

    fetchData()
  }, [token, user, fetchData, router])

  const fetchUserData = async () => {
    try {
      const currentToken = useAuthStore.getState().token
      if (!currentToken) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setAuth(data.user, currentToken)
          fetchData()
        }
      } else {
        clearAuth()
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      clearAuth()
      router.push('/login')
    }
  }

  const activeSubscription = subscriptions.find((sub) => sub.status === 'active')
  const isExpired =
    activeSubscription &&
    new Date(activeSubscription.expiry_date) < new Date()
  
  const daysRemaining = activeSubscription && !isExpired
    ? differenceInDays(new Date(activeSubscription.expiry_date), new Date())
    : 0

  const totalPaid = billing
    .filter((b) => b.payment_status === 'completed')
    .reduce((sum, b) => sum + Number(b.amount), 0)

  const pendingBills = billing.filter((b) => b.payment_status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Subscription Status Card Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-gray-300">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>

          {/* Quick Actions Skeleton */}
          <div className="mb-6 sm:mb-8">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                  <Skeleton className="h-8 w-8 mx-auto mb-2 rounded" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
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
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            ยินดีต้อนรับกลับมา,{' '}
            <span className="font-medium text-gray-900">
              {user?.full_name || user?.email}
            </span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">สถานะบริการ</p>
                <p className={`text-lg sm:text-xl font-bold ${
                  isExpired
                    ? 'text-red-600'
                    : activeSubscription
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}>
                  {isExpired
                    ? 'หมดอายุ'
                    : activeSubscription
                    ? 'ใช้งานอยู่'
                    : 'ไม่มีบริการ'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                isExpired
                  ? 'bg-red-100'
                  : activeSubscription
                  ? 'bg-green-100'
                  : 'bg-gray-100'
              }`}>
                {isExpired ? (
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                ) : activeSubscription ? (
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">จำนวนบิลรอชำระ</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {pendingBills}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">ชำระเงินทั้งหมด</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {totalPaid.toLocaleString()} THB
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Subscription ทั้งหมด</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {subscriptions.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="mb-6 sm:mb-8">
          <div
            className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 ${
              isExpired
                ? 'border-red-500 bg-red-50/30'
                : activeSubscription
                ? 'border-green-500 bg-green-50/30'
                : 'border-yellow-500 bg-yellow-50/30'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    สถานะ Subscription
                  </h2>
                </div>
                {activeSubscription ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">แผน:</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900">
                          {activeSubscription.plan_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">ประเภท:</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900">
                          {activeSubscription.plan_type === 'monthly'
                            ? 'รายเดือน'
                            : activeSubscription.plan_type === 'quarterly'
                            ? 'ราย 3 เดือน'
                            : activeSubscription.plan_type === 'yearly'
                            ? 'รายปี'
                            : 'ตลอดชีพ'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <p className="text-sm sm:text-base text-gray-600">
                        หมดอายุ:{' '}
                        <span className="font-semibold text-gray-900">
                          {format(
                            new Date(activeSubscription.expiry_date),
                            'dd MMMM yyyy',
                            { locale: th }
                          )}
                        </span>
                      </p>
                      {!isExpired && daysRemaining > 0 && (
                        <p className="text-sm sm:text-base text-green-600 font-semibold">
                          เหลืออีก {daysRemaining} วัน
                        </p>
                      )}
                    </div>
                    {isExpired && (
                      <div className="flex items-center gap-2 text-red-600 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">หมดอายุแล้ว</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">
                    คุณยังไม่มี subscription
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link
                  href="/invoices"
                  className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-primary-700 transition text-sm sm:text-base font-medium"
                >
                  <FileText className="h-4 w-4" />
                  <span>ดูบิลของฉัน</span>
                </Link>
                <Link
                  href="/services"
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 transition text-sm sm:text-base font-medium"
                >
                  <Server className="h-4 w-4" />
                  <span>บริการของฉัน</span>
                </Link>
                {!activeSubscription && (
                  <Link
                    href="/purchase"
                    className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-purple-700 transition text-sm sm:text-base font-medium"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>สั่งซื้อบริการ</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            เมนูด่วน
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/purchase"
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 hover:border-primary-300 hover:shadow-md transition text-center group"
            >
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mx-auto mb-2 group-hover:scale-110 transition" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                สั่งซื้อบริการ
              </p>
            </Link>
            <Link
              href="/invoices"
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 hover:border-primary-300 hover:shadow-md transition text-center group"
            >
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                บิลของฉัน
              </p>
            </Link>
            <Link
              href="/services"
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 hover:border-primary-300 hover:shadow-md transition text-center group"
            >
              <Server className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                บริการของฉัน
              </p>
            </Link>
            <Link
              href="/payment"
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 hover:border-primary-300 hover:shadow-md transition text-center group"
            >
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                ชำระเงิน
              </p>
            </Link>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              ประวัติ Subscriptions
            </h2>
            <Link
              href="/payment"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            {subscriptions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium text-sm sm:text-base">
                  ยังไม่มี subscription
                </p>
                <Link
                  href="/purchase"
                  className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  สั่งซื้อบริการ
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        แผน
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        ประเภท
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        จำนวนเงิน
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        สถานะ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                        วันหมดอายุ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.slice(0, 5).map((sub) => {
                      const subIsExpired = new Date(sub.expiry_date) < new Date()
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {sub.plan_name}
                            </div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">
                              {sub.plan_type === 'monthly'
                                ? 'รายเดือน'
                                : sub.plan_type === 'quarterly'
                                ? 'ราย 3 เดือน'
                                : sub.plan_type === 'yearly'
                                ? 'รายปี'
                                : 'ตลอดชีพ'}
                            </div>
                            <div className="md:hidden text-xs text-gray-500 mt-1">
                              {sub.amount.toLocaleString()} {sub.currency}
                            </div>
                            <div className="lg:hidden text-xs text-gray-500 mt-1">
                              {format(new Date(sub.expiry_date), 'dd/MM/yyyy', {
                                locale: th,
                              })}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                            {sub.plan_type === 'monthly'
                              ? 'รายเดือน'
                              : sub.plan_type === 'quarterly'
                              ? 'ราย 3 เดือน'
                              : sub.plan_type === 'yearly'
                              ? 'รายปี'
                              : 'ตลอดชีพ'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {sub.amount.toLocaleString()} {sub.currency}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                sub.status === 'active' && !subIsExpired
                                  ? 'bg-green-100 text-green-800'
                                  : sub.status === 'expired' || subIsExpired
                                  ? 'bg-red-100 text-red-800'
                                  : sub.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {sub.status === 'active' && !subIsExpired
                                ? 'ใช้งาน'
                                : sub.status === 'expired' || subIsExpired
                                ? 'หมดอายุ'
                                : sub.status === 'cancelled'
                                ? 'ยกเลิก'
                                : 'รอดำเนินการ'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {format(new Date(sub.expiry_date), 'dd MMM yyyy', {
                              locale: th,
                            })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Billing History */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              ประวัติการชำระเงินล่าสุด
            </h2>
            <Link
              href="/invoices"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            {billing.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium text-sm sm:text-base">
                  ยังไม่มีประวัติการชำระเงิน
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        จำนวนเงิน
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        วิธีชำระ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        สถานะ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        วันชำระเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billing.slice(0, 5).map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {bill.amount.toLocaleString()} {bill.currency}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 mt-1">
                            {bill.payment_method || '-'}
                          </div>
                          <div className="md:hidden text-xs text-gray-500 mt-1">
                            {bill.payment_date
                              ? format(new Date(bill.payment_date), 'dd/MM/yyyy', {
                                  locale: th,
                                })
                              : '-'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                          {bill.payment_method || '-'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              bill.payment_status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : bill.payment_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : bill.payment_status === 'refunded'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {bill.payment_status === 'completed'
                              ? 'สำเร็จ'
                              : bill.payment_status === 'failed'
                              ? 'ล้มเหลว'
                              : bill.payment_status === 'refunded'
                              ? 'คืนเงิน'
                              : 'รอดำเนินการ'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {bill.payment_date
                            ? format(new Date(bill.payment_date), 'dd MMM yyyy HH:mm', {
                                locale: th,
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
