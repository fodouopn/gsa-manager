import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  IconButton,
  Chip,
  alpha,
} from '@mui/material'
import { Search, Refresh, ExpandMore, ExpandLess, FilterList } from '@mui/icons-material'

/**
 * FiltersBar moderne - Barre de filtres compacte et repliable
 */
export default function FiltersBar({
  search = '',
  onSearchChange,
  filters = [],
  onFilterChange,
  onReset,
  loading = false,
}) {
  const [expanded, setExpanded] = useState(false)

  const handleFilterChange = (filterId, value) => {
    if (onFilterChange) {
      onFilterChange(filterId, value)
    }
  }

  const activeFiltersCount = filters.filter((f) => f.value && f.value !== '').length

  return (
    <Box
      sx={{
        bgcolor: '#ffffff',
        borderRadius: 2,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        p: 2,
        mb: 3,
      }}
    >
      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
        {/* Recherche principale */}
        <TextField
          size="small"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: '#6b7280' }} />,
          }}
          disabled={loading}
          sx={{
            flex: 1,
            minWidth: 250,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
            },
          }}
        />

        {/* Filtres rapides (toujours visibles) */}
        {filters.slice(0, 2).map((filter) => (
          <FormControl key={filter.id} size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={filter.value || ''}
              label={filter.label}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              disabled={loading}
            >
              {filter.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        {/* Bouton filtres avancés */}
        {filters.length > 2 && (
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setExpanded(!expanded)}
            sx={{
              borderColor: 'rgba(0, 0, 0, 0.12)',
              color: '#374151',
            }}
          >
            Filtres
            {activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                sx={{
                  ml: 1,
                  height: 20,
                  bgcolor: '#d32f2f',
                  color: 'white',
                  '& .MuiChip-label': {
                    px: 1,
                    fontSize: '0.75rem',
                  },
                }}
              />
            )}
          </Button>
        )}

        {/* Réinitialiser */}
        {onReset && (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onReset}
            disabled={loading}
            sx={{
              borderColor: 'rgba(0, 0, 0, 0.12)',
              color: '#374151',
            }}
          >
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* Filtres avancés (repliables) */}
      {filters.length > 2 && (
        <Collapse in={expanded}>
          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            {filters.slice(2).map((filter) => (
              <FormControl key={filter.id} size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  value={filter.value || ''}
                  label={filter.label}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  disabled={loading}
                >
                  {filter.options?.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  )
}
