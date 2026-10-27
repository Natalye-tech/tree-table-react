import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomeView from './views/Welcome';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomeView />} />
      </Routes>
    </Router>
  );
}

export default App;