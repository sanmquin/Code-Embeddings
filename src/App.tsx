import { useState } from 'react'
import TransformationScreen from './components/TransformationScreen'
import ExecutionScreen from './components/ExecutionScreen'
import './index.css'

function App() {
  const [screen, setScreen] = useState<'transformation' | 'execution'>('transformation')
  const [approvedCode, setApprovedCode] = useState<string>('')

  const handleApprove = (code: string) => {
    setApprovedCode(code)
    setScreen('execution')
  }

  return (
    <div className="app">
      <header>
        <h1>Code Embeddings</h1>
        <p>Transforming ARC solutions into modular, reusable functions.</p>
      </header>

      <nav>
        <button
          onClick={() => setScreen('transformation')}
          className={screen === 'transformation' ? 'active' : ''}
        >
          1. Refactor Solution
        </button>
        <button
          onClick={() => setScreen('execution')}
          disabled={!approvedCode}
          className={screen === 'execution' ? 'active' : ''}
        >
          2. Execute & Verify
        </button>
      </nav>

      <main>
        {screen === 'transformation' ? (
          <TransformationScreen onApprove={handleApprove} />
        ) : (
          <ExecutionScreen code={approvedCode} />
        )}
      </main>
    </div>
  )
}

export default App
