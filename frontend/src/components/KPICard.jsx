import React from 'react'
import { Card, CardContent, Typography, Box, Chip, alpha } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown } from '@mui/icons-material'

/**
 * KPI Card moderne - Carte visuelle avec nombre dominant, indicateur de tendance
 */
export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  iconColor = '#d32f2f',
  onClick,
  link,
  loading = false,
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (link) {
      navigate(link)
    } else if (onClick) {
      onClick()
    }
  }

  const isPositive = trend === 'up'
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card
      sx={{
        height: '100%',
        cursor: link || onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': link || onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.12)',
          borderColor: alpha(iconColor, 0.3),
        } : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${iconColor} 0%, ${alpha(iconColor, 0.6)} 100%)`,
        },
      }}
      onClick={handleClick}
      elevation={0}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography
            variant="body2"
            sx={{
              color: '#6b7280',
              fontWeight: 500,
              fontSize: '0.8125rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(iconColor, 0.1),
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Box mb={1}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: '2rem',
              lineHeight: 1.2,
              color: '#1a252f',
              mb: trend ? 1 : 0,
            }}
          >
            {loading ? '...' : value}
          </Typography>
        </Box>

        {trend && trendValue && (
          <Box display="flex" alignItems="center" gap={0.5} mb={1}>
            <TrendIcon
              sx={{
                fontSize: 16,
                color: isPositive ? '#10b981' : '#ef4444',
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: isPositive ? '#10b981' : '#ef4444',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {trendValue}
            </Typography>
          </Box>
        )}

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: '#6b7280',
              fontSize: '0.8125rem',
              mt: trend ? 0 : 1,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
