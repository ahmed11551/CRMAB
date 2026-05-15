import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Plus, Construction, MapPin, Calendar, DollarSign, ArrowRight, Home, Trash2 } from 'lucide-react';
import { Project } from '../types.ts';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', address: '', status: 'Planning', budget: 0 });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'projects'));
    return unsubscribe;
  }, []);

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

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl mx-auto md:mx-0 relative">
           <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand text-white flex items-center justify-center rotate-12">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {projects.map((project) => (
          <div key={project.id} className="bg-white border-2 border-brand overflow-hidden group hover:neo-shadow transition-all flex flex-col relative">
            <div className={`h-3 ${
              project.status === 'In Progress' ? 'bg-blue-600' : 
              project.status === 'Completed' ? 'bg-green-600' : 
              'bg-gray-400'
            }`}></div>
            <div className="p-6 md:p-10 space-y-8 relative">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <Home className="w-24 h-24 rotate-12" />
               </div>
               
               <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-2 truncate group-hover:text-brand transition-colors leading-none">{project.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 font-mono tracking-widest uppercase truncate font-bold">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{project.address || 'МЕСТОПОЛОЖЕНИЕ НЕ ОПРЕДЕЛЕНО'}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 border-2 border-brand text-[9px] md:text-[10px] font-black uppercase italic shadow-sm transform -rotate-3 ${
                    project.status === 'In Progress' ? 'bg-blue-600 text-white' : 'bg-bg text-brand'
                  } flex-shrink-0`}>
                    {statusMap[project.status] || project.status}
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4 md:gap-8 py-6 border-y-2 border-brand/10 italic">
                  <div className="space-y-1">
                    <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">БЮДЖЕТ</div>
                    <div className="text-sm md:text-lg font-black font-mono truncate text-brand leading-none">${project.budget?.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">РАСХОД</div>
                    <div className="text-sm md:text-lg font-black font-mono text-red-600 truncate leading-none">${project.expenses?.toLocaleString() || 0}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">ПРОГРЕСС</div>
                    <div className="text-sm md:text-lg font-black font-mono truncate leading-none">
                      {project.status === 'Completed' ? '100%' : '75%'}
                    </div>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-4 gap-4 relative z-10">
                 <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 md:w-12 md:h-12 bg-bg border-2 border-brand flex items-center justify-center text-[10px] md:text-xs font-black italic flex-shrink-0 transform hover:-translate-y-1 transition-transform">K{i}</div>
                    ))}
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-brand text-white flex items-center justify-center text-[10px] md:text-xs font-black border-2 border-brand shadow-sm">+2</div>
                 </div>
                 <button className="text-[10px] md:text-xs font-black uppercase italic tracking-[0.2em] flex items-center gap-2 hover:translate-x-2 transition-all p-3 border-2 border-brand neo-shadow-sm hover:shadow-none bg-bg">
                   ПАНЕЛЬ УПРАВЛЕНИЯ
                   <ArrowRight className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>

  );
}
