import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Dashboard from './Dashboard';
import JobBoard from './JobBoard';
import NotMatch from './NotMatch';
import './App.scss';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />}>
        <Route index element={<Home />} />
        <Route path="job-board" element={<JobBoard />} />
        <Route path="*" element={<NotMatch />} />
      </Route>
    </Routes>
  );
};

export default App;