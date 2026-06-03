import { useFishStore } from './store/fishStore';
import { Topbar } from './components/Topbar';
import { ConfigureScreen } from './components/configure/ConfigureScreen';
import { SimulateScreen } from './components/simulate/SimulateScreen';
import { DecideScreen } from './components/decide/DecideScreen';

export default function App() {
  const phase = useFishStore(s => s.phase);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--ink-900)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Topbar />
      {phase === 'configure' && <ConfigureScreen />}
      {phase === 'simulate' && <SimulateScreen />}
      {phase === 'decide'    && <DecideScreen />}
    </div>
  );
}
