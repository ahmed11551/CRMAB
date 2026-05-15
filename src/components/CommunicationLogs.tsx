import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { MessageSquare, Phone, Send, Mail, Map, Sparkles, User, Construction, Search, Filter, X, Trash2, Clock, Plus } from 'lucide-react';
import { Communication, Contact } from '../types.ts';

export default function CommunicationLogs({ userName }: { userName?: string }) {
  const [logs, setLogs] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [contactFilter, setContactFilter] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [newLog, setNewLog] = useState({ 
    contactId: '', 
    type: 'Call' as const, 
    content: '' 
  });

  useEffect(() => {
    const unsubLogs = onSnapshot(query(collection(db, 'communications'), orderBy('timestamp', 'desc'), limit(100)), 
      (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as Communication))),
      (err) => handleFirestoreError(err, OperationType.GET, 'communications')
    );
    const unsubContacts = onSnapshot(collection(db, 'contacts'), 
      (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as Contact))),
      (err) => handleFirestoreError(err, OperationType.GET, 'contacts')
    );
    return () => { unsubLogs(); unsubContacts(); };
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (typeFilter) {
      result = result.filter(log => log.type === typeFilter);
    }

    if (contactFilter) {
      result = result.filter(log => log.contactId === contactFilter);
    }

    const search = searchQuery.toLowerCase().trim();
    if (search) {
      result = result.filter(log => {
        const contactName = contacts.find(c => c.id === log.contactId)?.name || '';
        return log.content.toLowerCase().includes(search) || contactName.toLowerCase().includes(search);
      });
    }

    return result;
  }, [logs, typeFilter, contactFilter, searchQuery, contacts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'communications';
    try {
      await addDoc(collection(db, path), {
        ...newLog,
        sender: userName || 'Self',
        timestamp: serverTimestamp()
      });
      setIsAdding(false);
      setNewLog({ contactId: '', type: 'Call', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить эту запись из журнала?')) return;
    try {
      await deleteDoc(doc(db, 'communications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `communications/${id}`);
    }
  };

  const getAiSummary = async () => {
    setIsSummarizing(true);
    try {
      const logsText = logs.slice(0, 20).map(l => `[${l.type}] ${contacts.find(c => c.id === l.contactId)?.name}: ${l.content}`).join('\n');
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsText })
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) { console.error(err); }
    finally { setIsSummarizing(false); }
  };

  const protocolMap: Record<string, string> = {
    'Call': 'Звонок',
    'WhatsApp': 'WhatsApp',
    'Telegram': 'Telegram',
    'Email': 'Email',
    'Visit': 'Визит'
  };

  const roleMap: Record<string, string> = {
    'Contractor': 'Подрядчик',
    'Client': 'Клиент',
    'Team': 'Команда',
    'Vendor': 'Поставщик'
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ЖУРНАЛ СВЯЗИ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Контроль оперативных потоков: {logs.length} Записей</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
           <button 
            onClick={getAiSummary}
            disabled={isSummarizing || logs.length === 0}
            className="flex-1 md:flex-none border-4 border-brand text-brand bg-bg px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic neo-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
           >
            <Sparkles className={`w-5 h-5 text-brand ${isSummarizing ? 'animate-spin' : ''}`} />
            {isSummarizing ? 'АНАЛИЗ...' : 'AI SWOT АНАЛИЗ'}
           </button>
           <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 md:flex-none bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
           >
            <Plus className="w-5 h-5" />
            ФИКСАЦИЯ КОНТАКТА
           </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по содержанию и контактам..." 
              className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12 min-w-[150px]"
            >
              <option value="">ВСЕ ТИПЫ</option>
              {Object.entries(protocolMap).map(([key, label]) => (
                <option key={key} value={key}>{label.toUpperCase()}</option>
              ))}
            </select>
            <select 
              value={contactFilter || ''}
              onChange={(e) => setContactFilter(e.target.value || null)}
              className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12 min-w-[150px]"
            >
              <option value="">ВСЕ КОНТАКТЫ</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-brand text-white p-10 md:p-14 relative overflow-hidden neo-shadow group animate-in fade-in slide-in-from-top-6 duration-500">
           <div className="absolute top-0 right-0 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
             <Sparkles className="w-96 h-96 -translate-y-16 translate-x-16 rotate-12" />
           </div>
           <div className="relative z-10 max-w-5xl">
             <div className="flex justify-between items-start mb-10 border-b-2 border-white/20 pb-6">
               <h3 className="text-sm md:text-base font-black uppercase tracking-[0.4em] italic flex items-center gap-4">
                 <Sparkles className="w-6 h-6 animate-pulse" />
                 ИНТЕЛЛЕКТУАЛЬНЫЙ СИНТЕЗ ОПЕРАЦИОННОЙ ОБСТАНОВКИ
               </h3>
               <button onClick={() => setAiSummary('')} className="p-3 hover:bg-white/10 transition-all border-2 border-white/20 hover:border-white">
                  <X className="w-6 h-6" />
               </button>
             </div>
             <div className="text-sm md:text-lg font-mono leading-loose whitespace-pre-wrap font-black uppercase tracking-tight italic bg-white/5 p-6 border border-white/10">{aiSummary}</div>
           </div>
        </div>
      )}

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
           <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
           </button>
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 border-2 border-brand neo-shadow-sm">
             <Send className="w-6 h-6" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">ФИКСАЦИЯ КОММУНИКАЦИИ</h3>
           <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Участник</label>
                  <select required value={newLog.contactId} onChange={e => setNewLog({...newLog, contactId:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Выберите контакт</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({roleMap[c.role] || c.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Протокол связи</label>
                  <select value={newLog.type} onChange={e => setNewLog({...newLog, type:e.target.value as any})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="Call">Звонок</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Email">Email</option>
                    <option value="Visit">Визит</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Контекст передачи</label>
                <textarea required rows={4} value={newLog.content} onChange={e => setNewLog({...newLog, content:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none resize-none focus:bg-white transition-colors" placeholder="Детали разговора, согласованные условия, обновления..." />
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-8 pt-4">
                 <button type="submit" className="bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm uppercase">ЗАФИКСИРОВАТЬ</button>
                 <button type="button" onClick={() => setIsAdding(false)} className="border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors uppercase">ОТМЕНА</button>
              </div>
           </form>
         </div>
      )}

      <div className="space-y-12 md:ml-12 md:border-l-8 border-brand/10">
        {filteredLogs.map((log) => {
          const contact = contacts.find(c => c.id === log.contactId);
          return (
            <div key={log.id} className="relative md:pl-20 animate-in fade-in slide-in-from-left-6 duration-500 group/item">
              <div className="hidden md:flex absolute left-0 top-12 -translate-x-1/2 w-14 h-14 bg-white border-4 border-brand items-center justify-center neo-shadow-sm transform rotate-45 group-hover/item:bg-brand group-hover/item:text-white transition-all duration-300">
                 <div className="-rotate-45">
                   {log.type === 'Call' && <Phone className="w-6 h-6" />}
                   {log.type === 'Email' && <Mail className="w-6 h-6" />}
                   {log.type === 'Visit' && <Map className="w-6 h-6" />}
                   {(log.type === 'WhatsApp' || log.type === 'Telegram') && <MessageSquare className="w-6 h-6" />}
                 </div>
              </div>
              <div className="bg-white border-4 border-brand p-8 md:p-12 hover:translate-x-2 transition-all group-hover/item:neo-shadow shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] md:shadow-none font-black italic relative">
                 <button 
                   onClick={() => handleDelete(log.id)}
                   className="absolute top-4 right-4 p-3 text-gray-200 hover:text-red-600 transition-all opacity-0 group-hover/item:opacity-100"
                 >
                   <Trash2 className="w-6 h-6" />
                 </button>
                 
                 <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 border-b-4 border-brand/5 pb-6">
                    <div className="min-w-0">
                      <div className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-brand underline mb-3 truncate group-hover/item:no-underline transition-all">
                        {contact?.name || 'НЕИЗВЕСТНЫЙ УЧАСТНИК'} 
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] md:text-[11px] font-black italic text-gray-400 bg-bg px-3 py-1 border-2 border-brand/10 uppercase tracking-widest">{roleMap[contact?.role || ''] || contact?.role || 'ЛИНЕЙНЫЙ ТИП'}</span>
                        <div className="text-[10px] md:text-[11px] uppercase tracking-widest text-gray-300 font-mono font-black italic flex items-center gap-2">
                           <Clock className="w-4 h-4" />
                           {log.timestamp && (log.timestamp as any).toDate ? (log.timestamp as any).toDate().toLocaleString('ru-RU') : 'СИНХРОНИЗАЦИЯ...'}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] md:text-xs font-black uppercase italic tracking-[0.3em] bg-brand text-white px-5 py-2.5 border-4 border-brand shadow-sm transform -rotate-3 group-hover/item:rotate-0 transition-transform">
                      {protocolMap[log.type] || log.type}
                    </div>
                 </div>
                 <div className="text-base md:text-xl italic text-gray-700 leading-loose max-w-5xl break-words font-black uppercase tracking-tighter">
                   {log.content}
                 </div>
              </div>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="md:pl-20 h-80 flex flex-col items-center justify-center space-y-10 text-center animate-pulse">
            <div className="w-24 h-24 bg-bg border-4 border-dashed border-brand/20 flex items-center justify-center rotate-45">
              <MessageSquare className="w-12 h-12 text-gray-200 -rotate-45" />
            </div>
            <div className="uppercase tracking-[0.8em] font-black italic text-gray-300 text-lg">КАНАЛЫ СВЯЗИ СВОБОДНЫ // ЛОГИ НЕ ОБНАРУЖЕНЫ</div>
          </div>
        )}
      </div>
    </div>
  );
}
