import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Plus, CheckSquare, Clock, AlertCircle, User, Construction, Tag, Trash2 } from 'lucide-react';
import { CRMTask, Contact, Project } from '../types.ts';

export default function Tasks() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', projectId: '', priority: 'Medium', status: 'Pending' });

  useEffect(() => {
    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), 
      (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as CRMTask))),
      (err) => handleFirestoreError(err, OperationType.GET, 'tasks')
    );
    const unsubContacts = onSnapshot(collection(db, 'contacts'), 
      (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as Contact))),
      (err) => handleFirestoreError(err, OperationType.GET, 'contacts')
    );
    const unsubProjects = onSnapshot(collection(db, 'projects'), 
      (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))),
      (err) => handleFirestoreError(err, OperationType.GET, 'projects')
    );
    
    return () => { unsubTasks(); unsubContacts(); unsubProjects(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'tasks';
    try {
      await addDoc(collection(db, path), {
        ...newTask,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewTask({ title: '', description: '', assignedTo: '', projectId: '', priority: 'Medium', status: 'Pending' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const toggleStatus = async (task: CRMTask) => {
    const path = `tasks/${task.id}`;
    const nextStatus = task.status === 'Resolved' ? 'Pending' : 'Resolved';
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const priorityMap: Record<string, string> = {
    'Low': 'Низкий',
    'Medium': 'Средний',
    'High': 'Высокий',
    'Urgent': 'Критичный'
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ЗАДАЧИ И ПОРУЧЕНИЯ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Оперативная нагрузка: {tasks.filter(t => t.status !== 'Resolved').length} Активно</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          ПОСТАВИТЬ ЗАДАЧУ
        </button>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl mx-auto md:mx-0 relative">
           <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand text-white flex items-center justify-center rotate-12">
             <CheckSquare className="w-6 h-6" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">ПРОТОКОЛ ДЕЛЕГИРОВАНИЯ</h3>
           <form onSubmit={handleAdd} className="space-y-8">
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Общая цель</label>
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold focus:bg-white transition-colors outline-none" placeholder="Пример: Проверить заливку фундамента" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Назначение персонала</label>
                  <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Не назначено</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Контекст объекта</label>
                  <select value={newTask.projectId} onChange={e => setNewTask({...newTask, projectId:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Без привязки к объекту</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Критичность</label>
                  <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority:e.target.value as any})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="Low">Низкий</option>
                    <option value="Medium">Средний</option>
                    <option value="High">Высокий</option>
                    <option value="Urgent">Критичный</option>
                  </select>
                </div>
                <div className="flex gap-4 md:gap-8 pt-0 md:pt-6">
                   <button type="submit" className="flex-1 bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm">РАЗВЕРНУТЬ</button>
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors">ОТМЕНА</button>
                </div>
              </div>
           </form>
         </div>
      )}

      <div className="space-y-6 md:space-y-8">
        {tasks.map(task => (
          <div key={task.id} className={`bg-white border-2 border-brand p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 group transition-all relative overflow-hidden ${
            task.status === 'Resolved' ? 'opacity-50 grayscale bg-bg' : 'neo-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
          }`}>
             <div className="flex items-center justify-between w-full md:w-auto z-10">
               <button 
                onClick={() => toggleStatus(task)}
                className={`w-14 h-14 md:w-16 md:h-16 border-4 flex items-center justify-center transition-all shadow-sm ${
                  task.status === 'Resolved' ? 'bg-brand text-white border-brand' : 'hover:bg-brand hover:text-white bg-white border-brand rotate-6'
                }`}
               >
                  <CheckSquare className="w-8 h-8 md:w-9 md:h-9" />
               </button>
               <span className={`md:hidden text-[10px] font-black uppercase px-3 py-1 border-2 border-brand shadow-sm ${
                task.priority === 'Urgent' ? 'bg-red-600 text-white animate-pulse' : 
                task.priority === 'High' ? 'bg-orange-500 text-white' : 'bg-bg text-brand'
               }`}>
                {priorityMap[task.priority] || task.priority}
               </span>
             </div>
             
             <div className="flex-1 w-full z-10">
                <div className="flex items-center gap-4 mb-3 md:mb-2">
                  <h4 className={`text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none ${task.status === 'Resolved' ? 'line-through opacity-60' : 'group-hover:text-brand transition-colors'}`}>
                    {task.title}
                  </h4>
                  <span className={`hidden md:inline-block text-[10px] font-black uppercase px-3 py-1 border-2 border-brand shadow-sm transform -rotate-2 ${
                    task.priority === 'Urgent' ? 'bg-red-600 text-white animate-pulse' : 
                    task.priority === 'High' ? 'bg-orange-500 text-white' : 'bg-bg text-brand'
                  }`}>
                    {priorityMap[task.priority] || task.priority}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 text-[11px] md:text-xs uppercase tracking-widest font-mono text-gray-400 font-bold">
                   <div className="flex items-center gap-2.5 bg-bg/50 p-2 border border-brand/5">
                      <User className="w-4 h-4 text-brand" />
                      <span className="truncate">{contacts.find(c => c.id === task.assignedTo)?.name || 'НЕ НАЗНАЧЕНО'}</span>
                   </div>
                   <div className="flex items-center gap-2.5 bg-bg/50 p-2 border border-brand/5">
                      <Construction className="w-4 h-4 text-brand" />
                      <span className="truncate">{projects.find(p => p.id === task.projectId)?.name || 'БЕЗ ОБЪЕКТА'}</span>
                   </div>
                   <div className="hidden md:flex items-center gap-2.5 ml-auto italic border-l-2 border-brand/10 pl-6">
                      <Clock className="w-4 h-4" />
                      {task.createdAt ? new Date((task.createdAt as any).toDate()).toLocaleDateString() : 'Н/Д'}
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                     className="ml-4 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all rounded"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="p-20 text-center space-y-6 border-4 border-dashed border-brand/20 bg-white/50 neo-shadow">
             <div className="w-16 h-16 bg-bg border-2 border-brand mx-auto flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-gray-300" />
            </div>
             <div className="text-sm uppercase tracking-[0.3em] font-black text-gray-400 italic">ОЧЕРЕДЬ ПУСТА // ВСЕ ПОДРАЗДЕЛЕНИЯ СИНХРОНИЗИРОВАНЫ</div>
          </div>
        )}
      </div>
    </div>

  );
}
