/**
 * main.jsx - The entry point of our React app
 * 
 * What this does:
 * 1. Imports React
 * 2. Finds the <div id="root"> in index.html
 * 3. Renders our App component inside it
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Find the root element and render our app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
