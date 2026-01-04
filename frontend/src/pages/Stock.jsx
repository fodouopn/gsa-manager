import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Autocomplete,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  alpha,
} from '@mui/material'
import { Add, Print, Warehouse, TrendingUp, TrendingDown } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import StatusChip from '../components/StatusChip'
import { formatDate, formatCurrency } from '../utils/formatters'

export default function Stock() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [currentStock, setCurrentStock] = useState([])
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openAdjustForm, setOpenAdjustForm] = useState(false)
  const [openPrintDialog, setOpenPrintDialog] = useState(false)
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0])
  const [printDateType, setPrintDateType] = useState('day')
  const [selectedTab, setSelectedTab] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({ product: '', type: '' })
  const [adjustFormData, setAdjustFormData] = useState({
    product: null,
    qty_signee: '',
    reason: '',
  })

  const canAdjust =
    user?.role !== 'LECTURE' &&
    (user?.role === 'LOGISTIQUE' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN')

  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get('/catalog/products/', {
        params: { actif: true },
      })
      const productsData = response.data.results || response.data
      setProducts(productsData)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    }
  }, [])

  const fetchCurrentStock = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/stock/movements/current/')
      let stockData = response.data
      if (stockData.results) {
        stockData = stockData.results
      } else if (!Array.isArray(stockData)) {
        stockData = [stockData]
      }
      setCurrentStock(stockData || [])
    } catch (error) {
      console.error('Error fetching current stock:', error)
      showError('Erreur lors du chargement du stock')
      setCurrentStock([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }
      if (filters.product) {
        params.product = filters.product
      }
      if (filters.type) {
        params.type = filters.type
      }

      const response = await api.get('/stock/movements/', { params })

      if (response.data.results) {
        setMovements(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setMovements(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching movements:', error)
      showError('Erreur lors du chargement des mouvements')
      setMovements([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.product, filters.type, showError])

  useEffect(() => {
    if (selectedTab === 0) {
      fetchCurrentStock()
    } else {
      fetchMovements()
    }
  }, [selectedTab, fetchCurrentStock, fetchMovements])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleAdjust = async () => {
    if (!adjustFormData.product || !adjustFormData.qty_signee || !adjustFormData.reason) {
      showError('Veuillez remplir tous les champs')
      return
    }

    try {
      await api.post('/stock/movements/adjust/', {
        product: adjustFormData.product.id || adjustFormData.product,
        qty_signee: parseFloat(adjustFormData.qty_signee),
        type: 'AJUSTEMENT',
        reason: adjustFormData.reason,
      })
      setAdjustFormData({ product: null, qty_signee: '', reason: '' })
      setOpenAdjustForm(false)
      showSuccess('Ajustement effectué avec succès')
      fetchCurrentStock()
      fetchMovements()
    } catch (error) {
      showError('Erreur lors de l\'ajustement')
    }
  }

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ product: '', type: '' })
    setPage(0)
  }

  const stockColumns = [
    {
      id: 'product_detail',
      label: 'Produit',
      format: (value) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
            {value?.nom || '-'}
          </Typography>
          {value?.unite_vente_display && (
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {value.unite_vente_display}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'stock_courant',
      label: 'Stock actuel',
      align: 'right',
      format: (value, row) => {
        const stock = value ?? 0
        const seuil = row.product_detail?.seuil_stock || 0
        const isLow = stock <= seuil
        return (
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isLow ? '#ef4444' : '#1a252f',
              }}
            >
              {stock}
            </Typography>
            {isLow && <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />}
          </Box>
        )
      },
    },
    {
      id: 'seuil_stock',
      label: 'Seuil',
      align: 'right',
      format: (value, row) => {
        const seuil = row.product_detail?.seuil_stock || 0
        return (
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280' }}>
            {seuil || '-'}
          </Typography>
        )
      },
    },
    {
      id: 'statut_stock',
      label: 'Statut',
      format: (value, row) => {
        const stock = row.stock_courant ?? 0
        const seuil = row.product_detail?.seuil_stock || 0
        if (stock === 0) {
          return <StatusChip status="RUPTURE" label="Rupture" />
        } else if (stock <= seuil) {
          return <StatusChip status="BAS" label="Bas" />
        }
        return <StatusChip status="OK" label="OK" />
      },
    },
  ]

  const movementColumns = [
    {
      id: 'product_detail',
      label: 'Produit',
      format: (value) => value?.nom || '-',
    },
    {
      id: 'type',
      label: 'Type',
      type: 'status',
      statusLabel: (value) => {
        switch (value) {
          case 'RECEPTION':
            return 'Réception'
          case 'VENTE':
            return 'Vente'
          case 'AJUSTEMENT':
            return 'Ajustement'
          default:
            return value
        }
      },
    },
    {
      id: 'qty_signee',
      label: 'Quantité',
      align: 'right',
      format: (value, row) => {
        const qty = parseFloat(value) || 0
        const isPositive = qty > 0
        return (
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            {isPositive ? (
              <TrendingUp sx={{ fontSize: 16, color: '#10b981' }} />
            ) : (
              <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isPositive ? '#10b981' : '#ef4444',
              }}
            >
              {isPositive ? '+' : ''}{qty}
            </Typography>
          </Box>
        )
      },
    },
    { id: 'reference', label: 'Référence' },
    { id: 'reason', label: 'Raison' },
    { id: 'created_at', label: 'Date', type: 'date' },
  ]

  // Calcul des statistiques
  const totalProducts = currentStock.length
  const lowStockCount = currentStock.filter(
    (s) => (s.stock_courant ?? 0) <= (s.product_detail?.seuil_stock || 0)
  ).length
  const outOfStockCount = currentStock.filter((s) => (s.stock_courant ?? 0) === 0).length

  return (
    <Box>
      <PageHeader
        title="Stock"
        subtitle="Gestion du stock et historique des mouvements"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => setOpenPrintDialog(true)}
            >
              Imprimer
            </Button>
            {canAdjust && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenAdjustForm(true)}
                sx={{
                  bgcolor: '#d32f2f',
                  '&:hover': {
                    bgcolor: '#b71c1c',
                  },
                }}
              >
                Ajuster le stock
              </Button>
            )}
          </>
        }
      />

      {/* Statistiques rapides */}
      {selectedTab === 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0, 0, 0, 0.06)',
                bgcolor: alpha('#3b82f6', 0.05),
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Warehouse sx={{ fontSize: 32, color: '#3b82f6' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Total produits
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a252f' }}>
                      {totalProducts}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0, 0, 0, 0.06)',
                bgcolor: alpha('#f59e0b', 0.05),
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingDown sx={{ fontSize: 32, color: '#f59e0b' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Stock bas
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a252f' }}>
                      {lowStockCount}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(0, 0, 0, 0.06)',
                bgcolor: alpha('#ef4444', 0.05),
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingDown sx={{ fontSize: 32, color: '#ef4444' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Rupture de stock
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a252f' }}>
                      {outOfStockCount}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs
        value={selectedTab}
        onChange={(e, newValue) => setSelectedTab(newValue)}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Tab label="Stock actuel" />
        <Tab label="Historique des mouvements" />
      </Tabs>

      {selectedTab === 1 && (
        <FiltersBar
          search=""
          onSearchChange={() => {}}
          filters={[
            {
              id: 'product',
              label: 'Produit',
              type: 'select',
              value: filters.product,
              options: [
                { value: '', label: 'Tous' },
                ...products.map((p) => ({ value: p.id.toString(), label: p.nom })),
              ],
            },
            {
              id: 'type',
              label: 'Type',
              type: 'select',
              value: filters.type,
              options: [
                { value: '', label: 'Tous' },
                { value: 'RECEPTION', label: 'Réception' },
                { value: 'VENTE', label: 'Vente' },
                { value: 'AJUSTEMENT', label: 'Ajustement' },
              ],
            },
          ]}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          loading={loading}
        />
      )}

      {selectedTab === 0 ? (
        <DataTable
          columns={stockColumns}
          data={currentStock}
          loading={loading}
          emptyMessage="Aucun stock disponible"
        />
      ) : (
        <DataTable
          columns={movementColumns}
          data={movements}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onPageChange={setPage}
          onRowsPerPageChange={(newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage)
            setPage(0)
          }}
          emptyMessage="Aucun mouvement"
        />
      )}

      {/* Dialog ajustement */}
      <Dialog open={openAdjustForm} onClose={() => setOpenAdjustForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajuster le stock</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={products}
            getOptionLabel={(option) =>
              typeof option === 'string'
                ? option
                : `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`
            }
            value={adjustFormData.product}
            onChange={(e, newValue) => setAdjustFormData({ ...adjustFormData, product: newValue })}
            renderInput={(params) => (
              <TextField {...params} label="Produit" required margin="normal" fullWidth />
            )}
          />
          <TextField
            label="Quantité (positive pour ajouter, négative pour retirer)"
            type="number"
            fullWidth
            required
            margin="normal"
            value={adjustFormData.qty_signee}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, qty_signee: e.target.value })}
          />
          <TextField
            label="Raison de l'ajustement"
            fullWidth
            required
            multiline
            rows={3}
            margin="normal"
            value={adjustFormData.reason}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdjustForm(false)}>Annuler</Button>
          <Button
            onClick={handleAdjust}
            variant="contained"
            disabled={!adjustFormData.product || !adjustFormData.qty_signee || !adjustFormData.reason}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Ajuster
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog impression */}
      <Dialog
        open={openPrintDialog}
        onClose={() => setOpenPrintDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Imprimer le rapport de stock</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Type de date</InputLabel>
              <Select
                value={printDateType}
                label="Type de date"
                onChange={(e) => setPrintDateType(e.target.value)}
              >
                <MenuItem value="day">Jour</MenuItem>
                <MenuItem value="month">Mois</MenuItem>
                <MenuItem value="year">Année</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={
                printDateType === 'day'
                  ? 'Date (YYYY-MM-DD)'
                  : printDateType === 'month'
                    ? 'Mois (YYYY-MM)'
                    : 'Année (YYYY)'
              }
              value={printDate}
              onChange={(e) => setPrintDate(e.target.value)}
              fullWidth
              placeholder={
                printDateType === 'day'
                  ? '2024-01-15'
                  : printDateType === 'month'
                    ? '2024-01'
                    : '2024'
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrintDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const response = await api.get('/stock/movements/print_stock/', {
                  params: { date: printDate },
                  responseType: 'blob',
                })
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `stock_${printDate}.pdf`)
                document.body.appendChild(link)
                link.click()
                link.remove()
                window.URL.revokeObjectURL(url)
                setOpenPrintDialog(false)
                showSuccess('Rapport généré avec succès')
              } catch (error) {
                const errorMessage =
                  error.response?.data?.error ||
                  error.response?.data?.detail ||
                  'Erreur lors de la génération du PDF'
                showError(errorMessage)
              }
            }}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Générer PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
