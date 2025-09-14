import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Save, User, Lock, Bell, Palette, Globe, Download, Trash2, Moon, Sun, Mail, Smartphone, PieChart, AlertCircle, Zap } from 'lucide-react'
import { Card, Button, Input, Select, Alert, Switch, Tabs, Tab } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const Settings = () => {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [showSuccess, setShowSuccess] = useState(false)

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'preferences', name: 'Preferences', icon: Palette },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'data', name: 'Data & Privacy', icon: Download }
  ]

  const ProfileTab = () => {
    const {
      register,
      handleSubmit,
      formState: { errors, isDirty }
    } = useForm({
      defaultValues: {
        name: user?.name || '',
        email: user?.email || ''
      }
    })

    const onSubmit = async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-800"></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Information</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account profile and personal details
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
              error={errors.name?.message}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />

            <Input
              label="Email Address"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={errors.email?.message}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>

          {isDirty && (
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    )
  }

  const SecurityTab = () => {
    const {
      register,
      handleSubmit,
      watch,
      formState: { errors, isDirty }
    } = useForm()

    const watchPassword = watch('newPassword')

    const onSubmit = async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Keep your account secure with strong authentication
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...register('currentPassword', {
                required: 'Current password is required'
              })}
              error={errors.currentPassword?.message}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />

            <Input
              label="New Password"
              type="password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
              error={errors.newPassword?.message}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />

            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === watchPassword || 'Passwords do not match'
              })}
              error={errors.confirmPassword?.message}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>

          {isDirty && (
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button 
                type="submit"
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Lock className="w-5 h-5 mr-2" />
                Update Password
              </Button>
            </div>
          )}
        </form>
      </div>
    )
  }

  const PreferencesTab = () => {
    const [currency, setCurrency] = useState('USD')
    const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Palette className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">App Preferences</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Customize your personal finance assistant experience
          </p>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Theme Toggle */}
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-xl flex items-center justify-center">
                  {isDark ? <Moon className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Sun className="w-6 h-6 text-yellow-600" />}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Theme</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="flex items-center gap-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 px-4 py-2 rounded-xl transition-all duration-200"
              >
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Currency and Date Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                💰 Currency
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                📅 Date Format
              </label>
              <Select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
              <Save className="w-5 h-5 mr-2" />
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const NotificationsTab = () => {
    const [notifications, setNotifications] = useState({
      email: true,
      push: false,
      weeklyReport: true,
      budgetAlerts: true,
      newFeatures: false,
    })

    const handleNotificationChange = (key) => {
      setNotifications((prev) => ({
        ...prev,
        [key]: !prev[key],
      }))
    }

    const handleSave = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    const notificationTypes = [
      { key: "email", title: "Email Notifications", description: "Receive important updates via email", icon: Mail },
      { key: "push", title: "Push Notifications", description: "Get real-time alerts in your browser", icon: Bell },
      { key: "weeklyReport", title: "Weekly Reports", description: "Weekly spending summary and insights", icon: PieChart },
      { key: "budgetAlerts", title: "Budget Alerts", description: "Notifications when approaching budget limits", icon: AlertCircle },
      { key: "newFeatures", title: "New Features", description: "Updates about new app features", icon: Zap },
    ]

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose how you want to be notified about your finances
          </p>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          {notificationTypes.map(({ key, title, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
              </div>
              <Switch
                checked={notifications[key]}
                onChange={() => handleNotificationChange(key)}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800 max-w-2xl mx-auto">
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Save className="w-5 h-5 mr-2" />
            Save Notifications
          </Button>
        </div>
      </div>
    )
  }

  const DataTab = () => {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Data & Privacy</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your personal data and privacy preferences
          </p>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Download Your Data</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Export a complete copy of your personal data
                  </p>
                </div>
              </div>
              <Button variant="outline" className="border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 px-6 py-2 rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Delete Account</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Permanently delete your account and all associated data
                  </p>
                </div>
              </div>
              <Button variant="destructive" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6 py-2 rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />
      case 'security':
        return <SecurityTab />
      case 'preferences':
        return <PreferencesTab />
      case 'notifications':
        return <NotificationsTab />
      case 'data':
        return <DataTab />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {showSuccess && (
          <Alert variant="success" className="mb-6 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 rounded-xl">
            ✅ Changes saved successfully!
          </Alert>
        )}

        <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-8 shadow-inner">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {name}
            </button>
          ))}
        </div>

        <Card className="p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl">
          {renderTab()}
        </Card>
      </div>
    </div>
  )
}

export default Settings