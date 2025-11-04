const QR_PAYMENT_API_URL = process.env.NEXT_PUBLIC_QR_PAYMENT_API_URL || 'http://154.215.14.36:4000'

export interface CreatePaymentRequest {
  amount: number
  ref1: string
}

export interface CreatePaymentResponse {
  status: number
  qr_image_base64?: string
  amount?: string
  time_out?: string
  id_pay?: string
  message?: string
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'PAID' | 'TIMEOUT' | 'CANCELLED' | 'ERROR'
  id_pay: string
  amount: string
  ref1: string
  transaction_id?: string
  paid_at?: string
  bank_ref?: string
  created_at?: string
  expired_at?: string
}

export async function createQRPayment(
  amount: number,
  ref1: string
): Promise<CreatePaymentResponse> {
  try {
    const response = await fetch(`${QR_PAYMENT_API_URL}/create_payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        ref1,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating QR payment:', error)
    throw error
  }
}

export async function checkPaymentStatus(
  idPay: string
): Promise<PaymentStatusResponse> {
  try {
    const response = await fetch(
      `${QR_PAYMENT_API_URL}/api/payment_status?id_pay=${encodeURIComponent(idPay)}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error checking payment status:', error)
    throw error
  }
}

