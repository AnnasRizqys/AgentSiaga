import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { AVATARS } from '../constants';
import type { DisasterType } from '../types';
import {
  changeTeacherPin,
  CLASS_OPTIONS,
  clearAllSessions,
  refreshSessions,
  removeSession,
  signOutTeacher,
  useTeamSessions,
} from '../sessionStore';
import { TeacherLogin } from './TeacherLogin';
import { isTeacherAuthenticated } from '../sessionStore';

const MotionDiv = motion.div as any;

const ZONE_ICONS: Record<DisasterType, string> = {
  EARTHQUAKE: '🏚️',
  FLOOD: '🌊',
  VOLCANO: '🌋',
  LANDSLIDE: '⛰️',
};
const ZONE_LABELS: Record<DisasterType, string> = {
  EARTHQUAKE: 'Gempa',
  FLOOD: 'Banjir',
  VOLCANO: 'Gunung Meletus',
  LANDSLIDE: 'Tanah Longsor',
};
const ZONE_ORDER: DisasterType[] = ['EARTHQUAKE', 'FLOOD', 'VOLCANO', 'LANDSLIDE'];

export interface TeacherDashboardProps {
  onBack: () => void;
  playSound: (type: string) => void;
}

interface DashboardViewProps extends TeacherDashboardProps {
  onLogout: () => void;
}

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** Isi dashboard (hanya dirender setelah guru terautentikasi). */
const DashboardView: React.FC<DashboardViewProps> = ({ onBack, playSound, onLogout }) => {
  const sessions = useTeamSessions();
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('');
  const [sort, setSort] = useState<'score' | 'recent' | 'name'>('score');
  const [confirmClear, setConfirmClear] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  /* --------------------------- Data ------------------------------ */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessions.filter((session) => {
      const matchesQuery =
        !q ||
        session.studentName.toLowerCase().includes(q) ||
        session.teamName.toLowerCase().includes(q);
      const matchesGrade = !grade || session.className === grade;
      return matchesQuery && matchesGrade;
    });
    return [...list].sort((a, b) => {
      if (sort === 'score') return b.totalScore - a.totalScore;
      if (sort === 'recent') return b.lastActiveAt - a.lastActiveAt;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [sessions, query, grade, sort]);

  const totalTeams = sessions.length;
  const missionsDone = sessions.reduce((sum, s) => sum + s.completedZones.length, 0);
  const quizValues = sessions.flatMap((s) =>
    Object.values(s.quizScores ?? {}).filter((v): v is number => typeof v === 'number' && v >= 0)
  );
  const avgQuiz = quizValues.length
    ? Math.round(quizValues.reduce((a, b) => a + b, 0) / quizValues.length)
    : 0;
  const completionRate = totalTeams
    ? Math.round((missionsDone / (totalTeams * ZONE_ORDER.length)) * 100)
    : 0;

  const kpis = [
    {
      label: 'Tim / Siswa Terdaftar',
      value: totalTeams,
      suffix: 'tim',
      caption: `${new Set(sessions.map((s) => s.className)).size} kelas aktif`,
      icon: Users,
      gradient: 'from-sky-500 to-blue-600',
      glow: 'bg-sky-100 text-sky-600',
    },
    {
      label: 'Total Misi Diselesaikan',
      value: missionsDone,
      suffix: `/ ${totalTeams * 4}`,
      caption: 'Gempa, Banjir, Gunung, Longsor',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Rata-rata Skor Kuis',
      value: avgQuiz,
      suffix: '/ 100',
      caption: `${quizValues.length} kuis telah dikerjakan`,
      icon: Award,
      gradient: 'from-amber-500 to-orange-600',
      glow: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Tingkat Ketuntasan Kelas',
      value: completionRate,
      suffix: '%',
      caption: completionRate >= 75 ? 'Sangat baik! 🎉' : 'Terus tingkatkan',
      icon: Target,
      gradient: 'from-violet-500 to-fuchsia-600',
      glow: 'bg-violet-100 text-violet-600',
    },
  ];

  /* --------------------------- Export ---------------------------- */
  const buildRows = (): (string | number)[][] => {
    const header = [
      'Nama Siswa',
      'Nama Tim',
      'Kelas',
      ...ZONE_ORDER.flatMap((zone) => [
        `Status ${ZONE_LABELS[zone]}`,
        `Skor ${ZONE_LABELS[zone]}`,
        `Kuis ${ZONE_LABELS[zone]}`,
      ]),
      'Total Skor Akhir',
      'Terakhir Bermain',
    ];
    const body = filtered.map((session) => [
      session.studentName,
      session.teamName,
      session.className,
      ...ZONE_ORDER.flatMap((zone) => {
        const done = session.completedZones.includes(zone);
        return [
          done ? 'Selesai' : 'Belum',
          done ? (session.completedLevelScores?.[zone] ?? 0) : 0,
          done ? (session.quizScores?.[zone] ?? 0) : 0,
        ];
      }),
      session.totalScore,
      formatDateTime(session.lastActiveAt),
    ]);
    return [header, ...body];
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    const csv = '\uFEFF' + buildRows().map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    download(csv, `rekap-agent-siaga-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    playSound('success');
  };

  const exportExcel = () => {
    const rows = buildRows()
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, '&lt;')}</td>`).join('')}</tr>`
      )
      .join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${rows}</table></body></html>`;
    download(html, `rekap-agent-siaga-${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
    playSound('success');
  };

  const handleRefresh = () => {
    refreshSessions();
    setLastUpdated(Date.now());
    playSound('click');
  };

  const submitPinChange = () => {
    if (changeTeacherPin(oldPin, newPin)) {
      setPinDialogOpen(false);
      setOldPin('');
      setNewPin('');
      setPinMessage('PIN guru berhasil diperbarui.');
      playSound('success');
      window.setTimeout(() => setPinMessage(''), 4000);
    } else {
      setPinMessage('PIN lama salah atau PIN baru kurang dari 4 digit.');
      playSound('warning');
    }
  };

  /* --------------------------- Tampilan -------------------------- */
  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { playSound('click'); onBack(); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
              aria-label="Kembali ke halaman awal"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-xl shadow-inner">
              🎓
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-black text-slate-800 sm:text-2xl">
                  Dashboard Guru
                </h1>
                <span className="hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 sm:inline-flex">
                  <ShieldCheck size={11} /> Guru
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                Monitoring Progres Siswa · Agent Siaga
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { playSound('click'); setPinDialogOpen(true); }}
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
              title="Ganti PIN guru"
            >
              <KeyRound size={16} /> <span className="hidden sm:inline">Ganti PIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLogout();
                playSound('click');
              }}
              className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <MotionDiv
                key={kpi.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="relative overflow-hidden rounded-2xl border-2 border-white bg-white p-3 shadow-md sm:p-5"
              >
                <span className={`absolute -right-6 -top-7 h-20 w-20 rounded-full opacity-40 ${kpi.glow}`} />
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} text-white shadow-inner sm:h-12 sm:w-12`}>
                    <Icon size={21} />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] font-black uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
                      {kpi.label}
                    </p>
                    <p className="font-display mt-0.5 text-2xl font-black text-slate-800 sm:text-3xl">
                      {kpi.value}
                      <span className="ml-1 text-xs font-black text-slate-400 sm:text-sm">{kpi.suffix}</span>
                    </p>
                  </div>
                </div>
                {kpi.label === 'Tingkat Ketuntasan Kelas' ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${kpi.gradient}`}
                    />
                  </div>
                ) : null}
                <p className="mt-2 truncate text-[10px] font-bold text-slate-400">{kpi.caption}</p>
              </MotionDiv>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-white bg-white p-3 shadow-sm">
          <div className="relative min-w-[190px] flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama siswa atau tim..."
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
            />
          </div>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300"
            aria-label="Filter kelas"
          >
            <option value="">Semua kelas</option>
            {CLASS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300"
            aria-label="Urutkan"
          >
            <option value="score">Skor tertinggi</option>
            <option value="recent">Terakhir aktif</option>
            <option value="name">Nama siswa (A–Z)</option>
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
            title="Refresh Data"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filtered.length}
            className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="Unduh rekap sebagai CSV (bisa dibuka di Excel)"
          >
            <Download size={16} /> CSV
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={!filtered.length}
            className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="Unduh rekap sebagai file Excel (.xls)"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            type="button"
            onClick={() => { playSound('click'); setQuery(''); setGrade(''); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Atur ulang filter"
            aria-label="Atur ulang filter"
          >
            <X size={17} />
          </button>
        </div>

        {/* Status data real-time */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Data real-time · {filtered.length} dari {totalTeams} tim ditampilkan
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 size={13} /> Diperbarui {formatDateTime(lastUpdated)}
          </span>
        </div>

        {/* Tabel monitoring (desktop) */}
        {filtered.length > 0 ? (
          <div className="mt-4 hidden overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5">Siswa / Tim</th>
                    <th className="px-3 py-3.5">Kelas</th>
                    {ZONE_ORDER.map((zone) => (
                      <th key={zone} className="px-3 py-3.5 text-center">
                        <span className="mr-1">{ZONE_ICONS[zone]}</span>
                        {ZONE_LABELS[zone]}
                      </th>
                    ))}
                    <th className="px-3 py-3.5 text-center">Total Skor</th>
                    <th className="px-3 py-3.5">Terakhir Bermain</th>
                    <th className="px-3 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((session) => {
                    const avatar = AVATARS.find((item) => item.id === session.avatarId) || AVATARS[0];
                    return (
                      <tr key={session.id} className="text-sm transition-colors hover:bg-indigo-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatar.bgGradient} text-xl shadow-inner`}>
                              {avatar.icon}
                            </span>
                            <div className="min-w-0 leading-tight">
                              <p className="truncate font-black text-slate-800">{session.studentName}</p>
                              <p className="truncate text-[11px] font-bold text-slate-400">{session.teamName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-600">
                            {session.className}
                          </span>
                        </td>
                        {ZONE_ORDER.map((zone) => {
                          const done = session.completedZones.includes(zone);
                          const score = session.completedLevelScores?.[zone];
                          const quiz = session.quizScores?.[zone];
                          return (
                            <td key={zone} className="px-3 py-3 text-center">
                              {done ? (
                                <div className="leading-tight">
                                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
                                    <CheckCircle2 size={12} /> Selesai
                                  </span>
                                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                                    Skor {score ?? 0} · Kuis {quiz ?? 0}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-400">
                                  <Clock3 size={12} /> Belum
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-1.5 font-display text-lg font-black text-indigo-700">
                            <Award size={16} className="text-amber-500" />
                            {session.totalScore}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={13} className="text-slate-400" />
                            {formatDateTime(session.lastActiveAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => { playSound('click'); removeSession(session.id); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                            title={`Hapus data ${session.studentName}`}
                            aria-label={`Hapus data ${session.studentName}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Kartu monitoring (mobile/tablet) */}
        {filtered.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:hidden">
            <AnimatePresence>
              {filtered.map((session, index) => {
                const avatar = AVATARS.find((item) => item.id === session.avatarId) || AVATARS[0];
                const progress = Math.round((session.completedZones.length / 4) * 100);
                return (
                  <MotionDiv
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                    className="rounded-3xl border-2 border-white bg-white p-5 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatar.bgGradient} text-2xl shadow-inner`}>
                        {avatar.icon}
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <h3 className="truncate font-display text-lg font-black text-slate-800">{session.studentName}</h3>
                        <p className="truncate text-xs font-bold text-slate-500">{session.teamName} · {session.className}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playSound('click'); removeSession(session.id); }}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                        aria-label={`Hapus data ${session.studentName}`}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Progres misi</span>
                      <span className="text-indigo-600">{session.completedZones.length}/4 zona</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500"
                      />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      {ZONE_ORDER.map((zone) => {
                        const done = session.completedZones.includes(zone);
                        const score = session.completedLevelScores?.[zone];
                        const quiz = session.quizScores?.[zone];
                        return (
                          <div
                            key={zone}
                            className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-bold ${
                              done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {ZONE_ICONS[zone]} {ZONE_LABELS[zone]}
                            </span>
                            <span>
                              {done ? `✓ ${score ?? 0} · Kuis ${quiz ?? 0}` : 'Belum'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-black text-slate-500">
                        <Award size={15} className="text-amber-500" /> Total Skor
                      </span>
                      <span className="font-display text-xl font-black text-indigo-700">{session.totalScore}</span>
                    </div>
                    <p className="mt-2 text-center text-[10px] font-bold text-slate-400">
                      Terakhir bermain {formatDateTime(session.lastActiveAt)}
                    </p>
                  </MotionDiv>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 px-5 py-16 text-center">
            <span className="text-5xl">📊</span>
            <h2 className="font-display mt-4 text-xl font-black text-slate-700">
              {sessions.length ? 'Tidak ada data yang cocok' : 'Belum ada siswa terdaftar'}
            </h2>
            <p className="mt-1 max-w-sm text-sm font-semibold text-slate-500">
              {sessions.length
                ? 'Coba ubah kata kunci pencarian atau filter kelas.'
                : 'Rekap akan otomatis muncul di sini setelah siswa mendaftar dan menyelesaikan misi.'}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { playSound('click'); setPinDialogOpen(true); }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-indigo-600"
          >
            <KeyRound size={13} /> Ganti PIN Guru
          </button>
          <button
            type="button"
            onClick={() => { playSound('click'); setConfirmClear(true); }}
            disabled={!sessions.length}
            className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={13} /> Hapus Semua Data
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-slate-400">
          <BarChart3 size={14} /> Seluruh rekap diambil real-time dari penyimpanan lokal yang
          diperbarui setiap siswa menyelesaikan misi & kuis.
        </p>
      </main>

      {/* Dialog ganti PIN */}
      <AnimatePresence>
        {pinDialogOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
          >
            <MotionDiv
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border-4 border-white bg-white p-6 shadow-2xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <KeyRound size={24} />
              </div>
              <h2 className="font-display mt-4 text-center text-xl font-black text-slate-800">Ganti PIN Guru</h2>
              <div className="mt-4 space-y-2">
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="PIN lama"
                  value={oldPin}
                  onChange={(event) => setOldPin(event.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-center text-sm font-black tracking-widest outline-none focus:border-indigo-400"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="PIN baru (min. 4 digit)"
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-center text-sm font-black tracking-widest outline-none focus:border-indigo-400"
                />
              </div>
              {pinMessage && (
                <p className={`mt-2 text-center text-xs font-bold ${pinMessage.includes('berhasil') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {pinMessage}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPinDialogOpen(false); setPinMessage(''); }}
                  className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitPinChange}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white shadow-lg hover:bg-indigo-700"
                >
                  Simpan PIN
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Konfirmasi hapus semua */}
      <AnimatePresence>
        {confirmClear && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
          >
            <MotionDiv
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border-4 border-white bg-white p-6 text-center shadow-2xl"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 size={28} />
              </span>
              <h2 className="font-display mt-4 text-xl font-black text-slate-800">Hapus semua data tim?</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Seluruh sesi dan progres tim akan dihapus permanen dari perangkat ini.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllSessions();
                    setConfirmClear(false);
                    setLastUpdated(Date.now());
                    playSound('warning');
                  }}
                  className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-black text-white shadow-lg hover:bg-rose-600"
                >
                  Ya, Hapus
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Gerbang akses + dashboard. State autentikasi sengaja dipisah supaya
 * seluruh hook di DashboardView dipanggil secara konsisten.
 */
export const TeacherDashboard: React.FC<TeacherDashboardProps> = (props) => {
  const [authenticated, setAuthenticated] = useState(() => isTeacherAuthenticated());

  if (!authenticated) {
    return (
      <TeacherLogin
        playSound={props.playSound}
        onBack={props.onBack}
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <DashboardView
      {...props}
      onLogout={() => {
        signOutTeacher();
        setAuthenticated(false);
      }}
    />
  );
};

export default TeacherDashboard;
