import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Download,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import {
  FaceCrop,
  FighterArchetype,
  FighterProfile,
  FightingStyle,
  HeadgearType,
  LowerOutfitStyle,
  PortraitFilterStyle,
} from '../types/game';
import {
  ARCHETYPE_INFO,
  FIGHTING_STYLES,
  generateVillagePersona,
  resolveFighterStyle,
  resolveLowerOutfitStyle,
} from '../data/roster';
import {
  buildFaceTextureFromImage,
  buildStylizedStarterFaceTexture,
  generateStylizedPortrait,
} from '../utils/portraitStylizer';
import { exportFighterCardJson } from '../utils/storage';
import { FighterPreview3D } from './FighterPreview3D';

interface FighterStudioProps {
  editingFighter: FighterProfile | null;
  onSave: (fighter: FighterProfile) => Promise<void>;
  onCancel: () => void;
}

const SKIN_SWATCHES = ['#F0C4A0', '#DFA477', '#C68452', '#A66137', '#7F4423', '#5C2F18'];
const VEST_SWATCHES = ['#D97706', '#991B1B', '#312E81', '#0F766E', '#15803D', '#3F3F46'];
const PANTS_SWATCHES = ['#292524', '#1E1B4B', '#7F1D1D', '#1F2937', '#422006', '#14532D'];
const WRAP_SWATCHES = ['#F8F4EC', '#F59E0B', '#DC2626', '#14B8A6', '#18181B'];

const HEADGEAR_OPTIONS: { id: HeadgearType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'headband', label: 'Headband' },
  { id: 'turban', label: 'Turban' },
  { id: 'sunglasses', label: 'Aviators' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'tilak', label: 'Tilak' },
];

const LOWER_OUTFIT_OPTIONS: { id: LowerOutfitStyle; label: string }[] = [
  { id: 'rolled_trousers', label: 'Rolled Trousers' },
  { id: 'pathani_salwar', label: 'Pathani Salwar' },
  { id: 'split_dhoti', label: 'Split Dhoti' },
];

const PORTRAIT_STYLES: { id: PortraitFilterStyle; label: string }[] = [
  { id: 'gouache', label: 'Akhara Gouache' },
  { id: 'arcade_ink', label: 'Arcade Ink' },
  { id: 'mela_poster', label: 'Mela Poster' },
  { id: 'natural', label: 'Natural Crisp' },
];

