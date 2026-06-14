import React from 'react';
import { User, UserRole } from '../types';
import { motion } from 'motion/react';
import { UserCheck, ShieldAlert, Clock, AlertCircle } from 'lucide-react';

interface UsersListProps {
  id?: string;
  users: User[];
  isLoading?: boolean;
  error?: string | null;
}

export default function UsersList({ id, users, isLoading = false, error = null }: UsersListProps) {
  // Take last 5 registered users
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getRoleBadge = (role: UserRole) => {
    const roleUpper = String(role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPERVISOR') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-150">
          <ShieldAlert size={10} />
          {roleUpper === 'SUPERVISOR' ? 'Supervisor' : 'Administrador'}
        </span>
      );
    }
    if (roleUpper === 'CHECKIN_CADASTRO') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150">
          <UserCheck size={10} />
          Check-in + Cadastro
        </span>
      );
    }
    if (roleUpper === 'CHECKIN') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-150">
          <UserCheck size={10} />
          Check-in Apenas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-705 text-slate-700 border border-slate-150">
        <UserCheck size={10} />
        Atendente ({role})
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-[400px]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 mt-4 space-y-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-50 rounded-xl animate-pulse">
              <div className="w-10 h-10 bg-slate-205 bg-slate-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-150 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center items-center text-center h-[400px]">
        <AlertCircle className="text-rose-500 mb-3" size={36} />
        <h4 className="font-bold text-slate-800 text-sm">Falha ao Carregar Operadores</h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col h-[400px]">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
        <div>
          <h3 className="font-bold text-slate-800 tracking-tight text-base font-display">Operadores Recentes</h3>
          <p className="text-xs text-slate-500">Últimos usuários registrados na plataforma</p>
        </div>
        <span className="text-[11px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-full shrink-0">
          Ativos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {recentUsers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <UserCheck className="text-slate-300 mb-2" size={32} />
            <p className="text-xs text-slate-400 font-medium">Nenhum operador registrado no momento.</p>
          </div>
        ) : (
          recentUsers.map((user, idx) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100/40 rounded-xl border border-slate-105 border-slate-100 transition duration-150 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Dynamically Styled Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-150 bg-slate-200/60 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-indigo-100 group-hover:text-indigo-700 group-hover:border-indigo-200 transition duration-150">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-slate-900 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-450 text-slate-500 font-medium truncate mt-0.5 leading-none">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-1">
                {getRoleBadge(user.role)}
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-slate-400 mt-1">
                  <Clock size={11} className="text-slate-300 scale-95" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
