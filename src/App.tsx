import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import log from 'loglevel';
import FactoryDesigner from './components/FactoryDesigner';

// Set up logging level
log.setLevel(log.levels.INFO);

// Get the basename from the current location
const getBasename = () => {
  // Check if we're running in GitHub Pages (or similar subdirectory deployment)
  const path = window.location.pathname;
  // Extract the first path segment if it exists
  const match = path.match(/^\/([^/]+)/);
  return match ? match[0] : '/';
};

function App() {
  // Dynamically determine the basename
  const basename = getBasename();
  console.log(`Setting up router with basename: ${basename}`);
  
  return (
    <Router basename={basename}>
      <div className="App bg-gray-900 min-h-screen">
        <Routes>
          <Route path="/" element={<FactoryDesigner />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
