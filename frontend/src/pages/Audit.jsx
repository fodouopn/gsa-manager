import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Paper,
  alpha,
} from '@mui/material'
import { History, Visibility } from '@mui/icons-material'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import { formatDateTime } from '../utils/formatters'

export default function Audit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    user: '',
  })

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }

      if (filters.search) {
        params.search = filters.search
      }
      if (filters.action) {
        params.action = filters.action
      }
      if (filters.user) {
        params.user = filters.user
      }

      const response = await api.get('/audit/logs/', { params })

      if (response.data.results) {
        setLogs(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setLogs(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setLogs([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.search, filters.action, filters.user])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', action: '', user: '' })
    setPage(0)
  }

  const columns = [
    {
      id: 'action',
      label: 'Action',
      format: (value) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
          {value}
        </Typography>
      ),
    },
    {
      id: 'user_detail',
      label: 'Utilisateur',
      format: (value) => value?.username || value?.user_detail?.username || '-',
    },
    {
      id: 'entity_type',
      label: 'Type d\'entité',
      format: (value) => value?.model || '-',
    },
    { id: 'entity_id', label: 'ID' },
    { id: 'reason', label: 'Raison' },
    { id: 'created_at', label: 'Date', type: 'date' },
  ]

  return (
    <Box>
      <PageHeader
        title="Logs d'audit"
        subtitle="Historique des actions effectuées dans le système"
      />

      <FiltersBar
        search={filters.search}
        onSearchChange={(value) => handleFilterChange('search', value)}
        filters={[
          {
            id: 'action',
            label: 'Action',
            type: 'text',
            value: filters.action,
          },
        ]}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={setPage}
        onRowsPerPageChange={(newRowsPerPage) => {
          setRowsPerPage(newRowsPerPage)
          setPage(0)
        }}
        onRowClick={(row) => setSelectedLog(row)}
        emptyMessage="Aucun log d'audit"
        canEdit={false}
        canDelete={false}
      />

      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedLog && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <History sx={{ color: '#d32f2f' }} />
                Détail du log d'audit
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={3} mt={1}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Action
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedLog.action}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Utilisateur
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.user_detail?.username || selectedLog.user?.username || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Entité
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.entity_type?.model || '-'} #{selectedLog.entity_id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Raison
                  </Typography>
                  <Typography variant="body1">{selectedLog.reason || '-'}</Typography>
                </Box>
                {selectedLog.before_json && (
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                      État avant
                    </Typography>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: alpha('#fee2e2', 0.3),
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 2,
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: '0.8125rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.before_json, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                )}
                {selectedLog.after_json && (
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                      État après
                    </Typography>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: alpha('#d1fae5', 0.3),
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 2,
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: '0.8125rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.after_json, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDateTime(selectedLog.created_at)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedLog(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
