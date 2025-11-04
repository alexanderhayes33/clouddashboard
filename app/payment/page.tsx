'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const PLANS = [
  {
    name: 'Basic',
    type: 'monthly' as const,
    amount: 299,
    duration: '1 เดือน',
    features: ['พื้นที่เก็บข้อมูล 10GB', 'รองรับการใช้งานพื้นฐาน'],
  },
  {
    name: 'Pro',
    type: 'quarterly' as const,
    amount: 799,
    duration: '3 เดือน',
    features: ['พื้นที่เก็บข้อมูล 50GB', 'รองรับการใช้งานขั้นสูง', 'ความเร็วสูง'],
  },
  {
    name: 'Enterprise',
    type: 'yearly' as const,
    amount: 2999,
    duration: '1 ปี',
    features: [
      'พื้นที่เก็บข้อมูลไม่จำกัด',
      'รองรับการใช้งานเต็มรูปแบบ',
      'ความเร็วสูงสุด',
      'Support 24/7',
    ],
  },
]

export default function PaymentPage() {
  return (
    <ProtectedRoute>
      <PaymentContent />
    </ProtectedRoute>
  )
}

function PaymentContent() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const calculateExpiryDate = (planType: string) => {
    const now = new Date()
    switch (planType) {
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        now.setMonth(now.getMonth() + 3)
        break
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1)
        break
      case 'lifetime':
        now.setFullYear(now.getFullYear() + 100) // 100 ปี = lifetime
        break
    }
    return now.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) {
      setError('กรุณาเลือกแผน')
      return
    }

    if (!paymentMethod || !transactionId) {
      setError('กรุณากรอกข้อมูลการชำระเงินให้ครบถ้วน')
      return
    }

    setLoading(true)
    setError('')

    try {
      // สร้าง subscription
      const subscriptionRes = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_name: selectedPlan.name,
          plan_type: selectedPlan.type,
          amount: selectedPlan.amount,
          currency: 'THB',
          expiry_date: calculateExpiryDate(selectedPlan.type),
        }),
      })

      const subscriptionData = await subscriptionRes.json()

      if (!subscriptionRes.ok) {
        setError(subscriptionData.error || 'เกิดข้อผิดพลาดในการสร้าง subscription')
        setLoading(false)
        return
      }

      // สร้าง billing
      const billingRes = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_id: subscriptionData.subscription.id,
          amount: selectedPlan.amount,
          currency: 'THB',
          payment_method: paymentMethod,
          transaction_id: transactionId,
          description: `ชำระเงินสำหรับแผน ${selectedPlan.name} - ${selectedPlan.duration}`,
        }),
      })

      const billingData = await billingRes.json()

      if (!billingRes.ok) {
        setError(billingData.error || 'เกิดข้อผิดพลาดในการสร้าง billing')
        setLoading(false)
        return
      }

      // อัพเดท billing เป็น completed
      await fetch(`/api/billing/${billingData.billing.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          payment_method: paymentMethod,
        }),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ชำระเงินสำเร็จ!
          </h2>
          <p className="text-gray-700 font-medium mb-4">
            กำลังเปลี่ยนเส้นทางไปยัง Dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">เลือกแผนและชำระเงิน</h1>
          <p className="mt-2 text-gray-600">เลือกแผนที่เหมาะกับคุณ</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan)}
              className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${
                selectedPlan?.name === plan.name
                  ? 'ring-2 ring-primary-500 border-primary-500'
                  : 'hover:shadow-lg'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-primary-600">
                  {plan.amount.toLocaleString()}
                </span>
                <span className="text-gray-600"> บาท</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{plan.duration}</p>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              {selectedPlan?.name === plan.name && (
                <div className="mt-4 p-2 bg-primary-50 text-primary-700 rounded text-center text-sm font-medium">
                  ✓ เลือกแล้ว
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ข้อมูลการชำระเงิน
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แผนที่เลือก
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedPlan.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedPlan.amount.toLocaleString()} บาท - {selectedPlan.duration}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="paymentMethod"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  วิธีชำระเงิน
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">เลือกวิธีชำระเงิน</option>
                  <option value="bank_transfer">โอนเงินผ่านธนาคาร</option>
                  <option value="credit_card">บัตรเครดิต</option>
                  <option value="promptpay">พร้อมเพย์</option>
                  <option value="truewallet">TrueMoney Wallet</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="transactionId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Transaction ID / เลขที่อ้างอิง
                </label>
                <input
                  id="transactionId"
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                  placeholder="เช่น 123456789 หรือ SLIP-2024-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-700">รวมทั้งสิ้น</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {selectedPlan.amount.toLocaleString()} บาท
                  </span>
                </div>
                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full"
                  size="lg"
                >
                  ยืนยันการชำระเงิน
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

