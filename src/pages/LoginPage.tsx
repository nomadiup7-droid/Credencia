import React from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import credenciaLogoIcon from '../assets/credencia-logo-icon.png';
import credenciaLoginGlass from '../assets/credencia-login-glass.jpeg';
import type { Toast, UserRole } from '../types';

interface LoginPageProps {
  loginMethod: 'pin' | 'email';
  setLoginMethod: React.Dispatch<React.SetStateAction<'pin' | 'email'>>;
  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  isRegisterMode: boolean;
  setIsRegisterMode: React.Dispatch<React.SetStateAction<boolean>>;
  emailInput: string;
  setEmailInput: React.Dispatch<React.SetStateAction<string>>;
  passwordInput: string;
  setPasswordInput: React.Dispatch<React.SetStateAction<string>>;
  registerNameInput: string;
  setRegisterNameInput: React.Dispatch<React.SetStateAction<string>>;
  registerOrgInput: string;
  setRegisterOrgInput: React.Dispatch<React.SetStateAction<string>>;
  registerRoleInput: UserRole;
  setRegisterRoleInput: React.Dispatch<React.SetStateAction<UserRole>>;
  handleLogin: (event: React.FormEvent) => void;
  handleSignup: (event: React.FormEvent) => void;
  toasts: Toast[];
}

export default function LoginPage({
  loginMethod,
  setLoginMethod,
  pinInput,
  setPinInput,
  authLoading,
  isRegisterMode,
  setIsRegisterMode,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  registerNameInput,
  setRegisterNameInput,
  registerOrgInput,
  setRegisterOrgInput,
  registerRoleInput,
  setRegisterRoleInput,
  handleLogin,
  handleSignup,
  toasts
}: LoginPageProps) {
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
        <section className="min-h-[260px] flex flex-col justify-end lg:min-h-[640px]">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3">
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
            <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-white font-display max-w-xl leading-[0.98]">
              Operação elegante para eventos de alta exigência.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-lg leading-relaxed">
              Controle participantes, check-ins, acessos e impressões em um fluxo claro para recepção, supervisão e administração.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
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
              {isRegisterMode ? 'Criar acesso' : 'Entrar no sistema'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isRegisterMode ? 'Cadastre um operador para usar o sistema.' : 'Use seu e-mail e senha para acessar a operação.'}
            </p>
          </div>

          {loginMethod === 'pin' && !isRegisterMode ? (
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
            <form onSubmit={isRegisterMode ? handleSignup : handleLogin} className="space-y-4">
              {isRegisterMode && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={registerNameInput}
                      onChange={e => setRegisterNameInput(e.target.value)}
                      placeholder="Nome do operador"
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Organização ou empresa
                    </label>
                    <input
                      type="text"
                      value={registerOrgInput}
                      onChange={e => setRegisterOrgInput(e.target.value)}
                      placeholder="Nome da organizacao"
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none backdrop-blur-sm focus:border-emerald-400"
                    />
                  </div>
                </>
              )}

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

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nível de acesso
                  </label>
                  <select
                    value={registerRoleInput}
                    onChange={e => setRegisterRoleInput(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none backdrop-blur-sm focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="admin">Administrador</option>
                    <option value="operator">Operador</option>
                  </select>
                </div>
              )}

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
                    <span>{isRegisterMode ? 'Criar acesso' : 'Entrar'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {!isRegisterMode && loginMethod === 'email' && (
            <button
              type="button"
              onClick={() => { setLoginMethod('pin'); setPinInput(''); }}
              className="cx-button-secondary mt-4 w-full rounded-xl py-3 text-sm font-semibold cursor-pointer"
            >
              Entrar com PIN
            </button>
          )}

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginMethod('email');
                setEmailInput('');
                setPasswordInput('');
              }}
              className="text-sm text-emerald-700 hover:text-slate-950 font-semibold focus:outline-none transition cursor-pointer select-none"
            >
              {isRegisterMode ? 'Voltar para login' : 'Criar acesso administrativo'}
            </button>
          </div>
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
