import React from 'react'
import { Chip } from '@mui/material'

/**
 * StatusChip component with semantic colors
 * @param {string} status - Status value (PAYÉ, PARTIEL, IMPAYÉ, VALIDEE, BROUILLON, etc.)
 * @param {string} label - Display label (optional, defaults to status)
 */
export default function StatusChip({ status, label, size = 'small' }) {
  const getColor = (status) => {
    // Convert status to string, handling null, undefined, boolean, and other types
    let statusStr = ''
    if (status !== null && status !== undefined) {
      if (typeof status === 'boolean') {
        statusStr = status ? 'TRUE' : 'FALSE'
      } else {
        statusStr = String(status)
      }
    }
    const upperStatus = statusStr.toUpperCase()
    
    // Green: OK / paid / validated
    if (['PAYÉ', 'PAYE', 'VALIDEE', 'VALIDE', 'OK', 'DECHARGE', 'TRUE'].includes(upperStatus)) {
      return 'success'
    }
    
    // Orange: attention / pending
    if (['PARTIEL', 'EN_COURS', 'EN ATTENTE', 'BAS', 'PREVU'].includes(upperStatus)) {
      return 'warning'
    }
    
    // Red: delay / unpaid / broken
    if (['IMPAYÉ', 'IMPAYE', 'RUPTURE', 'ANNULEE', 'RETARD', 'OVERDUE', 'FALSE'].includes(upperStatus)) {
      return 'error'
    }
    
    // Default: info
    return 'default'
  }

  // Convert status to string for display
  let statusStr = ''
  if (status !== null && status !== undefined) {
    if (typeof status === 'boolean') {
      statusStr = status ? 'TRUE' : 'FALSE'
    } else {
      statusStr = String(status)
    }
  }
  const displayLabel = label || statusStr || ''

  return (
    <Chip
      label={displayLabel}
      color={getColor(status)}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  )
}

