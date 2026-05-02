'use client'

import { useEffect } from 'react'
import { useSceneStore } from '@/store/use-scene-store'
import { fetchCatalog } from '@/lib/api-client'

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const setCatalog = useSceneStore((s) => s.setCatalog)

  useEffect(() => {
    fetchCatalog()
      .then((items) => {
        if (items.length > 0) setCatalog(items)
      })
      .catch(() => {
        // DB unavailable — keep SAMPLE_CATALOG default in Zustand
      })
  }, [setCatalog])

  return <>{children}</>
}
