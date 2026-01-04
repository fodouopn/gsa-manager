import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  Grid,
} from '@mui/material'
import api from '../utils/api'

export default function ClientForm({ open, onClose, onSuccess, client = null }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    entreprise: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    siret: '',
    tva_intracommunautaire: '',
    notes: '',
    actif: true,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom || '',
        prenom: client.prenom || '',
        entreprise: client.entreprise || '',
        email: client.email || '',
        telephone: client.telephone || '',
        adresse: client.adresse || '',
        code_postal: client.code_postal || '',
        ville: client.ville || '',
        pays: client.pays || 'France',
        siret: client.siret || '',
        tva_intracommunautaire: client.tva_intracommunautaire || '',
        notes: client.notes || '',
        actif: client.actif ?? true,
      })
    } else {
      setFormData({
        nom: '',
        prenom: '',
        entreprise: '',
        email: '',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: '',
        pays: 'France',
        siret: '',
        tva_intracommunautaire: '',
        notes: '',
        actif: true,
      })
    }
    setErrors({})
  }, [client, open])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
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
      const url = client
        ? `/clients/${client.id}/`
        : '/clients/'
      const method = client ? 'put' : 'post'

      const response = await api[method](url, formData)
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {client ? 'Modifier le client' : 'Créer un client'}
        </DialogTitle>
        <DialogContent>
          {errors.non_field_errors && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.non_field_errors[0]}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="nom"
                label="Nom"
                fullWidth
                required
                value={formData.nom}
                onChange={handleChange}
                error={!!errors.nom}
                helperText={errors.nom?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="prenom"
                label="Prénom"
                fullWidth
                value={formData.prenom}
                onChange={handleChange}
                error={!!errors.prenom}
                helperText={errors.prenom?.[0]}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="entreprise"
                label="Entreprise"
                fullWidth
                value={formData.entreprise}
                onChange={handleChange}
                error={!!errors.entreprise}
                helperText={errors.entreprise?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="telephone"
                label="Téléphone"
                fullWidth
                value={formData.telephone}
                onChange={handleChange}
                error={!!errors.telephone}
                helperText={errors.telephone?.[0]}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="adresse"
                label="Adresse"
                fullWidth
                multiline
                rows={2}
                value={formData.adresse}
                onChange={handleChange}
                error={!!errors.adresse}
                helperText={errors.adresse?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="code_postal"
                label="Code postal"
                fullWidth
                value={formData.code_postal}
                onChange={handleChange}
                error={!!errors.code_postal}
                helperText={errors.code_postal?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="ville"
                label="Ville"
                fullWidth
                value={formData.ville}
                onChange={handleChange}
                error={!!errors.ville}
                helperText={errors.ville?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="pays"
                label="Pays"
                fullWidth
                value={formData.pays}
                onChange={handleChange}
                error={!!errors.pays}
                helperText={errors.pays?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="siret"
                label="SIRET"
                fullWidth
                value={formData.siret}
                onChange={handleChange}
                error={!!errors.siret}
                helperText={errors.siret?.[0]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="tva_intracommunautaire"
                label="TVA intracommunautaire"
                fullWidth
                value={formData.tva_intracommunautaire}
                onChange={handleChange}
                error={!!errors.tva_intracommunautaire}
                helperText={errors.tva_intracommunautaire?.[0]}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                error={!!errors.notes}
                helperText={errors.notes?.[0]}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="actif"
                    checked={formData.actif}
                    onChange={handleChange}
                  />
                }
                label="Actif"
              />
            </Grid>
          </Grid>
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

