import React, { useState, useEffect } from 'react'; // Make sure useEffect is imported
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, Edit, Trash2 } from 'lucide-react';
import { Card, Button, Input, Select, Modal, Badge, LoadingSpinner, Alert } from '../../components/ui';
import TransactionForm from '../../components/Transactions/TransactionForm';
import { format, startOfDay, endOfDay } from 'date-fns';
import { transactionsAPI } from '../../services/api';
import { motion } from 'framer-motion';
import useDebounce from '../../Hooks/useDebouncing'; 

const Transactions = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [filters, setFilters] = useState({
        searchTerm: '',
        type: 'all',
        category: 'all',
        date: 'all'
    });
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const debouncedFilters = useDebounce(filters, 500);

    const queryClient = useQueryClient();

    useEffect(() => {
        setPage(1);
    }, [debouncedFilters]);

    const handleFilterChange = (filterName, value) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [filterName]: value
        }));
    };

    // Build query parameters from debounced filters
    const buildQueryParams = () => {
        const params = {
            page,
            limit,
            sort: 'date_desc',
        };

        if (debouncedFilters.searchTerm) params.search = debouncedFilters.searchTerm;
        if (debouncedFilters.type !== 'all') params.type = debouncedFilters.type;
        if (debouncedFilters.category !== 'all') params.category = debouncedFilters.category;
        
        if (debouncedFilters.date !== 'all') {
            const today = new Date();
            let from, to;

            switch (debouncedFilters.date) {
                case 'today':
                    from = startOfDay(today);
                    to = endOfDay(today);
                    break;
                case 'thisWeek':
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    from = startOfDay(startOfWeek);
                    to = endOfDay(today);
                    break;
                case 'thisMonth':
                    from = new Date(today.getFullYear(), today.getMonth(), 1);
                    to = endOfDay(today);
                    break;
                case 'lastMonth':
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    from = lastMonth;
                    to = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                default:
                    break;
            }

            if (from && to) {
                params.from = format(from, 'yyyy-MM-dd');
                params.to = format(to, 'yyyy-MM-dd');
            }
        }

        return params;
    };

    // Fetch transactions
    const {
        data: transactionsData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['transactions', page, debouncedFilters],
        queryFn: () => transactionsAPI.getAll(buildQueryParams()),
        select: (response) => response.data,
        keepPreviousData: true
    });

    // Get unique categories for filter
    const { data: allTransactions } = useQuery({
        queryKey: ['all-transactions-categories'],
        queryFn: () => transactionsAPI.getAll(),
        select: (response) => {
            const transactions = response.data.transactions
            const categories = [...new Set(transactions.map(t => t.category))]
            return categories
        }
    })

    // Create transaction mutation
    const createMutation = useMutation({
        mutationFn: transactionsAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions'])
            queryClient.invalidateQueries(['analytics-summary'])
            queryClient.invalidateQueries(['expenses-by-category'])
            setIsAddModalOpen(false)
        },
        onError: (error) => {
            console.error('Create transaction error:', error)
        }
    })

    // Update transaction mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => transactionsAPI.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions'])
            queryClient.invalidateQueries(['analytics-summary'])
            queryClient.invalidateQueries(['expenses-by-category'])
            setIsEditModalOpen(false)
            setSelectedTransaction(null)
        },
        onError: (error) => {
            console.error('Update transaction error:', error)
        }
    })

    // Delete transaction mutation
    const deleteMutation = useMutation({
        mutationFn: transactionsAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions'])
            queryClient.invalidateQueries(['analytics-summary'])
            queryClient.invalidateQueries(['expenses-by-category'])
        },
        onError: (error) => {
            console.error('Delete transaction error:', error)
        }
    })

    const handleAddTransaction = (transactionData) => {
        createMutation.mutate(transactionData)
    }

    const handleEditTransaction = (transactionData) => {
        updateMutation.mutate({
            id: selectedTransaction._id,
            data: transactionData
        })
    }

    const handleDeleteTransaction = (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            deleteMutation.mutate(id)
        }
    }

    const openEditModal = (transaction) => {
        setSelectedTransaction(transaction)
        setIsEditModalOpen(true)
    }

    const getSourceBadge = (source) => {
        switch (source) {
            case 'ocr':
                return <Badge variant="warning" size="sm" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">OCR</Badge>
            case 'import':
                return <Badge variant="secondary" size="sm" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Import</Badge>
            default:
                return <Badge variant="primary" size="sm" className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">Manual</Badge>
        }
    }

    // Filter transactions by search term
    const filteredTransactions = transactionsData?.transactions?.filter(transaction => {
        if (!filters.searchTerm) return true
        return (
            transaction.merchant?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            transaction.notes?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            transaction.category.toLowerCase().includes(filters.searchTerm.toLowerCase())
        )
    }) || []

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Alert type="error" title="Error loading transactions" className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg p-4">
                    {error.response?.data?.error || 'Failed to load transactions'}
                </Alert>
                <Button onClick={() => refetch()} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
                    Try Again
                </Button>
            </div>
        )
    }

    const queryParams = buildQueryParams();
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Track and manage your income and expenses with ease
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                    <Button
                        size="sm"
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </Button>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Card className="p-6 bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search transactions..."
                                value={filters.searchTerm}
                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        <Select
                            value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </Select>

                        <Select
                            value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="all">All Categories</option>
                            {allTransactions && allTransactions.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </Select>

                        <Select
                            value={filters.date}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="thisWeek">This Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                        </Select>
                    </div>
                </Card>
            </motion.div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" className="text-teal-500" />
                </div>
            )}

            {/* Transactions Table */}
            {!isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="overflow-hidden bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Source
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredTransactions.map((transaction) => (
                                        <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                                {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                                                        {transaction.merchant}
                                                    </div>
                                                    {transaction.notes && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {transaction.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {transaction.category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getSourceBadge(transaction.meta?.source || 'manual')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(transaction)}
                                                        disabled={updateMutation.isLoading}
                                                        className="text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteTransaction(transaction._id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                        disabled={deleteMutation.isLoading}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredTransactions.length === 0 && !isLoading && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {transactionsData?.pagination && transactionsData.pagination.totalPages > 1 && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, transactionsData.pagination.total)} of {transactionsData.pagination.total} results
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            Page {page} of {transactionsData.pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={page === transactionsData.pagination.totalPages}
                                            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </motion.div>
            )}

            {/* Add Transaction Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Transaction"
                size="md"
                className="bg-white dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700/30"
            >
                <TransactionForm
                    onSubmit={handleAddTransaction}
                    onCancel={() => setIsAddModalOpen(false)}
                    isLoading={createMutation.isLoading}
                    error={createMutation.error}
                />
            </Modal>

            {/* Edit Transaction Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setSelectedTransaction(null)
                }}
                title="Edit Transaction"
                size="md"
                className="bg-white dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700/30"
            >
                <TransactionForm
                    transaction={selectedTransaction}
                    onSubmit={handleEditTransaction}
                    onCancel={() => {
                        setIsEditModalOpen(false)
                        setSelectedTransaction(null)
                    }}
                    isLoading={updateMutation.isLoading}
                    error={updateMutation.error}
                />
            </Modal>
        </div>
    )
}

export default Transactions