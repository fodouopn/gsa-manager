import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  alpha,
} from '@mui/material'
import { Add, CheckCircle, Print, ArrowBack, LocalShipping } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import StatusChip from '../components/StatusChip'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate } from '../utils/formatters'

const STEPS = ['Prévu', 'En cours', 'Validé']

export default function Containers() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { id } = useParams()
  const navigate = useNavigate()
  const [containers, setContainers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [openValidateDialog, setOpenValidateDialog] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState(null)
  const [manifestLines, setManifestLines] = useState([])
  const [receivedLines, setReceivedLines] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({ statut: '' })
  const [formData, setFormData] = useState({
    ref: '',
    date_arrivee_estimee: new Date().toISOString().split('T')[0],
  })
  const [lineFormData, setLineFormData] = useState({
    product: null,
    qty_prevue: '',
  })
  const [receivedFormData, setReceivedFormData] = useState({
    product: null,
    qty_recue: '',
  })
  const [openPrintDialog, setOpenPrintDialog] = useState(false)
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0])
  const [printDateType, setPrintDateType] = useState('day')

  const canEdit =
    user?.role !== 'LECTURE' &&
    (user?.role === 'LOGISTIQUE' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN')

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }
      if (filters.statut) {
        params.statut = filters.statut
      }

      const response = await api.get('/containers/', { params })

      if (response.data.results) {
        setContainers(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setContainers(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching containers:', error)
      showError('Erreur lors du chargement des conteneurs')
      setContainers([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.statut, showError])

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
    fetchContainers()
    fetchProducts()
  }, [fetchContainers, fetchProducts])

  useEffect(() => {
    if (id) {
      const loadContainer = async () => {
        try {
          const response = await api.get(`/containers/${id}/`)
          console.log('🔵 [DEBUG] Container loaded:', response.data)
          console.log('🔵 [DEBUG] date_arrivee_reelle:', response.data.date_arrivee_reelle)
          console.log('🔵 [DEBUG] All fields:', Object.keys(response.data))
          setSelectedContainer(response.data)
        } catch (error) {
          console.error('Error loading container:', error)
          navigate('/containers')
        }
      }
      loadContainer()
    } else {
      setSelectedContainer(null)
    }
  }, [id, navigate])

  useEffect(() => {
    if (selectedContainer) {
      fetchContainerDetails()
    }
  }, [selectedContainer])

  const fetchContainerDetails = async () => {
    if (!selectedContainer) return

    try {
      const manifestResponse = await api.get('/containers/manifest-lines/', {
        params: { container: selectedContainer.id },
      })
      setManifestLines(manifestResponse.data.results || manifestResponse.data)

      const receivedResponse = await api.get('/containers/received-lines/', {
        params: { container: selectedContainer.id },
      })
      setReceivedLines(receivedResponse.data.results || receivedResponse.data)
    } catch (error) {
      console.error('Error fetching container details:', error)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await api.post('/containers/', formData)
      setSelectedContainer(response.data)
      setOpenForm(false)
      setFormData({ ref: '', date_arrivee_estimee: new Date().toISOString().split('T')[0] })
      showSuccess('Conteneur créé avec succès')
      fetchContainers()
      navigate(`/containers/${response.data.id}`)
    } catch (error) {
      showError('Erreur lors de la création du conteneur')
    }
  }

  const handleAddManifestLine = async () => {
    if (!selectedContainer || !lineFormData.product || !lineFormData.qty_prevue) return

    try {
      await api.post('/containers/manifest-lines/', {
        container: selectedContainer.id,
        product: lineFormData.product.id || lineFormData.product,
        qty_prevue: parseFloat(lineFormData.qty_prevue),
      })
      setLineFormData({ product: null, qty_prevue: '' })
      fetchContainerDetails()
      fetchContainers()
      showSuccess('Ligne manifest ajoutée avec succès')
    } catch (error) {
      showError('Erreur lors de l\'ajout de la ligne')
    }
  }

  const handleAddReceivedLine = async () => {
    if (!selectedContainer || !receivedFormData.product || !receivedFormData.qty_recue) return

    try {
      await api.post('/containers/received-lines/', {
        container: selectedContainer.id,
        product: receivedFormData.product.id || receivedFormData.product,
        qty_recue: parseFloat(receivedFormData.qty_recue),
      })
      setReceivedFormData({ product: null, qty_recue: '' })
      fetchContainerDetails()
      showSuccess('Ligne reçue ajoutée avec succès')
    } catch (error) {
      showError('Erreur lors de l\'ajout de la ligne reçue')
    }
  }

  const handleValidate = async () => {
    if (!selectedContainer) return

    try {
      await api.post(`/containers/${selectedContainer.id}/validate/`)
      const response = await api.get(`/containers/${selectedContainer.id}/`)
      setSelectedContainer(response.data)
      setOpenValidateDialog(false)
      showSuccess('Conteneur validé avec succès')
      fetchContainers()
    } catch (error) {
      showError('Erreur lors de la validation')
    }
  }

  const getActiveStep = (statut) => {
    switch (statut) {
      case 'PREVU':
        return 0
      case 'EN_COURS':
        return 1
      case 'VALIDE':
        return 2
      default:
        return 0
    }
  }

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ statut: '' })
    setPage(0)
  }

  const columns = [
    { id: 'ref', label: 'Référence' },
    { id: 'date_arrivee_estimee', label: 'Date arrivée estimée', type: 'date' },
    {
      id: 'date_arrivee_reelle',
      label: 'Date arrivée réelle',
      type: 'date',
      format: (value) => (value ? formatDate(value) : '-'),
    },
    {
      id: 'statut',
      label: 'Statut',
      type: 'status',
      statusLabel: (value) => {
        switch (value) {
          case 'PREVU':
            return 'Prévu'
          case 'EN_COURS':
            return 'En cours'
          case 'VALIDE':
            return 'Validé'
          default:
            return value
        }
      },
    },
    { id: 'total_qty_prevue', label: 'Qté prévue', align: 'right' },
    { id: 'total_qty_recue', label: 'Qté reçue', align: 'right' },
  ]

  return (
    <Box>
      {!selectedContainer ? (
        <>
          <PageHeader
            title="Conteneurs"
            subtitle="Gérez vos conteneurs d'importation"
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => setOpenPrintDialog(true)}
                >
                  Imprimer
                </Button>
                {canEdit && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenForm(true)}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': {
                        bgcolor: '#b71c1c',
                      },
                    }}
                  >
                    Nouveau conteneur
                  </Button>
                )}
              </>
            }
          />

          <FiltersBar
            search=""
            onSearchChange={() => {}}
            filters={[
              {
                id: 'statut',
                label: 'Statut',
                type: 'select',
                value: filters.statut,
                options: [
                  { value: '', label: 'Tous' },
                  { value: 'PREVU', label: 'Prévu' },
                  { value: 'EN_COURS', label: 'En cours' },
                  { value: 'VALIDE', label: 'Validé' },
                ],
              },
            ]}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            loading={loading}
          />

          <DataTable
            columns={columns}
            data={containers}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onPageChange={setPage}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage)
              setPage(0)
            }}
            onRowClick={(row) => {
              navigate(`/containers/${row.id}`)
            }}
            emptyMessage="Aucun conteneur trouvé"
            emptyActionLabel="Créer un conteneur"
            onEmptyAction={canEdit ? () => setOpenForm(true) : undefined}
          />
        </>
      ) : (
        <Box>
          <PageHeader
            title={`Conteneur ${selectedContainer.ref}`}
            subtitle={`Date d'arrivée estimée: ${formatDate(selectedContainer.date_arrivee_estimee)}${selectedContainer.date_arrivee_reelle ? ` | Date d'arrivée réelle: ${formatDate(selectedContainer.date_arrivee_reelle)}` : ''}`}
            actions={
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => {
                  setSelectedContainer(null)
                  navigate('/containers')
                }}
              >
                Retour à la liste
              </Button>
            }
          />

          {/* Informations du conteneur */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#2c3e50' }}>
                Informations du conteneur
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Référence
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedContainer.ref}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Statut
                  </Typography>
                  <StatusChip
                    status={selectedContainer.statut}
                    label={
                      selectedContainer.statut === 'PREVU'
                        ? 'Prévu'
                        : selectedContainer.statut === 'EN_COURS'
                          ? 'En cours'
                          : 'Validé'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Date d'arrivée estimée
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(selectedContainer.date_arrivee_estimee)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>
                    Date prévue lors de la création du conteneur
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                    Date d'arrivée réelle
                  </Typography>
                  {canEdit && selectedContainer.statut !== 'VALIDE' ? (
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      value={selectedContainer.date_arrivee_reelle || ''}
                      onChange={async (e) => {
                        try {
                          const updatedContainer = {
                            ...selectedContainer,
                            date_arrivee_reelle: e.target.value || null,
                          }
                          await api.patch(`/containers/${selectedContainer.id}/`, {
                            date_arrivee_reelle: e.target.value || null,
                          })
                          setSelectedContainer(updatedContainer)
                          showSuccess('Date d\'arrivée réelle mise à jour')
                        } catch (error) {
                          console.error('Error updating date:', error)
                          showError('Erreur lors de la mise à jour de la date')
                        }
                      }}
                      helperText="Date à laquelle le conteneur est réellement arrivé (à remplir avant la validation du conteneur)"
                      InputLabelProps={{ shrink: true }}
                      sx={{ mt: 0 }}
                    />
                  ) : (
                    <Box sx={{ py: 0.5 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 500,
                          color: selectedContainer.date_arrivee_reelle ? '#2c3e50' : '#9e9e9e',
                          mb: 0.5
                        }}
                      >
                        {selectedContainer.date_arrivee_reelle
                          ? formatDate(selectedContainer.date_arrivee_reelle)
                          : 'Non renseignée'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>
                        {selectedContainer.statut === 'VALIDE' 
                          ? 'Conteneur validé - modification impossible'
                          : 'Date réelle d\'arrivée du conteneur (à remplir quand le conteneur arrive)'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Timeline visuelle */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <LocalShipping sx={{ fontSize: 32, color: '#d32f2f' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Cycle de vie du conteneur
                  </Typography>
                </Box>
              </Box>
              <Stepper activeStep={getActiveStep(selectedContainer.statut)} alternativeLabel>
                {STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>

          {selectedContainer.statut === 'EN_COURS' && (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                bgcolor: alpha('#3b82f6', 0.1),
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <strong>Statut "En cours" :</strong> Le conteneur a été créé et contient des lignes
              manifest, mais n'est pas encore validé. Il est en attente de déchargement et de
              validation. Ajoutez les quantités reçues pour pouvoir valider le conteneur.
            </Alert>
          )}

          {canEdit && selectedContainer.statut !== 'VALIDE' && receivedLines.length > 0 && (
            <Box mb={3}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<CheckCircle />}
                onClick={() => setOpenValidateDialog(true)}
                sx={{
                  bgcolor: '#10b981',
                  '&:hover': {
                    bgcolor: '#059669',
                  },
                }}
              >
                Valider le conteneur
              </Button>
            </Box>
          )}

          <Grid container spacing={3}>
            {/* Lignes manifest */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Lignes manifest (prévues)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {manifestLines.length} ligne{manifestLines.length > 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  {canEdit && selectedContainer.statut === 'PREVU' && (
                    <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option) =>
                          typeof option === 'string'
                            ? option
                            : `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`
                        }
                        getOptionKey={(option) =>
                          typeof option === 'string' ? option : `${option.id}-${option.unite_vente}`
                        }
                        value={lineFormData.product}
                        onChange={(e, newValue) =>
                          setLineFormData({ ...lineFormData, product: newValue })
                        }
                        sx={{ flex: 1, minWidth: 200 }}
                        renderInput={(params) => <TextField {...params} label="Produit" size="small" />}
                      />
                      <TextField
                        label="Quantité prévue"
                        type="number"
                        value={lineFormData.qty_prevue}
                        onChange={(e) =>
                          setLineFormData({ ...lineFormData, qty_prevue: e.target.value })
                        }
                        size="small"
                        sx={{ width: 120 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddManifestLine}
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
                  )}

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
                      { id: 'qty_prevue', label: 'Quantité prévue', align: 'right' },
                    ]}
                    data={manifestLines}
                    loading={false}
                    emptyMessage="Aucune ligne manifest"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Lignes reçues */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Lignes reçues
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {receivedLines.length} ligne{receivedLines.length > 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  {canEdit && selectedContainer.statut !== 'VALIDE' && (
                    <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option) =>
                          typeof option === 'string'
                            ? option
                            : `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`
                        }
                        getOptionKey={(option) =>
                          typeof option === 'string' ? option : `${option.id}-${option.unite_vente}`
                        }
                        value={receivedFormData.product}
                        onChange={(e, newValue) =>
                          setReceivedFormData({ ...receivedFormData, product: newValue })
                        }
                        sx={{ flex: 1, minWidth: 200 }}
                        renderInput={(params) => <TextField {...params} label="Produit" size="small" />}
                      />
                      <TextField
                        label="Quantité reçue"
                        type="number"
                        value={receivedFormData.qty_recue}
                        onChange={(e) =>
                          setReceivedFormData({ ...receivedFormData, qty_recue: e.target.value })
                        }
                        size="small"
                        sx={{ width: 120 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddReceivedLine}
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
                  )}

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
                      { id: 'qty_recue', label: 'Quantité reçue', align: 'right' },
                    ]}
                    data={receivedLines}
                    loading={false}
                    emptyMessage="Aucune ligne reçue"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Dialog création conteneur */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un conteneur</DialogTitle>
        <DialogContent>
          <TextField
            label="Référence"
            fullWidth
            required
            margin="normal"
            value={formData.ref}
            onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
          />
          <TextField
            label="Date d'arrivée estimée"
            type="date"
            fullWidth
            required
            margin="normal"
            value={formData.date_arrivee_estimee}
            onChange={(e) => setFormData({ ...formData, date_arrivee_estimee: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.ref || !formData.date_arrivee_estimee}
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

      {/* Dialog validation */}
      <ConfirmDialog
        open={openValidateDialog}
        onClose={() => setOpenValidateDialog(false)}
        onConfirm={handleValidate}
        title="Valider le conteneur"
        message={`Êtes-vous sûr de vouloir valider le conteneur ${selectedContainer?.ref} ? Cette action est irréversible.`}
        confirmLabel="Valider"
        color="success"
      />

      {/* Dialog impression */}
      <Dialog
        open={openPrintDialog}
        onClose={() => setOpenPrintDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Imprimer le rapport de conteneurs</DialogTitle>
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
                const response = await api.get('/containers/print_containers/', {
                  params: { date: printDate },
                  responseType: 'blob',
                })
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `containers_${printDate}.pdf`)
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
