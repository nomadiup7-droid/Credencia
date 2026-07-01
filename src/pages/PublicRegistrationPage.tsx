import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import UserQRCode from '../components/UserQRCode';
import { OnlineRegistrationConfig } from '../types';

interface PublicConfig extends OnlineRegistrationConfig {
  maxRegistrations?: number;
}

export default function PublicRegistrationPage() {
  const slug = decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || '');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ status: string; message: string; qrToken?: string; name?: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    cpf: '',
    lgpdAccepted: false
  });

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/public/online-registration/${encodeURIComponent(slug)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Inscrição não encontrada');
        setConfig(data.config);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar inscrição online');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [slug]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/public/online-registration/${encodeURIComponent(slug)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro ao enviar inscrição');
      setResult({
        status: data.status,
        message: data.message,
        qrToken: data.qrToken,
        name: data.registration?.name || form.name
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar inscrição');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="animate-spin" size={18} />
          <span>Carregando inscrição...</span>
        </div>
      </main>
    );
  }

  if (error && !config) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white text-slate-900 rounded-2xl border border-slate-200 p-6 shadow-xl">
          <AlertTriangle className="text-amber-500 mb-3" size={28} />
          <h1 className="text-xl font-black">Inscrição indisponível</h1>
          <p className="text-sm text-slate-600 mt-2">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950">
      <section className="bg-slate-950 text-white">
        {config?.bannerUrl ? (
          <div className="h-56 sm:h-72 bg-cover bg-center" style={{ backgroundImage: `url(${config.bannerUrl})` }} />
        ) : null}
        <div className="max-w-5xl mx-auto px-5 py-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Inscrição Online</p>
          <h1 className="text-3xl sm:text-5xl font-black mt-3">{config?.publicTitle}</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-slate-200">
            <span className="inline-flex items-center gap-2"><Calendar size={16} />{config?.publicDate || 'Data a confirmar'}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={16} />{config?.publicLocation || 'Local a confirmar'}</span>
          </div>
          {config?.publicDescription && <p className="mt-5 max-w-3xl text-slate-300 leading-relaxed">{config.publicDescription}</p>}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-8">
        {result ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <CheckCircle2 className={result.status === 'APROVADA' ? 'text-emerald-500' : 'text-amber-500'} size={36} />
            <h2 className="text-2xl font-black mt-4">{result.status === 'APROVADA' ? 'Inscrição confirmada' : 'Inscrição recebida'}</h2>
            <p className="text-slate-600 mt-2">{result.message}</p>
            {result.qrToken && (
              <div className="mt-6 inline-flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <UserQRCode value={result.qrToken} size={180} frameless />
                <p className="text-xs font-bold text-slate-500 uppercase">Apresente este QR Code no credenciamento</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-5">
            {config?.status !== 'ABERTA' || !config?.enabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                As inscrições não estão abertas neste momento.
              </div>
            ) : null}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2">
                <span className="text-xs font-black uppercase text-slate-500">Nome completo *</span>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-slate-500">E-mail</span>
                <input type="email" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-slate-500">Telefone/WhatsApp *</span>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} required />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-slate-500">Empresa</span>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.company} onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))} />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-slate-500">Cargo</span>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.position} onChange={e => setForm(prev => ({ ...prev, position: e.target.value }))} />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-slate-500">CPF</span>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.cpf} onChange={e => setForm(prev => ({ ...prev, cpf: e.target.value }))} />
              </label>
            </div>

            <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-600" checked={form.lgpdAccepted} onChange={e => setForm(prev => ({ ...prev, lgpdAccepted: e.target.checked }))} required />
              <span>Autorizo o uso dos meus dados para fins de inscrição, credenciamento e comunicação sobre este evento.</span>
            </label>

            <button disabled={submitting || config?.status !== 'ABERTA' || !config?.enabled} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              <span>Enviar inscrição</span>
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
