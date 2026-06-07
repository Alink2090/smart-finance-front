import { useEffect, useState } from 'react'

export default function InstallButton() {

  const [promptEvent, setPromptEvent] = useState(null)

  useEffect(() => {

    const handler = (e) => {
      e.preventDefault()
      setPromptEvent(e)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () =>
      window.removeEventListener('beforeinstallprompt', handler)

  }, [])

  const installApp = async () => {

    if (!promptEvent) return

    promptEvent.prompt()

    const choice = await promptEvent.userChoice

    console.log(choice)

    setPromptEvent(null)
  }

  if (!promptEvent) return null

  return (
    <button onClick={installApp}>
      Installer l'application
    </button>
  )
}