'use client'

import { useRef, useCallback, useEffect } from 'react'

export interface ProcessingProgress {
  fileIndex: number
  fileName: string
  progress: number
  status: 'preprocessing' | 'preprocessing_complete' | 'ready_for_upload' | 'error'
}

export interface ProcessedFile {
  index: number
  originalFile: File
  processedFile: File
  preprocessing: {
    originalSize: number
    clientCompressedSize: number
    clientCompressionRatio: number
  } | null
}

interface UseCompressionWorkerProps {
  onProgress?: (progress: ProcessingProgress) => void
  onComplete?: (results: ProcessedFile[]) => void
  onError?: (error: string) => void
}

export function useCompressionWorker({
  onProgress,
  onComplete,
  onError
}: UseCompressionWorkerProps) {
  const workerRef = useRef<Worker | null>(null)
  const isProcessingRef = useRef(false)

  // Initialiser le worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker('/compression-worker.js')
      
      workerRef.current.onmessage = (e) => {
        const { type, ...data } = e.data
        
        switch (type) {
          case 'progress':
            onProgress?.(data as ProcessingProgress)
            break
            
          case 'batch_complete':
            isProcessingRef.current = false
            onComplete?.(data.results)
            break
            
          case 'batch_error':
          case 'error':
            isProcessingRef.current = false
            onError?.(data.error)
            break
        }
      }
      
      workerRef.current.onerror = (error) => {
        isProcessingRef.current = false
        onError?.(`Worker error: ${error.message}`)
      }
    }
    
    return () => {
      workerRef.current?.terminate()
    }
  }, [onProgress, onComplete, onError])

  const processFiles = useCallback((files: File[]) => {
    if (!workerRef.current || isProcessingRef.current) {
      onError?.('Worker not available or already processing')
      return
    }
    
    isProcessingRef.current = true
    workerRef.current.postMessage({
      type: 'process_batch',
      files
    })
  }, [onError])

  const isProcessing = () => isProcessingRef.current

  return {
    processFiles,
    isProcessing
  }
}