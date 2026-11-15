import { useOnboardingNavigation } from './hooks/useOnboardingNavigation'
import { InterestSettingsPage } from './pages/InterestSettingsPage'
import { InterestTopicsPage } from './pages/InterestTopicsPage'
import { OnboardingPage } from './pages/OnboardingPage'

export default function App() {
  const { page, navigate } = useOnboardingNavigation()

  if (page === 'interests') {
    return <InterestSettingsPage onBack={() => navigate('topics')} />
  }

  if (page === 'topics') {
    return <InterestTopicsPage />
  }

  return (
    <OnboardingPage
      onLogin={() => navigate('topics')}
      onSignUp={() => navigate('topics')}
      onContinueAsGuest={() => navigate('topics')}
    />
  )
}
