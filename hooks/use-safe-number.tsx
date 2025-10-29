'use client'

import { useState, useEffect } from 'react'

/**
 * Hook para formatear números de manera segura evitando errores de hidratación
 * @param value - Número a formatear
 * @param options - Opciones de formateo
 * @returns String formateado o placeholder durante la hidratación
 */
export function useSafeNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || value === null || value === undefined) {
    return '--'
  }

  try {
    const defaultOptions: Intl.NumberFormatOptions = {
      ...options
    }

    return value.toLocaleString('es-ES', defaultOptions)
  } catch (error) {
    console.error('Error formatting number:', error)
    return value.toString()
  }
}

/**
 * Componente wrapper para números seguros
 */
interface SafeNumberProps {
  value: number | null | undefined
  options?: Intl.NumberFormatOptions
  className?: string
  fallback?: string
}

export function SafeNumber({ value, options, className, fallback = '--' }: SafeNumberProps) {
  const formattedNumber = useSafeNumber(value, options)
  
  return (
    <span className={className}>
      {formattedNumber === '--' ? fallback : formattedNumber}
    </span>
  )
}