export function FighterStudio({ editingFighter, onSave, onCancel }: FighterStudioProps) {
  const [name, setName] = useState(editingFighter?.name ?? '');
  const [nickname, setNickname] = useState(editingFighter?.nickname ?? 'Chai Cyclone');
  const [archetype, setArchetype] = useState<FighterArchetype>(
    editingFighter?.archetype ?? 'striker'
  );
  const [fightingStyle, setFightingStyle] = useState<FightingStyle>(
    editingFighter ? resolveFighterStyle(editingFighter) : 'bollywood_hero'
  );
  const [specialMoveName, setSpecialMoveName] = useState(
    editingFighter?.specialMoveName ?? ARCHETYPE_INFO.striker.defaultSpecial
  );
  const [taunt, setTaunt] = useState(
    editingFighter?.taunt ?? 'Step into the akhara—let us see what you have got!'
  );

  const [skinTone, setSkinTone] = useState(editingFighter?.appearance.skinTone ?? '#C68452');
  const [vestColor, setVestColor] = useState(editingFighter?.appearance.vestColor ?? '#D97706');
  const [pantsColor, setPantsColor] = useState(editingFighter?.appearance.pantsColor ?? '#292524');
  const [wrapColor, setWrapColor] = useState(editingFighter?.appearance.wrapColor ?? '#F8F4EC');
  const [hairColor, setHairColor] = useState(editingFighter?.appearance.hairColor ?? '#181412');
  const [headgear, setHeadgear] = useState<HeadgearType>(
    editingFighter?.appearance.headgear ?? 'headband'
  );
  const [buildScale, setBuildScale] = useState(editingFighter?.appearance.buildScale ?? 1.0);
  const [bald, setBald] = useState(Boolean(editingFighter?.appearance.bald));
  const [lowerOutfitStyle, setLowerOutfitStyle] = useState<LowerOutfitStyle>(
    editingFighter ? resolveLowerOutfitStyle(editingFighter.appearance) : 'rolled_trousers'
  );
  const [hasAxe, setHasAxe] = useState(Boolean(editingFighter?.appearance.hasAxe));
  const [previewCamRequest, setPreviewCamRequest] = useState<
    { mode: 'face' | 'body'; seq: number } | undefined
  >(undefined);

  const [stats, setStats] = useState(
    editingFighter?.stats ?? { ...ARCHETYPE_INFO.striker.baseStats }
  );

  const [portraitStyle, setPortraitStyle] = useState<PortraitFilterStyle>('gouache');
  const [uploadedImg, setUploadedImg] = useState<HTMLImageElement | null>(null);
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string | undefined>(editingFighter?.rawPhotoUrl);
  const [crop, setCrop] = useState<FaceCrop>({ offsetX: 0, offsetY: 0, zoom: 1.25 });
  const [portraitUrl, setPortraitUrl] = useState(editingFighter?.portraitUrl ?? '');
  const [faceTextureUrl, setFaceTextureUrl] = useState<string | undefined>(
    editingFighter?.faceTextureUrl ??
      (editingFighter?.portraitUrl
        ? undefined
        : buildStylizedStarterFaceTexture({ skinTone: '#C68452', hairColor: '#181412' }))
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Re-render face texture & stylized arcade portrait whenever photo, crop, style, or colors change
  useEffect(() => {
    if (!uploadedImg) {
      if (!editingFighter?.faceTextureUrl && !editingFighter?.portraitUrl) {
        setFaceTextureUrl(
          buildStylizedStarterFaceTexture({
            skinTone,
            hairColor,
            hasTilak: headgear === 'tilak',
          })
        );
      }
      return;
    }

    const faceTex = buildFaceTextureFromImage(uploadedImg, crop, skinTone, { hairColor, bald });
    const cardPortrait = generateStylizedPortrait(
      uploadedImg,
      crop,
      portraitStyle,
      vestColor,
      '#F59E0B',
      headgear
    );
    setFaceTextureUrl(faceTex);
    setPortraitUrl(cardPortrait);
  }, [uploadedImg, crop, skinTone, hairColor, bald, portraitStyle, vestColor, headgear, editingFighter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose a JPG, PNG, or WebP photo.');
      return;
    }
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Store a clean, resized copy of the uploaded photo for MediaPipe 478-landmark 3D head mapping
        const maxDim = 512;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const c = document.createElement('canvas');
        c.width = Math.max(64, Math.round((img.naturalWidth || maxDim) * scale));
        c.height = Math.max(64, Math.round((img.naturalHeight || maxDim) * scale));
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, c.width, c.height);
          setRawPhotoUrl(c.toDataURL('image/jpeg', 0.92));
        } else {
          setRawPhotoUrl(String(reader.result));
        }
        setUploadedImg(img);
        setCrop({ offsetX: 0, offsetY: 0, zoom: 1.2 });
      };
      img.onerror = () => setErrorMsg('Could not read that image file. Try another photo.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleArchetypeSelect = (next: FighterArchetype) => {
    setArchetype(next);
    setStats({ ...ARCHETYPE_INFO[next].baseStats });
    if (!editingFighter) {
      setSpecialMoveName(ARCHETYPE_INFO[next].defaultSpecial);
    }
  };

  const handleRandomPersona = () => {
    const p = generateVillagePersona(archetype);
    setNickname(p.nickname);
    setSpecialMoveName(p.specialMoveName);
    setTaunt(p.taunt);
  };

  const previewProfile: FighterProfile = useMemo(
    () => ({
      id: editingFighter?.id ?? `custom_${Date.now()}`,
      name: name.trim() || 'Village Fighter',
      nickname: nickname.trim() || 'Akhara Challenger',
      isCustom: true,
      archetype,
      fightingStyle,
      portraitUrl,
      rawPhotoUrl,
      faceTextureUrl,
      portraitFaceRect: uploadedImg ? undefined : editingFighter?.portraitFaceRect,
      appearance: {
        skinTone,
        vestColor,
        pantsColor,
        wrapColor,
        hairColor,
        headgear,
        buildScale,
        bald,
        lowerOutfitStyle,
        plaidLungi: lowerOutfitStyle === 'split_dhoti',
        hasAxe,
      },
      stats,
      specialMoveName: specialMoveName.trim() || 'Village Cyclone Strike',
      taunt: taunt.trim() || 'See you in the red clay!',
      wins: editingFighter?.wins ?? 0,
      createdAt: editingFighter?.createdAt ?? Date.now(),
    }),
    [
      editingFighter,
      name,
      nickname,
      archetype,
      fightingStyle,
      portraitUrl,
      rawPhotoUrl,
      faceTextureUrl,
      uploadedImg,
      skinTone,
      vestColor,
      pantsColor,
      wrapColor,
      hairColor,
      headgear,
      buildScale,
      bald,
      lowerOutfitStyle,
      hasAxe,
      stats,
      specialMoveName,
      taunt,
    ]
  );

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Enter a fighter name (yours or a friend’s) before saving.');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      // Ensure non-photo custom fighters still have a crisp portrait card from their face texture
      const finalPortrait = portraitUrl || faceTextureUrl || '';
      await onSave({
        ...previewProfile,
        portraitUrl: finalPortrait,
      });
    } catch {
      setErrorMsg('Could not save fighter locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#141210] text-[#F8F4EC]">
      {/* Clean 3-Zone Top Bar */}
      <header className="flex items-center justify-between gap-6 border-b border-[#F8F4EC]/12 px-4 py-3.5 sm:px-8">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-sm font-medium text-[#B6AA9A] hover:text-[#F8F4EC] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="font-display text-2xl font-black tracking-wide text-[#F8F4EC] sm:text-3xl whitespace-nowrap">
          {editingFighter ? 'Edit Fighter' : 'Import Yourself & Friends'}
        </h1>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#141210] hover:bg-[#D97706] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 sm:px-5 sm:text-sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Fighter'}
        </button>
      </header>

      {/* Main Split Workspace */}
      <div className="akhara-scroll flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
          {/* LEFT COLUMN: Live 3D Fighter Model + Arcade Portrait Card */}
          <div className="flex flex-col gap-4">
            <div className="h-[340px] w-full overflow-hidden border border-[#F8F4EC]/12 sm:h-[400px]">
              <FighterPreview3D
                profile={previewProfile}
                cameraModeRequest={previewCamRequest}
              />
            </div>

            {/* Generated Stylized Arcade Portrait Card Preview */}
            <div className="flex items-center gap-4 border border-[#F8F4EC]/12 bg-[#1D1916] p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden border-2 border-[#F59E0B] bg-[#141210]">
                {previewProfile.portraitUrl || previewProfile.faceTextureUrl ? (
                  <img
                    src={previewProfile.portraitUrl || previewProfile.faceTextureUrl}
                    alt={previewProfile.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl text-[#F59E0B]">
                    {previewProfile.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#F59E0B]">
                  {FIGHTING_STYLES[fightingStyle].label} · {ARCHETYPE_INFO[archetype].label}
                </div>
                <div className="truncate font-display text-3xl font-black leading-tight text-[#F8F4EC]">
                  {previewProfile.name}
                </div>
                <div className="truncate text-xs text-[#B6AA9A]">
                  “{previewProfile.nickname}” · {previewProfile.specialMoveName}
                </div>
                {editingFighter && (
                  <button
                    type="button"
                    onClick={() => exportFighterCardJson(previewProfile)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Friend Card (.json)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Photo Import, Face Framing, Style & Persona Controls */}
          <div className="space-y-6 border border-[#F8F4EC]/12 bg-[#1D1916] p-5 sm:p-6">
            {errorMsg && (
              <div className="border border-[#DC2626]/50 bg-[#DC2626]/15 px-4 py-2.5 text-sm text-[#FCA5A5]">
                {errorMsg}
              </div>
            )}

            {/* STEP 1: PHOTO UPLOAD & INTERACTIVE FACE FRAMER */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#F8F4EC]">
                    01. Upload Photo & Frame Face
                  </h2>
                  <p className="text-xs text-[#B6AA9A]">
                    Maps directly onto your 3D fighter’s head and generates a stylized arcade portrait locally—no API key needed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadedImg ? 'Change Photo' : 'Upload Photo'}
                  </button>
                </div>
              </div>

              {uploadedImg ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
                  {/* Interactive Drag-to-Center Face Framing Viewport */}
                  <div
                    className="touch-control relative mx-auto h-44 w-44 cursor-grab overflow-hidden border border-[#F59E0B]/50 bg-[#141210] active:cursor-grabbing"
                    onPointerDown={(e) => {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDragging(true);
                      dragStartRef.current = {
                        x: e.clientX,
                        y: e.clientY,
                        ox: crop.offsetX,
                        oy: crop.offsetY,
                      };
                    }}
                    onPointerMove={(e) => {
                      if (!dragging || !dragStartRef.current) return;
                      const dx = (e.clientX - dragStartRef.current.x) / 90;
                      const dy = (e.clientY - dragStartRef.current.y) / 90;
                      setCrop((c) => ({
                        ...c,
                        offsetX: Math.max(-1, Math.min(1, dragStartRef.current!.ox + dx)),
                        offsetY: Math.max(-1, Math.min(1, dragStartRef.current!.oy + dy)),
                      }));
                    }}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                  >
                    <img
                      src={faceTextureUrl}
                      alt="Face alignment preview"
                      className="pointer-events-none h-full w-full scale-[1.85] object-cover"
                    />
                    <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-[#F59E0B]/85" />
                    <div className="pointer-events-none absolute bottom-1 inset-x-0 text-center text-[10px] font-medium text-[#F8F4EC] drop-shadow">
                      Drag to align face
                    </div>
                  </div>

                  {/* Zoom & Instant Art Style Filter Controls */}
                  <div className="flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#B6AA9A]">
                        <span>Face Zoom</span>
                        <span className="font-mono-num text-[#F8F4EC]">{crop.zoom.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.7}
                        max={2.6}
                        step={0.05}
                        value={crop.zoom}
                        onChange={(e) =>
                          setCrop((c) => ({ ...c, zoom: parseFloat(e.target.value) }))
                        }
                        className="mt-1.5 w-full accent-[#F59E0B]"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 text-xs text-[#B6AA9A]">Arcade Portrait Art Style</div>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {PORTRAIT_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setPortraitStyle(st.id)}
                            className={`px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                              portraitStyle === st.id
                                ? 'bg-[#F59E0B] text-[#141210]'
                                : 'bg-[#26211D] text-[#B6AA9A] hover:text-[#F8F4EC]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-full items-center justify-center gap-3 border border-dashed border-[#F8F4EC]/25 bg-[#141210]/70 px-4 py-6 text-sm text-[#B6AA9A] hover:border-[#F59E0B] hover:text-[#F8F4EC] transition-colors"
                >
                  <Camera className="h-5 w-5 text-[#F59E0B]" />
                  <span>Click to pick a selfie or friend’s photo (front-facing works best)</span>
                </button>
              )}
            </section>

            {/* STEP 2: IDENTITY & VILLAGE FIGHTING STYLE */}
            <section className="border-t border-[#F8F4EC]/10 pt-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-[#F8F4EC]">
                  02. Fighter Identity & Style
                </h2>
                <button
                  type="button"
                  onClick={handleRandomPersona}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:underline whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Randomize Village Title
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-[#B6AA9A]">Fighter Name</span>
                  <input
                    type="text"
                    maxLength={34}
                    placeholder="e.g. Sultan 'Chet' Rathore"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full border border-[#F8F4EC]/15 bg-[#141210] px-3 py-2 text-sm text-[#F8F4EC] placeholder:text-[#B6AA9A]/50 focus:border-[#F59E0B] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-[#B6AA9A]">Village Nickname</span>
                  <input
                    type="text"
                    maxLength={26}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1 w-full border border-[#F8F4EC]/15 bg-[#141210] px-3 py-2 text-sm text-[#F8F4EC] focus:border-[#F59E0B] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-[#B6AA9A]">Signature Rage Art Move</span>
                  <input
                    type="text"
                    maxLength={32}
                    value={specialMoveName}
                    onChange={(e) => setSpecialMoveName(e.target.value)}
                    className="mt-1 w-full border border-[#F8F4EC]/15 bg-[#141210] px-3 py-2 text-sm text-[#F8F4EC] focus:border-[#F59E0B] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-[#B6AA9A]">Victory Taunt</span>
                  <input
                    type="text"
                    maxLength={90}
                    value={taunt}
                    onChange={(e) => setTaunt(e.target.value)}
                    className="mt-1 w-full border border-[#F8F4EC]/15 bg-[#141210] px-3 py-2 text-sm text-[#F8F4EC] focus:border-[#F59E0B] focus:outline-none"
                  />
                </label>
              </div>

              {/* Fighting Archetype Selector */}
              <div className="mt-4">
                <div className="mb-1.5 text-xs text-[#B6AA9A]">Martial Arts Archetype</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(ARCHETYPE_INFO) as FighterArchetype[]).map((key) => {
                    const info = ARCHETYPE_INFO[key];
                    const active = archetype === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleArchetypeSelect(key)}
                        className={`border p-2.5 text-left transition-colors ${
                          active
                            ? 'border-[#F59E0B] bg-[#2D2318] text-[#F8F4EC]'
                            : 'border-[#F8F4EC]/12 bg-[#141210] text-[#B6AA9A] hover:border-[#F8F4EC]/30'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#F8F4EC]">{info.label}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-[#B6AA9A]">
                          {info.style}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5 Distinct Village Fighting Styles */}
              <div className="mt-4">
                <div className="mb-1.5 text-xs text-[#B6AA9A]">
                  Village Fighting Style (Unique Stance, Moveset &amp; Combos)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(FIGHTING_STYLES) as FightingStyle[]).map((styleKey) => {
                    const st = FIGHTING_STYLES[styleKey];
                    const active = fightingStyle === styleKey;
                    return (
                      <button
                        key={styleKey}
                        type="button"
                        onClick={() => setFightingStyle(styleKey)}
                        style={active ? { borderColor: st.color } : undefined}
                        className={`border p-2.5 text-left transition-colors ${
                          active
                            ? 'bg-[#2A221A] text-[#F8F4EC]'
                            : 'border-[#F8F4EC]/12 bg-[#141210] text-[#B6AA9A] hover:border-[#F8F4EC]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#F8F4EC]">{st.label}</span>
                          <span
                            className="h-2 w-2 shrink-0"
                            style={{ backgroundColor: st.color }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-[#B6AA9A]">
                          {st.description}
                        </div>
                        <div
                          className="mt-1.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: st.color }}
                        >
                          {st.signatureMove}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* STEP 3: OUTFIT, SKIN BLEND & HEADGEAR */}
            <section className="border-t border-[#F8F4EC]/10 pt-5">
              <h2 className="font-display text-2xl font-bold text-[#F8F4EC]">
                03. 3D Body, Attire & Headgear
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs text-[#B6AA9A]">Skin Tone Blend</div>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Skin tone ${c}`}
                        onClick={() => setSkinTone(c)}
                        className={`h-8 w-8 border-2 transition-transform ${
                          skinTone === c ? 'scale-110 border-[#F59E0B]' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-xs text-[#B6AA9A]">Kurta / Vest Color</div>
                  <div className="flex flex-wrap gap-2">
                    {VEST_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Vest color ${c}`}
                        onClick={() => setVestColor(c)}
                        className={`h-8 w-8 border-2 transition-transform ${
                          vestColor === c ? 'scale-110 border-[#F59E0B]' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-xs text-[#B6AA9A]">Dhoti / Pants Color</div>
                  <div className="flex flex-wrap gap-2">
                    {PANTS_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Pants color ${c}`}
                        onClick={() => setPantsColor(c)}
                        className={`h-8 w-8 border-2 transition-transform ${
                          pantsColor === c ? 'scale-110 border-[#F59E0B]' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-xs text-[#B6AA9A]">Hand Wraps Color</div>
                  <div className="flex flex-wrap gap-2">
                    {WRAP_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Wrap color ${c}`}
                        onClick={() => setWrapColor(c)}
                        className={`h-8 w-8 border-2 transition-transform ${
                          wrapColor === c ? 'scale-110 border-[#F59E0B]' : 'border-[#F8F4EC]/20'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs text-[#B6AA9A]">Headwear & Accessory</div>
                  <div className="flex flex-wrap gap-1.5">
                    {HEADGEAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setHeadgear(opt.id)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          headgear === opt.id
                            ? 'bg-[#F59E0B] text-[#141210]'
                            : 'bg-[#26211D] text-[#B6AA9A] hover:text-[#F8F4EC]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-[#B6AA9A]">
                    <span>Fighter Build Size</span>
                    <span className="font-mono-num text-[#F8F4EC]">
                      {buildScale < 0.98
                        ? 'Agile'
                        : buildScale > 1.09
                          ? 'Pehelwan Heavy'
                          : 'Athletic'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.92}
                    max={1.18}
                    step={0.02}
                    value={buildScale}
                    onChange={(e) => setBuildScale(parseFloat(e.target.value))}
                    className="mt-2 w-full accent-[#F59E0B]"
                  />
                </div>
              </div>

              {/* Lower Outfit Style (Rolled Trousers / Pathani Salwar / Split Dhoti) */}
              <div className="mt-4">
                <label className="text-xs font-medium text-[#B6AA9A]">Lower Outfit Style</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {LOWER_OUTFIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLowerOutfitStyle(opt.id);
                        setPreviewCamRequest((prev) => ({
                          mode: 'body',
                          seq: (prev?.seq ?? 0) + 1,
                        }));
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        lowerOutfitStyle === opt.id
                          ? 'bg-[#F59E0B] text-[#141210]'
                          : 'bg-[#26211D] text-[#B6AA9A] hover:text-[#F8F4EC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rebel Squad Style Toggles */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBald((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    bald
                      ? 'bg-[#F59E0B] text-[#141210]'
                      : 'bg-[#26211D] text-[#B6AA9A] hover:text-[#F8F4EC]'
                  }`}
                >
                  {bald ? 'Shaved Head: On' : 'Shaved Head: Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setHasAxe((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    hasAxe
                      ? 'bg-[#F59E0B] text-[#141210]'
                      : 'bg-[#26211D] text-[#B6AA9A] hover:text-[#F8F4EC]'
                  }`}
                >
                  {hasAxe ? 'Battle Axe on Back: On' : 'Battle Axe on Back: Off'}
                </button>
              </div>

              {/* Fighter Stat Tuning */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['power', 'speed', 'reach', 'defense'] as const).map((statKey) => (
                  <div key={statKey} className="bg-[#141210] p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-[#B6AA9A]">{statKey}</span>
                      <span className="font-mono-num font-bold text-[#F59E0B]">
                        {stats[statKey]}/10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={10}
                      step={1}
                      value={stats[statKey]}
                      onChange={(e) =>
                        setStats((prev) => ({ ...prev, [statKey]: parseInt(e.target.value, 10) }))
                      }
                      className="mt-1.5 w-full accent-[#F59E0B]"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
