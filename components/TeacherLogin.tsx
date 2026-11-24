import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_TEACHER_PIN,
  signInTeacher,
  verifyTeacherPin,
} from '../sessionStore';

const MotionDiv = motion.div as any;

export interface TeacherLoginProps {
  onSuccess: () => void;
  onBack: () => void;
  playSound: (type: string) => void;
}

/**
 * Gerbang akses Dashboard Guru. PIN disimpan dalam bentuk hash di localStorage
 * (default: 1234) dan sesi login berlaku 8 jam lewat sessionStorage.
 */
export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSuccess, onBack, playSound }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    playSound('warning');
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (pin.trim().length < 4) {
      fail('PIN minimal 4 digit.');
      return;
    }
    if (!verifyTeacherPin(pin)) {
      fail('PIN salah. Coba lagi atau gunakan Akses Cepat Demo.');
      return;
    }
    signInTeacher();
    playSound('success');
    onSuccess();
  };

  const demoAccess = () => {
    signInTeacher();
    playSound('success');
    onSuccess();
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-4 font-sans">
      {/* Dekorasi latar */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/10" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full border-[50px] border-white/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.18),transparent_45%)]" />

      <MotionDiv
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl ${shake ? 'answer-shake' : ''}`}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-6 pb-8 pt-7 text-center text-white">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] border-white/10" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={13} /> Area Terbatas
          </span>
          <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner backdrop-blur-sm">
            🎓
          </div>
          <h1 className="font-display mt-3 text-3xl font-black">Login Guru</h1>
          <p className="mt-1 text-sm font-semibold text-indigo-100">
            Masukkan PIN untuk membuka Dashboard Guru Agent Siaga.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 pb-6 pt-6">
          <label htmlFor="teacher-pin" className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
            <KeyRound size={16} className="text-indigo-500" /> PIN Guru
          </label>
          <div className="relative">
            <input
              id="teacher-pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={8}
              placeholder="••••"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
              className="w-full rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 px-4 py-4 pr-12 text-center text-2xl font-black tracking-[0.4em] text-indigo-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              aria-invalid={!!error}
              aria-describedby={error ? 'pin-error' : 'pin-hint'}
            />
            <button
              type="button"
              onClick={() => setShowPin((value) => !value)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-indigo-100 hover:text-indigo-600"
              aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
            >
              {showPin ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error ? (
            <p id="pin-error" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600">
              <AlertCircle size={14} /> {error}
            </p>
          ) : (
            <p id="pin-hint" className="mt-2 text-center text-[11px] font-bold text-slate-400">
              PIN demo bawaan: <b className="text-indigo-500">{DEFAULT_TEACHER_PIN}</b>
            </p>
          )}

          <button
            type="submit"
            className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-black text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500 active:translate-y-0.5 active:border-b-2"
          >
            <LockKeyhole size={20} /> MASUK DASHBOARD
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">atau</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={demoAccess}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <Zap size={18} fill="currentColor" /> Akses Cepat Demo Guru
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              onBack();
            }}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-black text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft size={15} /> Kembali ke halaman awal
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 border-t-2 border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-400">
          <ShieldCheck size={13} className="text-emerald-500" />
          Sesi guru berlaku 8 jam · Data siswa tetap tersimpan di perangkat
        </div>
      </MotionDiv>
    </div>
  );
};

export default TeacherLogin;
