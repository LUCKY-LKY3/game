import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HeadLab } from './components/HeadLab';
import './index.css';

const showLab = new URLSearchParams(window.location.search).has('headlab');
createRoot(document.getElementById('root')!).render(showLab ? <HeadLab /> : <App />);
