import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  Warehouse as WarehouseIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

const drawerWidth = 72
const drawerExpandedWidth = 240

const menuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard', section: 'main' },
  { text: 'Produits', icon: InventoryIcon, path: '/products', section: 'main' },
  { text: 'Clients', icon: PeopleIcon, path: '/clients', section: 'main' },
  { text: 'Conteneurs', icon: LocalShippingIcon, path: '/containers', section: 'main' },
  { text: 'Stock', icon: WarehouseIcon, path: '/stock', section: 'main' },
  { text: 'Achats', icon: ShoppingCartIcon, path: '/purchases', section: 'main' },
  { text: 'Factures', icon: ReceiptIcon, path: '/invoices', section: 'main' },
  { text: 'Audit', icon: HistoryIcon, path: '/audit', section: 'admin' },
  { text: 'Utilisateurs', icon: PersonIcon, path: '/users', section: 'admin' },
  { text: 'Entreprise', icon: BusinessIcon, path: '/company-settings', section: 'admin' },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerExpanded, setDrawerExpanded] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'error'
      case 'GESTIONNAIRE':
        return 'primary'
      case 'VENDEUR':
        return 'success'
      default:
        return 'default'
    }
  }

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ffffff',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
      }}
      onMouseEnter={() => setDrawerExpanded(true)}
      onMouseLeave={() => setDrawerExpanded(false)}
    >
      {/* Logo / Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerExpanded ? 'flex-start' : 'center',
          px: drawerExpanded ? 2 : 0,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {drawerExpanded ? (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#d32f2f',
              fontSize: '1.25rem',
            }}
          >
            GSA Manager
          </Typography>
        ) : (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: '#d32f2f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '1.125rem',
            }}
          >
            G
          </Box>
        )}
      </Box>

      {/* Navigation principale */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 1 }}>
          {menuItems
            .filter((item) => item.section === 'main')
            .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Tooltip
                  key={item.text}
                  title={!drawerExpanded ? item.text : ''}
                  placement="right"
                  arrow
                >
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 2,
                        minHeight: 48,
                        px: drawerExpanded ? 2 : 1.5,
                        justifyContent: drawerExpanded ? 'flex-start' : 'center',
                        bgcolor: isActive ? 'rgba(211, 47, 47, 0.08)' : 'transparent',
                        color: isActive ? '#d32f2f' : '#6b7280',
                        '&:hover': {
                          bgcolor: isActive
                            ? 'rgba(211, 47, 47, 0.12)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: drawerExpanded ? 40 : 'auto',
                          color: 'inherit',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon />
                      </ListItemIcon>
                      {drawerExpanded && (
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 500,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              )
            })}
        </List>

        <Divider sx={{ my: 1, mx: 2 }} />

        {/* Section Admin */}
        <List sx={{ px: 1 }}>
          {menuItems
            .filter((item) => item.section === 'admin')
            .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Tooltip
                  key={item.text}
                  title={!drawerExpanded ? item.text : ''}
                  placement="right"
                  arrow
                >
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 2,
                        minHeight: 48,
                        px: drawerExpanded ? 2 : 1.5,
                        justifyContent: drawerExpanded ? 'flex-start' : 'center',
                        bgcolor: isActive ? 'rgba(211, 47, 47, 0.08)' : 'transparent',
                        color: isActive ? '#d32f2f' : '#6b7280',
                        '&:hover': {
                          bgcolor: isActive
                            ? 'rgba(211, 47, 47, 0.12)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: drawerExpanded ? 40 : 'auto',
                          color: 'inherit',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon />
                      </ListItemIcon>
                      {drawerExpanded && (
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 500,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              )
            })}
        </List>
      </Box>

      {/* User info */}
      <Box
        sx={{
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          p: 1.5,
        }}
      >
        {drawerExpanded ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#d32f2f',
                  fontSize: '0.875rem',
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.username}
                </Typography>
                <Chip
                  label={user?.role_display}
                  size="small"
                  color={getRoleColor(user?.role)}
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    mt: 0.5,
                  }}
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#d32f2f',
                fontSize: '0.875rem',
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
        )}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerExpanded ? drawerExpandedWidth : drawerWidth}px)` },
          ml: { sm: `${drawerExpanded ? drawerExpandedWidth : drawerWidth}px` },
          bgcolor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
        }}
      >
        <Toolbar sx={{ px: 3, minHeight: '64px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { sm: 'none' },
              color: '#374151',
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {/* Actions header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Recherche globale">
              <IconButton
                sx={{
                  color: '#6b7280',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
              onClick={handleMenuOpen}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#d32f2f',
                  fontSize: '0.8125rem',
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#1a252f',
                  }}
                >
                  {user?.username}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  {user?.role_display}
                </Typography>
              </Box>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  navigate('/profile')
                }}
              >
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Mon profil</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Déconnexion</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerExpandedWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerExpanded ? drawerExpandedWidth : drawerWidth,
              transition: 'width 0.2s ease-in-out',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerExpanded ? drawerExpandedWidth : drawerWidth}px)` },
          bgcolor: '#f5f7fa',
          minHeight: '100vh',
          transition: 'width 0.2s ease-in-out',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
