import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';
import UserQRCode from './UserQRCode';

interface PublicCredentialPageProps {
  token: string;
}

export default function PublicCredentialPage({ token }: PublicCredentialPageProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const viewSessionId = useMemo(() => {
    const key = `credencia_public_view_${token}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = `view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, next);
    return next;
  }, [token]);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/credentials/${encodeURIComponent(token)}`, {
      headers: { 'x-credential-view-session': viewSessionId }
    })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Credencial nao encontrada');
        return body;
      })
      .then(body => {
        if (active) setData(body);
      })
      .catch(err => {
        if (active) setError(err.message || 'Nao foi possivel abrir a credencial.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, viewSessionId]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">Carregando credencial...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white text-slate-900 rounded-2xl p-6 shadow-2xl text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
          <h1 className="text-xl font-black">Credencial indisponivel</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const event = data.event;
  const participant = data.participant;
  const credential = data.credential;
  const credentialQrToken = credential.token || credential.qrPayload;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <section className="w-full max-w-md bg-white text-slate-950 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-5">
          {event.logoUrl && <img src={event.logoUrl} alt={event.name} className="h-12 w-auto object-contain mb-4" />}
          <div className="text-[11px] font-black uppercase tracking-widest text-emerald-300">Credencial digital</div>
          <h1 className="text-2xl font-black mt-1 leading-tight">{event.name}</h1>
          <div className="mt-4 grid gap-2 text-sm text-slate-200">
            <div className="flex items-center gap-2"><Calendar size={15} />{event.date ? new Date(event.date).toLocaleDateString('pt-BR') : 'Data a confirmar'}</div>
            {(event.startTime || event.endTime) && <div className="flex items-center gap-2"><Clock size={15} />{[event.startTime, event.endTime].filter(Boolean).join(' - ')}</div>}
            <div className="flex items-center gap-2"><MapPin size={15} />{event.location || 'Local a confirmar'}</div>
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">Participante</div>
          <h2 className="text-3xl font-black mt-1 leading-tight">{participant.name}</h2>
          {(participant.company || participant.position) && (
            <p className="text-sm text-slate-500 mt-2">{[participant.position, participant.company].filter(Boolean).join(' - ')}</p>
          )}
          <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">{participant.category}</div>

          <div className="mt-6 flex justify-center">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              <UserQRCode value={credentialQrToken} size={230} frameless />
            </div>
          </div>
          <div className="mt-3 font-mono text-xs text-slate-500 break-all">{participant.ticketCode}</div>
        </div>

        <div className="border-t border-slate-100 p-5 bg-slate-50">
          <div className="flex items-start gap-3 text-sm text-slate-700">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
            <p>Apresente este QR Code na entrada do evento para realizar o credenciamento.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
