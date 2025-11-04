'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { CloudSubscription, CloudBilling } from '@/lib/supabase'

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
    // ตรวจสอบว่า token มีค่าหรือไม่
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
  }, [])

  useEffect(() => {
    const currentToken = token || useAuthStore.getState().token
    const currentUser = user || useAuthStore.getState().user

    // ตรวจสอบว่า token มีค่าหรือไม่
    if (!currentToken) {
      // ถ้าไม่มี token ให้ redirect ไป login
      router.push('/login')
      return
    }

    // ถ้ายังไม่มี user ให้ fetch user data ก่อน
    if (!currentUser) {
      fetchUserData()
      return
    }

    // ถ้ามีทั้ง token และ user แล้วให้ fetch data
    fetchData()
  }, [])

  const fetchUserData = async () => {
    try {
      // ถ้ายังไม่มี token ใน store ให้ logout
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
          // อัพเดท user ใน store
          setAuth(data.user, currentToken)
          // Fetch data หลังจากอัพเดท user
          fetchData()
        }
      } else {
        // Token ไม่ valid ให้ logout
        clearAuth()
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      clearAuth()
      router.push('/login')
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const activeSubscription = subscriptions.find((sub) => sub.status === 'active')
  const isExpired =
    activeSubscription &&
    new Date(activeSubscription.expiry_date) < new Date()

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">ยินดีต้อนรับกลับมา, {user?.full_name || user?.email}</p>
        </div>
        {/* Status Card */}
        <div className="mb-8">
          <div
            className={`bg-white rounded-lg shadow-md p-6 ${
              isExpired
                ? 'border-l-4 border-red-500'
                : activeSubscription
                ? 'border-l-4 border-green-500'
                : 'border-l-4 border-yellow-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  สถานะ Subscription
                </h2>
                {activeSubscription ? (
                  <div>
                    <p className="text-gray-600 mb-1">
                      แผน: <span className="font-medium">{activeSubscription.plan_name}</span>
                    </p>
                    <p className="text-gray-600 mb-1">
                      ประเภท: <span className="font-medium">{activeSubscription.plan_type}</span>
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isExpired ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {isExpired ? 'หมดอายุแล้ว' : 'ใช้งานได้'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      หมดอายุ:{' '}
                      {format(
                        new Date(activeSubscription.expiry_date),
                        'dd MMMM yyyy',
                        { locale: th }
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">คุณยังไม่มี subscription</p>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/invoices"
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  ดูบิลของฉัน
                </Link>
                <Link
                  href="/services"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                >
                  บริการของฉัน
                </Link>
                {!activeSubscription && (
                  <Link
                    href="/payment"
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
                  >
                    สมัครใช้งาน
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ประวัติ Subscriptions
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-700 font-medium">ยังไม่มี subscription</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        แผน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ประเภท
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จำนวนเงิน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันเริ่มต้น
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันหมดอายุ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.plan_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.plan_type === 'monthly'
                            ? 'รายเดือน'
                            : sub.plan_type === 'quarterly'
                            ? 'ราย 3 เดือน'
                            : sub.plan_type === 'yearly'
                            ? 'รายปี'
                            : 'ตลอดชีพ'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.amount.toLocaleString()} {sub.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              sub.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'expired'
                                ? 'bg-red-100 text-red-800'
                                : sub.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {sub.status === 'active'
                              ? 'ใช้งาน'
                              : sub.status === 'expired'
                              ? 'หมดอายุ'
                              : sub.status === 'cancelled'
                              ? 'ยกเลิก'
                              : 'รอดำเนินการ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(sub.start_date), 'dd/MM/yyyy', {
                            locale: th,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(sub.expiry_date), 'dd/MM/yyyy', {
                            locale: th,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Billing History */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ประวัติการชำระเงิน
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {billing.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-700 font-medium">ยังไม่มีประวัติการชำระเงิน</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จำนวนเงิน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วิธีชำระ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันชำระเงิน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billing.map((bill) => (
                      <tr key={bill.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.amount.toLocaleString()} {bill.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.payment_method || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.payment_date
                            ? format(new Date(bill.payment_date), 'dd/MM/yyyy HH:mm', {
                                locale: th,
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.transaction_id || '-'}
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

