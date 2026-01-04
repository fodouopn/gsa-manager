import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert } from '@mui/material'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

/**
 * ToastProvider component - Provides toast notifications (success/error)
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info', // success, error, warning, info
  })

  const showToast = useCallback((message, severity = 'info') => {
    setToast({
      open: true,
      message,
      severity,
    })
  }, [])

  const showSuccess = useCallback((message) => {
    showToast(message, 'success')
  }, [showToast])

  const showError = useCallback((message) => {
    showToast(message, 'error')
  }, [showToast])

  const showWarning = useCallback((message) => {
    showToast(message, 'warning')
  }, [showToast])

  const showInfo = useCallback((message) => {
    showToast(message, 'info')
  }, [showToast])

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setToast((prev) => ({ ...prev, open: false }))
  }

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

