import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { MapPin, Plus, Plane, Navigation, Construction, Calendar } from 'lucide-react';
import { TravelLog, Project } from '../types.ts';

export default function TravelLogs() {
  const [logs, setLogs] = useState<TravelLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState({ destination: '', purpose: '', date: new Date().toISOString().split('T')[0], cost: 0, projectId: '' });

  useEffect(() => {
    const q = query(collection(db, 'travelLogs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as TravelLog))), (err) => handleFirestoreError(err, OperationType.GET, 'travelLogs'));
    onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), (err) => handleFirestoreError(err, OperationType.GET, 'projects'));
    return () => unsubLogs();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'travelLogs';
    try {
      await addDoc(collection(db, path), { 
        ...newLog, 
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp() 
      });
      setIsAdding(false);
      setNewLog({ destination: '', purpose: '', date: new Date().toISOString().split('T')[0], cost: 0, projectId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">РЕЕСТР ПЕРЕМЕЩЕНИЙ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Логи мобильности развертывания</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          ЛОГИРОВАТЬ ВЫЕЗД
        </button>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative">
           <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 border-2 border-brand">
             <MapPin className="w-6 h-6" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">НОВАЯ ЗАПИСЬ О ПЕРЕМЕЩЕНИИ</h3>
           <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Пункт назначения</label>
                  <input required value={newLog.destination} onChange={e => setNewLog({...newLog, destination:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Город или Название объекта" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Дата</label>
                  <input type="date" required value={newLog.date} onChange={e => setNewLog({...newLog, date:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Связанный проект</label>
                  <select value={newLog.projectId} onChange={e => setNewLog({...newLog, projectId:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Общая поездка</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Расход (₽)</label>
                  <input type="number" value={newLog.cost} onChange={e => setNewLog({...newLog, cost:Number(e.target.value)})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Цель миссии</label>
                <input required value={newLog.purpose} onChange={e => setNewLog({...newLog, purpose:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Пример: Переговоры по контракту, аудит объекта" />
              </div>
              <div className="flex gap-4 md:gap-8 pt-4">
                 <button type="submit" className="flex-1 bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm uppercase">ЗАРЕГИСТРИРОВАТЬ</button>
                 <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors uppercase">ОТМЕНА</button>
              </div>
           </form>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
         {logs.map((log) => (
           <div key={log.id} className="bg-white border-2 border-brand p-8 neo-shadow hover:translate-y-[-8px] hover:shadow-brand transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rotate-45 translate-x-12 -translate-y-12"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div className="w-14 h-14 bg-bg border-2 border-brand flex items-center justify-center neo-shadow-sm group-hover:bg-brand group-hover:text-white transition-all transform rotate-6">
                    <Plane className="w-7 h-7" />
                 </div>
                 <div className="bg-brand text-white px-3 py-1 border-2 border-brand text-[10px] font-black uppercase tracking-widest font-mono italic shadow-sm transform -rotate-12">{log.date}</div>
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-3 leading-none group-hover:text-brand transition-colors">{log.destination}</h3>
              <p className="text-sm italic text-gray-500 mb-8 border-l-4 border-brand/20 pl-4 py-1 leading-relaxed font-medium">{log.purpose}</p>
              
              <div className="flex items-center justify-between pt-6 border-t-2 border-brand/10 relative z-10">
                <div className="flex items-center gap-3 text-[10px] uppercase font-black text-gray-400 italic bg-bg px-2 py-1 border border-brand/5">
                   <Construction className="w-4 h-4 text-brand" />
                   {projects.find(p => p.id === log.projectId)?.name || 'ОБЩИЕ'}
                </div>
                <div className="text-lg font-black font-mono italic text-brand">{log.cost || 0} ₽</div>
              </div>
           </div>
         ))}
         {logs.length === 0 && (
           <div className="col-span-full p-24 text-center border-4 border-dashed border-brand/20 bg-white/50 neo-shadow flex flex-col items-center justify-center space-y-6">
             <div className="w-20 h-20 bg-bg border-2 border-brand mx-auto flex items-center justify-center">
              <Navigation className="w-10 h-10 text-gray-200" />
            </div>
             <div className="text-sm uppercase tracking-[0.4em] font-black text-gray-300 italic text-center">ЗАПИСИ О ПЕРЕМЕЩЕНИЯХ В РЕЕСТРЕ ОТСУТСТВУЮТ</div>
           </div>
         )}
      </div>
    </div>

  );
}
