'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { searchCountries, type CountryResult } from '@/lib/countries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export default function CountryTypeahead() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CountryResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selected, setSelected] = useState<CountryResult | null>(null)

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS)

  // Two mechanisms guard against stale/out-of-order responses, and they
  // cover different failure modes:
  //   - AbortController actually cancels the in-flight network request,
  //     saving bandwidth and letting the browser's connection pool free up.
  //   - The monotonically increasing request id is the real correctness
  //     guarantee: even if an aborted fetch's promise still resolves (or a
  //     slow request simply finishes after a newer one), we only ever apply
  //     the result whose id matches the latest request we fired.
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const listboxId = useId()

  useEffect(() => {
    const trimmed = debouncedQuery.trim()

    abortRef.current?.abort()

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setStatus('idle')
      setResults([])
      setIsOpen(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    const requestId = ++requestIdRef.current
    setStatus('loading')
    setIsOpen(true)

    searchCountries(trimmed, controller.signal)
      .then((data) => {
        if (requestId !== requestIdRef.current) return // a newer request has since fired
        setResults(data)
        setStatus(data.length === 0 ? 'empty' : 'success')
        setActiveIndex(data.length > 0 ? 0 : -1)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (requestId !== requestIdRef.current) return
        setResults([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [debouncedQuery])

  // Keep the highlighted option visible as the arrow keys move activeIndex.
  // aria-activedescendant only tells assistive tech which option is active —
  // it doesn't scroll anything, so we have to do that ourselves. `nearest`
  // means this is a no-op if the option is already fully visible, so it
  // doesn't cause any jumpiness on mouse hover either.
  useEffect(() => {
    if (activeIndex < 0) return
    const optionEl = document.getElementById(
      `${listboxId}-option-${activeIndex}`
    )
    optionEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listboxId])

  const commitSelection = useCallback((country: CountryResult) => {
    setSelected(country)
    setQuery(country.name)
    setIsOpen(false)
    setResults([])
    setStatus('idle')
    setActiveIndex(-1)
  }, [])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (event.key === 'ArrowDown' && results.length > 0) setIsOpen(true)
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => (i + 1) % results.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % results.length)
        break
      case 'Enter':
        event.preventDefault()
        if (activeIndex >= 0) commitSelection(results[activeIndex])
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="typeahead">
      <label className="typeahead__label" htmlFor="country-search">
        Search for a country
      </label>

      <div className="typeahead__field">
        <input
          id="country-search"
          className="typeahead__input"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder="e.g. Nigeria, Canada, Japan"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onBlur={() => {
            // Small delay so a click on an option registers before the
            // listbox unmounts (a plain blur would otherwise beat the click).
            window.setTimeout(() => setIsOpen(false), 100)
          }}
        />
        {status === 'loading' && (
          <span className="typeahead__spinner" aria-hidden="true" />
        )}
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="typeahead__listbox"
          aria-label="Country results"
        >
          {status === 'loading' && (
            <li className="typeahead__status" role="presentation">
              Searching…
            </li>
          )}

          {status === 'error' && (
            <li
              className="typeahead__status typeahead__status--error"
              role="presentation"
            >
              Couldn't reach the country database. Try again in a moment.
            </li>
          )}

          {status === 'empty' && (
            <li className="typeahead__status" role="presentation">
              No countries match {debouncedQuery.trim()}.
            </li>
          )}

          {status === 'success' &&
            results.map((country, index) => (
              <li
                key={country.uuid}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={
                  'typeahead__option' +
                  (index === activeIndex ? ' typeahead__option--active' : '')
                }
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSelection(country)}
              >
                <span className="typeahead__flag" aria-hidden="true">
                  {country.flagEmoji}
                </span>
                <span className="typeahead__name">{country.name}</span>
                <span className="typeahead__meta">
                  {country.capitals ?? '—'} · {country.region}
                </span>
              </li>
            ))}
        </ul>
      )}

      {selected && (
        <>
          <div className="typeahead__selected">
            Selected: <strong>{selected.name}</strong>
            {' in '}
            <code>{selected.region}</code> Capital city{' '}
            <code>{selected.capitals}</code>
          </div>
        </>
      )}
    </div>
  )
}
