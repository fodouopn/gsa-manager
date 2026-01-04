import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { ArrowBack } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ForgotPassword() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)
  const navigate = useNavigate()

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await api.post('/users/password-reset/request/', {
        username: username,
      })

      setMessage(response.data.message)
      // In development, we get the token in the response
      // In production, this would be sent via email
      if (response.data.token) {
        setToken(response.data.token)
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Erreur lors de la demande de réinitialisation'
      )
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    // Redirect to reset password page
    navigate(`/reset-password/${token}`)
    return null
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

          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Mot de passe oublié
          </Typography>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Entrez votre nom d'utilisateur ou email pour recevoir un lien de
            réinitialisation
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleRequestReset} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Nom d'utilisateur ou Email"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
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
                'Envoyer le lien de réinitialisation'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

