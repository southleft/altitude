import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import JobBoard from './components/JobBoard';
import './App.scss';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route index element={<JobBoard />} />
        <Route path="*" element={<JobBoard />} />
      </Route>
    </Routes>
  );
};

export default App;