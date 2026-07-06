import { useEffect, useState } from 'react'

function isVisibleAndFocused(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

export function useIsWindowFocused(): boolean {
  const [focused, setFocused] = useState(isVisibleAndFocused)

  useEffect(() => {
    const update = (): void => setFocused(isVisibleAndFocused())
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
    }
  }, [])

  return focused
}
