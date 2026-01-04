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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Autocomplete,
  Tabs,
  Tab,
  Snackbar,
  CircularProgress,
  Fade,
  Grid,
} from '@mui/material'
import { Add, CheckCircle, Cancel, Payment } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import { formatDate, formatCurrency } from '../utils/formatters'

export default function Purchases() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [purchaseLines, setPurchaseLines] = useState([])
  const [selectedTab, setSelectedTab] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
  })
  const [formData, setFormData] = useState({
    fournisseur: null,
    date_achat: new Date().toISOString().split('T')[0],
    reference: '',
  })
  const [lineFormData, setLineFormData] = useState({
    product: null,
    qty: '',
    prix_unitaire: '',
  })
  const [validating, setValidating] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [supplierDebts, setSupplierDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [purchasePayments, setPurchasePayments] = useState([])
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    montant: '',
    mode: 'VIREMENT',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  })

  const canEdit = user?.role !== 'LECTURE' && (user?.role === 'LOGISTIQUE' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN')

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }

      if (filters.search) {
        params.search = filters.search
      }

      const response = await api.get('/stock/purchases/', { params })
      
      if (response.data.results) {
        setPurchases(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setPurchases(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
      setPurchases([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.search])

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

  const fetchPurchaseDetail = useCallback(async () => {
    if (!selectedPurchase) return

    try {
      const response = await api.get(`/stock/purchases/${selectedPurchase.id}/`)
      setSelectedPurchase(response.data)
      setPurchaseLines(response.data.purchase_lines || [])
    } catch (error) {
      console.error('Error fetching purchase details:', error)
      setSelectedPurchase(null)
      setPurchaseLines([])
    }
  }, [selectedPurchase?.id])

  useEffect(() => {
    fetchPurchases()
    fetchProducts()
    fetchClients()
  }, [fetchPurchases, fetchProducts, fetchClients])

  useEffect(() => {
    if (selectedPurchase && selectedTab > 0 && selectedTab !== 2 && selectedTab !== 3) {
      fetchPurchaseDetail()
    } else if (selectedTab === 2) {
      // Onglet Paiements
      if (selectedPurchase) {
        fetchPurchasePayments()
      }
    } else if (selectedTab === 3) {
      // Onglet Historique des dettes
      fetchSupplierDebts()
    }
  }, [selectedPurchase?.id, selectedTab, fetchPurchaseDetail])

  const fetchPurchasePayments = useCallback(async () => {
    if (!selectedPurchase) return
    try {
      const response = await api.get('/stock/purchase-payments/', {
        params: { purchase: selectedPurchase.id }
      })
      setPurchasePayments(response.data.results || response.data || [])
    } catch (error) {
      console.error('Error fetching purchase payments:', error)
      setPurchasePayments([])
    }
  }, [selectedPurchase?.id])

  const fetchSupplierDebts = useCallback(async () => {
    try {
      setLoadingDebts(true)
      const response = await api.get('/stock/purchases/supplier_debts/')
      setSupplierDebts(response.data || [])
    } catch (error) {
      console.error('Error fetching supplier debts:', error)
      setSupplierDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }, [])

  const handleCreatePurchase = async () => {
    if (!formData.fournisseur || !formData.date_achat) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      const dataToSend = {
        fournisseur: formData.fournisseur.id,
        date_achat: formData.date_achat,
        // reference is auto-generated, don't send it
      }
      const response = await api.post('/stock/purchases/', dataToSend)
      setOpenForm(false)
      setFormData({
        fournisseur: null,
        date_achat: new Date().toISOString().split('T')[0],
        reference: '',
      })
      fetchPurchases()
      setSelectedPurchase(response.data)
      setSelectedTab(1)
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors de la création de l\'achat'
      alert(errorMessage)
    }
  }

  const handleAddLine = async () => {
    if (!selectedPurchase || !lineFormData.product || !lineFormData.qty || !lineFormData.prix_unitaire) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      await api.post('/stock/purchase-lines/', {
        purchase: selectedPurchase.id,
        product: lineFormData.product.id || lineFormData.product,
        qty: parseInt(lineFormData.qty),
        prix_unitaire: parseFloat(lineFormData.prix_unitaire),
      })
      setLineFormData({ product: null, qty: '', prix_unitaire: '' })
      fetchPurchaseDetail()
      fetchPurchases()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors de l\'ajout de la ligne'
      alert(errorMessage)
    }
  }

  const handleDeleteLine = async (lineId) => {
    if (!window.confirm('Supprimer cette ligne ?')) {
      return
    }

    try {
      await api.delete(`/stock/purchase-lines/${lineId}/`)
      fetchPurchaseDetail()
      fetchPurchases()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors de la suppression'
      alert(errorMessage)
    }
  }

  const handleValidate = async (purchase) => {
    if (!window.confirm(`Valider l'achat ${purchase.reference || purchase.id} ?`)) {
      return
    }

    setValidating(true)
    setValidationSuccess(false)
    setValidationError(null)

    try {
      const response = await api.post(`/stock/purchases/${purchase.id}/validate/`)

      setValidationSuccess(true)
      setTimeout(() => setValidationSuccess(false), 3000)

      await fetchPurchases()
      if (selectedPurchase?.id === purchase.id) {
        const updatedPurchase = response.data.purchase
        setSelectedPurchase(updatedPurchase)
        await fetchPurchaseDetail()
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors de la validation'
      setValidationError(errorMessage)
      setTimeout(() => setValidationError(null), 5000)
    } finally {
      setValidating(false)
    }
  }

  const formatPaymentStatus = (purchase) => {
    const reste = parseFloat(purchase.reste_a_payer || 0)
    const totalPaye = parseFloat(purchase.total_paye || 0)
    const totalAchat = parseFloat(purchase.total_achat || 0)
    
    if (totalAchat === 0) {
      return { label: 'Non réglé', color: 'default' }
    }
    
    // Montant avancé : payé plus que le total
    if (totalPaye > totalAchat) {
      return { label: 'Montant avancé', color: 'info' }
    }
    
    // Réglé : payé exactement ou plus que le total
    if (reste <= 0 || totalPaye >= totalAchat) {
      return { label: 'Réglé', color: 'success' }
    }
    
    // Non réglé : reste à payer
    return { label: 'Non réglé', color: 'error' }
  }

  const columns = [
    { id: 'reference', label: 'Référence', minWidth: 150 },
    {
      id: 'fournisseur_detail',
      label: 'Fournisseur',
      minWidth: 200,
      format: (value) => value ? (value.entreprise || value.nom_complet) : '-',
    },
    {
      id: 'date_achat',
      label: 'Date d\'achat',
      minWidth: 150,
      type: 'date',
    },
    {
      id: 'paiement',
      label: 'Paiement',
      minWidth: 150,
      format: (value, row) => {
        const status = formatPaymentStatus(row)
        return (
          <Chip
            label={status.label}
            color={status.color}
            size="small"
          />
        )
      },
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Achats</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenForm(true)}
          >
            Nouvel achat
          </Button>
        )}
      </Box>

      {validationSuccess && (
        <Snackbar
          open={validationSuccess}
          autoHideDuration={3000}
          onClose={() => setValidationSuccess(false)}
          TransitionComponent={Fade}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setValidationSuccess(false)} severity="success" sx={{ width: '100%' }}>
            Achat validé avec succès !
          </Alert>
        </Snackbar>
      )}

      {validationError && (
        <Snackbar
          open={!!validationError}
          autoHideDuration={5000}
          onClose={() => setValidationError(null)}
          TransitionComponent={Fade}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setValidationError(null)} severity="error" sx={{ width: '100%' }}>
            {validationError}
          </Alert>
        </Snackbar>
      )}

      {!selectedPurchase ? (
        <>
          <Box mb={2} display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              sx={{ minWidth: 200 }}
            />
          </Box>

          <DataTable
            columns={columns}
            data={purchases}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            onRowClick={async (row) => {
              const response = await api.get(`/stock/purchases/${row.id}/`)
              setSelectedPurchase(response.data)
              setSelectedTab(0)
            }}
            emptyMessage="Aucun achat"
            canEdit={false}
            canDelete={false}
          />
        </>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Achat {selectedPurchase.reference || `#${selectedPurchase.id}`}
            </Typography>
            <Box display="flex" gap={1}>
              {canEdit && selectedPurchase.statut === 'BROUILLON' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={validating ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                    onClick={() => handleValidate(selectedPurchase)}
                    disabled={validating}
                  >
                    {validating ? 'Validation...' : 'Valider'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => {
                      if (window.confirm('Supprimer cet achat ?')) {
                        api.delete(`/stock/purchases/${selectedPurchase.id}/`)
                          .then(() => {
                            setSelectedPurchase(null)
                            setSelectedTab(0)
                            fetchPurchases()
                          })
                          .catch((error) => {
                            alert(error.response?.data?.error || 'Erreur lors de la suppression')
                          })
                      }
                    }}
                    disabled={validating}
                  >
                    Supprimer
                  </Button>
                </>
              )}
              <Button onClick={() => {
                setSelectedPurchase(null)
                setSelectedTab(0)
              }}>
                Retour
              </Button>
            </Box>
          </Box>

          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Informations" />
            <Tab label="Lignes" />
            <Tab label="Paiements" />
            <Tab label="Historique des dettes" />
          </Tabs>

          {selectedTab === 0 && (
            <Box mt={3}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Détails de l'achat</Typography>
                </Box>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Référence"
                    value={selectedPurchase.reference || ''}
                    disabled
                    fullWidth
                  />
                  <TextField
                    label="Fournisseur"
                    value={selectedPurchase.fournisseur_detail ? (selectedPurchase.fournisseur_detail.entreprise || selectedPurchase.fournisseur_detail.nom_complet) : (selectedPurchase.fournisseur || '')}
                    disabled
                    fullWidth
                  />
                  <TextField
                    label="Date d'achat"
                    value={selectedPurchase.date_achat ? formatDate(selectedPurchase.date_achat) : ''}
                    disabled
                    fullWidth
                  />
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      État de paiement
                    </Typography>
                    <Box display="flex" gap={2} alignItems="center" mt={1}>
                      <Chip
                        label={formatPaymentStatus(selectedPurchase).label}
                        color={formatPaymentStatus(selectedPurchase).color}
                        size="small"
                      />
                    </Box>
                  </Box>
                  {selectedPurchase.validated_at && (
                    <TextField
                      label="Validé le"
                      value={formatDate(selectedPurchase.validated_at)}
                      disabled
                      fullWidth
                    />
                  )}
                  {selectedPurchase.validated_by_username && (
                    <TextField
                      label="Validé par"
                      value={selectedPurchase.validated_by_username}
                      disabled
                      fullWidth
                    />
                  )}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suivi de paiement
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Total achat
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(selectedPurchase.total_achat || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Payé
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(selectedPurchase.total_paye || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Reste à payer
                        </Typography>
                        <Typography variant="h6" color={selectedPurchase.reste_a_payer > 0 ? "error.main" : "success.main"}>
                          {formatCurrency(selectedPurchase.reste_a_payer || 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          {selectedTab === 1 && (
            <Box mt={3}>
              {canEdit && selectedPurchase.statut === 'BROUILLON' && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Ajouter une ligne
                  </Typography>
                  <Box display="flex" gap={2} alignItems="flex-end">
                    <Autocomplete
                      options={products}
                      getOptionLabel={(option) => `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`}
                      getOptionKey={(option) => `${option.id}-${option.unite_vente}`}
                      value={lineFormData.product}
                      onChange={(e, newValue) => setLineFormData({ ...lineFormData, product: newValue })}
                      renderInput={(params) => <TextField {...params} label="Produit" />}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Quantité"
                      type="number"
                      value={lineFormData.qty}
                      onChange={(e) => setLineFormData({ ...lineFormData, qty: e.target.value })}
                      sx={{ width: 120 }}
                    />
                    <TextField
                      label="Prix unitaire"
                      type="number"
                      value={lineFormData.prix_unitaire}
                      onChange={(e) => setLineFormData({ ...lineFormData, prix_unitaire: e.target.value })}
                      sx={{ width: 150 }}
                    />
                    <Button variant="contained" onClick={handleAddLine} startIcon={<Add />}>
                      Ajouter
                    </Button>
                  </Box>
                </Paper>
              )}

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Prix unitaire</TableCell>
                      <TableCell align="right">Total</TableCell>
                      {canEdit && selectedPurchase.statut === 'BROUILLON' && (
                        <TableCell align="center">Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit && selectedPurchase.statut === 'BROUILLON' ? 5 : 4} align="center">
                          Aucune ligne
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            {line.product_detail?.nom || line.product}
                            {line.product_detail?.unite_vente_display && ` (${line.product_detail.unite_vente_display})`}
                          </TableCell>
                          <TableCell align="right">{line.qty}</TableCell>
                          <TableCell align="right">{formatCurrency(line.prix_unitaire)}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(line.qty * line.prix_unitaire)}
                          </TableCell>
                          {canEdit && selectedPurchase.statut === 'BROUILLON' && (
                            <TableCell align="center">
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                Supprimer
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box mt={3}>
              <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Paiements effectués</Typography>
                {canEdit && selectedPurchase && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenPaymentDialog(true)}
                  >
                    Ajouter un paiement
                  </Button>
                )}
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell align="right">Montant (€)</TableCell>
                      <TableCell>Référence</TableCell>
                      {canEdit && (
                        <TableCell align="center">Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchasePayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 5 : 4} align="center">
                          Aucun paiement enregistré
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchasePayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>{payment.mode_display || payment.mode}</TableCell>
                          <TableCell align="right">{formatCurrency(payment.montant)}</TableCell>
                          <TableCell>{payment.reference || '-'}</TableCell>
                          {canEdit && (
                            <TableCell align="center">
                              <Button
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (window.confirm('Supprimer ce paiement ?')) {
                                    try {
                                      await api.delete(`/stock/purchase-payments/${payment.id}/`)
                                      await fetchPurchasePayments()
                                      await fetchPurchaseDetail()
                                      // Rafraîchir la liste pour mettre à jour les statuts
                                      const refreshResponse = await api.get('/stock/purchases/', { 
                                        params: { page: page + 1, page_size: rowsPerPage } 
                                      })
                                      if (refreshResponse.data.results) {
                                        setPurchases(refreshResponse.data.results || [])
                                      }
                                    } catch (error) {
                                      alert(error.response?.data?.error || 'Erreur lors de la suppression')
                                    }
                                  }
                                }}
                              >
                                Supprimer
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {selectedTab === 3 && (
            <Box mt={3}>
              <Paper sx={{ p: 3 }}>
                <Box mb={2}>
                  <Typography variant="h6" gutterBottom>
                    Historique des dettes (Fournisseurs)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cette section affiche les factures impayées de vos fournisseurs (clients qui sont aussi fournisseurs). 
                    Elle vous permet de suivre ce que vous devez à chaque fournisseur pour vos achats.
                  </Typography>
                </Box>
                {loadingDebts ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : supplierDebts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Aucune dette enregistrée
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fournisseur</TableCell>
                          <TableCell align="right">Nombre de factures</TableCell>
                          <TableCell align="right">Total dû (€)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {supplierDebts.map((debt) => (
                          <TableRow key={debt.supplier.id}>
                            <TableCell>
                              {debt.supplier.entreprise || debt.supplier.nom_complet}
                            </TableCell>
                            <TableCell align="right">{debt.invoice_count}</TableCell>
                            <TableCell align="right">{formatCurrency(debt.total_due)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un paiement</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Montant (€)"
              type="number"
              value={paymentFormData.montant}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, montant: e.target.value })}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
            />
            <FormControl fullWidth>
              <InputLabel>Mode de paiement</InputLabel>
              <Select
                value={paymentFormData.mode}
                label="Mode de paiement"
                onChange={(e) => setPaymentFormData({ ...paymentFormData, mode: e.target.value })}
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
              value={paymentFormData.date}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Référence (optionnel)"
              value={paymentFormData.reference}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPaymentDialog(false)
            setPaymentFormData({
              montant: '',
              mode: 'VIREMENT',
              date: new Date().toISOString().split('T')[0],
              reference: '',
            })
          }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!paymentFormData.montant || !paymentFormData.date) {
                alert('Veuillez remplir tous les champs obligatoires')
                return
              }
              try {
                await api.post('/stock/purchase-payments/', {
                  purchase: selectedPurchase.id,
                  ...paymentFormData,
                })
                setOpenPaymentDialog(false)
                setPaymentFormData({
                  montant: '',
                  mode: 'VIREMENT',
                  date: new Date().toISOString().split('T')[0],
                  reference: '',
                })
                await fetchPurchasePayments()
                await fetchPurchaseDetail()
                // Rafraîchir la liste pour mettre à jour les statuts
                const refreshResponse = await api.get('/stock/purchases/', { 
                  params: { page: page + 1, page_size: rowsPerPage } 
                })
                if (refreshResponse.data.results) {
                  setPurchases(refreshResponse.data.results || [])
                }
              } catch (error) {
                alert(error.response?.data?.error || 'Erreur lors de l\'ajout du paiement')
              }
            }}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel achat</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Référence"
              value="(Générée automatiquement)"
              disabled
              fullWidth
              helperText="La référence sera générée automatiquement lors de la création"
            />
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => 
                typeof option === 'string' ? option : (option.entreprise || option.nom_complet || '')
              }
              value={formData.fournisseur}
              onChange={(e, newValue) => setFormData({ ...formData, fournisseur: newValue })}
              renderInput={(params) => (
                <TextField {...params} label="Fournisseur" required />
              )}
              fullWidth
            />
            <TextField
              label="Date d'achat"
              type="date"
              value={formData.date_achat}
              onChange={(e) => setFormData({ ...formData, date_achat: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreatePurchase}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

