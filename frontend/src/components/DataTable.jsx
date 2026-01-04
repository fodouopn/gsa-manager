import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
  Alert,
  alpha,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { formatDate } from '../utils/formatters'
import StatusChip from './StatusChip'
import EmptyState from './EmptyState'

/**
 * DataTable moderne - Table avec lignes aérées, actions au survol
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  page = 0,
  rowsPerPage = 10,
  totalRows = 0,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onRowClick,
  canEdit = true,
  canDelete = true,
  emptyMessage = 'Aucune donnée',
  error = null,
  emptyActionLabel,
  onEmptyAction,
}) {
  const [hoveredRow, setHoveredRow] = useState(null)

  const handleChangePage = (event, newPage) => {
    if (onPageChange) {
      onPageChange(newPage)
    }
  }

  const handleChangeRowsPerPage = (event) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(parseInt(event.target.value, 10))
    }
  }

  const colSpan = columns.length + (((canEdit && onEdit) || (canDelete && onDelete)) ? 1 : 0)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
      }}
    >
      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    color: '#374151',
                    bgcolor: '#f9fafb',
                    py: 2,
                    borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
              {((canEdit && onEdit) || (canDelete && onDelete)) && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    color: '#374151',
                    bgcolor: '#f9fafb',
                    py: 2,
                    borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                    width: 100,
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow key="loading">
                <TableCell colSpan={colSpan} align="center">
                  <Box sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow key="error">
                <TableCell colSpan={colSpan} align="center">
                  <Box sx={{ py: 3 }}>
                    <Alert severity="error">{error}</Alert>
                  </Box>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow key="empty">
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                  <EmptyState
                    message={emptyMessage}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={row.id || `row-${index}`}
                  onMouseEnter={() => setHoveredRow(row.id || index)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={(e) => {
                    if (onRowClick && !e.target.closest('button')) {
                      onRowClick(row, e)
                    }
                  }}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    bgcolor: hoveredRow === (row.id || index) ? alpha('#d32f2f', 0.02) : 'transparent',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: alpha('#d32f2f', 0.04),
                    },
                    '& td': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                      py: 2.5,
                    },
                  }}
                >
                  {columns.map((column) => {
                    let value = row[column.id]
                    let cellContent = null
                    
                    if (column.format) {
                      cellContent = column.format(value, row)
                    } else if (column.type === 'status') {
                      const label =
                        typeof column.statusLabel === 'function'
                          ? column.statusLabel(value, row)
                          : column.statusLabel || value
                      cellContent = <StatusChip status={value} label={label} />
                    } else if (column.type === 'date') {
                      value = formatDate(value)
                      cellContent = (
                        <Typography variant="body2" sx={{ color: '#374151' }}>
                          {value ?? '-'}
                        </Typography>
                      )
                    } else if (column.type === 'currency') {
                      // Gérer les valeurs null, undefined, NaN ou vides
                      if (value === null || value === undefined || value === '' || isNaN(value)) {
                        cellContent = (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
                            -
                          </Typography>
                        )
                      } else {
                        const numValue = typeof value === 'string' ? parseFloat(value) : value
                        if (isNaN(numValue)) {
                          cellContent = (
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
                              -
                            </Typography>
                          )
                        } else {
                          const formattedValue = new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                          }).format(numValue)
                          cellContent = (
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
                              {formattedValue}
                            </Typography>
                          )
                        }
                      }
                    } else if (column.type === 'boolean') {
                      cellContent = (
                        <StatusChip
                          status={value ? 'OK' : 'NOK'}
                          label={value ? 'Oui' : 'Non'}
                        />
                      )
                    } else {
                      cellContent = (
                        <Typography variant="body2" sx={{ color: '#374151' }}>
                          {value ?? '-'}
                        </Typography>
                      )
                    }

                    return (
                      <TableCell key={`${row.id}-${column.id}`} align={column.align || 'left'}>
                        {cellContent}
                      </TableCell>
                    )
                  })}
                  {((canEdit && onEdit) || (canDelete && onDelete)) && (
                    <TableCell
                      align="right"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        opacity: hoveredRow === (row.id || index) ? 1 : 0.3,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Box display="flex" gap={0.5} justifyContent="flex-end">
                      {canEdit && onEdit && (
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(row)
                            }}
                              sx={{
                                color: '#3b82f6',
                                '&:hover': {
                                  bgcolor: alpha('#3b82f6', 0.1),
                                },
                              }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && onDelete && (
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(row)
                            }}
                              sx={{
                                color: '#ef4444',
                                '&:hover': {
                                  bgcolor: alpha('#ef4444', 0.1),
                                },
                              }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalRows > 0 && (
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Lignes par page:"
          sx={{
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            '& .MuiTablePagination-toolbar': {
              px: 3,
            },
          }}
        />
      )}
    </Paper>
  )
}
