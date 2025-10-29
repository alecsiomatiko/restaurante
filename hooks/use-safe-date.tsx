'use client'

import { useState, useEffect } from 'react'

/**
 * Hook para formatear fechas de manera segura evitando errores de hidratación
 * @param dateString - String de fecha a formatear
 * @param options - Opciones de formateo de fecha
 * @returns String formateado o placeholder durante la hidratación
 */
export function useSafeDate(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !dateString) {
    return '--'
  }

  try {
    const date = new Date(dateString)
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }

    return date.toLocaleDateString('es-ES', defaultOptions)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Error en fecha'
  }
}

/**
 * Hook específico para formatear solo fechas (sin hora)
 */
export function useSafeDateOnly(dateString: string | null | undefined): string {
  return useSafeDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Hook específico para formatear fecha y hora completa
 */
export function useSafeDateTime(dateString: string | null | undefined): string {
  return useSafeDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Componente wrapper para fechas seguras
 */
interface SafeDateProps {
  date: string | null | undefined
  options?: Intl.DateTimeFormatOptions
  className?: string
  fallback?: string
}

export function SafeDate({ date, options, className, fallback = '--' }: SafeDateProps) {
  const formattedDate = useSafeDate(date, options)
  
  return (
    <span className={className}>
      {formattedDate === '--' ? fallback : formattedDate}
    </span>
  )
}