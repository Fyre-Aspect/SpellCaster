import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("SpellCaster crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="overlay crash-overlay">
        <div className="result-card crash-card">
          <h2 className="result-title lose">KAPOW!</h2>
          <p className="crash-text">
            Something broke mid-spell. Reload to get back to the race.
          </p>
          <button
            type="button"
            className="btn btn-big"
            autoFocus
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
