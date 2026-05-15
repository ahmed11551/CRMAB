import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Plus, CheckSquare, Clock, AlertCircle, User, Construction, Tag, Trash2, Search, X } from 'lucide-react';
import { CRMTask, Contact, Project } from '../types.ts';

export default function Tasks() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    assignedTo: '', 
    projectId: '', 
    priority: 'Medium', 
    status: 'Pending',
    reminderAt: ''
  });

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

  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    if (!showResolved) {
      result = result.filter(t => t.status !== 'Resolved');
    }

    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    const search = searchQuery.toLowerCase().trim();
    if (search) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        (t.description && t.description.toLowerCase().includes(search))
      );
    }

    return result;
  }, [tasks, searchQuery, priorityFilter, showResolved]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'tasks';
    try {
      await addDoc(collection(db, path), {
        ...newTask,
        reminderDismissed: false,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewTask({ title: '', description: '', assignedTo: '', projectId: '', priority: 'Medium', status: 'Pending', reminderAt: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const toggleStatus = async (task: CRMTask) => {
    const nextStatus = task.status === 'Resolved' ? 'Pending' : 'Resolved';
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
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

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по задачам..." 
              className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowResolved(!showResolved)}
              className={`px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none ${showResolved ? 'bg-brand text-white' : 'bg-white text-brand'}`}
            >
              {showResolved ? 'СКРЫТЬ ВЫПОЛНЕННЫЕ' : 'ПОКАЗАТЬ ВЫПОЛНЕННЫЕ'}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 overflow-x-auto pb-2 border-b-2 border-brand/5">
           <button 
             onClick={() => setPriorityFilter(null)}
             className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] italic border-2 transition-all ${!priorityFilter ? 'bg-brand text-white border-brand shadow-sm' : 'border-brand/10 text-gray-300'}`}
           >
             ВСЕ ПРИОРИТЕТЫ
           </button>
           {Object.entries(priorityMap).map(([key, label]) => (
             <button 
              key={key}
              onClick={() => setPriorityFilter(key)}
              className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] italic border-2 transition-all ${priorityFilter === key ? 'bg-brand text-white border-brand shadow-sm' : 'border-brand/10 text-gray-300'}`}
             >
               {label}
             </button>
           ))}
        </div>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative animate-in fade-in slide-in-from-top-4 duration-300">
           <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
           </button>
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 neo-shadow-sm">
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
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Напоминание (Дата и время)</label>
                  <input 
                    type="datetime-local" 
                    value={newTask.reminderAt} 
                    onChange={e => setNewTask({...newTask, reminderAt: e.target.value})} 
                    className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold focus:bg-white transition-colors outline-none cursor-text" 
                  />
                </div>
                <div className="flex gap-4 md:gap-8 pt-0 md:pt-6">
                   <button type="submit" className="flex-1 bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm">РАЗВЕРНУТЬ</button>
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors">ОТМЕНА</button>
                </div>
              </div>
           </form>
         </div>
      )}

      <div className="flex flex-col gap-6 md:gap-8">
        {filteredTasks.map(task => (
          <div key={task.id} className={`bg-white border-2 border-brand p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 group transition-all relative overflow-hidden ${
            task.status === 'Resolved' ? 'opacity-50 grayscale bg-bg border-dashed' : 'neo-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
          }`}>
             <div className="flex items-center justify-between w-full md:w-auto z-10">
               <button 
                onClick={() => toggleStatus(task)}
                className={`w-14 h-14 md:w-16 md:h-16 border-4 flex items-center justify-center transition-all shadow-sm ${
                  task.status === 'Resolved' ? 'bg-brand text-white border-brand' : 'hover:bg-brand hover:text-white bg-white border-brand rotate-6'
                }`}
                title={task.status === 'Resolved' ? "Активировать снова" : "Выполнить задачу"}
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
                <div className="flex items-center justify-between gap-4 mb-4 md:mb-2">
                  <div className="flex items-center gap-4">
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                    className="p-2 text-gray-200 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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
                   {task.reminderAt && (
                     <div className="flex items-center gap-2.5 bg-brand/5 p-2 border border-brand/10 text-brand group/reminder">
                        <AlertCircle className="w-4 h-4" />
                        <span className="truncate">Напомнить: {new Date(task.reminderAt).toLocaleString()}</span>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await updateDoc(doc(db, 'tasks', task.id), { reminderAt: '', reminderDismissed: false });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
                            }
                          }}
                          className="ml-auto opacity-0 group-hover/reminder:opacity-100 transition-opacity p-1 hover:bg-brand/10 rounded"
                          title="Удалить напоминание"
                        >
                          <X className="w-3 h-3" />
                        </button>
                     </div>
                   )}
                   <div className="hidden md:flex items-center gap-2.5 ml-auto italic border-l-2 border-brand/10 pl-6">
                      <Clock className="w-4 h-4" />
                      {task.createdAt ? new Date((task.createdAt as any).toDate()).toLocaleDateString() : 'Н/Д'}
                   </div>
                </div>
             </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="p-20 text-center space-y-6 border-4 border-dashed border-brand/20 bg-white/50 neo-shadow">
             <div className="w-16 h-16 bg-bg border-2 border-brand mx-auto flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-gray-300" />
            </div>
             <div className="text-sm uppercase tracking-[0.3em] font-black text-gray-400 italic">СЕКТОР ЧИСТ // ЗАДАЧИ НЕ ОБНАРУЖЕНЫ</div>
          </div>
        )}
      </div>
    </div>
  );
}
