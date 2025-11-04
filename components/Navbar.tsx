'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  FileText,
  Server,
  Settings,
  User,
  LogOut,
  Shield,
} from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const { user, clearAuth, isAuthenticated } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!isAuthenticated) return null

  // ดึงตัวอักษรแรกของ email สำหรับ avatar
  const getInitials = (email?: string) => {
    if (!email) return 'U'
    return email.charAt(0).toUpperCase()
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex space-x-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/invoices"
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">บิลของฉัน</span>
              </Link>
              <Link
                href="/services"
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition"
              >
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">บริการของฉัน</span>
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-primary-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-600 text-white">
                      {getInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || 'ผู้ใช้'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/invoices" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    บิลของฉัน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/services" className="flex items-center gap-2 cursor-pointer">
                    <Server className="h-4 w-4" />
                    บริการของฉัน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
