import React from 'react';
import { CheckCircle2, Clock, Info, MapPinned, PackageCheck } from 'lucide-react';
import type { CloakroomItem } from '../../types';

export interface CloakroomStoragePosition {
  rackId: string;
  rackName: string;
  column: string;
  row: string;
  address: string;
}

interface CloakroomMapProps {
  rackId: string;
  rackName: string;
  columns: string[];
  rows: string[];
  items: CloakroomItem[];
  selectedAddress: string;
  suggestedAddress: string;
  onSelectPosition: (position: CloakroomStoragePosition) => void;
  readOnly?: boolean;
}

const buildAddress = (column: string, row: string) => `${column}${row}`;

export default function CloakroomMap({
  rackId,
  rackName,
  columns,
  rows,
  items,
  selectedAddress,
  suggestedAddress,
  onSelectPosition,
  readOnly = false
}: CloakroomMapProps) {
  const occupiedEntries = items
    .filter(item => item.status === 'guardado')
    .flatMap(item => {
      if (Array.isArray(item.volumes) && item.volumes.length > 0) {
        return item.volumes
          .filter(volume => volume.storageAddress && (volume.storageRackId || item.storageRackId || 'principal') === rackId)
          .map(volume => ({
            address: volume.storageAddress as string,
            item,
            description: volume.description,
            tag: volume.tag
          }));
      }

      return item.storageAddress && (item.storageRackId || 'principal') === rackId
        ?[{ address: item.storageAddress, item, description: item.itemDescription, tag: String(item.tagNumber) }]
        : [];
    });

  const occupiedByAddress = new Map(occupiedEntries.map(entry => [entry.address, entry]));
  const selectedItem = occupiedByAddress.get(selectedAddress);
  const selectedColumn = selectedAddress.match(/^[A-Z]+/)?.[0] || '-';
  const selectedRow = selectedAddress.match(/\d+$/)?.[0] || '-';
  const latestItems = items
    .filter(item => (
      (item.storageAddress === selectedAddress && (item.storageRackId || 'principal') === rackId)
      || item.volumes?.some(volume => volume.storageAddress === selectedAddress && (volume.storageRackId || item.storageRackId || 'principal') === rackId)
    ))
    .slice(0, 3);
  const isSelectedOccupied = Boolean(selectedItem);

  const selectAddress = (column: string, row: string) => {
    onSelectPosition({
      rackId,
      rackName,
      column,
      row,
      address: buildAddress(column, row)
    });
  };

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[1fr_300px] gap-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Mapa da Chapelaria</p>
            <h3 className="text-lg font-black text-slate-950 mt-1">Estante {rackName}</h3>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="block text-[10px] font-black uppercase tracking-wider">Próxima posição livre</span>
            <b className="font-mono text-lg">{suggestedAddress || '-'}</b>
          </div>
        </div>

        <div className="mt-4 overflow-auto pb-1">
          <div
            className="grid gap-1 min-w-max"
            style={{ gridTemplateColumns: `42px repeat(${columns.length}, minmax(42px, 1fr))` }}
          >
            <div />
            {columns.map(column => (
              <div key={column} className="h-8 flex items-center justify-center text-xs font-black text-slate-500">
                {column}
              </div>
            ))}
            {rows.map(row => (
              <React.Fragment key={row}>
                <div className="h-10 flex items-center justify-center text-xs font-black text-slate-500">
                  {row}
                </div>
                {columns.map(column => {
                  const address = buildAddress(column, row);
                  const item = occupiedByAddress.get(address);
                  const isSelected = selectedAddress === address;
                  const isSuggested = suggestedAddress === address;
                  const statusClass = item
                    ?'bg-rose-50 border-rose-300 text-rose-700'
                    : isSelected
                      ?'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-100'
                      : isSuggested
                        ?'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-white border-emerald-200 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50';

                  return (
                    <button
                      key={address}
                      type="button"
                      onClick={() => {
                        if (readOnly) return;
                        selectAddress(column, row);
                      }}
                      className={`h-10 min-w-10 rounded-lg border text-[11px] font-black transition ${readOnly ?'cursor-default' : 'cursor-pointer'} ${statusClass}`}
                      title={item ?`${address} ocupado por ${item.item.participantName}` : `${address} livre`}
                    >
                      {address}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1"><span className="w-3 h-3 rounded bg-white border border-emerald-400" />Livre</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-400" />Ocupado</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />Reservado</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-500" />Selecionado</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />Indisponível</span>
        </div>
      </div>

      <aside className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Posição selecionada</p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-950 text-white p-4">
            <div>
              <b className="block font-mono text-3xl">{selectedAddress || '-'}</b>
              <span className="text-xs text-slate-300">{rackName}</span>
            </div>
            <MapPinned size={30} className="text-emerald-300" />
          </div>
        </div>

        <div className={`rounded-xl border p-3 ${isSelectedOccupied ?'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-center gap-2 font-black">
            {isSelectedOccupied ?<Info size={18} /> : <CheckCircle2 size={18} />}
            <span>Status: {isSelectedOccupied ?'Ocupado' : 'Livre'}</span>
          </div>
          {selectedItem && (
            <p className="mt-2 text-xs font-semibold">
              Ticket #{selectedItem.item.tagNumber} - {selectedItem.item.participantName}
              <span className="block font-mono">{selectedItem.tag}</span>
            </p>
          )}
        </div>

        {!readOnly ?(
          <button
            type="button"
            disabled={isSelectedOccupied || !selectedAddress}
            onClick={() => {
              if (!selectedAddress) return;
              const column = selectedColumn === '-' ?columns[0] : selectedColumn;
              const row = selectedRow === '-' ?rows[0] : selectedRow;
              selectAddress(column, row);
            }}
            className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-black transition cursor-pointer disabled:cursor-not-allowed"
          >
            Usar esta posição
          </button>
        ) :(
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            Alocação automática ativa
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Detalhes</p>
          <div className="mt-3 space-y-2 text-slate-700">
            <div className="flex justify-between gap-3"><span>Estante</span><b>{rackName}</b></div>
            <div className="flex justify-between gap-3"><span>Coluna</span><b>{selectedColumn}</b></div>
            <div className="flex justify-between gap-3"><span>Linha</span><b>{selectedRow}</b></div>
            <div className="flex justify-between gap-3"><span>Endereço</span><b className="font-mono">{selectedAddress || '-'}</b></div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Últimos itens armazenados</p>
          </div>
          <div className="mt-3 space-y-2">
            {latestItems.length === 0 ?(
              <p className="text-sm text-slate-400">Nenhum histórico</p>
            ) : latestItems.map(item => (
              <div key={item.id} className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <PackageCheck size={14} className="text-emerald-600" />
                  <span>Ticket {item.tagNumber}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.participantName}</p>
                <p className="text-[11px] text-slate-400">{item.itemDescription || 'Sem descrição'}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
