'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { CloudUser, CloudInvoice, CloudMachineService } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  )
}

function AdminContent() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invoices'>('dashboard')
  const [users, setUsers] = useState<CloudUser[]>([])
  const [invoices, setInvoices] = useState<CloudInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    // ถ้าไม่มี token ให้ redirect ไป login
    if (!token) {
      router.push('/login')
      return
    }

    // ถ้ายังไม่มี user ให้ fetch จาก API
    if (!user) {
      fetchUserData()
      return
    }

    // ตรวจสอบ role
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // ถ้าเป็น admin แล้วให้ fetch data
    fetchData()
  }, [user, token, router])

  const fetchUserData = async () => {
    try {
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // อัพเดท user ใน store
        if (data.user) {
          useAuthStore.getState().setAuth(data.user, token)
        }

        // ตรวจสอบ role อีกครั้ง
        if (data.user?.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        // ถ้าเป็น admin ให้ fetch data
        fetchData()
      } else {
        // ถ้าไม่สามารถ fetch user ได้ ให้ redirect ไป login
        useAuthStore.getState().clearAuth()
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      useAuthStore.getState().clearAuth()
      router.push('/login')
    }
  }

  const fetchData = async () => {
    try {
      const [usersRes, invoicesRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/invoices', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
        setStats((prev) => ({ ...prev, totalUsers: usersData.users?.length || 0 }))
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices || [])
        const pending = invoicesData.invoices?.filter((inv: CloudInvoice) => inv.status === 'pending').length || 0
        const revenue = invoicesData.invoices
          ?.filter((inv: CloudInvoice) => inv.status === 'paid')
          .reduce((sum: number, inv: CloudInvoice) => sum + Number(inv.amount), 0) || 0
        setStats((prev) => ({
          ...prev,
          totalInvoices: invoicesData.invoices?.length || 0,
          pendingInvoices: pending,
          totalRevenue: revenue,
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Tabs Skeleton */}
          <div className="mb-6 flex gap-4 border-b">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24 mb-4" />
            ))}
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-20 rounded-lg ml-auto" />
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">จัดการระบบและข้อมูลทั้งหมด</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              จัดการผู้ใช้
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              จัดการบิล
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ผู้ใช้ทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">บิลทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalInvoices}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">บิลรอชำระ</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pendingInvoices}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">รายได้รวม</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalRevenue.toLocaleString()} ฿
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UsersManagement users={users} token={token} onUpdate={fetchData} />
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <InvoicesManagement invoices={invoices} token={token} onUpdate={fetchData} />
        )}
      </main>
    </div>
  )
}

