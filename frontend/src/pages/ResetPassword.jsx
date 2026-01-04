import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material'
import { ArrowBack, Lock } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Verify token on mount
    const verifyToken = async () => {
      try {
        const response = await api.get(`/api/users/password-reset/verify/${token}/`)
        setValid(response.data.valid)
        setUsername(response.data.username || '')
      } catch (err) {
        setValid(false)
        setError(
          err.response?.data?.error || 'Token invalide ou expiré'
        )
      } finally {
        setVerifying(false)
      }
    }

    if (token) {
      verifyToken()
    } else {
      setVerifying(false)
      setValid(false)
      setError('Token manquant')
    }
  }, [token])

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    try {
      await api.post(`/api/users/password-reset/reset/${token}/`, {
        password: password,
        confirm_password: confirmPassword,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.details?.join(', ') ||
          'Erreur lors de la réinitialisation du mot de passe'
      )
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Vérification du token...
          </Typography>
        </Box>
      </Container>
    )
  }

  if (!valid) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Link
                to="/login"
                style={{
                  textDecoration: 'none',
                  color: '#d32f2f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ArrowBack fontSize="small" />
                <Typography variant="body2">Retour à la connexion</Typography>
              </Link>
            </Box>

            <Alert severity="error" sx={{ mb: 2 }}>
              {error || 'Token invalide ou expiré'}
            </Alert>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                to="/forgot-password"
                style={{
                  textDecoration: 'none',
                  color: '#d32f2f',
                }}
              >
                Demander un nouveau lien
              </Link>
            </Box>
          </Paper>
        </Box>
      </Container>
    )
  }

  if (success) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Mot de passe réinitialisé avec succès ! Redirection vers la page
              de connexion...
            </Alert>
          </Paper>
        </Box>
      </Container>
    )
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ mb: 2 }}>
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                color: '#d32f2f',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ArrowBack fontSize="small" />
              <Typography variant="body2">Retour à la connexion</Typography>
            </Link>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Lock sx={{ color: '#d32f2f' }} />
            <Typography component="h1" variant="h5" align="center">
              Réinitialiser le mot de passe
            </Typography>
          </Box>

          {username && (
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Compte : {username}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleReset} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              helperText="Le mot de passe doit contenir au moins 8 caractères"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              error={confirmPassword !== '' && password !== confirmPassword}
              helperText={
                confirmPassword !== '' && password !== confirmPassword
                  ? 'Les mots de passe ne correspondent pas'
                  : ''
              }
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

