import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import UserQRCode from '../components/UserQRCode';
import { OnlineRegistrationConfig, OnlineRegistrationField } from '../types';

interface PublicConfig extends OnlineRegistrationConfig {
  maxRegistrations?: number;
}

const defaultOnlineFields = (): OnlineRegistrationField[] => [
  { id: 'orf_name', key: 'name', label: 'Nome completo', type: 'text', required: true, visible: true, system: true, order: 1 },
  { id: 'orf_email', key: 'email', label: 'E-mail', type: 'email', required: true, visible: true, system: true, order: 2 },
  { id: 'orf_phone', key: 'phone', label: 'Telefone/WhatsApp', type: 'tel', required: true, visible: true, system: true, order: 3 },
  { id: 'orf_company', key: 'company', label: 'Empresa', type: 'text', required: false, visible: true, system: true, order: 4 },
  { id: 'orf_position', key: 'position', label: 'Cargo', type: 'text', required: false, visible: true, system: true, order: 5 },
  { id: 'orf_cpf', key: 'cpf', label: 'CPF', type: 'text', required: false, visible: true, system: true, order: 6 }
];

type PublicRegistrationResult = {
  status: string;
  message: string;
  qrToken?: string;
  registration?: {
    name?: string;
    email?: string;
  };
  emailDelivery?: {
    status?: string;
  };
};

export default function PublicRegistrationPage() {
  const slug = decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] || '');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PublicRegistrationResult | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  const fields = (config?.fields?.length ? config.fields : defaultOnlineFields())
    .map(field => field.key === 'email' ? { ...field, type: 'email' as const, required: true, visible: true } : field)
    .filter(field => field.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

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
        body: JSON.stringify({ fields: form, lgpdAccepted })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro ao enviar inscrição');
      setResult({
        status: data.status,
        message: data.message,
        qrToken: data.qrToken,
        registration: {
          name: data.registration?.name || form.name,
          email: data.registration?.email || form.email
        },
        emailDelivery: {
          status: data.emailDelivery?.status
        }
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
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${result.status === 'APROVADA' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
              <CheckCircle2 size={34} />
            </div>

            {result.status === 'APROVADA' ? (
              <>
                <h2 className="mt-5 text-2xl font-black sm:text-3xl">Inscrição confirmada!</h2>
                {result.emailDelivery?.status === 'ENVIADO' ? (
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                    Sua inscrição foi aprovada e enviamos a confirmação para:
                    <strong className="mt-1 block text-slate-950">{result.registration?.email || form.email}</strong>
                  </p>
                ) : (
                  <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                    Sua inscrição foi aprovada, mas não conseguimos enviar o e-mail neste momento. Salve este QR Code ou acesse sua credencial pelo botão abaixo.
                  </div>
                )}

                {result.qrToken && (
                  <div className="mx-auto mt-6 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <UserQRCode value={result.qrToken} size={190} frameless />
                    <p className="text-sm font-semibold leading-6 text-slate-600">
                      Apresente o QR Code abaixo no credenciamento. Você também pode acessar sua credencial pelo botão abaixo.
                    </p>
                    <a
                      href={`/convite/${encodeURIComponent(result.qrToken)}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                    >
                      Acessar minha credencial
                    </a>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="mt-5 text-2xl font-black sm:text-3xl">Inscrição recebida!</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                  Sua inscrição está aguardando aprovação. Assim que for aprovada, você receberá a confirmação e sua credencial por e-mail.
                </p>
              </>
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
              {fields.map(field => (
                <label key={field.key} className={field.key === 'name' ? 'sm:col-span-2' : ''}>
                  <span className="text-xs font-black uppercase text-slate-500">{field.label}{field.required ? ' *' : ''}</span>
                  {field.type === 'select' ? (
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      value={form[field.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                    >
                      <option value="">Selecione</option>
                      {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-600"
                        checked={form[field.key] === true}
                        onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.checked }))}
                        required={field.required}
                      />
                      {field.label}
                    </span>
                  ) : (
                    <input
                      type={field.type === 'tel' ? 'tel' : field.type}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      value={form[field.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                    />
                  )}
                </label>
              ))}
            </div>

            <label className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-600" checked={lgpdAccepted} onChange={e => setLgpdAccepted(e.target.checked)} required />
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
