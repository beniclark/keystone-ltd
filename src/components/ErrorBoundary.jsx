import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)] px-6">
        <div className="max-w-lg w-full rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] p-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
            Something went wrong
          </h1>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            We hit an unexpected error while rendering this page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-5 rounded-xl bg-[var(--color-surface-secondary)] p-4 text-left text-xs text-[var(--color-text-muted)] overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-brand-emerald text-white font-medium hover:opacity-95"
            onClick={this.handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
