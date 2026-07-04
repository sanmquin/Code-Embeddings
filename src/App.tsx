import { useState, useEffect } from 'react'
import TransformationScreen from './components/TransformationScreen'
import ExecutionScreen from './components/ExecutionScreen'
import './index.css'

function App() {
  const [screen, setScreen] = useState<'transformation' | 'execution'>('transformation')
  const [approvedCode, setApprovedCode] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('00576224')
  const [pythonSolution, setPythonSolution] = useState<string>('')
  const [taskData, setTaskData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadTask = async (id: string) => {
    setIsLoading(true)
    setError(null)
    setApprovedCode('')
    setScreen('transformation')

    try {
      const pythonUrl = `https://raw.githubusercontent.com/sanmquin/ARC/main/solves/${id}/solver.py`
      const jsonUrl = `https://raw.githubusercontent.com/sanmquin/ARC/main/dataset/tasks/${id}.json`

      const [pyRes, jsonRes] = await Promise.all([
        fetch(pythonUrl),
        fetch(jsonUrl)
      ])

      if (!pyRes.ok) throw new Error(`Failed to load Python solution: ${pyRes.statusText}`)
      if (!jsonRes.ok) throw new Error(`Failed to load Task JSON: ${jsonRes.statusText}`)

      const pythonCode = await pyRes.text()
      const taskJson = await jsonRes.json()

      setPythonSolution(pythonCode)
      setTaskData(taskJson)
    } catch (err: any) {
      setError(err.message)
      setPythonSolution('')
      setTaskData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTask(taskId)
  }, [])

  const handleApprove = (code: string) => {
    setApprovedCode(code)
    setScreen('execution')
  }

  return (
    <div className="app">
      <header>
        <h1>Code Embeddings</h1>
        <p>Transforming ARC solutions into modular, reusable functions.</p>

        <div className="task-loader">
          <input
            type="text"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="Enter Task ID (e.g. 00576224)"
          />
          <button onClick={() => loadTask(taskId)} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Puzzle'}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </header>

      <nav>
        <button
          onClick={() => setScreen('transformation')}
          className={screen === 'transformation' ? 'active' : ''}
          disabled={!pythonSolution}
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
          <TransformationScreen
            pythonSolution={pythonSolution}
            taskData={taskData}
            onApprove={handleApprove}
          />
        ) : (
          <ExecutionScreen code={approvedCode} taskData={taskData} />
        )}
      </main>
    </div>
  )
}

export default App
