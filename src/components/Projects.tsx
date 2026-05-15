import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Plus, Construction, MapPin, Calendar, DollarSign, ArrowRight, Home, Trash2, Search, X, Briefcase, Layers } from 'lucide-react';
import { Project } from '../types.ts';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const [newProject, setNewProject] = useState({ 
    name: '', 
    address: '', 
    status: 'Planning', 
    budget: 0 
  });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'projects'));
    return unsubscribe;
  }, []);

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }

    const search = searchQuery.toLowerCase().trim();
    if (search) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.address?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [projects, searchQuery, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'projects';
    try {
      await addDoc(collection(db, path), {
        ...newProject,
        contractorIds: [],
        expenses: 0,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewProject({ name: '', address: '', status: 'Planning', budget: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот проект?')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
    }
  };

  const statusMap: Record<string, string> = {
    'Planning': 'Планирование',
    'In Progress': 'В работе',
    'Completed': 'Завершено',
    'On Hold': 'Приостановлено'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-600';
      case 'Completed': return 'bg-green-600';
      case 'On Hold': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ОБЪЕКТЫ И ПЛОЩАДКИ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Активные развертывания: {projects.filter(p => p.status === 'In Progress').length}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          ИНИЦИИРОВАТЬ ОБЪЕКТ
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по объектам..." 
              className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12"
            >
              <option value="">ВСЕ СТАТУСЫ</option>
              {Object.entries(statusMap).map(([key, label]) => (
                <option key={key} value={key}>{label.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
           <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
           </button>
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 neo-shadow-sm">
             <Construction className="w-6 h-6" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">ПРОТОКОЛ ИНИЦИАЛИЗАЦИИ</h3>
           <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Название объекта</label>
                  <input required value={newProject.name} onChange={e => setNewProject({...newProject, name:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold focus:bg-white transition-colors outline-none" placeholder="Пример: ЖК 'Ультра-Сити' Фаза 2" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Оперативный статус</label>
                  <select value={newProject.status} onChange={e => setNewProject({...newProject, status:e.target.value as any})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="Planning">Планирование</option>
                    <option value="In Progress">В работе</option>
                    <option value="Completed">Завершено</option>
                    <option value="On Hold">Приостановлено</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Географический адрес</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={newProject.address} onChange={e => setNewProject({...newProject, address:e.target.value})} className="w-full bg-bg border-2 border-brand pl-12 pr-6 py-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Введите адрес площадки" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Выделенный бюджет ($)</label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget:Number(e.target.value)})} className="w-full bg-bg border-2 border-brand pl-12 pr-6 py-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-8 pt-4">
                <button type="submit" className="bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 active:scale-95 transition-all neo-shadow-sm">ЗАРЕГИСТРИРОВАТЬ <ArrowRight className="w-5 h-5" /></button>
                <button type="button" onClick={() => setIsAdding(false)} className="border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100">ОТМЕНА</button>
              </div>
           </form>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white border-4 border-brand overflow-hidden group hover:neo-shadow transition-all flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
            <div className={`h-4 ${getStatusColor(project.status)}`}></div>
            <div className="p-8 md:p-12 space-y-10 relative">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none group-hover:opacity-[0.07] transition-all duration-700">
                 <Home className="w-48 h-48" />
               </div>
               
               <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-3 truncate group-hover:text-brand transition-colors leading-none">{project.name}</h3>
                    <div className="flex items-center gap-2.5 text-[11px] md:text-sm text-gray-400 font-mono tracking-widest uppercase truncate font-black italic">
                      <MapPin className="w-4.5 h-4.5 text-brand" />
                      <span className="truncate">{project.address || 'ОБЪЕКТ БЕЗ КООРДИНАТ'}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 border-4 border-brand text-[10px] md:text-xs font-black uppercase italic shadow-sm transform -rotate-3 transition-transform group-hover:rotate-0 ${
                    project.status === 'In Progress' ? 'bg-blue-600 text-white' : 
                    project.status === 'Completed' ? 'bg-green-600 text-white' : 'bg-bg text-brand'
                  } flex-shrink-0`}>
                    {statusMap[project.status] || project.status}
                  </div>
               </div>

               <div className="space-y-6">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
                   <span>ОСВОЕНИЕ БЮДЖЕТА</span>
                   <span>{project.budget > 0 ? Math.round(((project.expenses || 0) / project.budget) * 100) : 0}%</span>
                 </div>
                 <div className="h-4 bg-bg border-2 border-brand p-0.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${project.budget > 0 && (project.expenses || 0) / project.budget > 0.9 ? 'bg-red-600' : 'bg-brand'}`}
                      style={{ width: `${Math.min(100, project.budget > 0 ? ((project.expenses || 0) / project.budget) * 100 : 0)}%` }}
                    ></div>
                 </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-2 gap-8 py-8 border-y-4 border-brand/10 italic">
                  <div className="space-y-2 border-r-2 border-brand/5 pr-8">
                    <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-black text-gray-400">БАЛАНС ОБЪЕКТА</div>
                    <div className="text-xl md:text-3xl font-black font-mono truncate text-brand leading-none tracking-tighter">
                      ${project.budget?.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2 pl-4">
                    <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-black text-gray-400">АКТУАЛЬНЫЙ РАСХОД</div>
                    <div className="text-xl md:text-3xl font-black font-mono text-red-600 truncate leading-none tracking-tighter">
                      ${project.expenses?.toLocaleString() || 0}
                    </div>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-4 gap-6 relative z-10 font-black">
                 <div className="flex -space-x-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 md:w-14 md:h-14 bg-white border-4 border-brand flex items-center justify-center text-[11px] md:text-sm italic flex-shrink-0 transform hover:-translate-y-2 hover:z-20 transition-all duration-300 shadow-sm">K{i}</div>
                    ))}
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-brand text-white flex items-center justify-center text-[11px] md:text-sm border-4 border-brand shadow-sm z-10">+2</div>
                 </div>
                 <div className="flex gap-4">
                   <button 
                     onClick={() => handleDelete(project.id)}
                     className="p-4 border-4 border-brand text-gray-200 hover:text-red-600 hover:bg-bg transition-all"
                   >
                     <Trash2 className="w-6 h-6" />
                   </button>
                   <button className="text-[10px] md:text-xs font-black uppercase italic tracking-[0.2em] flex items-center gap-3 px-6 py-4 border-4 border-brand neo-shadow-sm hover:shadow-none bg-bg active:translate-x-1 active:translate-y-1 transition-all group/btn">
                     ПАНЕЛЬ УПРАВЛЕНИЯ
                     <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                   </button>
                 </div>
               </div>
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 && (
          <div className="col-span-full p-32 text-center space-y-10 border-8 border-dashed border-brand/10 bg-white/50 neo-shadow">
             <div className="w-24 h-24 bg-bg border-4 border-brand mx-auto flex items-center justify-center rotate-45">
              <Construction className="w-12 h-12 text-gray-300 -rotate-45" />
            </div>
             <div className="text-xl uppercase tracking-[0.5em] font-black text-gray-400 italic">НУЛЕВАЯ АКТИВНОСТЬ // ПЛОЩАДКИ НЕ РАЗВЕРНУТЫ</div>
          </div>
        )}
      </div>
    </div>
  );
}
