import ReactDOM from 'react-dom/client';
import JobBoard from './components/JobBoard';
import 'al-web-components/dist/css/head.css';

function App() {
  return (
    <div>
      <JobBoard>
        <h1>JobBoard</h1>
      </JobBoard>
    </div>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);