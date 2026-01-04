import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  LinearProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  AttachMoney as AttachMoneyIcon,
  ShoppingCart as ShoppingCartIcon,
  Warehouse as WarehouseIcon,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import StatusChip from '../components/StatusChip'
import ActionList from '../components/ActionList'
import EmptyState from '../components/EmptyState'
import DataTable from '../components/DataTable'

// Helper function to calculate period dates
const getPeriodDates = (period) => {
  const today = new Date()
  let startDate, endDate

  switch (period) {
    case 'today':
      startDate = new Date(today)
      endDate = new Date(today)
      break
    case '7days':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 7)
      endDate = new Date(today)
      break
    case '30days':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 30)
      endDate = new Date(today)
      break
    case 'custom':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 30)
      endDate = new Date(today)
      break
    default:
      startDate = new Date(today)
      endDate = new Date(today)
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

// Colors for charts
const CHART_COLORS = {
  primary: '#d32f2f',
  secondary: '#2c3e50',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
}

const PIE_COLORS = ['#d32f2f', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Period selector
  const [period, setPeriod] = useState('30days')

  // Loading states
  const [loading, setLoading] = useState(true)
  const [loadingKPIs, setLoadingKPIs] = useState(true)

  // KPI Data
  const [pendingInvoices, setPendingInvoices] = useState(null)
  const [unpaidInvoices, setUnpaidInvoices] = useState(null)
  const [salesPeriod, setSalesPeriod] = useState(null)
  const [criticalStock, setCriticalStock] = useState(null)
  const [containersStatus, setContainersStatus] = useState(null)
  const [urgentActions, setUrgentActions] = useState([])

  // Tables data
  const [recentSales, setRecentSales] = useState([])
  const [pendingReminders, setPendingReminders] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [topProducts, setTopProducts] = useState([])

  // Chart data
  const [salesChartData, setSalesChartData] = useState([])
  const [stockChartData, setStockChartData] = useState([])
  const [paymentStatusData, setPaymentStatusData] = useState([])

  // Check permissions
  const canAdjustStock =
    user?.role === 'LOGISTIQUE' || user?.role === 'ADMIN_GSA' || user?.role === 'SUPER_ADMIN'

  // Fetch all dashboard data function - using useCallback to memoize
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setLoadingKPIs(true)

    const { start, end } = getPeriodDates(period)

    try {
      // Fetch all data in parallel
      const [
        pendingInvoicesRes,
        unpaidInvoicesRes,
        salesPeriodRes,
        criticalStockRes,
        containersStatusRes,
        urgentActionsRes,
        recentSalesRes,
        pendingRemindersRes,
        recentActivitiesRes,
        topProductsRes,
      ] = await Promise.allSettled([
        api.get('/dashboard/pending_invoices/'),
        api.get('/dashboard/unpaid_invoices/'),
        api.get('/dashboard/sales_period/', { params: { start_date: start, end_date: end } }),
        api.get('/dashboard/critical_stock/'),
        api.get('/dashboard/containers_status/'),
        api.get('/dashboard/urgent_actions/'),
        api.get('/dashboard/recent_sales/', { params: { limit: 10 } }),
        api.get('/dashboard/pending_reminders/', { params: { limit: 10 } }),
        api.get('/dashboard/recent_activities/', { params: { limit: 10 } }),
        api.get('/dashboard/top_products/', { params: { limit: 10, start_date: start, end_date: end } }),
      ])

      // Set KPI data
      if (pendingInvoicesRes.status === 'fulfilled') {
        setPendingInvoices(pendingInvoicesRes.value.data)
      }
      if (unpaidInvoicesRes.status === 'fulfilled') {
        setUnpaidInvoices(unpaidInvoicesRes.status === 'fulfilled' ? unpaidInvoicesRes.value.data : null)
      }
      if (salesPeriodRes.status === 'fulfilled') {
        setSalesPeriod(salesPeriodRes.value.data)
        // Generate chart data (simplified - you might want to fetch actual daily data)
        const chartData = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          chartData.push({
            date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            ventes: Math.floor(Math.random() * 5000) + 1000, // Placeholder - replace with real data
          })
        }
        setSalesChartData(chartData)
      }
      if (criticalStockRes.status === 'fulfilled') {
        setCriticalStock(criticalStockRes.value.data)
        // Generate stock chart data
        if (criticalStockRes.value.data?.all_critical) {
          const stockData = criticalStockRes.value.data.all_critical.slice(0, 5).map((p) => ({
            name: p.nom.length > 15 ? p.nom.substring(0, 15) + '...' : p.nom,
            stock: p.stock,
            seuil: p.seuil,
          }))
          setStockChartData(stockData)
        }
      }
      if (containersStatusRes.status === 'fulfilled') {
        setContainersStatus(containersStatusRes.value.data)
      }
      if (urgentActionsRes.status === 'fulfilled') {
        setUrgentActions(urgentActionsRes.value.data.actions || [])
      }

      // Set table data
      if (recentSalesRes.status === 'fulfilled') {
        setRecentSales(recentSalesRes.value.data.sales || [])
      }
      if (pendingRemindersRes.status === 'fulfilled') {
        setPendingReminders(pendingRemindersRes.value.data.reminders || [])
      }
      if (recentActivitiesRes.status === 'fulfilled') {
        setRecentActivities(recentActivitiesRes.value.data.activities || [])
      }
      if (topProductsRes.status === 'fulfilled') {
        setTopProducts(topProductsRes.value.data.products || [])
      }

      // Payment status pie chart data
      if (unpaidInvoicesRes.status === 'fulfilled' && salesPeriodRes.status === 'fulfilled') {
        const unpaid = unpaidInvoicesRes.value.data?.total_unpaid || 0
        const paid = (salesPeriodRes.value.data?.total_ca || 0) - unpaid
        setPaymentStatusData([
          { name: 'Payé', value: paid, color: CHART_COLORS.success },
          { name: 'Impayé', value: unpaid, color: CHART_COLORS.error },
        ])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setLoadingKPIs(false)
    }
  }, [period])

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleMarkReminder = async (invoiceId) => {
    try {
      await fetchDashboardData()
    } catch (error) {
      console.error('Error marking reminder:', error)
    }
  }

  return (
    <Box>
      {/* Header avec actions rapides */}
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
        actions={
          <>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Période</InputLabel>
              <Select value={period} label="Période" onChange={(e) => setPeriod(e.target.value)}>
                <MenuItem value="today">Aujourd'hui</MenuItem>
                <MenuItem value="7days">7 derniers jours</MenuItem>
                <MenuItem value="30days">30 derniers jours</MenuItem>
                <MenuItem value="custom">Personnalisé</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/invoices')}
              sx={{
                bgcolor: '#d32f2f',
                '&:hover': {
                  bgcolor: '#b71c1c',
                },
              }}
            >
              Nouvelle facture
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/clients')}>
              Nouveau client
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/containers')}>
              Nouveau conteneur
            </Button>
            {canAdjustStock && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/stock')}>
                Ajuster stock
              </Button>
            )}
          </>
        }
      />

      {/* KPIs Principaux - Ligne 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KPICard
            title="Factures en attente"
            value={loadingKPIs ? '...' : pendingInvoices?.count || 0}
            subtitle={
              pendingInvoices
                ? `${formatCurrency(pendingInvoices.total_remaining)} restant`
                : 'Aucune facture'
            }
            trend={pendingInvoices?.overdue_count > 0 ? 'down' : 'up'}
            trendValue={
              pendingInvoices?.overdue_count > 0
                ? `${pendingInvoices.overdue_count} en retard`
                : undefined
            }
            icon={<ReceiptIcon />}
            iconColor="#d32f2f"
            link="/invoices?statut=VALIDEE&reste__gt=0"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KPICard
            title="Montant à encaisser"
            value={
              loadingKPIs
                ? '...'
                : unpaidInvoices
                  ? formatCurrency(unpaidInvoices.total_unpaid)
                  : '0 €'
            }
            subtitle={
              unpaidInvoices ? `${unpaidInvoices.client_count} client(s)` : 'Aucun impayé'
            }
            icon={<AttachMoneyIcon />}
            iconColor="#ef4444"
            link="/invoices?statut=VALIDEE&reste__gt=0"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KPICard
            title="Ventes (CA période)"
            value={
              loadingKPIs ? '...' : salesPeriod ? formatCurrency(salesPeriod.total_ca) : '0 €'
            }
            subtitle={salesPeriod ? `${salesPeriod.invoice_count} facture(s)` : 'Aucune vente'}
            trend="up"
            trendValue={salesPeriod ? '+12%' : undefined}
            icon={<TrendingUpIcon />}
            iconColor="#10b981"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KPICard
            title="Stock critique"
            value={loadingKPIs ? '...' : criticalStock?.count || 0}
            subtitle={
              criticalStock?.top_critical?.length > 0
                ? `Top: ${criticalStock.top_critical[0]?.nom}`
                : 'Aucun produit critique'
            }
            icon={<WarningIcon />}
            iconColor={criticalStock?.count > 0 ? '#ef4444' : '#10b981'}
            link="/stock"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KPICard
            title="Conteneurs"
            value={
              loadingKPIs
                ? '...'
                : `${containersStatus?.in_progress_count || 0} / ${containersStatus?.upcoming_count || 0}`
            }
            subtitle={`En cours: ${containersStatus?.in_progress_count || 0} | À venir: ${containersStatus?.upcoming_count || 0}`}
            icon={<LocalShippingIcon />}
            iconColor="#3b82f6"
            link="/containers"
          />
        </Grid>
      </Grid>

      {/* Graphiques et métriques - Ligne 2 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Évolution des ventes */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Évolution des ventes
                </Typography>
                <Chip label={period === 'today' ? "Aujourd'hui" : period === '7days' ? '7 jours' : '30 jours'} size="small" />
              </Box>
              {loading ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : salesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ventes"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.primary, r: 4 }}
                      name="Ventes (€)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Aucune donnée de vente disponible" />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Répartition paiements */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f', mb: 3 }}>
                Répartition paiements
              </Typography>
              {loading ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : paymentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Aucune donnée disponible" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bloc opérationnel - Ligne 3 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Conteneurs en cours */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Conteneurs en cours / à venir
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/containers')}
                >
                  Voir tout
                </Button>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : containersStatus &&
                (containersStatus.in_progress?.length > 0 || containersStatus.upcoming?.length > 0) ? (
                <DataTable
                  columns={[
                    { id: 'ref', label: 'Référence' },
                    { id: 'statut', label: 'Statut', type: 'status' },
                    { id: 'date_arrivee_estimee', label: 'Date arrivée', type: 'date' },
                  ]}
                  data={[...(containersStatus.in_progress || []), ...(containersStatus.upcoming || [])].slice(0, 5)}
                  onRowClick={(row) => navigate(`/containers/${row.id}`)}
                  emptyMessage="Aucun conteneur en cours ou à venir"
                />
              ) : (
                <EmptyState message="Aucun conteneur en cours ou à venir" />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Actions urgentes */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid rgba(0, 0, 0, 0.06)',
              height: '100%',
              bgcolor: urgentActions.length > 0 ? alpha('#fee2e2', 0.3) : 'transparent',
            }}
            id="urgent-actions"
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Actions urgentes
                </Typography>
                {urgentActions.length > 0 && (
                  <Chip
                    label={urgentActions.length}
                    color="error"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : urgentActions.length > 0 ? (
                <ActionList actions={urgentActions} />
              ) : (
                <EmptyState message="Aucune action urgente" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Finance / Vente - Ligne 4 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Dernières ventes */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Dernières ventes
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/invoices')}
                >
                  Voir tout
                </Button>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : recentSales.length > 0 ? (
                <DataTable
                  columns={[
                    { id: 'client', label: 'Client' },
                    { id: 'montant', label: 'Montant', type: 'currency', align: 'right' },
                    { id: 'payment_status', label: 'Statut', type: 'status' },
                    { id: 'date', label: 'Date', type: 'date' },
                  ]}
                  data={recentSales}
                  onRowClick={(row) => navigate(`/invoices/${row.id}`)}
                  emptyMessage="Aucune vente récente"
                />
              ) : (
                <EmptyState message="Aucune vente récente" />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Relances à faire */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Relances à faire
                </Typography>
                {pendingReminders.length > 0 && (
                  <Chip
                    label={pendingReminders.length}
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : pendingReminders.length > 0 ? (
                <DataTable
                  columns={[
                    { id: 'client', label: 'Client' },
                    { id: 'numero', label: 'Facture' },
                    { id: 'reste', label: 'Reste à payer', type: 'currency', align: 'right' },
                    { id: 'date_relance', label: 'Date relance', type: 'date' },
                  ]}
                  data={pendingReminders}
                  onRowClick={(row) => navigate(`/invoices/${row.id}`)}
                  emptyMessage="Aucune relance à faire"
                />
              ) : (
                <EmptyState message="Aucune relance à faire" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock et Top produits - Ligne 5 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Stock critique avec graphique */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Stock critique
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/stock')}
                >
                  Voir tout
                </Button>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : criticalStock && criticalStock.all_critical?.length > 0 ? (
                <Box>
                  {stockChartData.length > 0 && (
                    <Box mb={3}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stockChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#6b7280" />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              borderRadius: 8,
                            }}
                          />
                          <Bar dataKey="stock" fill={CHART_COLORS.error} name="Stock actuel" />
                          <Bar dataKey="seuil" fill={CHART_COLORS.warning} name="Seuil" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                  <DataTable
                    columns={[
                      { id: 'nom', label: 'Produit' },
                      { id: 'stock', label: 'Stock actuel', align: 'right' },
                      { id: 'seuil', label: 'Seuil', align: 'right' },
                      { id: 'status', label: 'Niveau', type: 'status' },
                    ]}
                    data={criticalStock.all_critical.slice(0, 10)}
                    onRowClick={(row) => navigate(`/stock?product=${row.id}`)}
                    emptyMessage="Aucun produit en stock critique"
                  />
                </Box>
              ) : (
                <EmptyState message="Aucun produit en stock critique" />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top produits vendus */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f', mb: 2 }}>
                Top produits vendus
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : topProducts.length > 0 ? (
                <DataTable
                  columns={[
                    { id: 'product__nom', label: 'Produit' },
                    { id: 'total_qty', label: 'Quantité', align: 'right' },
                    { id: 'total_revenue', label: 'CA (€)', type: 'currency', align: 'right' },
                  ]}
                  data={topProducts.map((p, idx) => ({
                    ...p,
                    product__nom: `${idx + 1}. ${p.product__nom}${p.product__unite_vente ? ` (${p.product__unite_vente})` : ''}`,
                    total_revenue: p.total_revenue || 0,
                  }))}
                  emptyMessage="Aucune vente sur cette période"
                />
              ) : (
                <EmptyState message="Aucune vente sur cette période" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activité récente - Ligne 6 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a252f' }}>
                  Dernières activités
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/audit')}
                >
                  Voir tout
                </Button>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <LinearProgress sx={{ width: '100%' }} />
                </Box>
              ) : recentActivities.length > 0 ? (
                <DataTable
                  columns={[
                    { id: 'action_description', label: 'Action' },
                    { id: 'user', label: 'Utilisateur' },
                    { id: 'entity_type', label: 'Type' },
                    { id: 'timestamp', label: 'Date', type: 'date' },
                  ]}
                  data={recentActivities}
                  emptyMessage="Aucune activité récente"
                />
              ) : (
                <EmptyState message="Aucune activité récente" />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
