import ReactDOM from 'react-dom/client';
import { ALButton } from 'al-react/dist/src';
import 'al-web-components/dist/css/head.css';

function App() {
  console.log("BUTTON: ", ALButton)
  return (
    <div>
      <h1>Hello, React!</h1>
      <ALButton>Button</ALButton>
    </div>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);