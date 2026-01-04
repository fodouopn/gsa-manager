import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material'
import { Close, Save } from '@mui/icons-material'

/**
 * FormDialog component - Generic dialog for create/edit forms
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close handler
 * @param {function} onSubmit - Submit handler
 * @param {string} title - Dialog title
 * @param {ReactNode} children - Form content
 * @param {string} submitLabel - Submit button label
 * @param {boolean} loading - Loading state
 * @param {boolean} disabled - Disable submit button
 */
export default function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = 'Enregistrer',
  loading = false,
  disabled = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit && !loading && !disabled) {
      onSubmit(e)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>{children}</Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          startIcon={<Close />}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<Save />}
          disabled={loading || disabled}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

