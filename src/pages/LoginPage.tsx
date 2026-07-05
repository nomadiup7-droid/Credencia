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
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(18,224,0,0.28),transparent_28%),linear-gradient(90deg,rgba(3,6,4,0.48),rgba(3,6,4,0.82)_48%,rgba(3,6,4,0.96))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#030604] to-transparent" />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-8 lg:gap-12 items-center">
        <section className="min-h-[260px] flex flex-col justify-end lg:min-h-[640px]">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3">
              <img src={credenciaLogoIcon} alt="" className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_18px_32px_rgba(18,224,0,0.22)]" />
              <div>
                <div className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">CREDENCIA</div>
                <div className="text-sm sm:text-base text-slate-200">Tecnologia para events</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#12e000] shadow-[0_0_18px_rgba(18,224,0,0.85)]" />
              Plataforma de credenciamento
            </div>
            <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-white font-display max-w-xl">
              Operacao elegante para eventos de alta exigencia.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-lg leading-relaxed">
              Controle participantes, check-ins, acessos e impressoes em um fluxo claro para recepcao, supervisao e administracao.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
              <div className="border border-white/12 bg-white/8 rounded-lg p-4 backdrop-blur-md">
                <div className="text-sm font-bold text-white">Check-in</div>
                <div className="text-xs text-slate-300 mt-1">Busca, QR Code e presenca.</div>
              </div>
              <div className="border border-white/12 bg-white/8 rounded-lg p-4 backdrop-blur-md">
                <div className="text-sm font-bold text-white">Acessos</div>
                <div className="text-xs text-slate-300 mt-1">Salas, perfis e logs.</div>
              </div>
              <div className="border border-white/12 bg-white/8 rounded-lg p-4 backdrop-blur-md">
                <div className="text-sm font-bold text-white">Impressao</div>
                <div className="text-xs text-slate-300 mt-1">Etiquetas e credenciais.</div>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-white/96 border border-white/70 rounded-xl shadow-2xl shadow-black/35 p-6 sm:p-8 backdrop-blur-xl">
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
              {isRegisterMode ? 'Cadastre um operador para usar o sistema.' : 'Use seu e-mail e senha para acessar a operaÃ§Ã£o.'}
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
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      OrganizaÃ§Ã£o ou empresa
                    </label>
                    <input
                      type="text"
                      value={registerOrgInput}
                      onChange={e => setRegisterOrgInput(e.target.value)}
                      placeholder="Nome da organizacao"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
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
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
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
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition placeholder-slate-400"
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    NÃ­vel de acesso
                  </label>
                  <select
                    value={registerRoleInput}
                    onChange={e => setRegisterRoleInput(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                  >
                    <option value="admin">Administrador</option>
                    <option value="operator">Operador</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#173FAE] disabled:bg-slate-300 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
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
              className="mt-4 w-full py-2.5 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
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
                setEmailInput(isRegisterMode ? 'admin@credencia.com' : '');
                setPasswordInput(isRegisterMode ? 'admin123' : '');
              }}
              className="text-sm text-[#1D4ED8] hover:text-[#0F172A] font-semibold focus:outline-none transition cursor-pointer select-none"
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
