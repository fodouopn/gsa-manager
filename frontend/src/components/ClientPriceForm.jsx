import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material'
import api from '../utils/api'

export default function ClientPriceForm({
  open,
  onClose,
  onSuccess,
  clientId,
  clientPrice = null,
  products = [],
}) {
  const [formData, setFormData] = useState({
    product: null,
    prix: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [productsList, setProductsList] = useState([])

  useEffect(() => {
    if (open) {
      fetchProducts()
      if (clientPrice) {
        setFormData({
          product: clientPrice.product || null,
          prix: clientPrice.prix || '',
        })
      } else {
        setFormData({
          product: null,
          prix: '',
        })
      }
      setErrors({})
    }
  }, [open, clientPrice])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/catalog/products/', {
        params: { actif: true },
      })
      const productsData = response.data.results || response.data
      setProductsList(productsData)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleProductChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      product: newValue,
    }))
    if (errors.product) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.product
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const data = {
        client: clientId,
        product: formData.product?.id || formData.product,
        prix: parseFloat(formData.prix),
      }

      const url = clientPrice
        ? `/clients/prices/${clientPrice.id}/`
        : '/clients/prices/'
      const method = clientPrice ? 'put' : 'post'

      const response = await api[method](url, data)
      onSuccess(response.data)
      onClose()
    } catch (error) {
      if (error.response?.status === 400) {
        setErrors(error.response.data || {})
      } else {
        setErrors({ non_field_errors: ['Erreur lors de la sauvegarde'] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {clientPrice ? 'Modifier le prix client' : 'Ajouter un prix client'}
        </DialogTitle>
        <DialogContent>
          {errors.non_field_errors && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.non_field_errors[0]}
            </Alert>
          )}

          <Autocomplete
            options={productsList}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : `${option.nom} (${option.unite_vente_display || option.unite_vente || 'N/A'})`
            }
            value={formData.product}
            onChange={handleProductChange}
            disabled={!!clientPrice}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Produit"
                required
                margin="normal"
                error={!!errors.product}
                helperText={errors.product?.[0]}
              />
            )}
          />

          <TextField
            name="prix"
            label="Prix (€)"
            type="number"
            fullWidth
            required
            margin="normal"
            value={formData.prix}
            onChange={handleChange}
            inputProps={{ step: '0.01', min: '0' }}
            error={!!errors.prix}
            helperText={errors.prix?.[0]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