function UsersManagement({
  users,
  token,
  onUpdate,
}: {
  users: CloudUser[]
  token: string | null
  onUpdate: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<CloudUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'user' as 'admin' | 'user',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowModal(false)
        setEditingUser(null)
        setFormData({ email: '', password: '', full_name: '', phone: '', role: 'user' })
        onUpdate()
      } else {
        const data = await response.json()
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        onUpdate()
      } else {
        const data = await response.json()
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">จัดการผู้ใช้</h2>
        <button
          onClick={() => {
            setEditingUser(null)
            setFormData({ email: '', password: '', full_name: '', phone: '', role: 'user' })
            setShowModal(true)
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + เพิ่มผู้ใช้
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingUser(user)
                      setFormData({
                        email: user.email,
                        password: '',
                        full_name: user.full_name || '',
                        phone: user.phone || '',
                        role: user.role,
                      })
                      setShowModal(true)
                    }}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {editingUser ? 'รหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">เบอร์โทร</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    setEditingUser(null)
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  {editingUser ? 'อัพเดท' : 'สร้าง'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoicesManagement({
  invoices,
  token,
  onUpdate,
}: {
  invoices: CloudInvoice[]
  token: string | null
  onUpdate: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<CloudInvoice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<CloudUser[]>([])
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    currency: 'THB',
    usage_days: '',
    description: '',
    machine_specs: {
      cpu: '',
      ram: '',
      storage: '',
      bandwidth: '',
      os: '',
      gpu: '',
    },
    usage_limit_per_month: '',
    machine_type: '',
  })

  useEffect(() => {
    fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // สร้าง machine_specs object จาก formData
      const machineSpecs: any = {}
      if (formData.machine_specs.cpu) machineSpecs.cpu = formData.machine_specs.cpu
      if (formData.machine_specs.ram) machineSpecs.ram = formData.machine_specs.ram
      if (formData.machine_specs.storage) machineSpecs.storage = formData.machine_specs.storage
      if (formData.machine_specs.bandwidth) machineSpecs.bandwidth = formData.machine_specs.bandwidth
      if (formData.machine_specs.os) machineSpecs.os = formData.machine_specs.os
      if (formData.machine_specs.gpu) machineSpecs.gpu = formData.machine_specs.gpu

      const url = editingInvoice
        ? `/api/invoices/${editingInvoice.id}`
        : '/api/invoices'
      const method = editingInvoice ? 'PUT' : 'POST'

      // คำนวณ due_date จากจำนวนวันใช้งาน
      const usageDays = parseInt(formData.usage_days) || 0
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + usageDays)

      const requestBody = {
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        due_date: dueDate.toISOString(),
        description: formData.description,
        machine_specs: Object.keys(machineSpecs).length > 0 ? machineSpecs : null,
        usage_limit_per_month: formData.usage_limit_per_month
          ? parseInt(formData.usage_limit_per_month)
          : null,
        machine_info: formData.machine_type
          ? { type: formData.machine_type }
          : null,
        status: editingInvoice?.status || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setShowModal(false)
        setEditingInvoice(null)
        setFormData({
          user_id: '',
          amount: '',
          currency: 'THB',
          usage_days: '',
          description: '',
          machine_specs: {
            cpu: '',
            ram: '',
            storage: '',
            bandwidth: '',
            os: '',
            gpu: '',
          },
          usage_limit_per_month: '',
          machine_type: '',
        })
        onUpdate()
      } else {
        const data = await response.json()
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบิลนี้?')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        onUpdate()
      } else {
        const data = await response.json()
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">จัดการบิล</h2>
        <button
          onClick={() => {
            setEditingInvoice(null)
            setFormData({
              user_id: '',
              amount: '',
              currency: 'THB',
              usage_days: '',
              description: '',
              machine_specs: {
                cpu: '',
                ram: '',
                storage: '',
                bandwidth: '',
                os: '',
                gpu: '',
              },
              usage_limit_per_month: '',
              machine_type: '',
            })
            setShowModal(true)
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + สร้างบิลใหม่
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่บิล</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">จำนวนเงิน</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">วันครบกำหนด</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                  <div>{invoice.invoice_number}</div>
                  <div className="sm:hidden text-xs text-gray-500 mt-1">
                    {invoice.amount.toLocaleString()} {invoice.currency}
                  </div>
                  <div className="sm:hidden text-xs text-gray-400 mt-1">
                    {new Date(invoice.due_date).toLocaleDateString('th-TH')}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                  {invoice.amount.toLocaleString()} {invoice.currency}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : invoice.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {invoice.status === 'paid'
                      ? 'ชำระแล้ว'
                      : invoice.status === 'overdue'
                      ? 'เลยกำหนด'
                      : invoice.status === 'cancelled'
                      ? 'ยกเลิก'
                      : 'รอชำระ'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                  {new Date(invoice.due_date).toLocaleDateString('th-TH')}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingInvoice(invoice)
                        const machineSpecs = invoice.machine_specs || {}
                        // คำนวณจำนวนวันใช้งานจาก due_date
                        const invoiceDate = new Date(invoice.due_date)
                        const today = new Date()
                        const daysDiff = Math.ceil((invoiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        const usageDays = daysDiff > 0 ? daysDiff.toString() : '30'

                        setFormData({
                          user_id: invoice.user_id,
                          amount: invoice.amount.toString(),
                          currency: invoice.currency,
                          usage_days: usageDays,
                          description: invoice.description || '',
                          machine_specs: {
                            cpu: (machineSpecs as any)?.cpu || '',
                            ram: (machineSpecs as any)?.ram || '',
                            storage: (machineSpecs as any)?.storage || '',
                            bandwidth: (machineSpecs as any)?.bandwidth || '',
                            os: (machineSpecs as any)?.os || '',
                            gpu: (machineSpecs as any)?.gpu || '',
                          },
                          usage_limit_per_month: invoice.usage_limit_per_month?.toString() || '',
                          machine_type: invoice.machine_info?.type || '',
                        })
                        setShowModal(true)
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-2 sm:px-4">
          <div className="relative top-4 sm:top-10 mx-auto p-4 sm:p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingInvoice ? 'แก้ไขบิล' : 'สร้างบิลใหม่'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ลูกค้า</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">เลือกลูกค้า</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.full_name ? `(${user.full_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวนเงิน</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวนวันใช้งาน</label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_days}
                  onChange={(e) => setFormData({ ...formData, usage_days: e.target.value })}
                  required
                  placeholder="เช่น 30 (สำหรับ 30 วัน)"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ระบบจะคำนวณวันครบกำหนดอัตโนมัติจากวันปัจจุบัน + จำนวนวันใช้งาน
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>

              {/* Machine Specs Section */}
              <div className="border-t pt-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">สเปคเครื่อง (ไม่บังคับ)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPU</label>
                    <input
                      type="text"
                      value={formData.machine_specs.cpu}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, cpu: e.target.value },
                        })
                      }
                      placeholder="เช่น 4 vCPU"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RAM</label>
                    <input
                      type="text"
                      value={formData.machine_specs.ram}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, ram: e.target.value },
                        })
                      }
                      placeholder="เช่น 8GB"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Storage</label>
                    <input
                      type="text"
                      value={formData.machine_specs.storage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, storage: e.target.value },
                        })
                      }
                      placeholder="เช่น 100GB SSD"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bandwidth</label>
                    <input
                      type="text"
                      value={formData.machine_specs.bandwidth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, bandwidth: e.target.value },
                        })
                      }
                      placeholder="เช่น 1Gbps"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">OS</label>
                    <input
                      type="text"
                      value={formData.machine_specs.os}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, os: e.target.value },
                        })
                      }
                      placeholder="เช่น Ubuntu 22.04"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GPU</label>
                    <input
                      type="text"
                      value={formData.machine_specs.gpu}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          machine_specs: { ...formData.machine_specs, gpu: e.target.value },
                        })
                      }
                      placeholder="เช่น NVIDIA RTX 4090"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    จำนวนการใช้งานต่อเดือน (ครั้ง)
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit_per_month}
                    onChange={(e) =>
                      setFormData({ ...formData, usage_limit_per_month: e.target.value })
                    }
                    placeholder="เช่น 1000"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ประเภทเครื่อง</label>
                  <input
                    type="text"
                    value={formData.machine_type}
                    onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
                    placeholder="เช่น cloud-vm, dedicated-server"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>

              {/* Status field for editing */}
              {editingInvoice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                  <select
                    value={editingInvoice.status}
                    onChange={(e) => {
                      // Update status in editingInvoice
                      if (editingInvoice) {
                        const updated = { ...editingInvoice, status: e.target.value as any }
                        setEditingInvoice(updated)
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="pending">รอชำระ</option>
                    <option value="paid">ชำระแล้ว</option>
                    <option value="overdue">เลยกำหนด</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  {editingInvoice ? 'อัพเดทบิล' : 'สร้างบิล'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

