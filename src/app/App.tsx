import { PrimeReactProvider } from 'primereact/api'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <PrimeReactProvider>
      <AppShell />
    </PrimeReactProvider>
  )
}
