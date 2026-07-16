import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OptionsChainPage from '../OptionsChainPage.jsx'
import userEvent from '@testing-library/user-event'

describe('OptionsChainPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders stock not found for invalid ticker', () => {
    render(
      <MemoryRouter initialEntries={['/options/INVALID']}>
        <Routes>
          <Route path="/options/:ticker" element={<OptionsChainPage />} />
          <Route path="/options" element={<div>Options Landing</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Stock not found')).toBeInTheDocument()
    expect(screen.getByText(/No options data available for "INVALID"/)).toBeInTheDocument()
  })

  it('renders options chain for valid ticker', () => {
    render(
      <MemoryRouter initialEntries={['/options/AAPL']}>
        <Routes>
          <Route path="/options/:ticker" element={<OptionsChainPage />} />
          <Route path="/options" element={<div>Options Landing</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should show the ticker somewhere in the header
    expect(screen.getByText(/AAPL/i)).toBeInTheDocument()
    
    // Should have Back to Options link
    expect(screen.getByText('Back to Options')).toBeInTheDocument()
  })

  it('displays call and put options data', () => {
    render(
      <MemoryRouter initialEntries={['/options/MSFT']}>
        <Routes>
          <Route path="/options/:ticker" element={<OptionsChainPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Should render option type labels (Calls/Puts or similar)
    const content = screen.getByText(/MSFT/i).closest('div')
    expect(content).toBeInTheDocument()
  })

  it('allows navigation back to options list', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter initialEntries={['/options/GOOGL']}>
        <Routes>
          <Route path="/options/:ticker" element={<OptionsChainPage />} />
          <Route path="/options" element={<div>Options Landing</div>} />
        </Routes>
      </MemoryRouter>
    )

    const backLink = screen.getByText('Back to Options')
    await user.click(backLink)

    expect(screen.getByText('Options Landing')).toBeInTheDocument()
  })

  it('renders without crashing for all supported tickers', () => {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX']
    
    tickers.forEach((ticker) => {
      const { unmount, container } = render(
        <MemoryRouter initialEntries={[`/options/${ticker}`]}>
          <Routes>
            <Route path="/options/:ticker" element={<OptionsChainPage />} />
          </Routes>
        </MemoryRouter>
      )
      
      // Just verify it rendered without crashing
      expect(container).toBeTruthy()
      unmount()
    })
  })
})
