import { useState, useEffect, useRef } from 'react'
import TransformationScreen from './components/TransformationScreen'
import ExecutionScreen from './components/ExecutionScreen'
import PublishScreen from './components/PublishScreen'
import LibraryScreen from './components/LibraryScreen'
import ReasoningScreen from './components/ReasoningScreen'
import { getArcPythonUrlPatterns, getArcJsonUrl } from './constants'
import './index.css'

// @ts-ignore
import v2SetRaw from '../data/v2_public_evaluation_set.json.txt?raw'

const v2Set: string[] = JSON.parse(v2SetRaw).sort()

function App() {
  const [mainTab, setMainTab] = useState<'training' | 'library' | 'reasoning'>('training')
  const [screen, setScreen] = useState<'transformation' | 'execution' | 'publish'>('transformation')
  const [refactoredCode, setRefactoredCode] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('00576224')
  const [pythonSolution, setPythonSolution] = useState<string>('')
  const [taskData, setTaskData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ pythonUrls: string[], jsonUrl: string } | null>(null)
  const [testsPassed, setTestsPassed] = useState<boolean>(false)
  const [failedPuzzles, setFailedPuzzles] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const searchTerm = taskId.trim()
  let filteredPuzzles = v2Set

  if (searchTerm) {
    try {
      const pattern = searchTerm.startsWith('^') ? searchTerm : `^${searchTerm}`
      const regex = new RegExp(pattern, 'i')
      filteredPuzzles = v2Set.filter(id => regex.test(id))
    } catch (e) {
      const lowerSearch = searchTerm.toLowerCase()
      filteredPuzzles = v2Set.filter(id => id.toLowerCase().startsWith(lowerSearch))
    }
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
          Training Data
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
              <div className="puzzle-selector-container" ref={containerRef}>
                <input
                  type="text"
                  value={taskId}
                  onChange={(e) => {
                    setTaskId(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadTask(taskId)
                      setShowDropdown(false)
                    } else if (e.key === 'Escape') {
                      setShowDropdown(false)
                    }
                  }}
                  placeholder="Enter Task ID (e.g. 00576224)"
                />

                {showDropdown && (
                  <ul className="puzzle-dropdown-list">
                    {filteredPuzzles.length > 0 ? (
                      filteredPuzzles.map((id) => {
                        const isSolved = !!savedSolutions[id]
                        const isFailed = failedPuzzles.has(id)
                        return (
                          <li
                            key={id}
                            className={`puzzle-dropdown-item ${id === taskId ? 'selected' : ''}`}
                            onClick={() => {
                              setTaskId(id)
                              loadTask(id)
                              setShowDropdown(false)
                            }}
                          >
                            <span className="puzzle-id-text">{id}</span>
                            <div className="puzzle-status-icons">
                              {isSolved && (
                                <span className="status-icon solved-icon" title="Solved">✓</span>
                              )}
                              {isFailed && (
                                <span className="status-icon failed-icon" title="Failed to load">✗</span>
                              )}
                            </div>
                          </li>
                        )
                      })
                    ) : (
                      <li className="puzzle-dropdown-no-matches">No matching puzzles</li>
                    )}
                  </ul>
                )}
              </div>

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
        </>
      ) : mainTab === 'library' ? (
        <LibraryScreen />
      ) : (
        <ReasoningScreen />
      )}
    </div>
  )
}

export default App
