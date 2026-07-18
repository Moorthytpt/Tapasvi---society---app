import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.setState({ info }); }
  render() {
    if (this.state.error) {
      return React.createElement('div', { style: { padding: 24, fontFamily: 'Arial', background: '#FEF2F2', minHeight: '100vh' } },
        React.createElement('h2', { style: { color: '#DC2626' } }, 'TAPASVI App Error'),
        React.createElement('pre', { style: { background: '#fff', padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', overflow: 'auto' } },
          String(this.state.error) + '\n\n' + (this.state.info?.componentStack || '')
        ),
        React.createElement('button', {
          onClick: () => window.location.reload(),
          style: { marginTop: 16, padding: '8px 20px', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }
        }, 'Reload App')
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(App)
  )
);
