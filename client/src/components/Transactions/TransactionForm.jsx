import React from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Select } from '../ui'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

const categories = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Healthcare',
  'Education',
  'Travel',
  'Salary',
  'Freelance',
  'Investment',
  'Other'
]

const TransactionForm = ({ transaction, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          merchant: transaction.merchant,
          date: format(new Date(transaction.date), 'yyyy-MM-dd'),
          notes: transaction.notes || ''
        }
      : {
          type: 'expense',
          amount: '',
          category: '',
          merchant: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: ''
        }
  })

  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      amount: parseFloat(data.amount),
      date: new Date(data.date).toISOString()
    })
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onFormSubmit)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 bg-white dark:bg-gray-800/95 p-8 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/30"
    >
      {/* Heading */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-4">
        {transaction ? 'Edit Transaction' : 'New Transaction'}
      </h2>

      {/* Row: Type + Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
          <Select
            {...register('type', { required: 'Type is required' })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          {errors.type && (
            <p className="text-sm text-red-500">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' }
            })}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <Select
          {...register('category', { required: 'Category is required' })}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Merchant */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description / Merchant</label>
        <Input
          placeholder="Where did you spend/earn this money?"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
          {...register('merchant', { required: 'Description is required' })}
        />
        {errors.merchant && (
          <p className="text-sm text-red-500">{errors.merchant.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
        <Input
          type="date"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
          {...register('date', { required: 'Date is required' })}
        />
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
        <Input
          placeholder="Add any additional notes..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
          {...register('notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="px-5 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition"
        >
          {transaction ? 'Update Transaction' : 'Add Transaction'}
        </Button>
      </div>
    </motion.form>
  )
}

export default TransactionForm