import React from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import credenciaLogoIcon from '../assets/credencia-logo-icon.png';
import credenciaLoginGlass from '../assets/credencia-login-glass.jpeg';
import type { Toast } from '../types';

interface LoginPageProps {
  loginMethod: 'pin' | 'email';
  setLoginMethod: React.Dispatch<React.SetStateAction<'pin' | 'email'>>;
  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  emailInput: string;
  setEmailInput: React.Dispatch<React.SetStateAction<string>>;
  passwordInput: string;
  setPasswordInput: React.Dispatch<React.SetStateAction<string>>;
  handleLogin: (event: React.FormEvent) => void;
  handleRecoverLogin: (pin: string, newPassword: string) => Promise<{ email: string; name: string }>;
  toasts: Toast[];
}

export default function LoginPage({
  loginMethod,
  setLoginMethod,
  pinInput,
  setPinInput,
  authLoading,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  handleLogin,
  handleRecoverLogin,
  toasts
}: LoginPageProps) {
  const [isRecoveryMode, setIsRecoveryMode] = React.useState(false);
  const [recoveryPin, setRecoveryPin] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = React.useState(false);
  const [recoveryError, setRecoveryError] = React.useState('');

  const resetRecoveryForm = () => {
    setRecoveryPin('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError('');
    setShowRecoveryPassword(false);
  };

  const closeRecovery = () => {
    resetRecoveryForm();
    setIsRecoveryMode(false);
  };

  const submitRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryError('');

    if (!/^\d{4,6}$/.test(recoveryPin)) {
      setRecoveryError('Informe o PIN de 4 a 6 números cadastrado no seu acesso.');
      return;
    }
    if (newPassword.length < 8) {
      setRecoveryError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('As senhas não coincidem. Digite novamente.');
      return;
    }

    try {
      await handleRecoverLogin(recoveryPin, newPassword);
      closeRecovery();
    } catch {
      setRecoveryError('Não foi possível validar o PIN. Confira e tente novamente.');
    }
  };

  const recoveryForm = (
    <form onSubmit={submitRecovery} className="space-y-4" noValidate>
      <div>
        <label htmlFor="recovery-pin" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          PIN de acesso
        </label>
        <input
          id="recovery-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={recoveryPin}
          onChange={event => setRecoveryPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="4 a 6 números"
          disabled={authLoading}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium tracking-[0.3em] text-slate-900 placeholder:tracking-normal placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="recovery-password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Nova senha
        </label>
        <div className="relative">
          <input
            id="recovery-password"
            type={showRecoveryPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="Mínimo de 8 caracteres"
            disabled={authLoading}
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowRecoveryPassword(value => !value)}
            className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={showRecoveryPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
          >
            {showRecoveryPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="recovery-password-confirm" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Confirmar nova senha
        </label>
        <input
          id="recovery-password-confirm"
          type={showRecoveryPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          placeholder="Repita a nova senha"
          disabled={authLoading}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {recoveryError && (
        <p role="alert" aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-800">
          {recoveryError}
        </p>
      )}

      <button
        type="submit"
        disabled={authLoading}
        className="cx-button-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {authLoading ? <RefreshCw className="animate-spin" size={16} /> : <KeyRound size={16} />}
        <span>{authLoading ? 'Recuperando...' : 'Redefinir senha'}</span>
      </button>

      <button
        type="button"
        onClick={closeRecovery}
        disabled={authLoading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowLeft size={16} />
        Voltar para login
      </button>
    </form>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030604] text-white flex items-center justify-center p-4 sm:p-6">
      <img
        src={credenciaLoginGlass}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80 scale-[1.02]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(18,224,0,0.30),transparent_28%),radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.10),transparent_30%),linear-gradient(90deg,rgba(3,6,4,0.42),rgba(3,6,4,0.78)_48%,rgba(3,6,4,0.96))]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_18%,transparent_72%,rgba(18,224,0,0.08))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#030604] to-transparent" />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-8 lg:gap-12 items-center">
        <section className="flex min-h-[260px] flex-col justify-center lg:min-h-[560px] lg:-translate-y-6">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="mb-7 flex items-center justify-center gap-3 lg:justify-start">
              <img src={credenciaLogoIcon} alt="" className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_18px_32px_rgba(18,224,0,0.22)]" />
              <div>
                <div className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">CREDENCIA</div>
                <div className="text-sm sm:text-base text-slate-200">Tecnologia para eventos</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#12e000] shadow-[0_0_18px_rgba(18,224,0,0.85)]" />
              Plataforma de credenciamento
            </div>
            <h1 className="mx-auto mt-5 max-w-xl text-3xl font-bold leading-[0.98] tracking-tight text-white font-display sm:text-5xl lg:mx-0">
              Operação elegante para eventos de alta exigência.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-200 sm:text-base lg:mx-0">
              Controle participantes, check-ins, acessos e impressões em um fluxo claro para recepção, supervisão e administração.
            </p>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3 lg:mx-0">
              <div className="border border-white/12 bg-white/8 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-sm font-bold text-white">Check-in</div>
                <div className="text-xs text-slate-300 mt-1">Busca, QR Code e presença.</div>
              </div>
              <div className="border border-white/12 bg-white/8 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-sm font-bold text-white">Acessos</div>
                <div className="text-xs text-slate-300 mt-1">Salas, perfis e logs.</div>
              </div>
              <div className="border border-white/12 bg-white/8 rounded-xl p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-sm font-bold text-white">Impressão</div>
                <div className="text-xs text-slate-300 mt-1">Etiquetas e credenciais.</div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/92 p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#12e000]/10 blur-3xl" />
          <div className="mb-7">
            <div className="mb-5 flex items-center gap-2 lg:hidden">
              <img src={credenciaLogoIcon} alt="" className="h-10 w-auto object-contain" />
              <div>
                <div className="font-display text-lg font-bold tracking-wide text-slate-950">CREDENCIA</div>
                <div className="text-xs text-slate-500">Tecnologia para eventos</div>
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-950 font-display">
              {isRecoveryMode ? 'Recuperar login' : 'Entrar no sistema'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isRecoveryMode
                ? 'Valide seu PIN para consultar o e-mail cadastrado e criar uma nova senha.'
                : 'Use seu e-mail e senha para acessar a operação.'}
            </p>
          </div>

          {isRecoveryMode ? recoveryForm : loginMethod === 'pin' ? (
            <div className="space-y-5">
              <div className="flex justify-center gap-2 select-none">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const val = pinInput[idx];
                  const active = pinInput.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-md border flex items-center justify-center font-bold text-xl transition ${
                        active
                          ? 'border-[#1D4ED8] bg-slate-50 text-[#1D4ED8]'
                          : val
                            ? 'border-slate-300 bg-slate-100 text-slate-700'
                            : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {authLoading ? <div className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-ping" /> : val ? '*' : ''}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (pinInput.length < 6 && !authLoading) {
                        setPinInput(prev => prev + num);
                      }
                    }}
                    className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPinInput('')}
                  className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Limpar
                </button>
                <button
                  key={0}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 6 && !authLoading) {
                      setPinInput(prev => prev + '0');
                    }
                  }}
                  className="h-12 bg-white border border-slate-200 rounded-md font-semibold text-slate-900 hover:bg-slate-50 active:scale-98 transition cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPinInput(prev => prev.slice(0, -1))}
                  className="h-12 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  Apagar
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setPinInput(''); }}
                className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-[#1D4ED8] transition cursor-pointer"
              >
                Entrar com e-mail e senha
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Senha"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="cx-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:bg-slate-300"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {!isRecoveryMode && loginMethod === 'email' && (
            <button
              type="button"
              onClick={() => { setLoginMethod('pin'); setPinInput(''); }}
              className="cx-button-secondary mt-4 w-full rounded-xl py-3 text-sm font-semibold cursor-pointer"
            >
              Entrar com PIN
            </button>
          )}

          {!isRecoveryMode && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                resetRecoveryForm();
                setIsRecoveryMode(true);
                setLoginMethod('email');
                setPasswordInput('');
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer select-none"
            >
              <KeyRound size={16} />
              Recuperar login
            </button>
          </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3.5 rounded-md shadow-xl flex items-center gap-3 text-sm font-medium border bg-white animate-slide-in duration-300 ${
              t.type === 'success' ? 'border-emerald-200 text-emerald-900' :
              t.type === 'error' ? 'border-rose-200 text-rose-900' :
              'border-blue-200 text-blue-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
