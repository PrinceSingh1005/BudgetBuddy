import React, { useState, useEffect } from 'react'
import { Upload, FileText, Eye, Download, Trash2, RefreshCw } from 'lucide-react'
import { Card, Button, Modal, Badge, Alert, LoadingSpinner } from '../../components/ui'
import FileUpload from '../../components/common/FileUpload'
import { format } from 'date-fns'
import { receiptsAPI } from '../../services/api'
import { motion } from 'framer-motion'

const truncateFilename = (filename, maxLength = 30) => {
  if (filename.length <= maxLength) return filename;

  const extension = filename.split('.').pop();
  const nameWithoutExtension = filename.slice(0, -(extension.length + 1));
  const truncatedName = nameWithoutExtension.slice(0, maxLength - extension.length - 4) + '...';

  return `${truncatedName}.${extension}`;
};

const Receipts = () => {
  const [receipts, setReceipts] = useState([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await receiptsAPI.getAll()
        const receiptsWithId = res.data.map(receipt => ({
          ...receipt,
          id: receipt._id
        }))
        setReceipts(receiptsWithId)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch receipts')
      }
      setLoading(false)
    }
    fetchReceipts()
  }, [])

  // Auto-refresh receipt status for processing receipts
  useEffect(() => {
    const processingReceipts = receipts.filter(r => r.status === 'processing')
    if (processingReceipts.length === 0) return

    const interval = setInterval(async () => {
      try {
        for (const receipt of processingReceipts) {
          const statusRes = await receiptsAPI.getStatus(receipt._id)
          if (statusRes.data.status !== 'processing') {
            // Refresh the receipt data
            const updatedRes = await receiptsAPI.getById(receipt._id)
            setReceipts(prev => 
              prev.map(r => r._id === receipt._id ? { ...updatedRes.data, id: updatedRes.data._id } : r)
            )
          }
        }
      } catch (err) {
        console.error('Status check error:', err)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [receipts])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'done':
        return <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Processed</Badge>
      case 'processing':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Processing</Badge>
      case 'error':
        return <Badge variant="danger" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Uploaded</Badge>
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = async (files) => {
    setIsUploading(true)
    setUploadProgress(0)
    const file = files[0]
    try {
      const formData = new FormData()
      formData.append('receipt', file)
      const res = await receiptsAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded) / progressEvent.total)
          setUploadProgress(percent)
        }
      })
      // Add the new receipt to the list with processing status
      const newReceipt = { ...res.data, id: res.data.fileId, _id: res.data.fileId, status: 'processing' }
      setReceipts([newReceipt, ...receipts])
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload receipt'
      setError(errorMessage.includes('Unexpected field')
        ? 'Invalid file upload. Please try again with a valid image or PDF.'
        : errorMessage)
    }
    setIsUploading(false)
    setIsUploadModalOpen(false)
    setUploadProgress(0)
  }

  const handleDelete = async (receiptId) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await receiptsAPI.delete(receiptId)
        setReceipts(receipts.filter(r => r._id !== receiptId))
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete receipt')
      }
    }
  }

  const handleView = (receipt) => {
    setSelectedReceipt(receipt)
    setIsViewModalOpen(true)
  }

  const handleReprocess = async (id) => {
    // Update UI to show processing
    setReceipts(receipts.map(r =>
      r._id === id ? { ...r, status: 'processing', errorMessage: null } : r
    ))
    // Here you would typically call an API to reprocess the receipt
    // For now, we'll just simulate the status change
  }

  // Helper function to get extracted data from receipt
  const getExtractedData = (receipt) => {
    if (!receipt.ocrResult) return null
    
    // Try extractedData first, then fall back to parsed for backward compatibility
    return receipt.ocrResult.extractedData || receipt.ocrResult.parsed || null
  }

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Receipts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload and manage your receipt images and PDFs with ease
          </p>
        </div>
        <Button
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-2"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="w-4 h-4" />
          Upload Receipt
        </Button>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert variant="danger" className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg p-4">
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" className="text-teal-500" />
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6 bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" className="text-teal-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploading...
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Receipts Grid */}
      {!loading && receipts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => {
              const extractedData = getExtractedData(receipt)
              return (
                <Card
                  key={receipt._id}
                  className="p-6 bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                        <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate" title={receipt.originalName}>
                          {truncateFilename(receipt.originalName)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(receipt.size)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(receipt.status)}
                  </div>

                  {receipt.status === 'done' && extractedData && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            ${extractedData.amount ? extractedData.amount.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Merchant:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {extractedData.merchant || 'Unknown'}
                          </span>
                        </div>
                        {receipt.ocrResult.confidence && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {(receipt.ocrResult.confidence).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {receipt.status === 'processing' && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" className="text-yellow-500" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                          Processing receipt...
                        </span>
                      </div>
                    </div>
                  )}

                  {receipt.status === 'error' && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {receipt.errorMessage || 'Processing failed'}
                      </p>
                    </div>
                  )}

                  {receipt.processedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Processed {format(new Date(receipt.processedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(receipt)}
                      className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    {receipt.status === 'error' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprocess(receipt._id)}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(receipt._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </motion.div>
      )}

      {!loading && receipts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-12 text-center bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm">
            <div className="mb-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No receipts uploaded yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by uploading your first receipt to extract transaction data automatically
            </p>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Receipt
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Receipt"
        size="md"
        className="bg-white dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700/30"
      >
        <FileUpload
          accept="image/*,application/pdf"
          maxSize={10 * 1024 * 1024} // 10MB
          onUpload={handleFileUpload}
          multiple={false}
        />
      </Modal>

      {/* View Receipt Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedReceipt(null)
        }}
        title={selectedReceipt ? truncateFilename(selectedReceipt.originalName, 40) : 'Receipt Details'}
        size="xl"
        className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-2xl backdrop-blur-sm"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            {/* Header with file icon */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedReceipt.originalName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Uploaded {format(new Date(selectedReceipt.createdAt || selectedReceipt.uploadedAt), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {/* Status and File Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedReceipt.status)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50">
                <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                  File Info
                </label>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatFileSize(selectedReceipt.size)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedReceipt.mimeType}
                  </p>
                </div>
              </div>
            </div>

            {selectedReceipt.ocrResult && (
              <div className="space-y-4">
                {/* Extracted Data Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-5 rounded-2xl border border-green-100 dark:border-green-800/50">
                  <label className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                    <span>Extracted Data</span>
                  </label>

                  {(() => {
                    const extractedData = getExtractedData(selectedReceipt)
                    if (!extractedData) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>No data extracted from this receipt</p>
                        </div>
                      )
                    }

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white/80 dark:bg-gray-800/60 p-3 rounded-lg border border-green-200/50 dark:border-green-700/30">
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 block mb-1">
                              Amount
                            </span>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">
                              ${extractedData.amount ? extractedData.amount.toFixed(2) : '0.00'}
                            </p>
                          </div>

                          <div className="bg-white/80 dark:bg-gray-800/60 p-3 rounded-lg border border-green-200/50 dark:border-green-700/30">
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 block mb-1">
                              Merchant
                            </span>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {extractedData.merchant || 'Unknown'}
                            </p>
                          </div>

                          {extractedData.date && (
                            <div className="bg-white/80 dark:bg-gray-800/60 p-3 rounded-lg border border-green-200/50 dark:border-green-700/30">
                              <span className="text-xs font-medium text-green-600 dark:text-green-400 block mb-1">
                                Date
                              </span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {format(new Date(extractedData.date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          )}

                          {extractedData.category && (
                            <div className="bg-white/80 dark:bg-gray-800/60 p-3 rounded-lg border border-green-200/50 dark:border-green-700/30">
                              <span className="text-xs font-medium text-green-600 dark:text-green-400 block mb-1">
                                Category
                              </span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {extractedData.category}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Confidence Meter */}
                        {selectedReceipt.ocrResult.confidence && (
                          <div className="bg-white/80 dark:bg-gray-800/60 p-3 rounded-lg border border-green-200/50 dark:border-green-700/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                Confidence
                              </span>
                              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                {(selectedReceipt.ocrResult.confidence).toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: `${selectedReceipt.ocrResult.confidence}%`,
                                  transition: 'width 1s ease-in-out'
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Raw OCR Text Section */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/30 dark:to-blue-900/30 p-5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                  <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <span>Raw OCR Text</span>
                  </label>

                  {selectedReceipt.ocrResult.text ? (
                    <div className="space-y-3">
                      <div className="bg-white/80 dark:bg-gray-800/60 p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <span>Line Breakdown</span>
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                          {selectedReceipt.ocrResult.text.split('\n').filter(line => line.trim()).map((line, index) => (
                            <div key={index} className="flex items-start gap-2 py-1 border-b border-gray-100 dark:border-gray-700/30 last:border-b-0">
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono min-w-[20px] text-right">
                                {index + 1}.
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-mono break-words flex-1">
                                {line.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>No text extracted from this receipt</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/80 dark:border-gray-700/50">
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-4 py-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false)
                  setSelectedReceipt(null)
                }}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl px-6 py-2 transition-all duration-200 hover:scale-105 hover:shadow-lg transform"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Receipts