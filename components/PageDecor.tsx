import Image from 'next/image'

interface Sticker {
  src: string
  side: 'left' | 'right'
  vertical?: 'top' | 'bottom'
  rotate?: number
  size?: number
  mobileSize?: number
  offset?: number
  mobileOffset?: number
}

export default function PageDecor({ stickers }: { stickers: Sticker[] }) {
  return (
    <>
      {stickers.map((s, i) => {
        const size = s.size ?? 420
        const mobileSize = s.mobileSize ?? 180
        const offset = s.offset ?? 60
        const mobileOffset = s.mobileOffset ?? 30
        const rotate = s.rotate ?? (s.side === 'left' ? -8 : 8)
        const vPos = s.vertical ?? 'bottom'

        return (
          <div key={i}>
            {/* Mobile */}
            <div
              style={{
                position: 'fixed',
                [s.side]: `-${mobileOffset}px`,
                [vPos]: vPos === 'bottom' ? '70px' : '70px',
                transform: `rotate(${rotate}deg)`,
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.18,
                mixBlendMode: 'multiply',
                width: mobileSize,
                height: mobileSize,
              }}
              className="block lg:hidden"
            >
              <Image src={s.src} alt="" width={mobileSize} height={mobileSize} />
            </div>

            {/* Desktop */}
            <div
              style={{
                position: 'fixed',
                [s.side]: `-${offset}px`,
                [vPos]: vPos === 'bottom' ? '24px' : '80px',
                transform: `rotate(${rotate}deg)`,
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.22,
                mixBlendMode: 'multiply',
                width: size,
                height: size,
              }}
              className="hidden lg:block"
            >
              <Image src={s.src} alt="" width={size} height={size} />
            </div>
          </div>
        )
      })}
    </>
  )
}
