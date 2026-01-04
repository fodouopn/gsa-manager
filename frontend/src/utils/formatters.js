/**
 * Utility functions for formatting data
 */
import { format, parseISO } from 'date-fns'

/**
 * Format date to French format (DD/MM/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, 'dd/MM/yyyy')
  } catch (error) {
    return dateString
  }
}

/**
 * Format date and time to French format (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, 'dd/MM/yyyy HH:mm')
  } catch (error) {
    return dateString
  }
}

/**
 * Format amount to currency (€)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Format number with French locale
 */
export const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined) return '-'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number)
}

/**
 * Format unit display name
 */
export const formatUnit = (unit) => {
  const units = {
    BOUTEILLE: 'Bouteille',
    PACK: 'Pack',
    CARTON: 'Carton',
  }
  return units[unit] || unit
}

/**
 * Format invoice status
 */
export const formatInvoiceStatus = (status) => {
  const statuses = {
    BROUILLON: 'Brouillon',
    VALIDEE: 'Validée',
    ACCEPTEE: 'Acceptée',
    ANNULEE: 'Annulée',
    AVOIR: 'Avoir',
  }
  return statuses[status] || status
}

/**
 * Format container status
 */
export const formatContainerStatus = (status) => {
  const statuses = {
    PREVU: 'Prévu',
    EN_COURS: 'En cours',
    VALIDE: 'Validé',
    ANNULE: 'Annulé',
  }
  return statuses[status] || status
}

/**
 * Format stock movement type
 */
export const formatStockMovementType = (type) => {
  const types = {
    RECEPTION: 'Réception',
    VENTE: 'Vente',
    AJUSTEMENT: 'Ajustement',
  }
  return types[type] || type
}

