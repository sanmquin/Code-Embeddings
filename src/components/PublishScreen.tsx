import React, { useState } from 'react';
import { GITHUB_OWNER, GITHUB_REPO } from '../constants';

interface PublishScreenProps {
  taskId: string;
  code: string;
}

const PublishScreen: React.FC<PublishScreenProps> = ({ taskId, code }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setPrUrl(null);
    setStatus('Initializing publishing process...');

    try {
      setStatus('Sending data to GitHub...');
      const response = await fetch('/.netlify/functions/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, code })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish solution');
      }

      setPrUrl(result.prUrl);
      setStatus(result.alreadyExisted ? 'Pull Request already exists!' : 'Successfully published!');
    } catch (err: any) {
      setError(err.message);
      setStatus('Failed to publish.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="publish-screen">
      <h3>3. Publish to GitHub</h3>
      <p>
        Your refactored solution has passed all tests. You can now publish it to the
        <code>{GITHUB_OWNER}/{GITHUB_REPO}</code> repository by creating a Pull Request.
      </p>

      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #444',
        margin: '20px 0'
      }}>
        <h4>Publishing Details:</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><strong>Branch:</strong> <code>feat/solution-{taskId}</code></li>
          <li><strong>File:</strong> <code>solutions/{taskId}.js</code></li>
        </ul>

        {status && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: isPublishing ? '#333' : (error ? '#442222' : '#224422'),
            borderRadius: '4px'
          }}>
            {status}
          </div>
        )}

        {prUrl && (
          <div style={{ marginTop: '20px' }}>
            <strong>Pull Request created:</strong><br />
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                padding: '10px 20px',
                backgroundColor: '#238636',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}
            >
              View Pull Request on GitHub
            </a>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', color: '#f44336' }}>
            <strong>Error:</strong> {error}
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              Make sure <code>GITHUB_TOKEN</code> is correctly configured in your environment.
              See <code>GITHUB_SETUP.md</code> for instructions.
            </p>
          </div>
        )}

        {!prUrl && (
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            style={{
              marginTop: '20px',
              backgroundColor: isPublishing ? '#555' : '#2196F3',
              color: 'white'
            }}
          >
            {isPublishing ? 'Publishing...' : 'Create Pull Request'}
          </button>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h4>Code to be published:</h4>
        <pre style={{ maxHeight: '300px', overflow: 'auto' }}>{code}</pre>
      </div>
    </div>
  );
};

export default PublishScreen;
