import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Layout from './Layout';
import JobBoard from './JobBoard';
import NotMatch from './NotMatch';
import './App.scss';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route index element={<JobBoard />} />
        <Route path="/job-board" element={<JobBoard />} />
        <Route path="*" element={<NotMatch />} />
      </Route>
    </Routes>
  );
};

export default App;