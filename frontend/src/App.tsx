import './App.css';
import { BotSettings } from './components/BotSettings';
import { EditConfig } from './components/EditConfig';
import { Header } from './components/Header';
import { Logs } from './components/LogsDisplay';
import { TestChat } from './components/TestChat';

function App() {
  return (
    <>
      <Header />
      <div className="container">
        <div className="top-panels">
          <div className="panel">
            <BotSettings />
          </div>
          <div className="panel">
            <TestChat />
          </div>
        </div>
        <Logs />
        <EditConfig />
      </div>
    </>
  );
}

export default App;
