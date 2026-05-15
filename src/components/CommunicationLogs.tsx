import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { MessageSquare, Phone, Send, Mail, Map, Sparkles, User, Construction } from 'lucide-react';
import { Communication, Contact } from '../types.ts';

export default function CommunicationLogs() {
  const [logs, setLogs] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState({ contactId: '', type: 'Call', content: '' });
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    const unsubLogs = onSnapshot(query(collection(db, 'communications'), orderBy('timestamp', 'desc'), limit(50)), 
      (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as Communication))),
      (err) => handleFirestoreError(err, OperationType.GET, 'communications')
    );
    const unsubContacts = onSnapshot(collection(db, 'contacts'), 
      (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as Contact))),
      (err) => handleFirestoreError(err, OperationType.GET, 'contacts')
    );
    return () => { unsubLogs(); unsubContacts(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'communications';
    try {
      await addDoc(collection(db, path), {
        ...newLog,
        sender: 'Self',
        timestamp: serverTimestamp()
      });
      setIsAdding(false);
      setNewLog({ contactId: '', type: 'Call', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const getAiSummary = async () => {
    setIsSummarizing(true);
    try {
      const logsText = logs.map(l => `[${l.type}] ${contacts.find(c => c.id === l.contactId)?.name}: ${l.content}`).join('\n');
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
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Всего зафиксировано контактов: {logs.length}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
           <button 
            onClick={getAiSummary}
            disabled={isSummarizing || logs.length === 0}
            className="flex-1 md:flex-none border-2 border-brand text-brand bg-bg px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic neo-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
           >
            <Sparkles className="w-5 h-5 text-brand/60" />
            {isSummarizing ? 'АНАЛИЗ...' : 'AI ПЕРСПЕКТИВА'}
           </button>
           <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 md:flex-none bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
           >
            <MessageSquare className="w-5 h-5" />
            ЛОГИРОВАТЬ КОНТАКТ
           </button>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-brand text-white p-8 md:p-12 relative overflow-hidden neo-shadow transform -rotate-1">
           <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
             <Sparkles className="w-64 h-64 -translate-y-16 translate-x-16" />
           </div>
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-8 border-b border-white/20 pb-4">
               <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] italic text-gray-400 flex items-center gap-3">
                 <Sparkles className="w-5 h-5" />
                 ИНТЕЛЛЕКТУАЛЬНЫЙ АНАЛИЗ ГЕНЕРАТИВНОГО ИИ
               </h3>
               <button onClick={() => setAiSummary('')} className="p-2 hover:bg-white/10 transition-all">
                  <Send className="w-5 h-5 hover:rotate-90 transition-all" />
               </button>
             </div>
             <div className="text-xs md:text-base font-mono leading-relaxed max-w-4xl whitespace-pre-wrap font-medium">{aiSummary}</div>
           </div>
        </div>
      )}

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative">
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center rotate-12">
             <MessageSquare className="w-6 h-6" />
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
                 <button type="submit" className="bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm">ЗАФИКСИРОВАТЬ</button>
                 <button type="button" onClick={() => setIsAdding(false)} className="border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors uppercase">ОТМЕНА</button>
              </div>
           </form>
         </div>
      )}

      <div className="space-y-10 md:ml-12 md:border-l-4 border-brand/10">
        {logs.map((log, i) => {
          const contact = contacts.find(c => c.id === log.contactId);
          return (
            <div key={log.id} className="relative md:pl-16">
              <div className="hidden md:flex absolute left-0 top-10 -translate-x-1/2 w-12 h-12 bg-white border-4 border-brand items-center justify-center neo-shadow-sm transform rotate-45 group">
                 <div className="-rotate-45">
                   {log.type === 'Call' && <Phone className="w-5 h-5" />}
                   {log.type === 'Email' && <Mail className="w-5 h-5" />}
                   {log.type === 'Visit' && <Map className="w-5 h-5" />}
                   {(log.type === 'WhatsApp' || log.type === 'Telegram') && <MessageSquare className="w-5 h-5" />}
                 </div>
              </div>
              <div className="bg-white border-2 border-brand p-6 md:p-8 group hover:translate-x-2 hover:neo-shadow transition-all shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] md:shadow-none">
                 <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 border-b-2 border-brand/5 pb-4">
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm font-black uppercase tracking-[0.2em] italic text-brand underline mb-2 truncate">
                        {contact?.name || 'НЕИЗВЕСТНЫЙ УЧАСТНИК'} 
                        <span className="no-underline text-gray-400 ml-3 font-mono text-[9px] md:text-[10px] bg-bg px-2 py-0.5 border border-brand/5">({roleMap[contact?.role || ''] || contact?.role || 'Н/Д'})</span>
                      </div>
                      <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-mono font-bold italic">
                         {log.timestamp && (log.timestamp as any).toDate ? (log.timestamp as any).toDate().toLocaleString('ru-RU') : 'СИНХРОНИЗАЦИЯ...'}
                      </div>
                    </div>
                    <div className="text-[9px] md:text-[11px] font-black uppercase italic tracking-[0.2em] bg-brand text-white px-3 py-1.5 border-2 border-brand shadow-sm transform -rotate-2">
                      {protocolMap[log.type] || log.type}
                    </div>
                 </div>
                 <p className="text-sm md:text-base italic text-gray-700 leading-relaxed max-w-4xl break-words font-medium">{log.content}</p>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="md:pl-16 h-60 flex flex-col items-center justify-center md:items-start space-y-4">
            <div className="w-16 h-16 bg-bg border-2 border-brand flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-200" />
            </div>
            <div className="uppercase tracking-[0.3em] font-black italic text-gray-300 text-sm">ИНТЕРВЕНЦИИ НЕ ЗАФИКСИРОВАНЫ</div>
          </div>
        )}
      </div>
    </div>

  );
}
