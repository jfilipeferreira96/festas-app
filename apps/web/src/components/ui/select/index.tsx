'use client'

import { useState, useRef, useEffect } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedOption(options.find(opt => opt.value === (value ?? defaultValue)))
  }, [value, options])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
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

      {isOpen && !disabled && (
        <div 
          className={`
            absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto
            ${dropdownWidth || 'w-full'}
          `}
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
        </div>
      )}
    </div>
  )
}
