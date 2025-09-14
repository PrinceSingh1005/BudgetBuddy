import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Select, Button, LoadingSpinner, Alert } from '../../components/ui'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { analyticsAPI } from '../../services/api'

const Analytics = () => {
  const [dateRange, setDateRange] = useState('thisMonth')
  const [chartType, setChartType] = useState('pie')

  // Get date range based on selection
  const getDateRange = () => {
    const today = new Date()
    let from, to
    
    switch (dateRange) {
      case 'lastMonth':
        from = startOfMonth(subMonths(today, 1))
        to = endOfMonth(subMonths(today, 1))
        break
      case 'last3Months':
        from = startOfMonth(subMonths(today, 3))
        to = endOfMonth(today)
        break
      case 'last6Months':
        from = startOfMonth(subMonths(today, 6))
        to = endOfMonth(today)
        break
      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1)
        to = endOfMonth(today)
        break
      default: // thisMonth
        from = startOfMonth(today)
        to = endOfMonth(today)
    }
    
    return { 
      from: format(from, 'yyyy-MM-dd'), 
      to: format(to, 'yyyy-MM-dd') 
    }
  }

  const { from, to } = getDateRange()

  // API Queries
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['analytics-summary', from, to],
    queryFn: () => analyticsAPI.getSummary({ from, to }),
    select: (response) => response.data
  })

  const { data: expenseCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['expenses-by-category', from, to],
    queryFn: () => analyticsAPI.getExpensesByCategory({ from, to }),
    select: (response) => response.data.map((item, index) => ({
      ...item,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6]
    }))
  })

  const { data: expensesByDate, isLoading: dateLoading } = useQuery({
    queryKey: ['expenses-by-date', dateRange, from, to],
    queryFn: () => analyticsAPI.getExpensesByDate({ 
      interval: dateRange === 'thisYear' || dateRange === 'last6Months' ? 'month' : 'day',
      from, 
      to 
    }),
    select: (response) => response.data
  })

  const { data: incomeVsExpenses, isLoading: incomeLoading } = useQuery({
    queryKey: ['daily-financial-summary', from, to],
    queryFn: () => analyticsAPI.getDailyFinancialSummary({ from, to }),
    select: (response) => {
      // Group by month if date range is large
      if (dateRange === 'thisYear' || dateRange === 'last6Months') {
        const monthlyData = {}
        response.data.forEach(item => {
          const month = format(new Date(item.date), 'MMM yyyy')
          if (!monthlyData[month]) {
            monthlyData[month] = { month, income: 0, expenses: 0 }
          }
          monthlyData[month].income = item.income
          monthlyData[month].expenses += item.expenses
        })
        return Object.values(monthlyData)
      }
      return response.data.map(item => ({
        date: item.date,
        income: item.income,
        expenses: item.expenses
      }))
    }
  })

  const { data: topMerchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['top-merchants', from, to],
    queryFn: () => analyticsAPI.getTopMerchants({ from, to, limit: 5 }),
    select: (response) => response.data
  })

  const isLoading = summaryLoading || categoriesLoading || dateLoading || incomeLoading || merchantsLoading

  if (summaryError) {
    return (
      <Alert type="error" title="Error loading analytics data">
        {summaryError.response?.data?.error || 'Failed to load analytics data'}
      </Alert>
    )
  }

  const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? `${value.toLocaleString()}` : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 
              changeType === 'negative' ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-gray-400'
            }`}>
              {changeType === 'positive' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {change}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed insights into your financial patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-auto"
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3Months">Last 3 Months</option>
            <option value="last6Months">Last 6 Months</option>
            <option value="thisYear">This Year</option>
          </Select>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Expenses"
          value={summaryData?.expenses?.total || 0}
          change={-8.2}
          changeType="negative"
          icon={TrendingDown}
          color="bg-red-500"
        />
        <StatCard
          title="Average Daily"
          value={summaryData?.expenses?.total ? Math.round(summaryData.expenses.total / 30) : 0}
          change={5.1}
          changeType="positive"
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          title="Top Category"
          value={expenseCategories && expenseCategories.length > 0 ? 
            `${expenseCategories[0].category} (${expenseCategories[0].total})` : 
            'No data'
          }
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Transaction Count"
          value={(summaryData?.expenses?.count || 0) + (summaryData?.income?.count || 0)}
          change={12.5}
          changeType="positive"
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expense Categories
            </h3>
            <Select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-auto text-sm"
            >
              <option value="pie">Pie Chart</option>
              <option value="bar">Bar Chart</option>
            </Select>
          </div>
          <div className="h-80">
            {expenseCategories && expenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="total"
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, 'Amount']} />
                  </PieChart>
                ) : (
                  <BarChart data={expenseCategories}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="category" className="text-gray-600 dark:text-gray-400" />
                    <YAxis className="text-gray-600 dark:text-gray-400" />
                    <Tooltip formatter={(value) => [`${value}`, 'Amount']} />
                    <Bar dataKey="total" fill="#3B82F6" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No expense data available for the selected period
              </div>
            )}
          </div>
        </Card>

        {/* Income vs Expenses Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Income vs Expenses
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            {incomeVsExpenses && incomeVsExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey={dateRange === 'thisYear' || dateRange === 'last6Months' ? 'month' : 'date'}
                    className="text-gray-600 dark:text-gray-400" 
                    tickFormatter={(value) => 
                      dateRange === 'thisYear' || dateRange === 'last6Months' ? value : 
                      format(new Date(value), 'MMM dd')
                    }
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip formatter={(value) => [`${value}`, '']} />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stackId="2"
                    stroke="#EF4444" 
                    fill="#EF4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for the selected period
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Spending Pattern
            </h3>
          </div>
          <div className="h-64">
            {expensesByDate && expensesByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expensesByDate}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Spent']}
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No spending data available
              </div>
            )}
          </div>
        </Card>

        {/* Top Merchants */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Merchants
            </h3>
          </div>
          <div className="space-y-4">
            {topMerchants && topMerchants.length > 0 ? (
              topMerchants.map((merchant, index) => (
                <div key={merchant.merchant} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{merchant.merchant}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {merchant.count} transactions
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${merchant.total.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No merchant data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Category Details Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Category Breakdown
        </h3>
        <div className="overflow-x-auto">
          {expenseCategories && expenseCategories.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Average
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {expenseCategories.map((category) => {
                  const total = expenseCategories.reduce((sum, cat) => sum + cat.total, 0)
                  const percentage = total > 0 ? ((category.total / total) * 100).toFixed(1) : '0'
                  const average = category.count > 0 ? (category.total / category.count).toFixed(0) : '0'
                  
                  return (
                    <tr key={category.category} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${category.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category.count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${average}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {percentage}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No category data available for the selected period</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default Analytics