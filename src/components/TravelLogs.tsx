import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { MapPin, Plus, Plane, Navigation, Construction, Calendar, Search, Filter, X, Globe, Footprints, Trash2 } from 'lucide-react';
import { TravelLog, Project } from '../types.ts';

export default function TravelLogs() {
  const [logs, setLogs] = useState<TravelLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  
  const [newLog, setNewLog] = useState({ 
    destination: '', 
    purpose: '', 
    date: new Date().toISOString().split('T')[0], 
    cost: 0, 
    projectId: '' 
  });

  useEffect(() => {
    const q = query(collection(db, 'travelLogs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as TravelLog))), (err) => handleFirestoreError(err, OperationType.GET, 'travelLogs'));
    onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), (err) => handleFirestoreError(err, OperationType.GET, 'projects'));
    return () => unsubLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (projectFilter) {
      result = result.filter(log => log.projectId === projectFilter);
    }

    const search = searchQuery.toLowerCase().trim();
    if (search) {
      result = result.filter(log => 
        log.destination.toLowerCase().includes(search) ||
        log.purpose.toLowerCase().includes(search) ||
        (projects.find(p => p.id === log.projectId)?.name || '').toLowerCase().includes(search)
      );
    }

    return result;
  }, [logs, projectFilter, searchQuery, projects]);

  const stats = useMemo(() => {
    return {
      totalCost: logs.reduce((acc, log) => acc + (log.cost || 0), 0),
      totalTrips: logs.length,
      uniqueDestinations: new Set(logs.map(log => log.destination)).size
    };
  }, [logs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'travelLogs';
    try {
      await addDoc(collection(db, path), { 
        ...newLog, 
        cost: Number(newLog.cost),
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp() 
      });
      setIsAdding(false);
      setNewLog({ destination: '', purpose: '', date: new Date().toISOString().split('T')[0], cost: 0, projectId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить эту запись из реестра?')) return;
    try {
      await deleteDoc(doc(db, 'travelLogs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `travelLogs/${id}`);
    }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">РЕЕСТР ПЕРЕМЕЩЕНИЙ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Логи мобильности стратегических выездов</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          ЛОГИРОВАТЬ ВЫЕЗД
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
         <div className="bg-white border-4 border-brand p-8 neo-shadow relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rotate-45 translate-x-12 -translate-y-12"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">ЛОГИСТИЧЕСКИЕ ЗАТРАТЫ</div>
              <Globe className="w-6 h-6 text-brand" />
            </div>
            <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter">{stats.totalCost.toLocaleString()} ₽</div>
         </div>
         <div className="bg-white border-4 border-brand p-8 neo-shadow relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rotate-45 translate-x-12 -translate-y-12"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">ОПЕРАТИВНЫЕ ВЫЕЗДЫ</div>
              <Navigation className="w-6 h-6 text-brand" />
            </div>
            <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter uppercase">{stats.totalTrips} МИССИЙ</div>
         </div>
         <div className="bg-white border-4 border-brand p-8 neo-shadow relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rotate-45 translate-x-12 -translate-y-12"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">ГЕОГРАФИЯ ОХВАТА</div>
              <MapPin className="w-6 h-6 text-brand" />
            </div>
            <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter uppercase">{stats.uniqueDestinations} ТОЧЕК</div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по маршрутам и целям..." 
            className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
          />
        </div>
        <select 
          value={projectFilter || ''}
          onChange={(e) => setProjectFilter(e.target.value || null)}
          className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12 min-w-[200px]"
        >
          <option value="">ВСЕ ОБЪЕКТЫ</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
           <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
           </button>
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 border-2 border-brand neo-shadow-sm">
             <Footprints className="w-6 h-6" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
         {filteredLogs.map((log) => (
           <div key={log.id} className="bg-white border-4 border-brand p-10 neo-shadow hover:translate-y-[-10px] hover:shadow-brand-strong transition-all group overflow-hidden relative animate-in fade-in zoom-in-95 duration-500 font-black">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rotate-45 translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-10 relative z-10">
                 <div className="w-16 h-16 bg-bg border-4 border-brand flex items-center justify-center neo-shadow-sm group-hover:bg-brand group-hover:text-white group-hover:rotate-0 transition-all transform rotate-12 duration-500">
                    <Plane className="w-8 h-8" />
                 </div>
                 <div className="bg-brand text-white px-4 py-2 border-4 border-brand text-[11px] font-black uppercase tracking-widest font-mono italic shadow-sm transform -rotate-6 group-hover:rotate-0 transition-transform">{log.date}</div>
              </div>
              
              <div className="flex flex-col gap-2 mb-8">
                <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none group-hover:text-brand transition-colors truncate">{log.destination}</h3>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black italic flex items-center gap-2">
                   <Construction className="w-4 h-4 text-brand" />
                   {projects.find(p => p.id === log.projectId)?.name || 'ОПЕРАЦИОННЫЙ ОВЕРХЕД'}
                </div>
              </div>

              <div className="relative mb-10 group-hover:translate-x-1 transition-transform duration-500">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-brand/10"></div>
                <p className="text-sm md:text-base italic text-gray-500 py-1 pl-6 leading-relaxed font-black uppercase tracking-tight">{log.purpose}</p>
              </div>
              
              <div className="flex items-center justify-between pt-8 border-t-4 border-brand/10 relative z-10">
                <div className="text-2xl font-black font-mono italic text-brand tracking-tighter group-hover:scale-110 transition-transform duration-500">{log.cost || 0} ₽</div>
                <button 
                  onClick={() => handleDelete(log.id)}
                  className="p-3 border-2 border-transparent hover:border-red-600 hover:text-red-600 text-gray-200 transition-all hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
           </div>
         ))}
         {filteredLogs.length === 0 && (
           <div className="col-span-full p-32 text-center border-8 border-dashed border-brand/10 bg-white/50 neo-shadow flex flex-col items-center justify-center space-y-8">
              <div className="w-24 h-24 bg-bg border-4 border-brand mx-auto flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-500">
               <Navigation className="w-12 h-12 text-gray-200" />
             </div>
              <div className="text-xl uppercase tracking-[0.5em] font-black text-gray-300 italic text-center">РЕЕСТР ПУСТ // ПЕРЕМЕЩЕНИЙ НЕ ЗАФИКСИРОВАНЫ</div>
           </div>
         )}
      </div>
    </div>
  );
}
