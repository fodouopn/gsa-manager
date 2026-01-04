import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  alpha,
} from '@mui/material'
import { Add, Edit, Delete, Print, ArrowBack, AttachMoney } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import ClientForm from '../components/ClientForm'
import ClientPriceForm from '../components/ClientPriceForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatters'

export default function Clients() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [openPriceForm, setOpenPriceForm] = useState(false)
  const [openPrintDialog, setOpenPrintDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0])
  const [printDateType, setPrintDateType] = useState('day')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientPrices, setClientPrices] = useState([])
  const [totalDue, setTotalDue] = useState(0)
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [totalOwed, setTotalOwed] = useState(0)
  const [avoirCount, setAvoirCount] = useState(0)
  const [owedDetails, setOwedDetails] = useState({
    avoirs_amount: 0,
    excess_invoice_payments: 0,
    unpaid_purchases_amount: 0,
    excess_purchase_payments: 0,
    has_purchases: false,
  })
  const [selectedTab, setSelectedTab] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    actif: '',
    pays: '',
    ville: '',
  })
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)

  const canEdit =
    user?.role !== 'LECTURE' &&
    (user?.role === 'COMMERCIAL' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN')

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
      }

      if (filters.search) {
        params.search = filters.search
      }
      if (filters.actif !== '') {
        params.actif = filters.actif === 'true'
      }
      if (filters.pays) {
        params.pays = filters.pays
      }
      if (filters.ville) {
        params.ville = filters.ville
      }

      const response = await api.get('/clients/', { params })

      if (response.data.results) {
        setClients(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setClients(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      showError('Erreur lors du chargement des clients')
      setClients([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.search, filters.actif, filters.pays, filters.ville, showError])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const fetchClientDetail = async (clientId) => {
    try {
      const response = await api.get(`/clients/${clientId}/`)
      return response.data
    } catch (error) {
      console.error('Error fetching client detail:', error)
      return null
    }
  }

  const fetchClientPrices = useCallback(async () => {
    if (!selectedClient) return

    try {
      const response = await api.get('/clients/prices/', {
        params: { client: selectedClient.id },
      })
      const prices = response.data.results || response.data
      setClientPrices(prices)
    } catch (error) {
      console.error('Error fetching client prices:', error)
    }
  }, [selectedClient?.id])

  useEffect(() => {
    if (selectedClient && selectedTab === 1) {
      fetchClientPrices()
    }
  }, [selectedClient?.id, selectedTab, fetchClientPrices])

  const fetchClientTotalDue = useCallback(async () => {
    if (!selectedClient) return

    try {
      const response = await api.get(`/clients/${selectedClient.id}/total_due/`)
      setTotalDue(response.data.total_due || 0)
      setUnpaidCount(response.data.unpaid_count || 0)
    } catch (error) {
      console.error('Error fetching client total due:', error)
      setTotalDue(0)
      setUnpaidCount(0)
    }
  }, [selectedClient?.id])

  const fetchClientTotalOwed = useCallback(async () => {
    if (!selectedClient) return

    try {
      const response = await api.get(`/clients/${selectedClient.id}/total_owed_to_client/`)
      const totalOwedValue = response.data?.total_owed ?? 0
      const avoirCountValue = response.data?.avoir_count ?? 0
      setTotalOwed(totalOwedValue)
      setAvoirCount(avoirCountValue)
      setOwedDetails({
        avoirs_amount: response.data?.avoirs_amount ?? 0,
        excess_invoice_payments: response.data?.excess_invoice_payments ?? 0,
        unpaid_purchases_amount: response.data?.unpaid_purchases_amount ?? 0,
        excess_purchase_payments: response.data?.excess_purchase_payments ?? 0,
        has_purchases: response.data?.has_purchases ?? false,
      })
    } catch (error) {
      console.error('Error fetching client total owed:', error)
      setTotalOwed(0)
      setAvoirCount(0)
      setOwedDetails({
        avoirs_amount: 0,
        excess_invoice_payments: 0,
        unpaid_purchases_amount: 0,
        excess_purchase_payments: 0,
        has_purchases: false,
      })
    }
  }, [selectedClient?.id])

  useEffect(() => {
    if (selectedClient) {
      fetchClientTotalDue()
      fetchClientTotalOwed()
    }
  }, [selectedClient?.id, fetchClientTotalDue, fetchClientTotalOwed])

  const handleFormSuccess = (client) => {
    if (selectedClient) {
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)))
      setSelectedClient(client)
      showSuccess('Client modifié avec succès')
    } else {
      fetchClients()
      showSuccess('Client créé avec succès')
    }
    setOpenForm(false)
  }

  const handleDelete = async () => {
    if (!clientToDelete) return

    try {
      await api.delete(`/clients/${clientToDelete.id}/`)
      showSuccess('Client supprimé avec succès')
      setOpenDeleteDialog(false)
      setClientToDelete(null)
      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null)
      }
      fetchClients()
    } catch (error) {
      showError('Erreur lors de la suppression')
    }
  }

  const handleEdit = async (client) => {
    const detail = await fetchClientDetail(client.id)
    setSelectedClient(detail || client)
    setOpenForm(true)
  }

  const handleCreate = () => {
    setSelectedClient(null)
    setOpenForm(true)
  }

  const handlePriceFormSuccess = () => {
    fetchClientPrices()
    setSelectedPrice(null)
    showSuccess('Prix enregistré avec succès')
  }

  const handleAddPrice = () => {
    setSelectedPrice(null)
    setOpenPriceForm(true)
  }

  const handleEditPrice = (price) => {
    setSelectedPrice(price)
    setOpenPriceForm(true)
  }

  const handleDeletePrice = async (price) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
      return
    }

    try {
      await api.delete(`/clients/prices/${price.id}/`)
      fetchClientPrices()
      showSuccess('Prix supprimé avec succès')
    } catch (error) {
      showError('Erreur lors de la suppression')
    }
  }

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', actif: '', pays: '', ville: '' })
    setPage(0)
  }

  const columns = [
    {
      id: 'nom_complet',
      label: 'Nom complet',
      format: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
            {value}
          </Typography>
          {row.entreprise && (
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {row.entreprise}
            </Typography>
          )}
        </Box>
      ),
    },
    { id: 'email', label: 'Email' },
    { id: 'telephone', label: 'Téléphone' },
    { id: 'ville', label: 'Ville' },
    { id: 'pays', label: 'Pays' },
    {
      id: 'actif',
      label: 'Statut',
      type: 'status',
      statusLabel: (value) => (value ? 'Actif' : 'Inactif'),
    },
  ]

  return (
    <Box>
      {!selectedClient ? (
        <>
          <PageHeader
            title="Clients"
            subtitle="Gérez votre base de clients"
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
                    onClick={handleCreate}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': {
                        bgcolor: '#b71c1c',
                      },
                    }}
                  >
                    Nouveau client
                  </Button>
                )}
              </>
            }
          />

          <FiltersBar
            search={filters.search}
            onSearchChange={(value) => handleFilterChange('search', value)}
            filters={[
              {
                id: 'actif',
                label: 'Statut',
                type: 'select',
                value: filters.actif,
                options: [
                  { value: '', label: 'Tous' },
                  { value: 'true', label: 'Actifs' },
                  { value: 'false', label: 'Inactifs' },
                ],
              },
            ]}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            loading={loading}
          />

          <DataTable
            columns={columns}
            data={clients}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onPageChange={setPage}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage)
              setPage(0)
            }}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={
              canEdit
                ? (client) => {
                    setClientToDelete(client)
                    setOpenDeleteDialog(true)
                  }
                : undefined
            }
            onRowClick={async (row) => {
              const detail = await fetchClientDetail(row.id)
              setSelectedClient(detail || row)
              setSelectedTab(0)
            }}
            canEdit={canEdit}
            canDelete={canEdit}
            emptyMessage="Aucun client trouvé"
            emptyActionLabel="Créer un client"
            onEmptyAction={canEdit ? handleCreate : undefined}
          />
        </>
      ) : (
        <Box>
          <PageHeader
            title={selectedClient.nom_complet || selectedClient.nom}
            subtitle="Détails du client"
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={async () => {
                    try {
                      const response = await api.get(`/clients/${selectedClient.id}/print_client_detail/`, {
                        responseType: 'blob',
                      })
                      const url = window.URL.createObjectURL(new Blob([response.data]))
                      const link = document.createElement('a')
                      link.href = url
                      link.setAttribute('download', `fiche_client_${selectedClient.nom_complet.replace(/\s+/g, '_')}.pdf`)
                      document.body.appendChild(link)
                      link.click()
                      link.remove()
                      window.URL.revokeObjectURL(url)
                      showSuccess('Fiche client générée avec succès')
                    } catch (error) {
                      console.error('Error generating client PDF:', error)
                      showError('Erreur lors de la génération de la fiche client')
                    }
                  }}
                >
                  Imprimer la fiche
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => setSelectedClient(null)}
                >
                  Retour à la liste
                </Button>
              </>
            }
          />

          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{
              mb: 3,
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            }}
          >
            <Tab label="Informations" />
            <Tab label="Prix spécifiques" />
            <Tab label="Factures" />
          </Tabs>

          {selectedTab === 0 && (
            <Box>
              {/* Cadre Somme due - Proéminent en haut */}
              {totalDue > 0 && (
                <Card
                  elevation={2}
                  sx={{
                    mb: 3,
                    bgcolor: alpha('#ef4444', 0.08),
                    border: `2px solid ${alpha('#ef4444', 0.3)}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha('#ef4444', 0.5),
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha('#ef4444', 0.15),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AttachMoney
                            sx={{
                              color: '#ef4444',
                              fontSize: 36,
                            }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#6b7280',
                              mb: 0.5,
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            Somme due au client
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: '#ef4444',
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 },
                            }}
                            onClick={() => navigate(`/invoices?client=${selectedClient.id}`)}
                          >
                            {formatCurrency(totalDue)}
                          </Typography>
                          {unpaidCount > 0 && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#6b7280',
                                mt: 0.5,
                                fontWeight: 500,
                              }}
                            >
                              {unpaidCount} facture{unpaidCount > 1 ? 's' : ''} impayée{unpaidCount > 1 ? 's' : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        sx={{
                          bgcolor: '#ef4444',
                          '&:hover': { bgcolor: '#dc2626' },
                        }}
                        startIcon={<AttachMoney />}
                        onClick={() => navigate(`/invoices?client=${selectedClient.id}`)}
                      >
                        Voir les factures
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Cadre Crédit client - Proéminent */}
              <Card
                elevation={2}
                sx={{
                  mb: 3,
                  bgcolor: totalOwed > 0 ? alpha('#2196F3', 0.08) : alpha('#9e9e9e', 0.05),
                  border: `2px solid ${totalOwed > 0 ? alpha('#2196F3', 0.3) : alpha('#9e9e9e', 0.2)}`,
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: totalOwed > 0 ? alpha('#2196F3', 0.5) : alpha('#9e9e9e', 0.3),
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: totalOwed > 0 ? alpha('#2196F3', 0.15) : alpha('#9e9e9e', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AttachMoney
                          sx={{
                            color: totalOwed > 0 ? '#2196F3' : '#9e9e9e',
                            fontSize: 36,
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6b7280',
                            mb: 0.5,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Crédit client (somme due au client)
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: totalOwed > 0 ? '#2196F3' : '#9e9e9e',
                            cursor: totalOwed > 0 ? 'pointer' : 'default',
                            '&:hover': totalOwed > 0 ? { opacity: 0.8 } : {},
                          }}
                          onClick={() => {
                            if (totalOwed > 0) {
                              navigate(`/invoices?client=${selectedClient.id}&statut=AVOIR`)
                            }
                          }}
                        >
                          {formatCurrency(totalOwed)}
                        </Typography>
                        {totalOwed > 0 ? (
                          <Box sx={{ mt: 0.5 }}>
                            {avoirCount > 0 && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#6b7280',
                                  fontWeight: 500,
                                }}
                              >
                                {avoirCount} avoir{avoirCount > 1 ? 's' : ''} : {formatCurrency(owedDetails.avoirs_amount)}
                              </Typography>
                            )}
                            {owedDetails.excess_invoice_payments > 0 && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#6b7280',
                                  fontWeight: 500,
                                }}
                              >
                                Excédent factures : {formatCurrency(owedDetails.excess_invoice_payments)}
                              </Typography>
                            )}
                            {owedDetails.unpaid_purchases_amount > 0 && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#6b7280',
                                  fontWeight: 500,
                                }}
                              >
                                Achats impayés : {formatCurrency(owedDetails.unpaid_purchases_amount)}
                              </Typography>
                            )}
                            {owedDetails.excess_purchase_payments > 0 && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#6b7280',
                                  fontWeight: 500,
                                }}
                              >
                                Excédent achats : {formatCurrency(owedDetails.excess_purchase_payments)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#9e9e9e',
                              mt: 0.5,
                              fontStyle: 'italic',
                            }}
                          >
                            Aucun crédit disponible
                          </Typography>
                        )}
                      </Box>
                    </Box>
                        {totalOwed > 0 && (
                      <Box display="flex" gap={1} flexDirection="column" alignItems="flex-end">
                        {owedDetails.has_purchases && (owedDetails.unpaid_purchases_amount > 0 || owedDetails.excess_purchase_payments > 0) && (
                          <Button
                            variant="outlined"
                            sx={{
                              borderColor: '#2196F3',
                              color: '#2196F3',
                              '&:hover': { borderColor: '#1976D2', bgcolor: alpha('#2196F3', 0.08) },
                            }}
                            onClick={() => {
                              navigate(`/purchases`)
                              // Le filtre par fournisseur devra être appliqué manuellement sur la page purchases
                              // ou on peut utiliser un paramètre d'URL si la page le supporte
                            }}
                          >
                            Voir les achats
                          </Button>
                        )}
                        {avoirCount > 0 && (
                          <Button
                            variant="contained"
                            sx={{
                              bgcolor: '#2196F3',
                              '&:hover': { bgcolor: '#1976D2' },
                            }}
                            startIcon={<AttachMoney />}
                            onClick={() => navigate(`/invoices?client=${selectedClient.id}&statut=AVOIR`)}
                          >
                            Voir les avoirs
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Informations générales */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      color: '#1a252f',
                      pb: 1,
                      borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    Informations générales
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Nom
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.nom}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Prénom
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.prenom || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Entreprise
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.entreprise || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.email || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Téléphone
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.telephone || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                        Adresse
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedClient.adresse || '-'}
                        {selectedClient.code_postal && `, ${selectedClient.code_postal}`}
                        {selectedClient.ville && ` ${selectedClient.ville}`}
                        {selectedClient.pays && `, ${selectedClient.pays}`}
                      </Typography>
                    </Grid>
                    {canEdit && (
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => {
                            setOpenForm(true)
                          }}
                        >
                          Modifier
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}

          {selectedTab === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Prix spécifiques
                </Typography>
                {canEdit && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddPrice}
                    sx={{
                      bgcolor: '#d32f2f',
                      '&:hover': {
                        bgcolor: '#b71c1c',
                      },
                    }}
                  >
                    Ajouter un prix
                  </Button>
                )}
              </Box>

              <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
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
                    { id: 'prix', label: 'Prix', type: 'currency', align: 'right' },
                  ]}
                  data={clientPrices}
                  loading={false}
                  emptyMessage="Aucun prix spécifique défini"
                  canEdit={canEdit}
                  canDelete={canEdit}
                  onEdit={canEdit ? handleEditPrice : undefined}
                  onDelete={
                    canEdit
                      ? (price) => {
                          if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
                            handleDeletePrice(price)
                          }
                        }
                      : undefined
                  }
                />
              </Card>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Factures du client
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate(`/invoices?client=${selectedClient.id}`)}
              >
                Voir toutes les factures
              </Button>
            </Box>
          )}
        </Box>
      )}

      <ClientForm
        open={openForm}
        onClose={() => {
          setOpenForm(false)
          if (!selectedClient) {
            setSelectedClient(null)
          }
        }}
        onSuccess={handleFormSuccess}
        client={selectedClient}
      />

      <ClientPriceForm
        open={openPriceForm}
        onClose={() => {
          setOpenPriceForm(false)
          setSelectedPrice(null)
        }}
        onSuccess={handlePriceFormSuccess}
        clientId={selectedClient?.id}
        clientPrice={selectedPrice}
      />

      <ConfirmDialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false)
          setClientToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer le client"
        message={`Êtes-vous sûr de vouloir supprimer "${clientToDelete?.nom_complet || clientToDelete?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />

      <Dialog
        open={openPrintDialog}
        onClose={() => setOpenPrintDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Imprimer le rapport de clients</DialogTitle>
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
                const response = await api.get('/clients/print_clients/', {
                  params: { date: printDate },
                  responseType: 'blob',
                })
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `clients_${printDate}.pdf`)
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
