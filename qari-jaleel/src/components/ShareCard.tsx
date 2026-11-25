import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { makeShareCard, shareCardImage, type ShareCardInput } from '../utils/shareCard';

/** Preview of the funny result picture, with Share (phone share sheet) and Download. */
export function ShareCardModal({ input, onClose }: { input: ShareCardInput; onClose: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    let alive = true;
    makeShareCard(input).then((url) => alive && setImg(url));
    try {
      setCanShare(typeof navigator.share === 'function');
    } catch {
      setCanShare(false);
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const text = input.endless ? `I reached wave ${input.wave} with ${input.score.toLocaleString()} points in Mafia Bhaiyas!` : `Mafia Bhaiyas: ${input.score.toLocaleString()} points!`;
  return (
    <div className="safe-inset fixed inset-0 z-[55] flex overflow-y-auto bg-[#0B0907]/95 p-3 short:p-2" onClick={onClose}>
      <div className="m-auto w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display text-xl font-black tracking-wider text-[#FCD34D] uppercase">Share your score</div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#B6AA9A] hover:text-[#F8F4EC]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {img ? (
          <img src={img} alt="Your Mafia Bhaiyas result" className="w-full rounded-lg border-2 border-[#F59E0B]/60" />
        ) : (
          <div className="flex aspect-[1200/630] items-center justify-center rounded-lg border border-[#F8F4EC]/15 text-sm text-[#B6AA9A]">Drawing...</div>
        )}
        <div className="mt-2 flex gap-2 short:mt-1">
          {canShare && (
            <button
              type="button"
              disabled={!img}
              onClick={() => img && void shareCardImage(img, text)}
              className="flex flex-1 items-center justify-center gap-2 bg-[#F59E0B] py-2.5 text-sm font-black text-[#141210] uppercase disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          )}
          {img && (
            <a
              href={img}
              download="mafia-bhaiyas-score.png"
              className="flex flex-1 items-center justify-center gap-2 border border-[#F8F4EC]/25 bg-[#26211D] py-2.5 text-sm font-bold text-[#F8F4EC] uppercase"
            >
              <Download className="h-4 w-4" /> Save
            </a>
          )}
        </div>
        <div className="mt-1.5 text-center text-[11px] text-[#B6AA9A]">Tip: if Save does nothing, press and hold the picture to save it.</div>
      </div>
    </div>
  );
}
