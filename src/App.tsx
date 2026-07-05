import { useState, useEffect } from 'react'
import TransformationScreen from './components/TransformationScreen'
import ExecutionScreen from './components/ExecutionScreen'
import PublishScreen from './components/PublishScreen'
import './index.css'

function App() {
  const [screen, setScreen] = useState<'transformation' | 'execution' | 'publish'>('transformation')
  const [refactoredCode, setRefactoredCode] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('00576224')
  const [pythonSolution, setPythonSolution] = useState<string>('')
  const [taskData, setTaskData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ pythonUrls: string[], jsonUrl: string } | null>(null)
  const [testsPassed, setTestsPassed] = useState<boolean>(false)
  const [savedSolutions, setSavedSolutions] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('arc_solutions')
    try {
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      console.error('Failed to parse saved solutions:', e)
      return {}
    }
  })

  const loadTask = async (id: string) => {
    setIsLoading(true)
    setError(null)
    setRefactoredCode(savedSolutions[id] || '')
    setTestsPassed(false)
    setScreen('transformation')

    const pythonUrlPatterns = [
      `https://raw.githubusercontent.com/sanmquin/ARC/refs/heads/main/solves/${id}/solver.py`,
      `https://raw.githubusercontent.com/sanmquin/ARC/refs/heads/main/solves/${id}/solve.py`,
      `https://raw.githubusercontent.com/sanmquin/ARC/refs/heads/main/solves/${id}.py`
    ]
    const jsonUrl = `https://raw.githubusercontent.com/sanmquin/ARC/refs/heads/main/dataset/tasks/${id}.json`
    setDebugInfo({ pythonUrls: pythonUrlPatterns, jsonUrl })

    try {
      // Fetch JSON first as it's more likely to exist
      const jsonRes = await fetch(jsonUrl)
      if (!jsonRes.ok) {
        throw new Error(`Failed to load Task JSON: ${jsonRes.status} ${jsonRes.statusText}. URL: ${jsonUrl}`)
      }
      const taskJson = await jsonRes.json()
      setTaskData(taskJson)

      // Try Python patterns sequentially
      let pythonCode = ''
      let lastError = ''
      let success = false

      for (const url of pythonUrlPatterns) {
        try {
          const pyRes = await fetch(url)
          if (pyRes.ok) {
            pythonCode = await pyRes.text()
            success = true
            break
          } else {
            lastError = `Failed to load Python solution from ${url}: ${pyRes.status} ${pyRes.statusText}`
          }
        } catch (e: any) {
          lastError = `Error fetching ${url}: ${e.message}`
        }
      }

      if (!success) {
        throw new Error(lastError || 'Could not find a Python solution for this task.')
      }

      setPythonSolution(pythonCode)
    } catch (err: any) {
      setError(err.message)
      setPythonSolution('')
      // Don't necessarily clear taskData if JSON was loaded but Python failed,
      // but the app needs both to proceed anyway.
      setTaskData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (newCode: string) => {
    setRefactoredCode(newCode)
    const updated = { ...savedSolutions, [taskId]: newCode }
    setSavedSolutions(updated)
    localStorage.setItem('arc_solutions', JSON.stringify(updated))
  }

  useEffect(() => {
    loadTask(taskId)
  }, [])

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
            onKeyDown={(e) => e.key === 'Enter' && loadTask(taskId)}
            placeholder="Enter Task ID (e.g. 00576224)"
          />
          <button onClick={() => loadTask(taskId)} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Puzzle'}
          </button>

          {Object.keys(savedSolutions).length > 0 && (
            <select
              className="stored-solutions-select"
              value={savedSolutions[taskId] ? taskId : ""}
              onChange={(e) => {
                const id = e.target.value;
                setTaskId(id);
                loadTask(id);
              }}
            >
              <option value="" disabled>Stored Solutions</option>
              {Object.keys(savedSolutions).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          )}
        </div>
        {error && (
          <div className="error-container">
            <div className="error-message">{error}</div>
            {debugInfo && (
              <div className="debug-info">
                <p><strong>Debug Info:</strong></p>
                <div>
                  <p>Attempted Python URLs:</p>
                  <ul>
                    {debugInfo.pythonUrls.map(url => (
                      <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <p>Attempted JSON URL:</p>
                  <ul>
                    <li><a href={debugInfo.jsonUrl} target="_blank" rel="noreferrer">{debugInfo.jsonUrl}</a></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
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
          disabled={!refactoredCode}
          className={screen === 'execution' ? 'active' : ''}
        >
          2. Execute & Verify
        </button>
        <button
          onClick={() => setScreen('publish')}
          disabled={!testsPassed}
          className={screen === 'publish' ? 'active' : ''}
        >
          3. Publish to GitHub
        </button>
      </nav>

      <main>
        {screen === 'transformation' ? (
          <TransformationScreen
            pythonSolution={pythonSolution}
            taskData={taskData}
            refactoredCode={refactoredCode}
            onCodeChange={handleCodeChange}
          />
        ) : screen === 'execution' ? (
          <ExecutionScreen
            code={refactoredCode}
            taskData={taskData}
            onTestsPassed={setTestsPassed}
          />
        ) : (
          <PublishScreen taskId={taskId} code={refactoredCode} />
        )}
      </main>
    </div>
  )
}

export default App
