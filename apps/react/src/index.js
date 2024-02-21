import ReactDOM from 'react-dom/client';
import { SLButton } from 'sl-react/dist/src';
import 'sl-web-components/dist/css/head.css';

function App() {
  console.log("BUTTON: ", SLButton)
  return (
    <div>
      <h1>Hello, React!</h1>
      <SLButton>Button</SLButton>
    </div>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);