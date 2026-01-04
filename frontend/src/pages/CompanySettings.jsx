import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  alpha,
} from '@mui/material'
import { Save, Business, Image as ImageIcon } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import PageHeader from '../components/PageHeader'

export default function CompanySettings() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    pays: '',
    telephone: '',
    email: '',
    site_web: '',
    numero_compte_bancaire: '',
    tva_taux: 18.0,
    message_facture: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_GSA'

  useEffect(() => {
    if (canEdit) {
      fetchSettings()
    }
  }, [canEdit])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/billing/company-settings/')
      setFormData({
        nom: response.data.nom || '',
        adresse: response.data.adresse || '',
        ville: response.data.ville || '',
        code_postal: response.data.code_postal || '',
        pays: response.data.pays || '',
        telephone: response.data.telephone || '',
        email: response.data.email || '',
        site_web: response.data.site_web || '',
        numero_compte_bancaire: response.data.numero_compte_bancaire || '',
        tva_jus: response.data.tva_jus || 5.5,
        tva_biere: response.data.tva_biere || 20.0,
        message_facture: response.data.message_facture || '',
      })
      if (response.data.logo_url) {
        setLogoPreview(response.data.logo_url)
      }
    } catch (error) {
      console.error('Error fetching company settings:', error)
      showError('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    if (!formData.nom || formData.nom.trim() === '') {
      showError('Le nom de l\'entreprise est obligatoire')
      setSaving(false)
      return
    }

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          let value = formData[key]
          
          if (key === 'tva_jus' || key === 'tva_biere') {
            value = value.toString()
          } else if (
            key === 'site_web' &&
            value &&
            !value.startsWith('http://') &&
            !value.startsWith('https://')
          ) {
            value = `https://${value}`
          }
          
          formDataToSend.append(key, value)
        }
      })
      if (logoFile) {
        formDataToSend.append('logo', logoFile)
      }

      const getResponse = await api.get('/billing/company-settings/')
      const settingsId = getResponse.data.id
      
      await api.patch(`/billing/company-settings/${settingsId}/`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      showSuccess('Paramètres enregistrés avec succès')
    } catch (error) {
      console.error('Error saving company settings:', error)
      let errorMessage = 'Erreur lors de la sauvegarde'
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else {
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ')
          if (fieldErrors) {
            errorMessage = `Erreurs de validation: ${fieldErrors}`
          }
        }
      }
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <Box>
        <PageHeader title="Paramètres de l'entreprise" />
        <Alert severity="error">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Paramètres de l'entreprise"
        subtitle="Configurez les informations de votre entreprise"
        actions={
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={handleSubmit}
          disabled={saving}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        }
      />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
          {/* Informations générales avec logo */}
            <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <Business sx={{ color: '#d32f2f' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Informations générales
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {/* Logo à gauche */}
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5, fontWeight: 500 }}>
                        Logo de l'entreprise
                      </Typography>
                      {logoPreview ? (
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha('#d32f2f', 0.05),
                            border: '2px solid #d32f2f',
                            display: 'inline-block',
                            mb: 2,
                          }}
                        >
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            style={{
                              maxWidth: '150px',
                              maxHeight: '150px',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: '150px',
                            height: '150px',
                            borderRadius: 2,
                            bgcolor: '#f5f5f5',
                            border: '2px dashed #d32f2f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 48, color: '#d32f2f', opacity: 0.5 }} />
                        </Box>
                      )}
                      <Button 
                        variant="outlined" 
                        component="label" 
                        startIcon={<ImageIcon />}
                        size="small"
                        sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                      >
                        {logoFile ? 'Changer' : 'Choisir un logo'}
                        <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                      </Button>
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: '#6b7280' }}>
                        Format: JPG, PNG. Max: 2MB
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Informations à droite */}
                  <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          label="Nom de l'entreprise"
                          name="nom"
                          value={formData.nom}
                          onChange={handleInputChange}
                          fullWidth
                          required
                          helperText="Champ obligatoire"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="TVA Jus (%)"
                          name="tva_jus"
                          type="number"
                          value={formData.tva_jus}
                          onChange={handleInputChange}
                          fullWidth
                          inputProps={{ step: '0.01', min: '0', max: '100' }}
                          helperText="Taux de TVA pour les jus (défaut: 5.5%)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="TVA Bière (%)"
                          name="tva_biere"
                          type="number"
                          value={formData.tva_biere}
                          onChange={handleInputChange}
                          fullWidth
                          inputProps={{ step: '0.01', min: '0', max: '100' }}
                          helperText="Taux de TVA pour les bières (défaut: 20%)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Téléphone"
                          name="telephone"
                          value={formData.telephone}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="0651742621"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="gsa@gmail.com"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Site web"
                          name="site_web"
                          value={formData.site_web}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="www.gsa-boissons.com"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Adresse"
                          name="adresse"
                          value={formData.adresse}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="6 place de l'ermitage"
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Code postal"
                          name="code_postal"
                          value={formData.code_postal}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="93200"
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Ville"
                          name="ville"
                          value={formData.ville}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="Saint-denis"
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Pays"
                          name="pays"
                          value={formData.pays}
                          onChange={handleInputChange}
                          fullWidth
                          placeholder="France"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Numéro de compte bancaire"
                          name="numero_compte_bancaire"
                          value={formData.numero_compte_bancaire}
                          onChange={handleInputChange}
                          fullWidth
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Message sur la facture"
                          name="message_facture"
                          value={formData.message_facture}
                          onChange={handleInputChange}
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Merci pour votre confiance !"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            </Grid>
          </Grid>
        </form>
    </Box>
  )
}
