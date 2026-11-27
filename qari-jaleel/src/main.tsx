import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HeadLab } from './components/HeadLab';
import { CousinLab } from './components/CousinLab';
import { LineupLab } from './components/LineupLab';
import { EndlessScoreEntry } from './components/Leaderboard';
import { WEB_BOARD } from './config';
import { registerServiceWorker } from './utils/pwa';
import './index.css';

registerServiceWorker();

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
// Debug: ?formtest sends a test score to the Google Form the plain way, in a new tab, so you can read Google's reply
const formTest = params.has('formtest') ? (
  <div className="flex min-h-screen items-center justify-center bg-[#141210] p-4 text-[#F8F4EC]">
    <form action={WEB_BOARD.formUrl} method="POST" target="_blank" className="w-full max-w-md space-y-3">
      <div className="text-lg font-black">Form test</div>
      <div className="text-sm text-[#B6AA9A]">Tap the button. A new tab opens with Google&apos;s reply. Tell Claude what it says.</div>
      <input type="hidden" name={WEB_BOARD.entryNick} value="TESTER" />
      <input type="hidden" name={WEB_BOARD.entryFighter} value="Fady" />
      <input type="hidden" name={WEB_BOARD.entryScore} value="777" />
      <input type="hidden" name={WEB_BOARD.entryWave} value="2" />
      <button type="submit" className="w-full bg-[#F59E0B] px-4 py-3 font-black text-[#141210] uppercase">Send test score</button>
      <div className="break-all text-[10px] text-[#8A7F70]">{WEB_BOARD.formUrl}</div>
    </form>
  </div>
) : null;
createRoot(document.getElementById('root')!).render(lbTest ?? formTest ?? (showLab ? <HeadLab /> : params.has('cousinlab') ? <CousinLab /> : params.has('lineup') ? <LineupLab /> : <App />));
