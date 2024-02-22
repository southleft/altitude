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
        <Route path="/home" element={<Home />} />
        <Route index element={<JobBoard />} />
        <Route path="*" element={<NotMatch />} />
      </Route>
    </Routes>
  );
};

export default App;