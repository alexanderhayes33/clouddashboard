'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { CloudInvoice } from '@/lib/supabase'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { checkPaymentStatus } from '@/lib/qr-payment'

export default function InvoicesPage() {
  return (
    <ProtectedRoute>
      <InvoicesContent />
    </ProtectedRoute>
  )
}

function InvoicesContent() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [invoices, setInvoices] = useState<CloudInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<CloudInvoice | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'timeout' | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (token) {
      fetchInvoices()
    }
  }, [token])

  useEffect(() => {
    // Cleanup polling when component unmounts
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (invoice: CloudInvoice) => {
    try {
      setSelectedInvoice(invoice)
      setPaymentStatus('pending')

      const response = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'เกิดข้อผิดพลาด')
        return
      }

      setQrImage(data.qr_image_base64)
      setPaymentId(data.payment_id)

      // เริ่ม polling เพื่อตรวจสอบสถานะ
      startPolling(data.payment_id, invoice.id)
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง QR Payment')
    }
  }

  const startPolling = (idPay: string, invoiceId: string) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const status = await checkPaymentStatus(idPay)

        if (status.status === 'PAID') {
          clearInterval(interval)
          setPaymentStatus('paid')
          setPollingInterval(null)

          // อัพเดท invoice ผ่าน check-payment API
          await fetch(`/api/invoices/${invoiceId}/check-payment`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          // Refresh invoices
          await fetchInvoices()

          // แสดงข้อความสำเร็จ
          setTimeout(() => {
            setSelectedInvoice(null)
            setQrImage(null)
            setPaymentId(null)
            setPaymentStatus(null)
            alert('ชำระเงินสำเร็จ!')
          }, 2000)
        } else if (status.status === 'TIMEOUT' || status.status === 'CANCELLED') {
          clearInterval(interval)
          setPaymentStatus('timeout')
          setPollingInterval(null)
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }, 5000) // ตรวจสอบทุก 5 วินาที

    setPollingInterval(interval)
  }

  const handleCloseModal = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setSelectedInvoice(null)
    setQrImage(null)
    setPaymentId(null)
    setPaymentStatus(null)
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
          <h1 className="text-3xl font-bold text-gray-900">บิลของฉัน</h1>
          <p className="mt-2 text-gray-600">ดูและชำระบิลของคุณ</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-700 font-medium">ยังไม่มีบิล</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        เลขที่บิล
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        จำนวนเงิน
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        สถานะ
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        วันครบกำหนด
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const isOverdue =
                      invoice.status === 'pending' &&
                      new Date(invoice.due_date) < new Date()

                    return (
                      <tr key={invoice.id} className={isOverdue ? 'bg-red-50' : ''}>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          {invoice.description && (
                            <div className="text-xs sm:text-sm text-gray-500 mt-1">{invoice.description}</div>
                          )}
                          {invoice.machine_specs && (
                            <div className="text-xs text-gray-400 mt-1">
                              {invoice.machine_specs.cpu && `CPU: ${invoice.machine_specs.cpu}`}
                              {invoice.machine_specs.ram && ` | RAM: ${invoice.machine_specs.ram}`}
                            </div>
                          )}
                          <div className="sm:hidden text-sm font-semibold text-gray-900 mt-2">
                            {invoice.amount.toLocaleString()} {invoice.currency}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 mt-1">
                            {format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: th })}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 hidden sm:table-cell">
                          {invoice.amount.toLocaleString()} {invoice.currency}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : isOverdue
                                ? 'bg-red-100 text-red-800'
                                : invoice.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {invoice.status === 'paid'
                              ? 'ชำระแล้ว'
                              : isOverdue
                              ? 'เลยกำหนด'
                              : invoice.status === 'cancelled'
                              ? 'ยกเลิก'
                              : 'รอชำระ'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: th })}
                          {isOverdue && (
                            <div className="text-xs text-red-600 mt-1">เลยกำหนดแล้ว</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invoice.status === 'pending' && !isOverdue && (
                            <button
                              onClick={() => handlePay(invoice)}
                              className="text-primary-600 hover:text-primary-900 font-medium"
                            >
                              ชำระเงิน
                            </button>
                          )}
                          {invoice.status === 'paid' && invoice.paid_at && (
                            <div className="text-sm text-gray-500">
                              ชำระเมื่อ:{' '}
                              {format(new Date(invoice.paid_at), 'dd/MM/yyyy HH:mm', { locale: th })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
          <div className="relative top-10 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">ชำระเงิน</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {paymentStatus === 'paid' ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-8 w-8 text-green-600"
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
                <h4 className="text-xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ!</h4>
                <p className="text-gray-700 font-medium">บิลของคุณถูกชำระเรียบร้อยแล้ว</p>
              </div>
            ) : paymentStatus === 'timeout' ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">QR Code หมดอายุ</h4>
                <p className="text-gray-700 font-medium mb-4">กรุณากดปุ่มชำระเงินอีกครั้งเพื่อสร้าง QR Code ใหม่</p>
                <button
                  onClick={() => handlePay(selectedInvoice)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                >
                  สร้าง QR Code ใหม่
                </button>
              </div>
            ) : qrImage ? (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">เลขที่บิล: {selectedInvoice.invoice_number}</div>
                  <div className="text-lg font-bold text-gray-900">
                    จำนวนเงิน: {selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="inline-block p-2 sm:p-4 bg-white rounded-lg border-2 border-gray-200">
                    <img
                      src={`data:image/png;base64,${qrImage}`}
                      alt="QR Code"
                      className="w-48 h-48 sm:w-64 sm:h-64 mx-auto"
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    สแกน QR Code เพื่อชำระเงินผ่าน PromptPay
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    กำลังตรวจสอบสถานะการชำระเงิน...
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>หมายเหตุ:</strong> QR Code จะหมดอายุใน 15 นาที
                    ระบบจะตรวจสอบสถานะการชำระเงินอัตโนมัติ
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-700 font-medium">กำลังสร้าง QR Code...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

