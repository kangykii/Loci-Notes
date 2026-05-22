import { useEffect, useRef, useState } from 'react'
import { LIGHT_BACKGROUND_LOGO_SRC, logoSrcForBackground } from './brandLogoAssets'

type BrandLogoProps = {
  className?: string
}

function backgroundColorForElement(element: HTMLElement | null) {
  let current: HTMLElement | null = element

  while (current) {
    const backgroundColor = window.getComputedStyle(current).backgroundColor
    const logoSrc = logoSrcForBackground(backgroundColor)
    if (logoSrc !== LIGHT_BACKGROUND_LOGO_SRC || backgroundColor !== 'rgba(0, 0, 0, 0)') {
      return logoSrc
    }
    current = current.parentElement
  }

  return logoSrcForBackground(window.getComputedStyle(document.body).backgroundColor)
}

export function BrandLogo({ className }: BrandLogoProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [src, setSrc] = useState(LIGHT_BACKGROUND_LOGO_SRC)

  useEffect(() => {
    const updateLogo = () => setSrc(backgroundColorForElement(imageRef.current?.parentElement ?? null))
    updateLogo()

    const observer = new MutationObserver(updateLogo)
    let current: HTMLElement | null = imageRef.current?.parentElement ?? null
    while (current) {
      observer.observe(current, { attributes: true, attributeFilter: ['class', 'style'] })
      current = current.parentElement
    }

    window.addEventListener('resize', updateLogo)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLogo)
    }
  }, [])

  return <img ref={imageRef} className={className} src={src} alt="" aria-hidden />
}
