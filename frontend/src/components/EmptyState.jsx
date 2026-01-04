import React from 'react'
import { Box, Typography, Button, alpha } from '@mui/material'
import { Inbox, Add } from '@mui/icons-material'

/**
 * EmptyState moderne - État vide élégant avec message et action
 */
export default function EmptyState({
  message = 'Aucune donnée disponible',
  actionLabel,
  onAction,
  icon,
}) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={8}
      px={2}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha('#d32f2f', 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        {icon || <Inbox sx={{ fontSize: 40, color: '#d32f2f' }} />}
      </Box>
      <Typography
        variant="h6"
        sx={{
          color: '#374151',
          fontWeight: 600,
          mb: 1,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#6b7280',
          textAlign: 'center',
          mb: actionLabel && onAction ? 3 : 0,
        }}
      >
        Commencez par créer votre premier élément
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAction}
          sx={{
            bgcolor: '#d32f2f',
            '&:hover': {
              bgcolor: '#b71c1c',
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}
