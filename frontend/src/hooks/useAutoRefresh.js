import { useEffect, useRef } from 'react'

/**
 * Hook pour actualiser automatiquement les données
 * @param {function} refreshFunction - Fonction à appeler pour rafraîchir les données
 * @param {number} intervalSeconds - Intervalle en secondes (défaut: 30)
 * @param {boolean} enabled - Activer/désactiver l'auto-refresh (défaut: true)
 */
export function useAutoRefresh(refreshFunction, intervalSeconds = 30, enabled = true) {
  const intervalRef = useRef(null)
  const refreshFunctionRef = useRef(refreshFunction)

  // Mettre à jour la référence de la fonction sans déclencher de re-render
  useEffect(() => {
    refreshFunctionRef.current = refreshFunction
  }, [refreshFunction])

  useEffect(() => {
    if (!enabled || !refreshFunction) {
      // Nettoyer l'intervalle si désactivé
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Nettoyer l'intervalle existant s'il y en a un
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Attendre un peu avant de démarrer l'auto-refresh pour éviter les conflits avec le chargement initial
    const timeoutId = setTimeout(() => {
      // Configurer l'intervalle avec la fonction de référence
      intervalRef.current = setInterval(() => {
        if (refreshFunctionRef.current) {
          refreshFunctionRef.current()
        }
      }, intervalSeconds * 1000)
    }, 5000) // Attendre 5 secondes avant de démarrer

    // Nettoyer l'intervalle au démontage ou quand les dépendances changent
    return () => {
      clearTimeout(timeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [intervalSeconds, enabled]) // Ne pas inclure refreshFunction dans les dépendances

  return {
    refresh: refreshFunction,
  }
}

