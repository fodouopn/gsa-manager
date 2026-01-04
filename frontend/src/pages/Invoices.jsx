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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Autocomplete,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  alpha,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material'
import {
  Add,
  CheckCircle,
  Cancel,
  GetApp,
  ContentCopy,
  Payment,
  ArrowBack,
  Receipt,
  AttachMoney,
  Send,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import StatusChip from '../components/StatusChip'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatCurrency, formatInvoiceStatus } from '../utils/formatters'

export default function Invoices() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [openAcceptanceDialog, setOpenAcceptanceDialog] = useState(false)
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [acceptanceUrl, setAcceptanceUrl] = useState('')
  const [acceptanceExpiresAt, setAcceptanceExpiresAt] = useState('')
  const [openPaymentForm, setOpenPaymentForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoiceLines, setInvoiceLines] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedTab, setSelectedTab] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    client: '',
  })
  const [formData, setFormData] = useState({
    client: null,
    type: 'LIVRAISON',
  })
  const [lineFormData, setLineFormData] = useState({
    product: null,
    qty: '',
  })
  const [productStock, setProductStock] = useState(null)
  const [paymentFormData, setPaymentFormData] = useState({
    montant: '',
    mode: 'VIREMENT',
    date: new Date().toISOString().split('T')[0],
  })
  const [validating, setValidating] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')

  const canEdit =
    user?.role !== 'LECTURE' &&
    (user?.role === 'COMMERCIAL' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN')

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }

      if (filters.search) {
        params.search = filters.search
      }
      if (filters.statut) {
        params.statut = filters.statut
      }
      if (filters.client) {
        params.client = filters.client
      }

      const response = await api.get('/billing/invoices/', { params })

      if (response.data.results) {
        setInvoices(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setInvoices(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      showError('Erreur lors du chargement des factures')
      setInvoices([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.search, filters.statut, filters.client, showError])

  const fetchClients = useCallback(async () => {
    try {
      const response = await api.get('/clients/', {
        params: { actif: true },
      })
      const clientsData = response.data.results || response.data
      setClients(clientsData)
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    }
  }, [])

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

  useEffect(() => {
    fetchInvoices()
    fetchClients()
    fetchProducts()
  }, [fetchInvoices, fetchClients, fetchProducts])

  useEffect(() => {
    if (selectedInvoice && selectedTab > 0) {
      fetchInvoiceDetail()
    }
  }, [selectedInvoice?.id, selectedTab])

  useEffect(() => {
    if (selectedInvoice?.id) {
      fetchInvoiceDetail()
    }
  }, [selectedInvoice?.id])

  const fetchInvoiceDetail = async () => {
    if (!selectedInvoice) return

    try {
      const response = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
      setInvoiceLines(response.data.invoice_lines || [])
      setPayments(response.data.payments || [])
      // Mettre à jour selectedInvoice avec les nouvelles valeurs calculées (total_ttc, paye, reste)
      setSelectedInvoice(response.data)
    } catch (error) {
      console.error('Error fetching invoice detail:', error)
    }
  }

  const handleCreate = () => {
    setFormData({ client: null, type: 'LIVRAISON' })
    setInvoiceLines([])
    setOpenForm(true)
  }

  const fetchProductStock = useCallback(async (productId) => {
    if (!productId) {
      setProductStock(null)
      return
    }
    try {
      const response = await api.get('/stock/movements/current/', {
        params: { product_id: productId },
      })
      setProductStock(response.data.stock_courant || 0)
    } catch (error) {
      console.error('Error fetching product stock:', error)
      setProductStock(null)
    }
  }, [])

  const handleProductChange = async (newProduct) => {
    setLineFormData({ ...lineFormData, product: newProduct, qty: '' })
    if (newProduct) {
      await fetchProductStock(newProduct.id)
    } else {
      setProductStock(null)
    }
  }

  const handleAddLine = async () => {
    if (!selectedInvoice || !lineFormData.product || !lineFormData.qty) return

    const qty = parseFloat(lineFormData.qty)
    if (productStock !== null && qty > productStock) {
      showError(`Stock insuffisant. Stock disponible: ${productStock}`)
      return
    }

    try {
      await api.post('/billing/invoice-lines/', {
        invoice: selectedInvoice.id,
        product: lineFormData.product.id || lineFormData.product,
        qty: qty,
      })
      setLineFormData({ product: null, qty: '' })
      setProductStock(null)
      // Rafraîchir la facture pour mettre à jour les totaux
      const updatedInvoice = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
      setSelectedInvoice(updatedInvoice.data)
      fetchInvoiceDetail()
      fetchInvoices()
      showSuccess('Ligne ajoutée avec succès')
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de l\'ajout de la ligne'
      showError(errorMessage)
    }
  }

  const handleValidate = async () => {
    if (!selectedInvoice) return

    setValidating(true)
    setValidationSuccess(false)
    setValidationMessage('')

    try {
      const response = await api.post(`/billing/invoices/${selectedInvoice.id}/validate/`)

      setValidationMessage(response.data.message || 'Facture validée avec succès')
      setValidationSuccess(true)
      setTimeout(() => {
        setValidationSuccess(false)
        setValidationMessage('')
      }, 5000)

      if (response.data.warning) {
        setTimeout(() => {
          showError(`Avertissement: ${response.data.warning}`)
        }, 500)
      }

      await fetchInvoices()
      if (selectedInvoice?.id) {
        const updatedResponse = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
        setSelectedInvoice(updatedResponse.data)
        await fetchInvoiceDetail()
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de la validation'
      setValidationMessage(errorMessage)
      setValidationSuccess(false)
      showError(errorMessage)
    } finally {
      setValidating(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedInvoice) return

    try {
      await api.post(`/billing/invoices/${selectedInvoice.id}/cancel/`)
      showSuccess('Facture annulée avec succès')
      setOpenCancelDialog(false)
      await fetchInvoices()
      if (selectedInvoice?.id) {
        const updatedResponse = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
        setSelectedInvoice(updatedResponse.data)
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error)
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de l\'annulation de la facture'
      showError(errorMessage)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedInvoice || !paymentFormData.montant) return

    try {
      const montant = parseFloat(paymentFormData.montant)
      if (isNaN(montant) || montant <= 0) {
        showError('Le montant doit être un nombre positif')
        return
      }

      const response = await api.post('/billing/payments/', {
        invoice: selectedInvoice.id,
        montant: montant,
        mode: paymentFormData.mode,
        date: paymentFormData.date,
      })
      setPaymentFormData({
        montant: '',
        mode: 'VIREMENT',
        date: new Date().toISOString().split('T')[0],
      })
      setOpenPaymentForm(false)
      // Rafraîchir la facture pour mettre à jour les totaux
      const updatedInvoice = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
      setSelectedInvoice(updatedInvoice.data)
      fetchInvoiceDetail()
      fetchInvoices()
      showSuccess('Paiement ajouté avec succès')
    } catch (error) {
      console.error('Error adding payment:', error.response?.data)
      const errorMessage = 
        error.response?.data?.detail ||
        error.response?.data?.error ||
        (error.response?.data && typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data)
          : 'Erreur lors de l\'ajout du paiement')
      showError(errorMessage)
    }
  }

  const handleDownloadPDF = async (invoice) => {
    try {
      const response = await api.get(`/billing/invoices/${invoice.id}/download_pdf/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `facture-${invoice.numero || invoice.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showSuccess('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      const errorMessage =
        error.response?.data?.error || 'Erreur lors du téléchargement du PDF'
      showError(errorMessage)
    }
  }

  const handleSaveInvoice = async () => {
    if (!formData.client) {
      showError('Veuillez sélectionner un client')
      return
    }

    try {
      const invoiceData = {
        client: formData.client.id || formData.client,
        type: formData.type,
      }
      const response = await api.post('/billing/invoices/', invoiceData)
      setSelectedInvoice(response.data)
      setOpenForm(false)
      setSelectedTab(1)
      fetchInvoices()
      showSuccess('Facture créée avec succès')
    } catch (error) {
      console.error('Error creating invoice:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la création de la facture'
      showError(errorMessage)
    }
  }

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', statut: '', client: '' })
    setPage(0)
  }

  const columns = [
    { id: 'numero', label: 'Numéro' },
    {
      id: 'client_detail',
      label: 'Client',
      format: (value) => value?.nom_complet || value?.nom || '-',
    },
    {
      id: 'statut',
      label: 'Statut',
      type: 'status',
      statusLabel: (value, row) =>
        formatInvoiceStatus(row.statut_display || row.statut || value || ''),
    },
    { id: 'total_ttc', label: 'Total', type: 'currency', align: 'right' },
    { id: 'reste', label: 'Reste', type: 'currency', align: 'right' },
    { id: 'created_at', label: 'Date', type: 'date' },
  ]

  const filterConfigs = [
    {
      id: 'statut',
      label: 'Statut',
      type: 'select',
      value: filters.statut,
      options: [
        { value: '', label: 'Tous' },
        { value: 'BROUILLON', label: 'Brouillon' },
        { value: 'VALIDEE', label: 'Validée' },
        { value: 'ANNULEE', label: 'Annulée' },
        { value: 'CONTESTEE', label: 'Contestée' },
      ],
    },
  ]

  return (
    <Box>
      {!selectedInvoice ? (
        <>
          <PageHeader
            title="Factures"
            subtitle="Gestion des factures et paiements"
            actions={
              canEdit && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreate}
                  sx={{
                    bgcolor: '#d32f2f',
                    '&:hover': {
                      bgcolor: '#b71c1c',
                    },
                  }}
                >
                  Nouvelle facture
                </Button>
              )
            }
          />

          <FiltersBar
            search={filters.search}
            onSearchChange={(value) => handleFilterChange('search', value)}
            filters={filterConfigs}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            loading={loading}
          />

          <DataTable
            columns={columns}
            data={invoices}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onPageChange={setPage}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage)
              setPage(0)
            }}
            onRowClick={async (row) => {
              const response = await api.get(`/billing/invoices/${row.id}/`)
              setSelectedInvoice(response.data)
              setSelectedTab(0)
            }}
            emptyMessage="Aucune facture trouvée"
            emptyActionLabel="Créer une facture"
            onEmptyAction={canEdit ? handleCreate : undefined}
          />
        </>
      ) : (
        <Box>
          <PageHeader
            title={`Facture ${selectedInvoice.numero || `#${selectedInvoice.id}`}`}
            subtitle={`Client: ${selectedInvoice.client_detail?.nom_complet || selectedInvoice.client_detail?.nom || '-'}`}
            actions={
              <Box display="flex" gap={1}>
                {selectedInvoice.statut === 'VALIDEE' && (
                  <Button
                    variant="outlined"
                    startIcon={<GetApp />}
                    onClick={() => handleDownloadPDF(selectedInvoice)}
                  >
                    Télécharger PDF
                  </Button>
                )}
                {canEdit && selectedInvoice.statut === 'BROUILLON' && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={validating ? <CheckCircle /> : <CheckCircle />}
                      onClick={handleValidate}
                      disabled={validating}
                      sx={{
                        bgcolor: '#10b981',
                        '&:hover': {
                          bgcolor: '#059669',
                        },
                      }}
                    >
                      {validating ? 'Validation...' : 'Valider'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => setOpenCancelDialog(true)}
                    >
                      Annuler
                    </Button>
                  </>
                )}
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => {
                    setSelectedInvoice(null)
                    setSelectedTab(0)
                  }}
                >
                  Retour
                </Button>
              </Box>
            }
          />

          {/* Résumé financier */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  bgcolor: alpha('#3b82f6', 0.05),
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Receipt sx={{ fontSize: 32, color: '#3b82f6' }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Total TTC
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a252f' }}>
                        {formatCurrency(selectedInvoice.total_ttc || selectedInvoice.total || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  bgcolor: alpha('#10b981', 0.05),
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AttachMoney sx={{ fontSize: 32, color: '#10b981' }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Payé
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a252f' }}>
                        {formatCurrency(selectedInvoice.paye || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  bgcolor: alpha(
                    selectedInvoice.reste > 0 ? '#ef4444' : '#10b981',
                    0.05
                  ),
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AttachMoney
                      sx={{
                        fontSize: 32,
                        color: selectedInvoice.reste > 0 ? '#ef4444' : '#10b981',
                      }}
                    />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Reste à payer
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: selectedInvoice.reste > 0 ? '#ef4444' : '#10b981',
                        }}
                      >
                        {formatCurrency(selectedInvoice.reste || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{
              mb: 3,
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            }}
          >
            <Tab label="Informations" />
            <Tab label="Lignes" />
            <Tab label="Paiements" />
          </Tabs>

          {selectedTab === 0 && (
            <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <CardContent>
                {canEdit && selectedInvoice.statut === 'VALIDEE' && (
                  <Box mb={3}>
                    <Button
                      variant="outlined"
                      startIcon={<Send />}
                      onClick={async () => {
                        try {
                          const response = await api.post(
                            `/billing/invoices/${selectedInvoice.id}/send_for_acceptance/`
                          )
                          setAcceptanceUrl(response.data.accept_url)
                          setAcceptanceExpiresAt(response.data.expires_at)
                          setOpenAcceptanceDialog(true)
                        } catch (error) {
                          showError(
                            error.response?.data?.error || 'Erreur lors de la génération du lien'
                          )
                        }
                      }}
                    >
                      Envoyer au client pour acceptation
                    </Button>
                  </Box>
                )}

                {selectedInvoice.contestation && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 3,
                      bgcolor: alpha('#f59e0b', 0.1),
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Facture contestée
                    </Typography>
                    <Typography variant="body2">
                      <strong>Date de contestation :</strong>{' '}
                      {formatDate(selectedInvoice.contestation.contestation_date)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Raison :</strong> {selectedInvoice.contestation.reason}
                    </Typography>
                    {selectedInvoice.contestation.contestant_name && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Contestataire :</strong>{' '}
                        {selectedInvoice.contestation.contestant_name}
                      </Typography>
                    )}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      Client
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedInvoice.client_detail?.nom_complet ||
                        selectedInvoice.client_detail?.nom ||
                        '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      Statut
                    </Typography>
                    <StatusChip
                      status={selectedInvoice.statut}
                      label={formatInvoiceStatus(
                        selectedInvoice.statut_display || selectedInvoice.statut
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      Date de création
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(selectedInvoice.created_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedInvoice.type === 'LIVRAISON' ? 'Livraison' : 'Retrait'}
                    </Typography>
                  </Grid>
                  {canEdit && selectedInvoice.statut === 'BROUILLON' && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedInvoice.tva_incluse ?? true}
                            onChange={async (e) => {
                              try {
                                const newValue = e.target.checked
                                await api.patch(`/billing/invoices/${selectedInvoice.id}/`, {
                                  tva_incluse: newValue,
                                })
                                // Refresh invoice data
                                const response = await api.get(`/billing/invoices/${selectedInvoice.id}/`)
                                setSelectedInvoice(response.data)
                                showSuccess(
                                  newValue
                                    ? 'TVA activées - Les totaux seront recalculés'
                                    : 'TVA désactivées - Les totaux seront recalculés'
                                )
                              } catch (error) {
                                console.error('Error updating TVA status:', error)
                                showError(
                                  error.response?.data?.detail ||
                                    'Erreur lors de la mise à jour du statut TVA'
                                )
                              }
                            }}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {selectedInvoice.tva_incluse ?? true ? 'TVA activées' : 'TVA désactivées'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {selectedInvoice.tva_incluse ?? true
                                ? 'Les TVA Jus (5.5%) et Bière (20%) sont appliquées'
                                : 'Aucune TVA ne sera appliquée sur cette facture'}
                            </Typography>
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start' }}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {selectedTab === 1 && (
            <Box>
              {canEdit && selectedInvoice.statut === 'BROUILLON' && (
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    mb: 3,
                    bgcolor: alpha('#d32f2f', 0.02),
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Ajouter une ligne
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option) =>
                          typeof option === 'string'
                            ? option
                            : `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`
                        }
                        getOptionKey={(option) =>
                          typeof option === 'string' ? option : `${option.id}-${option.unite_vente || ''}`
                        }
                        value={lineFormData.product}
                        onChange={(e, newValue) => handleProductChange(newValue)}
                        sx={{ flex: 1, minWidth: 250 }}
                        renderInput={(params) => (
                          <TextField {...params} label="Produit" size="small" />
                        )}
                      />
                      <TextField
                        label="Quantité"
                        type="number"
                        value={lineFormData.qty}
                        onChange={(e) => {
                          const value = e.target.value
                          if (productStock !== null && parseFloat(value) > productStock) {
                            return
                          }
                          setLineFormData({ ...lineFormData, qty: value })
                        }}
                        inputProps={{
                          min: 1,
                          max: productStock !== null ? productStock : undefined,
                        }}
                        helperText={
                          productStock !== null ? `Stock disponible: ${productStock}` : ''
                        }
                        error={
                          productStock !== null && parseFloat(lineFormData.qty) > productStock
                        }
                        size="small"
                        sx={{ width: 120 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddLine}
                        disabled={
                          !lineFormData.product ||
                          !lineFormData.qty ||
                          (productStock !== null && parseFloat(lineFormData.qty) > productStock)
                        }
                        sx={{
                          bgcolor: '#d32f2f',
                          '&:hover': {
                            bgcolor: '#b71c1c',
                          },
                        }}
                      >
                        Ajouter
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <CardContent>
                  <DataTable
                    columns={[
                      {
                        id: 'product_detail',
                        label: 'Produit',
                        format: (value) =>
                          value
                            ? `${value.nom} (${value.unite_vente_display || value.unite_vente || 'N/A'})`
                            : '-',
                      },
                      { id: 'qty', label: 'Quantité', align: 'right' },
                      {
                        id: 'prix_unit_applique',
                        label: 'Prix unitaire',
                        type: 'currency',
                        align: 'right',
                      },
                      { id: 'total_ligne', label: 'Total', type: 'currency', align: 'right' },
                    ]}
                    data={invoiceLines}
                    loading={false}
                    emptyMessage="Aucune ligne de facture"
                  />
                </CardContent>
              </Card>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              {canEdit && selectedInvoice && (selectedInvoice.statut === 'VALIDEE' || selectedInvoice.statut === 'BROUILLON') && (
                <Box mb={3}>
                  <Button
                    variant="contained"
                    startIcon={<Payment />}
                    onClick={() => setOpenPaymentForm(true)}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': {
                        bgcolor: '#b71c1c',
                      },
                    }}
                  >
                    Ajouter un paiement
                  </Button>
                </Box>
              )}

              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <CardContent>
                  <DataTable
                    columns={[
                      { id: 'date', label: 'Date', type: 'date' },
                      {
                        id: 'mode_display',
                        label: 'Mode',
                        format: (value, row) => value || row.mode || '-',
                      },
                      { id: 'montant', label: 'Montant', type: 'currency', align: 'right' },
                    ]}
                    data={payments}
                    loading={false}
                    emptyMessage="Aucun paiement enregistré"
                  />
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* Dialog création facture */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une facture</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={clients}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : option.nom_complet || option.nom || ''
            }
            value={formData.client}
            onChange={(e, newValue) => setFormData({ ...formData, client: newValue })}
            renderInput={(params) => (
              <TextField {...params} label="Client" required margin="normal" fullWidth />
            )}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              label="Type"
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              MenuProps={{
                disablePortal: true,
                disableScrollLock: true,
                disableAutoFocus: true,
                disableEnforceFocus: true,
              }}
            >
              <MenuItem value="LIVRAISON">Livraison</MenuItem>
              <MenuItem value="RETRAIT">Retrait</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button
            onClick={handleSaveInvoice}
            variant="contained"
            disabled={!formData.client}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog paiement */}
      <Dialog open={openPaymentForm} onClose={() => setOpenPaymentForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un paiement</DialogTitle>
        <DialogContent>
          <TextField
            label="Montant (€)"
            type="number"
            fullWidth
            margin="normal"
            value={paymentFormData.montant}
            onChange={(e) => setPaymentFormData({ ...paymentFormData, montant: e.target.value })}
            inputProps={{ step: '0.01', min: '0' }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Mode de paiement</InputLabel>
            <Select
              value={paymentFormData.mode}
              label="Mode de paiement"
              onChange={(e) => setPaymentFormData({ ...paymentFormData, mode: e.target.value })}
              MenuProps={{
                disablePortal: true,
                disableScrollLock: true,
                disableAutoFocus: true,
                disableEnforceFocus: true,
              }}
            >
              <MenuItem value="CASH">Espèces</MenuItem>
              <MenuItem value="VIREMENT">Virement</MenuItem>
              <MenuItem value="CB">Carte bancaire</MenuItem>
              <MenuItem value="CHEQUE">Chèque</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            value={paymentFormData.date}
            onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentForm(false)}>Annuler</Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            disabled={!paymentFormData.montant}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog lien acceptation */}
      <Dialog
        open={openAcceptanceDialog}
        onClose={() => setOpenAcceptanceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Lien d'acceptation généré</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Le lien d'acceptation a été généré. Partagez ce lien avec le client pour qu'il puisse
              accepter la facture.
            </Typography>
            {acceptanceExpiresAt && (
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                <strong>Expire le :</strong> {formatDate(acceptanceExpiresAt)}
              </Typography>
            )}
            <TextField
              label="Lien d'acceptation"
              value={acceptanceUrl}
              fullWidth
              multiline
              rows={3}
              InputProps={{
                readOnly: true,
              }}
            />
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => {
                navigator.clipboard.writeText(acceptanceUrl)
                showSuccess('Lien copié dans le presse-papiers')
              }}
            >
              Copier le lien
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAcceptanceDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog annulation */}
      <ConfirmDialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
        onConfirm={handleCancel}
        title="Annuler la facture"
        message={`Êtes-vous sûr de vouloir annuler la facture ${selectedInvoice?.numero || selectedInvoice?.id} ? Cette action est irréversible.`}
        confirmLabel="Annuler la facture"
      />
    </Box>
  )
}
