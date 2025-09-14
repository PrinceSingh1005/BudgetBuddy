import React, { useState, useRef } from 'react'
import { Upload, X, FileText, Image } from 'lucide-react'
import { Button, Alert } from '../ui'

const FileUpload = ({ 
  accept = "*/*", 
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  onUpload,
  className = ""
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList)
    setError('')

    // Validate file size
    const oversizedFiles = newFiles.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      setError(`File size must be less than ${formatFileSize(maxSize)}`)
      return
    }

    // Validate file type if accept is specified
    if (accept !== "*/*") {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const invalidFiles = newFiles.filter(file => {
        return !acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase())
          } else if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('*', ''))
          } else {
            return file.type === type
          }
        })
      })
      
      if (invalidFiles.length > 0) {
        setError(`Invalid file type. Accepted types: ${accept}`)
        return
      }
    }

    if (multiple) {
      setFiles([...files, ...newFiles])
    } else {
      setFiles(newFiles)
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5" />
    } else {
      return <FileText className="w-5 h-5" />
    }
  }

  const handleUpload = () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }
    onUpload(files)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {accept === "*/*" ? "Any file type" : `Accepted: ${accept}`} • Max {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="text-gray-500 dark:text-gray-400">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setFiles([])
            setError('')
          }}
          disabled={files.length === 0}
        >
          Clear
        </Button>
        <Button
          onClick={handleUpload}
          disabled={files.length === 0}
        >
          Upload {files.length > 0 && `(${files.length})`}
        </Button>
      </div>
    </div>
  )
}

export default FileUpload