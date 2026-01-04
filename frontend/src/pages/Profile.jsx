import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Save, Lock, Person } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import PageHeader from '../components/PageHeader'

export default function Profile() {
  const { user, fetchUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      })
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.patch(`/users/${user.id}/`, formData)
      await fetchUser() // Rafraîchir les données utilisateur
      showSuccess('Profil mis à jour avec succès')
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        'Erreur lors de la mise à jour du profil'
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordData.current_password) {
      showError('Veuillez saisir votre mot de passe actuel')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Les mots de passe ne correspondent pas')
      return
    }

    if (passwordData.new_password.length < 8) {
      showError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setSaving(true)

    try {
      // Utiliser l'endpoint set_password qui vérifie le mot de passe actuel
      await api.post(`/users/${user.id}/set_password/`, {
        password: passwordData.new_password,
        current_password: passwordData.current_password,
      })

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      showSuccess('Mot de passe modifié avec succès')
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de la modification du mot de passe'
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Mon profil"
        subtitle="Gérez vos informations personnelles et votre mot de passe"
      />

      <Grid container spacing={3}>
        {/* Informations personnelles */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Person sx={{ color: '#d32f2f' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Informations personnelles
                </Typography>
              </Box>

              <form onSubmit={handleUpdateProfile}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Nom d'utilisateur"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      disabled
                      helperText="Le nom d'utilisateur ne peut pas être modifié"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Prénom"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nom"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
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
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Modification du mot de passe */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Lock sx={{ color: '#d32f2f' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Modifier le mot de passe
                </Typography>
              </Box>

              <form onSubmit={handleChangePassword}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Mot de passe actuel"
                      name="current_password"
                      type="password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Nouveau mot de passe"
                      name="new_password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      fullWidth
                      required
                      helperText="Le mot de passe doit contenir au moins 8 caractères"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Confirmer le nouveau mot de passe"
                      name="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      fullWidth
                      required
                      error={
                        passwordData.confirm_password !== '' &&
                        passwordData.new_password !== passwordData.confirm_password
                      }
                      helperText={
                        passwordData.confirm_password !== '' &&
                        passwordData.new_password !== passwordData.confirm_password
                          ? 'Les mots de passe ne correspondent pas'
                          : ''
                      }
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                        disabled={saving}
                        sx={{
                          bgcolor: '#d32f2f',
                          '&:hover': {
                            bgcolor: '#b71c1c',
                          },
                        }}
                      >
                        {saving ? 'Modification...' : 'Modifier le mot de passe'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations système (lecture seule) */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Informations système
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Rôle
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user.role_display || user.role || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                    Statut
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

