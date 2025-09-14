import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  CreditCard,
  BarChart3,
  Receipt,
  Settings,
  X,
  DollarSign,
  Search,
  LogOut,
  User
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Receipts', href: '/receipts', icon: Receipt },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation()

  // Close sidebar with Escape key
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors
     ${isActive
       ? 'bg-primary-600 text-white shadow-sm'
       : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
     }`

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex ${collapsed ? 'w-20' : 'w-64'} transition-all`}>
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg">
          
          {/* Brand & Collapse button */}
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="px-2 rounded-full">
                <img src="logo.png" alt="BudgetBuddy" className='h-20 w-20'  />
              </div>
              {!collapsed && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">BudgetBuddy</h1>
              )}
            </div>
          </div>

          {/* Search */}
          {!collapsed && (
            <div className="px-4 mt-5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="mt-6 flex-grow px-2 space-y-1" role="navigation" aria-label="Sidebar">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.name} to={item.href} className={navItemClass}>
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        transition-transform duration-300 ease-in-out lg:hidden shadow-lg`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">FinanceApp</h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto">
            <nav className="px-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={navItemClass}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
