import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TxnGraph } from '@akta/txn-graph-web'
import { fixtures, mockDataProvider } from '@akta/txn-graph-fixtures'

function App() {
  const [key, setKey] = useState(fixtures[0].key)
  const [scheme, setScheme] = useState<'auto' | 'dark' | 'light'>('auto')
  const fixture = fixtures.find((f) => f.key === key) ?? fixtures[0]
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        {fixtures.map((f) => (
          <button
            key={f.key}
            onClick={() => setKey(f.key)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid #3b424d',
              background: f.key === key ? '#2a3140' : 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 13,
            }}
          >
            {f.label}
          </button>
        ))}
        <select
          value={scheme}
          onChange={(e) => setScheme(e.target.value as typeof scheme)}
          style={{ marginLeft: 'auto', font: 'inherit', fontSize: 13 }}
        >
          <option value="auto">auto</option>
          <option value="dark">dark</option>
          <option value="light">light</option>
        </select>
      </div>
      <TxnGraph
        key={fixture.key}
        transactions={fixture.transactions}
        dataProvider={mockDataProvider}
        colorScheme={scheme}
        height={720}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
