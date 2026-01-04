import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import { Download, CheckCircle } from '@mui/icons-material'
import api from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function InvoiceAcceptance() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptedName, setAcceptedName] = useState('')
  const [acceptChecked, setAcceptChecked] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchInvoiceData()
  }, [token])

  const fetchInvoiceData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/api/billing/public/invoices/accept/${token}/`)
      setInvoiceData(response.data)
      setAccepted(response.data.accepted)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('invalid')
      } else if (err.response?.status === 410) {
        setError('expired')
      } else if (err.response?.status === 400) {
        setError('other')
        setErrorMessage(err.response?.data?.error || 'Erreur lors du chargement')
      } else {
        setError('other')
        setErrorMessage('Erreur lors du chargement de la facture')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/api/billing/public/invoices/pdf/${token}/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${invoiceData?.invoice_number || 'facture'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erreur lors du téléchargement du PDF')
    }
  }

  const handleAccept = async () => {
    if (!acceptChecked) {
      alert('Veuillez cocher la case de confirmation')
      return
    }

    try {
      setAccepting(true)
      setErrorMessage('')
      const response = await api.post(`/api/billing/public/invoices/accept/${token}/`, {
        accept: true,
        accepted_name: acceptedName.trim() || null,
      })
      setAccepted(true)
      setInvoiceData({
        ...invoiceData,
        accepted: true,
        accepted_at: response.data.accepted_at,
        accepted_name: response.data.accepted_name,
      })
    } catch (err) {
      if (err.response?.status === 400) {
        setErrorMessage(err.response?.data?.error || 'Erreur lors de l\'acceptation')
      } else if (err.response?.status === 404) {
        setError('invalid')
      } else if (err.response?.status === 410) {
        setError('expired')
      } else {
        setErrorMessage('Erreur lors de l\'acceptation de la facture')
      }
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error === 'invalid') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Lien invalide
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Le lien d'acceptation est invalide. Veuillez contacter GSA pour obtenir un nouveau lien.
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (error === 'expired') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Lien expiré
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ce lien d'acceptation a expiré. Veuillez contacter GSA pour obtenir un nouveau lien.
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (error === 'other') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Erreur
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {errorMessage || 'Une erreur est survenue. Veuillez réessayer plus tard.'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (!invoiceData) {
    return null
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 2 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Acceptation de facture
          </Typography>

          {/* Invoice Summary */}
          <Card sx={{ mt: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détails de la facture
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Numéro de facture
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {invoiceData.invoice_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {invoiceData.client_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total TTC
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(invoiceData.total)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Payé
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(invoiceData.paid)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Reste à payer
                  </Typography>
                  <Typography variant="h6" color={invoiceData.remaining > 0 ? 'error.main' : 'success.main'}>
                    {formatCurrency(invoiceData.remaining)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Invoice Lines Table */}
          {invoiceData.invoice_lines && invoiceData.invoice_lines.length > 0 && (
            <Card sx={{ mt: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Détail des produits
                </Typography>
                <Box sx={{ overflowX: 'auto', mt: 2 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold' }}>Produit</th>
                        <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>Quantité</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>Prix unitaire</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.invoice_lines.map((line, index) => (
                        <tr key={line.id || index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px' }}>
                            {line.product_detail?.nom || 'Produit'}
                            {line.product_detail?.unite_vente_display && ` (${line.product_detail.unite_vente_display})`}
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px' }}>{line.qty}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{formatCurrency(line.prix_unit_applique || 0)}</td>
                          <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>{formatCurrency(line.total_ligne || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>Total HT</td>
                        <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>{formatCurrency(invoiceData.total_ht || 0)}</td>
                      </tr>
                      {invoiceData.tva > 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'right', padding: '12px' }}>TVA</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{formatCurrency(invoiceData.tva || 0)}</td>
                        </tr>
                      )}
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <td colSpan={3} style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold', fontSize: '1.1em' }}>Total TTC</td>
                        <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold', fontSize: '1.1em' }}>{formatCurrency(invoiceData.total || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Download PDF Button */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadPDF}
              size="large"
            >
              Télécharger le PDF
            </Button>
          </Box>

          {/* Acceptance Section */}
          {accepted ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" color="success.main" gutterBottom>
                Facture acceptée
              </Typography>
              {invoiceData.accepted_at && (
                <Typography variant="body2" color="text.secondary">
                  Acceptée le {formatDate(invoiceData.accepted_at)}
                </Typography>
              )}
              {invoiceData.accepted_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Par : {invoiceData.accepted_name}
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptChecked}
                    onChange={(e) => setAcceptChecked(e.target.checked)}
                    required
                  />
                }
                label="Je reconnais avoir pris connaissance et j'accepte cette facture."
                sx={{ mb: 2, display: 'block' }}
              />
              <TextField
                label="Nom et prénom (optionnel)"
                value={acceptedName}
                onChange={(e) => setAcceptedName(e.target.value)}
                fullWidth
                sx={{ mb: 3 }}
              />
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAccept}
                  disabled={!acceptChecked || accepting}
                  size="large"
                >
                  {accepting ? <CircularProgress size={24} /> : 'Accepter la facture'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

