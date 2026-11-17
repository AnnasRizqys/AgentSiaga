import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Gamepad2,
  LogOut,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Avatar, DisasterType } from '../../types';
import { WORLD_FACTS } from '../../constants';
import { Joystick } from './Joystick';
import {
  INFO_BOARDS,
  MISSION_ZONES,
  PLAYER_SPAWN,
  WORLD_BOUNDS,
  type InfoBoard,
  type MissionZone,
  type MoveVector,
  type PlayerPose,
} from './worldConfig';
import { InfoBoard as InfoBoardMesh } from './InfoBoard';
import { KaptenBillboard } from './KaptenBillboard';
import { Player } from './Player';
import { NatureEnvironment } from './NatureEnvironment';
import { ZoneMarker } from './ZoneMarker';
import { WorldLoadingScreen } from './WorldLoadingScreen';

interface World3DProps {
  teamName: string;
  avatar: Avatar | null;
  score: number;
  completedZones: DisasterType[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClassicMode: () => void;
  onStartMission: (zoneId: DisasterType) => void;
  onExit?: () => void;
  playSound?: (type: string) => void;
}

interface WorldSceneProps {
  joystickRef: { current: MoveVector };
  poseRef: { current: PlayerPose };
  avatar: Avatar | null;
  teamName: string;
  completedZones: DisasterType[];
  kaptenMessage: string;
  onNearZone: (zone: MissionZone | null) => void;
  onNearBoard: (board: InfoBoard | null) => void;
}

const WorldScene: React.FC<WorldSceneProps> = ({
  joystickRef,
  poseRef,
  avatar,
  teamName,
  completedZones,
  kaptenMessage,
  onNearZone,
  onNearBoard,
}) => (
  <>
    <Sky distance={180} sunPosition={[60, 32, 45]} turbidity={6} rayleigh={0.55} mieCoefficient={0.005} mieDirectionalG={0.8} />
    <fog attach="fog" args={['#cfe4db', 62, 165]} />

    <hemisphereLight args={['#d8efff', '#3f6b2f', 1.05]} />
    <directionalLight position={[30, 42, 20]} intensity={1.65} color="#fff4df" />
    <directionalLight position={[-22, 20, -16]} intensity={0.35} color="#bfe3ff" />
    <ambientLight intensity={0.22} />

    <NatureEnvironment />

    {MISSION_ZONES.map((zone) => (
      <ZoneMarker key={zone.id} zone={zone} completed={completedZones.includes(zone.id)} />
    ))}

    {INFO_BOARDS.map((board) => (
      <InfoBoardMesh key={board.id} board={board} />
    ))}

    <KaptenBillboard />

    <Player
      joystickRef={joystickRef}
      poseRef={poseRef}
      avatar={avatar}
      teamName={teamName}
      onNearZone={onNearZone}
      onNearBoard={onNearBoard}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Minimap                                                             */
/* ------------------------------------------------------------------ */

const mapX = (x: number) =>
  ((x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * 100;
const mapZ = (z: number) =>
  ((z - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * 100;

const Minimap: React.FC<{
  poseRef: { current: PlayerPose };
  completedZones: DisasterType[];
  nextZone?: MissionZone;
}> = ({ poseRef, completedZones, nextZone }) => {
  const dotRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pose = poseRef.current;
      if (dotRef.current) {
        dotRef.current.style.left = `${mapX(pose.x)}%`;
        dotRef.current.style.top = `${mapZ(pose.z)}%`;
      }
      if (arrowRef.current) {
        arrowRef.current.style.transform = `rotate(${(pose.yaw * 180) / Math.PI + 180}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [poseRef]);

  return (
    <div className="pointer-events-none flex flex-col items-end gap-1.5">
      <div
        className="relative h-24 w-24 overflow-hidden rounded-full border-[3px] border-white/85 bg-emerald-200/90 shadow-xl ring-2 ring-slate-900/10 backdrop-blur-sm sm:h-32 sm:w-32"
        title="Minimap alam"
      >
        {/* Perbukitan & danau */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#d9f99d,#86efac_45%,#4ade80)] opacity-90" />
        <div
          className="absolute h-6 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/45 blur-[1px]"
          style={{ left: `${mapX(23)}%`, top: `${mapZ(16)}%` }}
        />
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/40 blur-[1px]"
          style={{ left: `${mapX(21)}%`, top: `${mapZ(-18)}%` }}
        />
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-800/35 blur-[1px]"
          style={{ left: `${mapX(-22)}%`, top: `${mapZ(7)}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/60" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-white/60" />
        <div className="absolute left-1/2 top-0 h-full w-[44%] -translate-x-1/2 rounded-full border border-white/30" />
        <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[8px] font-black text-emerald-900/70">
          U
        </span>

        {/* Zona misi */}
        {MISSION_ZONES.map((zone) => {
          const done = completedZones.includes(zone.id);
          const isNext = nextZone?.id === zone.id;
          return (
            <div
              key={zone.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mapX(zone.position[0])}%`, top: `${mapZ(zone.position[2])}%` }}
              title={`${zone.name}${done ? ' (selesai)' : ''}`}
            >
              {isNext && (
                <span className="absolute -inset-1.5 animate-ping rounded-full bg-yellow-300/90" />
              )}
              <div
                className={`relative h-2.5 w-2.5 rounded-full border-2 border-white shadow sm:h-3 sm:w-3 ${
                  done ? 'bg-emerald-500' : ''
                }`}
                style={done ? undefined : { backgroundColor: zone.color }}
              />
            </div>
          );
        })}

        {/* Posisi pemain */}
        <div
          ref={dotRef}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${mapX(PLAYER_SPAWN[0])}%`, top: `${mapZ(PLAYER_SPAWN[2])}%` }}
        >
          <div ref={arrowRef} className="relative h-3.5 w-3.5" style={{ transform: 'rotate(180deg)' }}>
            <div className="absolute inset-0 rounded-full border-2 border-white bg-indigo-600 shadow-md" />
            <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[6px] border-x-transparent border-b-indigo-600" />
          </div>
        </div>
      </div>

      <div className="flex max-w-[150px] items-center gap-1 rounded-full border border-white/60 bg-white/90 px-2 py-1 shadow-md backdrop-blur-sm">
        {nextZone ? (
          <>
            <span className="text-xs leading-none">{nextZone.icon}</span>
            <span className="truncate text-[9px] font-black text-slate-600 sm:text-[10px]">
              {nextZone.name}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 sm:text-[10px]">
            <CheckCircle2 size={11} /> Semua selesai
          </span>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Fallback & error boundary                                           */
/* ------------------------------------------------------------------ */

const WorldFallback: React.FC<{ onClassicMode: () => void }> = ({ onClassicMode }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 p-5">
    <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl sm:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <AlertTriangle size={34} />
      </div>
      <h2 className="text-2xl font-black text-slate-800">Dunia 3D belum bisa dimuat</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
        Perangkat ini mungkin belum mendukung WebGL. Tenang, petualangan kalian tetap bisa
        dilanjutkan lewat <b>Mode Klasik</b>.
      </p>
      <div className="mt-6 space-y-3">
        <button
          onClick={() => window.location.reload()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-base font-black text-white shadow-lg transition-colors hover:bg-indigo-700"
        >
          <RefreshCw size={20} /> Coba Lagi
        </button>
        <button
          onClick={onClassicMode}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-base font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Gamepad2 size={20} /> Mode Klasik (2D)
        </button>
      </div>
    </div>
  </div>
);

class WorldErrorBoundary extends React.Component<
  { children: React.ReactNode; onClassicMode: () => void },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode; onClassicMode: () => void }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <WorldFallback onClassicMode={this.props.onClassicMode} />;
    }
    return this.props.children;
  }
}

function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Dunia 3D                                                            */
/* ------------------------------------------------------------------ */

export const World3D: React.FC<World3DProps> = ({
  teamName,
  avatar,
  score,
  completedZones,
  soundEnabled,
  onToggleSound,
  onClassicMode,
  onStartMission,
  onExit,
  playSound,
}) => {
  const joystickRef = useRef<MoveVector>({ x: 0, y: 0 });
  const poseRef = useRef<PlayerPose>({
    x: PLAYER_SPAWN[0],
    z: PLAYER_SPAWN[2],
    yaw: 0,
  });
  const [nearZone, setNearZone] = useState<MissionZone | null>(null);
  const [nearBoard, setNearBoard] = useState<InfoBoard | null>(null);
  const [dismissedBoardId, setDismissedBoardId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ text: string; key: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [webglOk] = useState(webglSupported);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => {
      setCompact(
        media.matches || navigator.maxTouchPoints > 0 || window.innerWidth < 900
      );
    };
    update();

    const onChange = () => update();
    if (media.addEventListener) media.addEventListener('change', onChange);
    else media.addListener(onChange);
    window.addEventListener('resize', update);

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
      else media.removeListener(onChange);
      window.removeEventListener('resize', update);
    };
  }, []);

  const nextZone = useMemo(
    () => MISSION_ZONES.find((zone) => !completedZones.includes(zone.id)),
    [completedZones]
  );

  const objective = useMemo(() => {
    if (!nextZone) return 'Semua zona misi selesai!';
    const remaining = MISSION_ZONES.length - completedZones.length;
    return `Sisa ${remaining} zona • berikutnya ${nextZone.name}`;
  }, [completedZones.length, nextZone]);

  const handleNearZone = useCallback(
    (zone: MissionZone | null) => {
      setNearZone(zone);
      if (zone) playSound?.('click');
    },
    [playSound]
  );

  const nearZoneDone = nearZone ? completedZones.includes(nearZone.id) : false;

  const handleNearBoard = useCallback((board: InfoBoard | null) => {
    setNearBoard(board);
    if (!board) setDismissedBoardId(null);
  }, []);

  const kaptenMessage = useMemo(() => {
    if (completedZones.length >= MISSION_ZONES.length) {
      return 'Semua zona selesai! Kamu luar biasa!';
    }
    return `Halo ${teamName || 'Agen'}! Cari tiang bercahaya dan baca papan fakta ya!`;
  }, [completedZones.length, teamName]);

  useEffect(() => {
    let message: string;
    if (completedZones.length >= MISSION_ZONES.length) {
      message = 'Semua zona selesai! Misi penyelamatan bumi berhasil!';
    } else if (nearBoard) {
      message = 'Papan fakta! Baca dulu, lalu cari tiang bercahaya.';
    } else if (nearZone) {
      message = nearZoneDone
        ? `${nearZone.name} sudah selesai! Cari zona berikutnya.`
        : `Kamu di zona ${nearZone.name}. Klik Mulai Misi kalau siap!`;
    } else {
      const next = MISSION_ZONES.find((zone) => !completedZones.includes(zone.id));
      message = next
        ? `Halo ${teamName || 'Agen'}! Cari tiang bercahaya. Berikutnya: ${next.name}.`
        : 'Semua zona selesai!';
    }
    setTip({ text: message, key: Date.now() });
    const timer = window.setTimeout(() => setTip(null), 9000);
    return () => window.clearTimeout(timer);
  }, [completedZones, nearBoard, nearZone, nearZoneDone, teamName]);

  const boardFacts = nearBoard ? WORLD_FACTS[nearBoard.zoneId] : null;
  const boardColor =
    (nearBoard && MISSION_ZONES.find((zone) => zone.id === nearBoard.zoneId)?.color) || '#4f46e5';

  const startMission = useCallback(() => {
    if (!nearZone || completedZones.includes(nearZone.id)) return;
    playSound?.('click');
    onStartMission(nearZone.id);
  }, [nearZone, completedZones, onStartMission, playSound]);

  // Tekan E untuk memulai misi saat berdiri di zona (desktop).
  useEffect(() => {
    if (!nearZone || nearZoneDone) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE') {
        event.preventDefault();
        startMission();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nearZone, nearZoneDone, startMission]);

  const handleSound = () => {
    onToggleSound();
    playSound?.('click');
  };

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-sky-200 select-none"
      style={{ touchAction: 'none' }}
    >
      {webglOk ? (
        <WorldErrorBoundary onClassicMode={onClassicMode}>
          <Canvas
            className="absolute inset-0"
            dpr={[1, compact ? 1.25 : 1.5]}
            shadows={false}
            performance={{ min: 0.5 }}
            camera={{ position: [0, 5, 21], fov: 55, near: 0.1, far: 220 }}
            gl={{ antialias: !compact, powerPreference: 'high-performance', alpha: false }}
            onCreated={() => setReady(true)}
          >
            <Suspense fallback={null}>
              <WorldScene
                joystickRef={joystickRef}
                poseRef={poseRef}
                avatar={avatar}
                teamName={teamName}
                completedZones={completedZones}
                kaptenMessage={kaptenMessage}
                onNearZone={handleNearZone}
                onNearBoard={handleNearBoard}
              />
            </Suspense>
          </Canvas>
        </WorldErrorBoundary>
      ) : (
        <WorldFallback onClassicMode={onClassicMode} />
      )}

      {/* Scrim atas & bawah supaya HUD mudah dibaca */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/35 to-transparent" />

      {/* ---------- HUD ATAS ---------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-2.5 py-2 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner sm:h-12 sm:w-12 sm:text-2xl ${
                  avatar?.bgGradient || 'from-indigo-400 to-purple-600'
                }`}
              >
                {avatar?.icon || <Shield size={20} />}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="max-w-[30vw] truncate text-sm font-black text-slate-800 sm:max-w-[220px] sm:text-base">
                  {teamName || 'Tim Agent'}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Unit Penyelamat
                </p>
              </div>
            </div>

            <div className="flex w-max items-center gap-1.5 rounded-xl border border-white/40 bg-indigo-600/90 px-3 py-1.5 text-white shadow-md backdrop-blur-sm">
              <Shield size={14} className="text-yellow-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">
                Skor
              </span>
              <span className="font-mono text-sm font-black">{score}</span>
            </div>

            <div className="flex w-max items-center gap-2 rounded-xl border border-white/50 bg-white/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Misi
              </span>
              <span className="font-mono text-xs font-black text-slate-800">
                {completedZones.length}/{MISSION_ZONES.length}
              </span>
              <div className="flex items-center gap-1">
                {MISSION_ZONES.map((zone) => {
                  const done = completedZones.includes(zone.id);
                  return (
                    <span
                      key={zone.id}
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                        done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                      title={`${zone.name}${done ? ' (selesai)' : ''}`}
                    >
                      {done ? '✓' : zone.icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={handleSound}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95"
                aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} className="text-slate-400" />}
              </button>
              {onExit && (
                <button
                  onClick={() => {
                    playSound?.('click');
                    onExit();
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white active:scale-95"
                  aria-label="Kembali ke menu"
                  title="Kembali ke menu"
                >
                  <LogOut size={20} />
                </button>
              )}
              <button
                onClick={() => {
                  playSound?.('click');
                  onClassicMode();
                }}
                className="hidden h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-white/70 bg-slate-900/75 px-3 text-sm font-black text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-900 active:scale-95 sm:flex sm:px-4"
              >
                <Gamepad2 size={19} className="text-yellow-300" />
                <span>Mode Klasik</span>
              </button>
            </div>

            <Minimap poseRef={poseRef} completedZones={completedZones} nextZone={nextZone} />
          </div>
        </div>
      </div>

      {/* ---------- PESAN KAPTEN SIAGA ---------- */}
      {tip && ready && (
        <div className="pointer-events-none absolute inset-x-0 top-[158px] z-20 flex justify-center px-3 sm:top-24">
          <div
            key={tip.key}
            className="pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border-2 border-amber-300 bg-white/95 px-2.5 py-2 shadow-xl backdrop-blur-sm"
          >
            <img
              src="/assets/kapten-idle.png"
              alt="Kapten Siaga"
              className="h-10 w-10 flex-shrink-0 object-contain sm:h-12 sm:w-12"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                Kapten Siaga
              </p>
              <p className="text-[11px] font-bold leading-snug text-slate-700 sm:text-xs">
                {tip.text}
              </p>
            </div>
            <button
              onClick={() => setTip(null)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup pesan Kapten Siaga"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ---------- PANEL ZONA MISI ---------- */}
      {nearZone && (
        <div className="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex justify-center px-3 sm:bottom-28">
          <div
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border-4 bg-white/95 shadow-2xl backdrop-blur-md"
            style={{ borderColor: nearZoneDone ? '#10b981' : nearZone.color }}
          >
            <div className="flex items-center gap-3 px-4 pt-3">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
                style={{ backgroundColor: `${nearZone.color}22` }}
              >
                {nearZoneDone ? '✅' : nearZone.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: nearZoneDone ? '#059669' : nearZone.color }}
                >
                  {nearZoneDone ? 'Zona selesai' : 'Zona misi'}
                </p>
                <h3 className="truncate text-lg font-black leading-tight text-slate-800">
                  {nearZone.name}
                </h3>
                <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-500">
                  {nearZone.description}
                </p>
              </div>
            </div>

            {nearZoneDone ? (
              <div className="m-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-black text-emerald-700">
                <CheckCircle2 size={18} /> Misi selesai — skor sudah masuk
              </div>
            ) : (
              <button
                onClick={startMission}
                className="m-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-lg font-black text-white shadow-lg transition-transform active:scale-[0.98]"
                style={{ backgroundColor: nearZone.color }}
              >
                Mulai Misi <ChevronRight size={22} />
                <span className="hidden rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-black sm:inline">
                  E
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- PANEL PAPAN INFORMASI ---------- */}
      {nearBoard && boardFacts && !nearZone && dismissedBoardId !== nearBoard.id && (
        <div className="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex justify-center px-3 sm:bottom-28">
          <div
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border-4 bg-white/95 shadow-2xl backdrop-blur-md"
            style={{ borderColor: boardColor }}
          >
            <div className="flex items-center gap-2.5 px-4 pt-3">
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: `${boardColor}22` }}
              >
                {boardFacts.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                  style={{ color: boardColor }}
                >
                  <BookOpen size={11} /> Papan informasi
                </p>
                <h3 className="truncate text-base font-black leading-tight text-slate-800 sm:text-lg">
                  {boardFacts.title}
                </h3>
              </div>
              <button
                onClick={() => setDismissedBoardId(nearBoard.id)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                aria-label="Tutup papan informasi"
              >
                <X size={16} />
              </button>
            </div>

            <ol className="max-h-[34vh] space-y-2 overflow-y-auto px-4 pb-4 pt-2.5">
              {boardFacts.facts.map((fact, index) => (
                <li key={index} className="flex gap-2">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: boardColor }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-bold leading-snug text-slate-700 sm:text-sm">
                    {fact}
                  </span>
                </li>
              ))}
            </ol>

            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] font-bold text-slate-400">
              Dekati papan untuk membaca • dunia Jelajah Alam Siaga
            </div>
          </div>
        </div>
      )}

      {/* ---------- KONTROL BAWAH ---------- */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-5"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {compact ? (
          <Joystick valueRef={joystickRef} />
        ) : (
          <div className="pointer-events-auto rounded-2xl border border-white/25 bg-slate-900/60 px-4 py-3 text-white shadow-xl backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
              Kontrol
            </p>
            <p className="mt-1 text-sm font-bold">
              <span className="rounded bg-white/20 px-1.5 py-0.5">W A S D</span> atau{' '}
              <span className="rounded bg-white/20 px-1.5 py-0.5">← ↑ ↓ →</span> untuk berjalan
            </p>
            <p className="text-xs font-medium text-white/70">Tahan & geser mouse untuk memutar kamera</p>
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto max-w-[46vw] rounded-2xl border border-white/40 bg-white/85 px-3 py-2 text-right shadow-lg backdrop-blur-sm sm:max-w-xs sm:px-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
              Tujuan
            </p>
            <p className="text-xs font-bold leading-snug text-slate-700 sm:text-sm">{objective}</p>
          </div>
          {compact && (
            <div className="rounded-xl border border-white/20 bg-slate-900/55 px-3 py-1.5 text-[10px] font-bold text-white/90 shadow backdrop-blur-sm sm:text-xs">
              Geser layar untuk memutar kamera
            </div>
          )}
          <button
            onClick={() => {
              playSound?.('click');
              onClassicMode();
            }}
            className="pointer-events-auto flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-white/70 bg-slate-900/80 px-3 py-2.5 text-sm font-black text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-900 active:scale-95 sm:hidden"
          >
            <Gamepad2 size={18} className="text-yellow-300" />
            Mode Klasik
          </button>
        </div>
      </div>

      {/* ---------- LOADING ---------- */}
      {!ready && webglOk && <WorldLoadingScreen message="Menyiapkan alam petualangan..." />}
    </div>
  );
};

export default World3D;
