import AuthForm from '@/components/AuthForm'
import PageDecor from '@/components/PageDecor'
import IntroOverlay from '@/components/IntroOverlay'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      <PageDecor stickers={[
        { src: '/juanita-trophy.png', side: 'left',  vertical: 'bottom', rotate: -10, size: 420, offset: 60 },
        { src: '/juanita-flag.png',   side: 'right', vertical: 'bottom', rotate:  10, size: 420, offset: 60 },
      ]} />
      <AuthForm />
      <IntroOverlay />
    </div>
  )
}
