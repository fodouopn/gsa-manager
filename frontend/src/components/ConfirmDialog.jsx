import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'
import { Delete, Cancel } from '@mui/icons-material'

/**
 * ConfirmDialog component - Confirmation dialog for delete actions
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm handler
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {string} confirmLabel - Confirm button label
 * @param {string} cancelLabel - Cancel button label
 * @param {boolean} loading - Loading state
 * @param {string} severity - Severity (error, warning, info)
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmer la suppression',
  message = 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.',
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  loading = false,
  severity = 'error',
}) {
  const handleConfirm = () => {
    if (onConfirm && !loading) {
      onConfirm()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          startIcon={<Cancel />}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={severity}
          startIcon={<Delete />}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

