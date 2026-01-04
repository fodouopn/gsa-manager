import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import { Add, PriceCheck, Edit, Delete, Inventory } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import FiltersBar from '../components/FiltersBar'
import ProductForm from '../components/ProductForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatters'

export default function Products() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [openPriceDialog, setOpenPriceDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    actif: '',
    unite_vente: '',
  })
  const [priceFormData, setPriceFormData] = useState({ prix_base: '' })
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState(null)

  const canEdit = user?.role !== 'LECTURE'

  const fetchProducts = useCallback(async () => {
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
      if (filters.unite_vente) {
        params.unite_vente = filters.unite_vente
      }

      const response = await api.get('/catalog/products/', { params })
      
      if (response.data.results) {
        setProducts(response.data.results || [])
        setTotalRows(response.data.count || 0)
      } else {
        setProducts(Array.isArray(response.data) ? response.data : [])
        setTotalRows(Array.isArray(response.data) ? response.data.length : 0)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      showError('Erreur lors du chargement des produits')
      setProducts([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filters.search, filters.actif, filters.unite_vente, showError])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleFormSuccess = (product) => {
    if (selectedProduct) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)))
      showSuccess('Produit modifié avec succès')
    } else {
      fetchProducts()
      showSuccess('Produit créé avec succès')
    }
    setOpenForm(false)
    setSelectedProduct(null)
  }

  const handleDelete = async () => {
    if (!selectedProduct) return

    try {
      await api.delete(`/catalog/products/${selectedProduct.id}/`)
      showSuccess('Produit supprimé avec succès')
      setOpenDeleteDialog(false)
      setSelectedProduct(null)
      fetchProducts()
    } catch (error) {
      showError('Erreur lors de la suppression')
    }
  }

  const handleEdit = (product) => {
    setSelectedProduct(product)
    setOpenForm(true)
  }

  const handleCreate = () => {
    setSelectedProduct(null)
    setOpenForm(true)
  }

  const handleOpenPriceDialog = (product) => {
    setSelectedProduct(product)
    setPriceFormData({ prix_base: product.base_price_value || '' })
    setPriceError(null)
    setOpenPriceDialog(true)
  }

  const handleSetPrice = async () => {
    if (!selectedProduct) return

    // Valider le prix avant de continuer
    const priceStr = priceFormData.prix_base?.toString().trim()
    if (!priceStr || priceStr === '') {
      setPriceError('Veuillez saisir un prix')
      return
    }

    const newPrice = parseFloat(priceStr)
    if (isNaN(newPrice) || newPrice < 0) {
      setPriceError('Le prix doit être un nombre positif')
      return
    }

    setPriceLoading(true)
    setPriceError(null)

    try {
      // Try to get existing base price first
      let priceExists = false
      try {
        await api.get(`/catalog/products/${selectedProduct.id}/base_price/`)
        priceExists = true
      } catch (getError) {
        // Base price doesn't exist yet
        priceExists = false
      }

      // Create or update base price
      if (priceExists) {
        await api.put(`/catalog/products/${selectedProduct.id}/base_price/`, {
          prix_base: newPrice,
        })
      } else {
      await api.post(`/catalog/products/${selectedProduct.id}/base_price/`, {
          prix_base: newPrice,
      })
      }

      // Fermer le dialog
      setOpenPriceDialog(false)
      setSelectedProduct(null)
      setPriceFormData({ prix_base: '' })
      
      // Recharger la liste comme sur les autres pages (Invoices, Clients, Containers)
      await fetchProducts()
      
      showSuccess('Prix de base défini avec succès')
    } catch (error) {
      console.error('Error setting price:', error)
      if (error.response?.status === 400) {
        setPriceError(error.response.data.prix_base?.[0] || 'Erreur de validation')
      } else {
        setPriceError('Erreur lors de la définition du prix')
      }
    } finally {
      setPriceLoading(false)
    }
  }

  const handleFilterChange = (filterId, value) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }))
    setPage(0)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', actif: '', unite_vente: '' })
    setPage(0)
  }

  const columns = [
    {
      id: 'nom',
      label: 'Nom du produit',
      format: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
            {value}
          </Typography>
          {row.marque && (
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {row.marque}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'categorie_display',
      label: 'Catégorie',
      format: (value) => (
        <Chip
          label={value || 'N/A'}
          size="small"
          sx={{
            bgcolor: value === 'Jus' ? alpha('#10b981', 0.1) : alpha('#f59e0b', 0.1),
            color: value === 'Jus' ? '#10b981' : '#f59e0b',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      id: 'unite_vente_display',
      label: 'Unité de vente',
      format: (value) => (
        <Chip
          label={value || 'N/A'}
          size="small"
          sx={{
            bgcolor: alpha('#3b82f6', 0.1),
            color: '#3b82f6',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      id: 'base_price_value',
      label: 'Prix de base',
      type: 'currency',
      align: 'right',
      format: (value, row) => (
        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
            {value !== null && value !== undefined && !isNaN(value)
              ? new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(typeof value === 'string' ? parseFloat(value) : value)
              : '-'}
          </Typography>
          {canEdit && (
            <Tooltip title="Modifier le prix">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenPriceDialog(row)
                }}
                sx={{
                  color: '#d32f2f',
                  '&:hover': {
                    bgcolor: alpha('#d32f2f', 0.1),
                  },
                }}
              >
                <PriceCheck fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      id: 'actif',
      label: 'Statut',
      type: 'status',
      statusLabel: (value) => (value ? 'Actif' : 'Inactif'),
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Produits"
        subtitle="Gérez votre catalogue de produits"
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
              Nouveau produit
          </Button>
          )
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
          {
            id: 'unite_vente',
            label: 'Unité',
            type: 'select',
            value: filters.unite_vente,
            options: [
              { value: '', label: 'Toutes' },
              { value: 'BOUTEILLE', label: 'Bouteille' },
              { value: 'PACK', label: 'Pack' },
              { value: 'CARTON', label: 'Carton' },
            ],
          },
        ]}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={products}
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
        onDelete={canEdit ? (product) => {
          setSelectedProduct(product)
          setOpenDeleteDialog(true)
        } : undefined}
        canEdit={canEdit}
        canDelete={canEdit}
        emptyMessage="Aucun produit trouvé"
        emptyActionLabel="Créer un produit"
        onEmptyAction={canEdit ? handleCreate : undefined}
      />

      {/* Formulaire produit */}
      {openForm && (
      <ProductForm
        open={openForm}
        onClose={() => {
          setOpenForm(false)
          setSelectedProduct(null)
        }}
        onSuccess={handleFormSuccess}
        product={selectedProduct}
      />
      )}

      {/* Dialogue prix */}
      <Dialog
        open={openPriceDialog}
        onClose={() => {
          setOpenPriceDialog(false)
          setSelectedProduct(null)
          setPriceError(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Définir le prix de base</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Produit: <strong>{selectedProduct.nom}</strong>
            </Typography>
            </Box>
          )}
          {priceError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {priceError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Prix de base (€)"
            type="number"
            value={priceFormData.prix_base}
            onChange={(e) => setPriceFormData({ prix_base: e.target.value })}
            InputProps={{
              inputProps: { min: 0, step: 0.01 },
            }}
            disabled={priceLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenPriceDialog(false)
              setSelectedProduct(null)
              setPriceError(null)
            }}
            disabled={priceLoading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSetPrice}
            disabled={priceLoading || !priceFormData.prix_base}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue confirmation suppression */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false)
          setSelectedProduct(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${selectedProduct?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />
    </Box>
  )
}
