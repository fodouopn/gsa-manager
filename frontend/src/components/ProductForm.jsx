import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Box,
} from '@mui/material'
import api from '../utils/api'

export default function ProductForm({ open, onClose, onSuccess, product = null }) {
  const [formData, setFormData] = useState({
    nom: '',
    unite_vente: 'BOUTEILLE',
    categorie: 'BIERE',
    actif: true,
    prix_base: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      setFormData({
        nom: product.nom || '',
        unite_vente: product.unite_vente || 'BOUTEILLE',
        categorie: product.categorie || 'BIERE',
        actif: product.actif ?? true,
        prix_base: product.base_price_value || product.base_price?.prix_base || '',
      })
    } else {
      setFormData({
        nom: '',
        unite_vente: 'BOUTEILLE',
        categorie: 'BIERE',
        actif: true,
        prix_base: '',
      })
    }
    setErrors({})
  }, [product, open])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const url = product
        ? `/catalog/products/${product.id}/`
        : '/catalog/products/'
      const method = product ? 'put' : 'post'

      // Extract prix_base before sending product data
      const { prix_base, ...productData } = formData

      const response = await api[method](url, productData)
      const createdProduct = response.data

      // Si c'est une création (product === null) et qu'un prix est fourni, le créer
      // Si c'est une modification (product !== null), on ne modifie pas le prix ici
      if (!product && prix_base && prix_base.toString().trim() !== '' && !isNaN(parseFloat(prix_base))) {
        try {
          // Créer le prix de base pour le nouveau produit
          await api.post(`/api/catalog/products/${createdProduct.id}/base_price/`, {
            prix_base: parseFloat(prix_base),
          })
        } catch (priceError) {
          console.error('Error setting base price:', priceError)
          // Don't fail the whole operation if price setting fails
        }
      }

      // Recharger les données du produit
      try {
        const updatedResponse = await api.get(`/api/catalog/products/${createdProduct.id}/`)
        onSuccess(updatedResponse.data)
      } catch (fetchError) {
        // Si le rechargement échoue, utiliser les données de base
        onSuccess(createdProduct)
      }
      onClose()
    } catch (error) {
      if (error.response?.status === 400) {
        // Validation errors
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
          {product ? 'Modifier le produit' : 'Créer un produit'}
        </DialogTitle>
        <DialogContent>
          {errors.non_field_errors && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.non_field_errors[0]}
            </Alert>
          )}

          <TextField
            name="nom"
            label="Nom du produit"
            fullWidth
            required
            value={formData.nom}
            onChange={handleChange}
            margin="normal"
            error={!!errors.nom}
            helperText={errors.nom?.[0]}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Unité de vente</InputLabel>
            <Select
              name="unite_vente"
              value={formData.unite_vente}
              onChange={handleChange}
              label="Unitée de vente"
            >
              <MenuItem value="BOUTEILLE">Bouteille</MenuItem>
              <MenuItem value="PACK">Pack</MenuItem>
              <MenuItem value="CARTON">Carton</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Catégorie</InputLabel>
            <Select
              name="categorie"
              value={formData.categorie}
              onChange={handleChange}
              label="Catégorie"
            >
              <MenuItem value="BIERE">Bière</MenuItem>
              <MenuItem value="JUS">Jus</MenuItem>
            </Select>
          </FormControl>

          <TextField
            name="prix_base"
            label="Prix de base (€)"
            type="number"
            fullWidth
            value={formData.prix_base}
            onChange={handleChange}
            margin="normal"
            disabled={!!product}
            InputProps={{
              inputProps: { min: 0, step: 0.01 },
            }}
            error={!!errors.prix_base}
            helperText={
              product
                ? "Le prix de base doit être modifié via l'icône dans le tableau"
                : 'Prix de base optionnel pour le produit'
            }
          />

          <FormControlLabel
            control={
              <Switch
                name="actif"
                checked={formData.actif}
                onChange={handleChange}
              />
            }
            label="Actif"
            sx={{ mt: 2 }}
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

