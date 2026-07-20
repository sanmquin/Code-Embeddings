import { useState, useEffect } from 'react'
import TransformationScreen from './components/TransformationScreen'
import ExecutionScreen from './components/ExecutionScreen'
import PublishScreen from './components/PublishScreen'
import LibraryScreen from './components/LibraryScreen'
import ReasoningScreen from './components/ReasoningScreen'
import ClusterVisualizationScreen from './components/ClusterVisualizationScreen'
import BatchDocScreen from './components/BatchDocScreen'
import PuzzleSelector from './components/PuzzleSelector'
import { getArcPythonUrlPatterns, getArcJsonUrl } from './constants'
import './index.css'

// @ts-ignore
import v2SetRaw from '../data/v2_public_training_set.json.txt?raw'

const v2Set: string[] = JSON.parse(v2SetRaw).sort()

function App() {
  const [mainTab, setMainTab] = useState<'training' | 'library' | 'reasoning' | 'cluster_visualization'>('training')
  const [screen, setScreen] = useState<'transformation' | 'execution' | 'publish'>('transformation')
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false)
  const [refactoredCode, setRefactoredCode] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('00576224')
  const [pythonSolution, setPythonSolution] = useState<string>('')
  const [taskData, setTaskData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ pythonUrls: string[], jsonUrl: string } | null>(null)
  const [testsPassed, setTestsPassed] = useState<boolean>(false)
  const [failedPuzzles, setFailedPuzzles] = useState<Set<string>>(new Set())

  // Reasoning-specific shared state
  const [reasoningTaskId, setReasoningTaskId] = useState<string>('00576224')
  const [reasoningDefaultMode, setReasoningDefaultMode] = useState<'solver' | 'visualization'>('solver')

  const navigateToReasoning = (puzzleId: string) => {
    setReasoningTaskId(puzzleId)
    setReasoningDefaultMode('solver')
    setMainTab('reasoning')
  }

  const [savedSolutions, setSavedSolutions] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('arc_solutions')
    try {
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      console.error('Failed to parse saved solutions:', e)
      return {}
    }
  })

  const [documentedPuzzles, setDocumentedPuzzles] = useState<string[]>(() => {
    const saved = localStorage.getItem('arc_documented')
    try {
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('Failed to parse documented puzzles:', e)
      return []
    }
  })

  const loadTask = async (id: string) => {
    setIsLoading(true)
    setError(null)
    setRefactoredCode(savedSolutions[id] || '')
    setTestsPassed(false)
    setScreen('transformation')

    const pythonUrlPatterns = getArcPythonUrlPatterns(id)
    const jsonUrl = getArcJsonUrl(id)
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
      setFailedPuzzles(prev => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err: any) {
      setError(err.message)
      setPythonSolution('')
      // Don't necessarily clear taskData if JSON was loaded but Python failed,
      // but the app needs both to proceed anyway.
      setTaskData(null)
      setFailedPuzzles(prev => {
        if (prev.has(id)) return prev
        const next = new Set(prev)
        next.add(id)
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (newCode: string) => {
    setRefactoredCode(newCode)
    setTestsPassed(false)
    const updated = { ...savedSolutions, [taskId]: newCode }
    setSavedSolutions(updated)
    localStorage.setItem('arc_solutions', JSON.stringify(updated))
  }

  useEffect(() => {
    loadTask(taskId)
  }, [])

  return (
    <div className="app">
      <nav className="main-nav">
        <button
          onClick={() => setMainTab('training')}
          className={mainTab === 'training' ? 'active' : ''}
        >
          Training
        </button>
        <button
          onClick={() => setMainTab('cluster_visualization')}
          className={mainTab === 'cluster_visualization' ? 'active' : ''}
        >
          Clusters
        </button>
        <button
          onClick={() => setMainTab('reasoning')}
          className={mainTab === 'reasoning' ? 'active' : ''}
        >
          Reasoning
        </button>
        <button
          onClick={() => setMainTab('library')}
          className={mainTab === 'library' ? 'active' : ''}
        >
          Library
        </button>
      </nav>

      {mainTab === 'training' ? (
        <>
          <header>
            <h1>Code-Embeddings</h1>
            <p>Transforming ARC solutions into modular, reusable functions.</p>

            <div className="task-loader">
              <PuzzleSelector
                taskId={taskId}
                onChangeTaskId={setTaskId}
                onSelectTaskId={loadTask}
                savedSolutions={savedSolutions}
                documentedPuzzles={documentedPuzzles}
                failedPuzzles={failedPuzzles}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={isBatchMode}
                    onChange={(e) => setIsBatchMode(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '0.95rem', color: isBatchMode ? '#0074D9' : '#aaa' }}>
                    Batch Python Documentation
                  </strong>
                </label>
              </div>
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

          {isBatchMode ? (
            <main>
              <BatchDocScreen
                startTaskId={taskId}
                v2Set={v2Set}
                getArcPythonUrlPatterns={getArcPythonUrlPatterns}
                onPuzzleDocumented={(id) => {
                  setDocumentedPuzzles(prev => {
                    if (prev.includes(id)) return prev;
                    return [...prev, id];
                  });
                }}
              />
            </main>
          ) : (
            <>
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
            </>
          )}
        </>
      ) : mainTab === 'library' ? (
        <LibraryScreen />
      ) : mainTab === 'reasoning' ? (
        <ReasoningScreen
          initialTaskId={reasoningTaskId}
          initialMode={reasoningDefaultMode}
        />
      ) : (
        <ClusterVisualizationScreen onNavigateToReasoning={navigateToReasoning} />
      )}
    </div>
  )
}

export default App
