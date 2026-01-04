import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Checkbox,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  alpha,
} from '@mui/material'
import { Add, Security, Person } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastProvider'
import api from '../utils/api'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate } from '../utils/formatters'

export default function Users() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'LECTURE',
    is_staff: false,
  })
  const [errors, setErrors] = useState({})

  const canEdit = user?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (canEdit) {
      fetchUsers()
    }
  }, [canEdit])

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        username: selectedUser.username || '',
        email: selectedUser.email || '',
        password: '',
        first_name: selectedUser.first_name || '',
        last_name: selectedUser.last_name || '',
        role: selectedUser.role || 'LECTURE',
        is_staff: selectedUser.is_staff || false,
      })
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'LECTURE',
        is_staff: false,
      })
    }
    setErrors({})
  }, [selectedUser, openForm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/')
      const usersData = response.data.results || response.data
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
      showError('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const data = { ...formData }
      if (!data.password && selectedUser) {
        delete data.password
      }
      if (!data.first_name) {
        data.first_name = ''
      }
      if (!data.last_name) {
        data.last_name = ''
      }

      const url = selectedUser ? `/users/${selectedUser.id}/` : '/users/'
      const method = selectedUser ? 'put' : 'post'

      await api[method](url, data)
      showSuccess(selectedUser ? 'Utilisateur modifié avec succès' : 'Utilisateur créé avec succès')
      fetchUsers()
      setOpenForm(false)
      setSelectedUser(null)
    } catch (error) {
      if (error.response?.status === 400) {
        setErrors(error.response.data || {})
      } else {
        setErrors({ non_field_errors: ['Erreur lors de la sauvegarde'] })
      }
      showError('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      await api.delete(`/users/${userToDelete.id}/`)
      showSuccess('Utilisateur supprimé avec succès')
      setOpenDeleteDialog(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (error) {
      showError('Erreur lors de la suppression')
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'error'
      case 'ADMIN_GSA':
        return 'warning'
      case 'LOGISTIQUE':
      case 'COMMERCIAL':
        return 'primary'
      default:
        return 'default'
    }
  }

  const columns = [
    {
      id: 'username',
      label: 'Nom d\'utilisateur',
      format: (value) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Person sx={{ fontSize: 20, color: '#6b7280' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a252f' }}>
            {value}
          </Typography>
        </Box>
      ),
    },
    { id: 'email', label: 'Email' },
    {
      id: 'role_display',
      label: 'Rôle',
      format: (value, row) => (
        <Chip
          label={value || '-'}
          size="small"
          color={getRoleColor(row.role)}
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      id: 'is_staff',
      label: 'Staff',
      type: 'status',
      statusLabel: (value) => (value ? 'Oui' : 'Non'),
    },
  ]

  if (!canEdit) {
    return (
      <Box>
        <PageHeader title="Utilisateurs" />
        <Alert severity="warning">
          Vous n'avez pas la permission de gérer les utilisateurs.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gestion des utilisateurs et permissions"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedUser(null)
              setOpenForm(true)
            }}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            Nouveau utilisateur
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        onEdit={(row) => {
          setSelectedUser(row)
          setOpenForm(true)
        }}
        onDelete={(row) => {
          setUserToDelete(row)
          setOpenDeleteDialog(true)
        }}
        onRowClick={async (row, event) => {
          if (event.target.closest('button')) {
            return
          }
          try {
            const response = await api.get(`/users/${row.id}/`)
            setSelectedUser(response.data)
            if (response.data.custom_permissions) {
              setPermissions(response.data.custom_permissions)
            } else {
              setPermissions({
                user: response.data.id,
                can_create_invoices: null,
                can_validate_invoices: null,
                can_delete_invoices: null,
                can_manage_payments: null,
                can_manage_stock: null,
                can_adjust_stock: null,
                can_manage_purchases: null,
                can_manage_containers: null,
                can_validate_containers: null,
                can_manage_clients: null,
                can_manage_client_prices: null,
                can_manage_products: null,
                can_view_reports: null,
                can_export_data: null,
                can_manage_users: null,
                can_manage_company_settings: null,
              })
            }
            setOpenPermissionsDialog(true)
          } catch (error) {
            console.error('Error fetching user details:', error)
          }
        }}
        canEdit={canEdit}
        canDelete={canEdit}
        emptyMessage="Aucun utilisateur"
        emptyActionLabel="Créer un utilisateur"
        onEmptyAction={() => {
          setSelectedUser(null)
          setOpenForm(true)
        }}
      />

      {/* Dialog formulaire utilisateur */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </DialogTitle>
          <DialogContent>
            {errors.non_field_errors && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.non_field_errors[0]}
              </Alert>
            )}

            <TextField
              name="username"
              label="Nom d'utilisateur"
              fullWidth
              required
              margin="normal"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={!!errors.username}
              helperText={errors.username?.[0]}
            />

            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              required
              margin="normal"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email?.[0]}
            />

            <TextField
              name="password"
              label={
                selectedUser
                  ? 'Nouveau mot de passe (laisser vide pour ne pas changer)'
                  : 'Mot de passe'
              }
              type="password"
              fullWidth
              required={!selectedUser}
              margin="normal"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={!!errors.password}
              helperText={errors.password?.[0]}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Rôle</InputLabel>
              <Select
                value={formData.role}
                label="Rôle"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                <MenuItem value="ADMIN_GSA">Admin GSA</MenuItem>
                <MenuItem value="LOGISTIQUE">Logistique</MenuItem>
                <MenuItem value="COMMERCIAL">Commercial</MenuItem>
                <MenuItem value="LECTURE">Lecture</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_staff}
                  onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                />
              }
              label="Staff (accès Django Admin)"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#d32f2f',
                '&:hover': {
                  bgcolor: '#b71c1c',
                },
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog permissions */}
      <Dialog
        open={openPermissionsDialog}
        onClose={() => {
          setOpenPermissionsDialog(false)
          setSelectedUser(null)
          setPermissions(null)
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Security sx={{ color: '#d32f2f' }} />
            Permissions - {selectedUser?.username}
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 1, color: '#6b7280' }}>
            Rôle de base: {selectedUser?.role_display}
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{ fontSize: '0.7rem', mt: 0.5, color: '#6b7280' }}
          >
            Les permissions personnalisées remplacent les permissions par défaut du rôle. Laissez
            vide pour utiliser les permissions du rôle.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {permissions && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {[
                  { section: 'Factures', perms: ['can_create_invoices', 'can_validate_invoices', 'can_delete_invoices', 'can_manage_payments'] },
                  { section: 'Stock', perms: ['can_manage_stock', 'can_adjust_stock', 'can_manage_purchases'] },
                  { section: 'Conteneurs', perms: ['can_manage_containers', 'can_validate_containers'] },
                  { section: 'Clients', perms: ['can_manage_clients', 'can_manage_client_prices'] },
                  { section: 'Produits', perms: ['can_manage_products'] },
                  { section: 'Rapports', perms: ['can_view_reports', 'can_export_data'] },
                  { section: 'Administration', perms: ['can_manage_users', 'can_manage_company_settings'] },
                ].map(({ section, perms }) => (
                  <React.Fragment key={section}>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {section}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    {perms.map((perm) => (
                      <Grid item xs={12} sm={6} key={perm}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={permissions[perm] === true}
                              indeterminate={
                                permissions[perm] === null || permissions[perm] === undefined
                              }
                              onChange={(e) => {
                                let newValue
                                if (permissions[perm] === null || permissions[perm] === undefined) {
                                  newValue = true
                                } else if (permissions[perm] === true) {
                                  newValue = false
                                } else {
                                  newValue = null
                                }
                                setPermissions({ ...permissions, [perm]: newValue })
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">
                                {perm
                                  .replace('can_', '')
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                {permissions[perm] === null || permissions[perm] === undefined
                                  ? '(Par défaut du rôle)'
                                  : permissions[perm] === true
                                    ? '(Autorisé)'
                                    : '(Interdit)'}
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    ))}
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenPermissionsDialog(false)
              setSelectedUser(null)
              setPermissions(null)
            }}
            disabled={loadingPermissions}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!selectedUser || !permissions) return

              setLoadingPermissions(true)
              try {
                const dataToSend = { user: selectedUser.id }
                Object.keys(permissions).forEach((key) => {
                  if (
                    key !== 'id' &&
                    key !== 'user' &&
                    key !== 'user_username' &&
                    key !== 'created_at' &&
                    key !== 'updated_at'
                  ) {
                    if (permissions[key] !== null && permissions[key] !== undefined) {
                      dataToSend[key] = permissions[key]
                    }
                  }
                })

                try {
                  const existingResponse = await api.get('/users/permissions/', {
                    params: { user: selectedUser.id },
                  })
                  const existing =
                    existingResponse.data.results?.[0] || existingResponse.data?.[0]

                  if (existing && existing.id) {
                    await api.put(`/users/permissions/${existing.id}/`, dataToSend)
                  } else {
                    await api.post('/users/permissions/', dataToSend)
                  }
                } catch (getError) {
                  await api.post('/users/permissions/', dataToSend)
                }

                setOpenPermissionsDialog(false)
                setSelectedUser(null)
                setPermissions(null)
                showSuccess('Permissions enregistrées avec succès')
                fetchUsers()
              } catch (error) {
                console.error('Error saving permissions:', error)
                showError('Erreur lors de la sauvegarde des permissions')
              } finally {
                setLoadingPermissions(false)
              }
            }}
            disabled={loadingPermissions}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
            }}
          >
            {loadingPermissions ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog suppression */}
      <ConfirmDialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false)
          setUserToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete?.username}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />
    </Box>
  )
}
