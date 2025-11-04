'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { CloudInvoice } from '@/lib/supabase'
import { format, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { checkPaymentStatus } from '@/lib/qr-payment'
import {
  FileText,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  QrCode,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

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

      startPolling(data.payment_id, invoice.id)
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง QR Payment')
    }
  }

  const startPolling = (idPay: string, invoiceId: string) => {
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

          await fetch(`/api/invoices/${invoiceId}/check-payment`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          await fetchInvoices()

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
    }, 5000)

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">บิลของฉัน</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            ดูและชำระบิลของคุณ
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium text-lg mb-2">ยังไม่มีบิล</p>
            <Link
              href="/purchase"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              สั่งซื้อบริการ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {invoices.map((invoice) => {
              const isOverdue =
                invoice.status === 'pending' &&
                new Date(invoice.due_date) < new Date()
              const daysUntilDue = differenceInDays(
                new Date(invoice.due_date),
                new Date()
              )

              return (
                <div
                  key={invoice.id}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
                    isOverdue
                      ? 'border-red-200 bg-red-50/30'
                      : invoice.status === 'paid'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="p-4 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <h3 className="text-lg font-bold text-gray-900">
                            {invoice.invoice_number}
                          </h3>
                        </div>
                        {invoice.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {invoice.description}
                          </p>
                        )}
                        {invoice.machine_specs && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {invoice.machine_specs.cpu && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {invoice.machine_specs.cpu}
                              </span>
                            )}
                            {invoice.machine_specs.ram && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {invoice.machine_specs.ram}
                              </span>
                            )}
                            {invoice.machine_specs.storage && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {invoice.machine_specs.storage}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                          {invoice.amount.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600">{invoice.currency}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          ครบกำหนด:{' '}
                          <span className="font-medium text-gray-900">
                            {format(new Date(invoice.due_date), 'dd MMMM yyyy', {
                              locale: th,
                            })}
                          </span>
                        </span>
                      </div>
                      {invoice.status === 'pending' && !isOverdue && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            เหลืออีก {daysUntilDue} วัน
                          </span>
                        </div>
                      )}
                      {isOverdue && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">เลยกำหนดชำระแล้ว</span>
                        </div>
                      )}
                      {invoice.status === 'paid' && invoice.paid_at && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            ชำระเมื่อ:{' '}
                            {format(new Date(invoice.paid_at), 'dd/MM/yyyy HH:mm', {
                              locale: th,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4">
                      {invoice.status === 'pending' && !isOverdue && (
                        <button
                          onClick={() => handlePay(invoice)}
                          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition font-medium"
                        >
                          <CreditCard className="h-5 w-5" />
                          <span>ชำระเงิน</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* QR Payment Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  ชำระเงิน
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {paymentStatus === 'paid' ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      ชำระเงินสำเร็จ!
                    </h4>
                    <p className="text-gray-700 font-medium">
                      บิลของคุณถูกชำระเรียบร้อยแล้ว
                    </p>
                  </div>
                ) : paymentStatus === 'timeout' ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      QR Code หมดอายุ
                    </h4>
                    <p className="text-gray-700 font-medium mb-4">
                      กรุณากดปุ่มชำระเงินอีกครั้งเพื่อสร้าง QR Code ใหม่
                    </p>
                    <button
                      onClick={() => handlePay(selectedInvoice)}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
                    >
                      สร้าง QR Code ใหม่
                    </button>
                  </div>
                ) : qrImage ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">
                        เลขที่บิล: {selectedInvoice.invoice_number}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        จำนวนเงิน: {selectedInvoice.amount.toLocaleString()}{' '}
                        {selectedInvoice.currency}
                      </div>
                    </div>

                    <div className="text-center mb-4">
                      <div className="inline-block p-3 sm:p-4 bg-white rounded-lg border-2 border-gray-200">
                        <img
                          src={`data:image/png;base64,${qrImage}`}
                          alt="QR Code"
                          className="w-48 h-48 sm:w-64 sm:h-64 mx-auto"
                        />
                      </div>
                      <p className="mt-4 text-sm text-gray-600">
                        สแกน QR Code เพื่อชำระเงินผ่าน PromptPay
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                        <p className="text-xs text-gray-500">
                          กำลังตรวจสอบสถานะการชำระเงิน...
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>หมายเหตุ:</strong> ระบบจะตรวจสอบสถานะการชำระเงินอัตโนมัติ
                        กรุณารอสักครู่
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-700 font-medium">กำลังสร้าง QR Code...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
