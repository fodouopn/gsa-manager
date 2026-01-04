import React from 'react'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material'

/**
 * ActionList component - List of actionable urgent items
 * @param {array} actions - Array of action items: { type, priority, title, subtitle, link, data }
 * @param {function} onActionClick - Optional click handler
 */
export default function ActionList({ actions = [], onActionClick }) {
  const navigate = useNavigate()

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <ErrorIcon color="error" />
      case 'MEDIUM':
        return <WarningIcon color="warning" />
      case 'LOW':
        return <InfoIcon color="info" />
      default:
        return <InfoIcon color="default" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'info'
      default:
        return 'default'
    }
  }

  const handleClick = (action) => {
    if (onActionClick) {
      onActionClick(action)
    } else if (action.link) {
      navigate(action.link)
    }
  }

  if (actions.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Aucune action urgente
        </Typography>
      </Box>
    )
  }

  return (
    <List>
      {actions.map((action, index) => (
        <ListItem key={index} disablePadding>
          <ListItemButton onClick={() => handleClick(action)}>
            <ListItemIcon>
              {getPriorityIcon(action.priority)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight={500}>
                    {action.title}
                  </Typography>
                  {action.priority && (
                    <Chip
                      label={action.priority}
                      size="small"
                      color={getPriorityColor(action.priority)}
                      sx={{ height: '20px', fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              }
              secondary={action.subtitle}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
}

