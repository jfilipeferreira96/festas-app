'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  color?: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: boolean
  dropdownWidth?: string
  showColorIndicators?: boolean
}

interface DropdownCoords {
  left: number
  width: number
  /** Edge inferior do botão (abre para baixo). */
  top?: number
  /** Distância do fundo do viewport ao topo do botão (abre para cima). */
  bottom?: number
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  disabled = false,
  error = false,
  dropdownWidth,
  showColorIndicators = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<SelectOption | undefined>(
    options.find(opt => opt.value === (value ?? defaultValue))
  )
  const [coords, setCoords] = useState<DropdownCoords | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedOption(options.find(opt => opt.value === (value ?? defaultValue)))
  }, [value, options])

  /**
   * Dropdown renderizado num portal com position: fixed (alinhado ao botão).
   * Assim NUNCA contribui para o scroll do contentor ancestral (overflow-y-auto
   * das modais) nem é cortado por ele - era isto que fazia aparecer a scrollbar
   * ao abrir o select.
   */
  const updateCoords = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    // Altura estimada: linha ~40px, máximo max-h-60 (240px)
    const estimatedHeight = Math.min(options.length * 40 + 8, 240)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < estimatedHeight + 8 && spaceAbove > spaceBelow
    setCoords(
      openUp
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4 }
        : { left: rect.left, width: rect.width, top: rect.bottom + 4 }
    )
  }, [options.length])

  const openDropdown = useCallback(() => {
    updateCoords()
    setIsOpen(true)
  }, [updateCoords])

  // O dropdown é fixo - ao fazer scroll/resize, REALINHA (não fecha; fechava
  // instantaneamente ao abrir, inclusivo ao fazer scroll da própria lista).
  useEffect(() => {
    if (!isOpen) return
    const handleReposition = () => updateCoords()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [isOpen, updateCoords])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    setSelectedOption(option)
    onChange(option.value)
    setIsOpen(false)
  }

  const buttonClasses = `
    w-full px-3 py-2 border rounded-md flex items-center justify-between text-left transition-colors
    ${disabled ? 'bg-surface cursor-not-allowed opacity-50' : 'cursor-pointer bg-surface'}
    ${error ? 'border-accent-red-400 focus:ring-accent-red-400' : 'border-border focus:ring-primary-500'}
    ${!disabled && !error ? 'focus:outline-none focus:ring-2' : ''}
    ${className}
  `

  const textClasses = `
    ${selectedOption ? 'text-text-primary' : 'text-text-muted'}
    ${disabled ? 'text-text-muted' : ''}
  `

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && (isOpen ? setIsOpen(false) : openDropdown())}
        disabled={disabled}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2 flex-1">
          {selectedOption && selectedOption.color && showColorIndicators && (
            <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: selectedOption.color }}></span>
          )}
          <span className={textClasses}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && coords && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[999999] max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg ${dropdownWidth || ''}`}
          style={{
            left: coords.left,
            width: dropdownWidth ? undefined : coords.width,
            ...(coords.top != null ? { top: coords.top } : { bottom: coords.bottom }),
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={option.disabled}
              className={`
                w-full px-3 py-2 flex items-center justify-between text-left transition-colors
                ${option.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : selectedOption?.value === option.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-900 hover:bg-gray-50 cursor-pointer'
                }
              `}
            >
              <div className="flex items-center gap-2 flex-1">
                {option.color && showColorIndicators && (
                  <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: option.color }}></span>
                )}
                <span>{option.label}</span>
              </div>
              {selectedOption?.value === option.value && !option.disabled && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
