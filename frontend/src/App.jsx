import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ToastProvider'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Clients from './pages/Clients'
import Containers from './pages/Containers'
import Stock from './pages/Stock'
import Purchases from './pages/Purchases'
import Invoices from './pages/Invoices'
import Audit from './pages/Audit'
import Users from './pages/Users'
import CompanySettings from './pages/CompanySettings'
import InvoiceAcceptance from './pages/InvoiceAcceptance'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import theme from './theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ToastProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/accept/invoice/:token" element={<InvoiceAcceptance />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="clients" element={<Clients />} />
              <Route path="containers" element={<Containers />} />
              <Route path="containers/:id" element={<Containers />} />
              <Route path="stock" element={<Stock />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<Invoices />} />
              <Route path="audit" element={<Audit />} />
              <Route path="users" element={<Users />} />
              <Route path="company-settings" element={<CompanySettings />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
