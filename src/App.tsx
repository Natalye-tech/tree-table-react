import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import  ParentPage from './views/ParentPage/ParentPageServer';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ParentPage />} />
      </Routes>
    </Router>
  );
}

export default App;