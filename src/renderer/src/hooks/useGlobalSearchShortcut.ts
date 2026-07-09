import { useEffect } from 'react'
import { useGlobalSearchStore } from '../stores/globalSearchStore'

export function useGlobalSearchShortcut(): void {
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
  const closeSearch = useGlobalSearchStore((s) => s.closeSearch)
  const open = useGlobalSearchStore((s) => s.open)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) closeSearch()
        else openSearch()
        return
      }

      if (open && event.key === 'Escape') {
        event.preventDefault()
        closeSearch()
        return
      }

      if (isEditable && !open) return
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, openSearch, closeSearch])
}
