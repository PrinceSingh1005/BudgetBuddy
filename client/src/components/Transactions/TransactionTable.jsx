import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner, Alert, Select } from '../ui'
import { format } from 'date-fns'
import { transactionsAPI } from '../../services/api'

const TransactionTable = ({ 
  filters = {}, 
  onEdit, 
  onDelete,
  showActions = true,
  compact = false,
  initialPageSize = 5 
}) => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const queryClient = useQueryClient()
  // Build query parameters
  const queryParams = {
    page,
    limit: pageSize,
    sort: 'date_desc',
    ...filters
  }

  // Fetch transactions
  const { 
    data: transactionsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionsAPI.getAll(queryParams),
    select: (response) => response.data,
    keepPreviousData: true
  })

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: transactionsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['analytics-summary'])
      queryClient.invalidateQueries(['expenses-by-category'])
      
      // Adjust page if we deleted the last item on the current page
      if (transactionsData?.transactions?.length === 1 && page > 1) {
        setPage(page - 1)
      }
    },
    onError: (error) => {
      console.error('Delete transaction error:', error)
    }
  })

  const handleDelete = (transaction) => {
    if (window.confirm(`Are you sure you want to delete the transaction "${transaction.merchant}"?`)) {
      deleteMutation.mutate(transaction._id)
      if (onDelete) onDelete(transaction)
    }
  }

  const handleEdit = (transaction) => {
    if (onEdit) onEdit(transaction)
  }

  const getSourceBadge = (source) => {
    switch (source) {
      case 'ocr':
        return <Badge variant="warning" size="sm">OCR</Badge>
      case 'import':
        return <Badge variant="secondary" size="sm">Import</Badge>
      default:
        return <Badge variant="primary" size="sm">Manual</Badge>
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(parseInt(newSize))
    setPage(1) // Reset to first page when changing page size
  }

  // Pagination calculations
  const pagination = transactionsData?.pagination || {}
  const { total = 0, totalPages = 0 } = pagination
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  if (error) {
    return (
      <Alert type="error" title="Error loading transactions">
        {error.response?.data?.error || 'Failed to load transactions'}
        <Button 
          onClick={() => refetch()} 
          className="mt-2"
          size="sm"
        >
          Try Again
        </Button>
      </Alert>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  {!compact && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                  )}
                  {showActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {transactionsData?.transactions?.map((transaction) => (
                  <tr 
                    key={transaction._id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                          {transaction.merchant}
                        </div>
                        {transaction.notes && !compact && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {transaction.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`${
                        transaction.type === 'income' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </span>
                    </td>
                    {!compact && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSourceBadge(transaction.meta?.source || 'manual')}
                      </td>
                    )}
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                            className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction)}
                            className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                            disabled={deleteMutation.isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {transactionsData?.transactions?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              {Object.keys(filters).length > 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your filters
                </p>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show:</span>
                    <Select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(e.target.value)}
                      className="w-auto text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </Select>
                  </div>

                  {/* Results Info */}
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of {total.toLocaleString()} results
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* First Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="hidden sm:flex"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>

                  {/* Previous Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10 h-8"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  {/* Next Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {/* Last Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className="hidden sm:flex"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Pagination Info */}
              <div className="sm:hidden mt-3 text-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default TransactionTable