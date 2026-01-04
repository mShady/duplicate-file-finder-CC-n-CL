import { useStore } from './store/useStore';
import { HomeView } from './components/HomeView';
import { ScanningView } from './components/ScanningView';
import { ResultsView } from './components/ResultsView';

function App() {
  const { currentView } = useStore();

  switch (currentView) {
    case 'scanning':
      return <ScanningView />;
    case 'results':
      return <ResultsView />;
    default:
      return <HomeView />;
  }
}

export default App;
