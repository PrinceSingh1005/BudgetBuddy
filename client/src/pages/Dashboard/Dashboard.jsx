import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { Card, Button, Select, LoadingSpinner, Alert } from '../../components/ui';
import { analyticsAPI, transactionsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import TransactionTable from '../../components/Transactions/TransactionTable';

// Animation variants for cards
const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i = 1) => ({
        opacity: 1,
        y: 0,
        transition: { delay: 0.05 * i, duration: 0.4, ease: 'easeOut' }
    })
};

// --- Reusable StatCard Component ---
const StatCard = ({ title, value, change, changeType, icon: Icon, color, index }) => (
    <motion.div initial="hidden" animate="visible" custom={index} variants={cardVariants} className="w-full">
        <Card className="p-4 sm:p-5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{title}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${(value || 0).toLocaleString()}</p>
                    {change !== undefined && (
                        <div className={`mt-2 flex items-center text-xs font-medium ${changeType === 'positive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {changeType === 'positive' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                            {Math.abs(change)}% vs last month
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color} bg-opacity-90`} aria-hidden>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
            </div>
        </Card>
    </motion.div>
);


// --- Main Dashboard Component ---
const Dashboard = () => {
    const [dateRange, setDateRange] = useState('thisMonth');

    // Utility to get date range parameters
    const getDateParams = (range) => {
        const now = new Date();
        let from, to;
        switch (range) {
            case 'lastMonth':
                from = startOfMonth(subMonths(now, 1));
                to = endOfMonth(subMonths(now, 1));
                break;
            case 'last3Months':
                from = startOfMonth(subMonths(now, 2));
                to = endOfMonth(now);
                break;
            case 'thisYear':
                from = new Date(now.getFullYear(), 0, 1);
                to = endOfMonth(now);
                break;
            default: // 'thisMonth'
                from = startOfMonth(now);
                to = endOfMonth(now);
        }
        return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    };

    // --- Data Fetching with React Query ---
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboard-analytics', dateRange],
        queryFn: async () => {
            const params = getDateParams(dateRange);
            const [summary, categories, dailySummary, recentTransactions] = await Promise.all([
                analyticsAPI.getSummary(params),
                analyticsAPI.getExpensesByCategory(params),
                analyticsAPI.getDailyFinancialSummary(params),
                transactionsAPI.getAll({ page: 1, limit: 5, sort: 'date_desc' }) // Fetch recent transactions
            ]);
            return {
                summary: summary.data,
                categories: categories.data,
                dailySummary: dailySummary.data,
                recentTransactions: recentTransactions.data
            };
        }
    });

    const trendData = data?.dailySummary?.map(d => ({
        date: d.date,
        income: d.income || 0,
        expenses: d.expenses || 0
    })) || [];
    
    const pieData = data?.categories?.length > 0 ? data.categories : [{ category: 'No Data', total: 1 }];
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];


    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">

            {/* --- Header --- */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A snapshot of your financial health.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 sm:flex-none">
                        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} aria-label="Select date range">
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="last3Months">Last 3 Months</option>
                            <option value="thisYear">This Year</option>
                        </Select>
                    </div>
                    <Link to="/transactions">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            <span>Add</span>
                        </Button>
                    </Link>
                </div>
            </header>

            {/* --- Loading / Error States --- */}
            {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
            {error && (
                <Alert type="error" title="Failed to load dashboard data">
                    <p>{error.message}</p>
                    <Button onClick={() => refetch()} className="mt-2" size="sm">Try Again</Button>
                </Alert>
            )}

            {data && (
                <>
                    {/* --- Summary Cards --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard index={1} title="Total Income" value={data.summary?.income?.total} change={12.5} changeType="positive" icon={TrendingUp} color="bg-emerald-500" />
                        <StatCard index={2} title="Total Expenses" value={data.summary?.expenses?.total} change={-8.2} changeType="negative" icon={TrendingDown} color="bg-rose-500" />
                        <StatCard index={3} title="Net Balance" value={data.summary?.balance} change={15.3} changeType="positive" icon={DollarSign} color="bg-sky-500" />
                        <StatCard index={4} title="Transactions" value={(data.summary?.income?.count || 0) + (data.summary?.expenses?.count || 0)} icon={CreditCard} color="bg-violet-500" />
                    </div>

                    {/* --- Charts --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <Card className="lg:col-span-3 p-4 sm:p-6 rounded-xl">
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income vs. Expenses</h3>
                             <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} />
                                        <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card className="lg:col-span-2 p-4 sm:p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expense Categories</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="total" nameKey="category" labelLine={false}>
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* --- Recent Transactions --- */}
                    <Card className="p-4 sm:p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                            <Link to="/transactions" className="text-sm font-medium text-primary-600 hover:underline">
                                View All
                            </Link>
                        </div>
                        <TransactionTable 
                            transactionsData={data.recentTransactions}
                            compact={true}
                            showActions={false}
                        />
                    </Card>
                </>
            )}
        </motion.div>
    );
};

export default Dashboard;