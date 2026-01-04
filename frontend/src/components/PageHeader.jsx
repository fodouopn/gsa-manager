import React from 'react'
import { Box, Typography, Breadcrumbs, Link } from '@mui/material'
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material'

/**
 * PageHeader moderne - En-tête de page avec titre, description et actions
 */
export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <Box mb={4}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2 }}
        >
          {breadcrumbs.map((crumb, index) => {
            if (index === breadcrumbs.length - 1) {
              return (
                <Typography key={index} color="text.primary" sx={{ fontSize: '0.875rem' }}>
                  {crumb.label}
                </Typography>
              )
            }
            return (
              <Link
                key={index}
                color="inherit"
                href={crumb.path}
                sx={{
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {crumb.label}
              </Link>
            )
          })}
        </Breadcrumbs>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={3}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: '1.875rem',
              color: '#1a252f',
              mb: subtitle ? 1 : 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: '#6b7280',
                fontSize: '0.9375rem',
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box
            display="flex"
            gap={1.5}
            flexWrap="wrap"
            sx={{
              '& > *': {
                flexShrink: 0,
              },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  )
}
