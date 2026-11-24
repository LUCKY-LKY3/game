import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HeadLab } from './components/HeadLab';
import { EndlessScoreEntry } from './components/Leaderboard';
import './index.css';

const showLab = new URLSearchParams(window.location.search).has('headlab');
const params = new URLSearchParams(window.location.search);
// Debug: ?lbtest&score=12345 shows the Endless score-entry form on its own
const lbTest = params.has('lbtest') ? (
  <div className="flex min-h-screen items-center justify-center bg-[#141210] p-4">
    <div className="w-full max-w-md">
      <EndlessScoreEntry score={Number(params.get('score') ?? 12345)} wave={7} fighterName="Sultan 'Chet' Rathore" />
    </div>
  </div>
) : null;
createRoot(document.getElementById('root')!).render(lbTest ?? (showLab ? <HeadLab /> : <App />));
