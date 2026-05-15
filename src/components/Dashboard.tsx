import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Construction, Users, CheckSquare, MessageSquare, TrendingUp, AlertCircle, Clock, MapPin, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { CRMTask, TravelLog } from '../types.ts';

export default function Dashboard({ onNavigate }: { onNavigate?: (s: any) => void }) {
  const [stats, setStats] = useState({
    projects: 0,
    contacts: 0,
    activeTasks: 0,
    unresolvedComms: 0
  });

  const [criticalTasks, setCriticalTasks] = useState<CRMTask[]>([]);
  const [recentTravel, setRecentTravel] = useState<TravelLog[]>([]);

  useEffect(() => {
    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (s) => {
      setStats(prev => ({ ...prev, projects: s.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'projects'));

    const unsubscribeContacts = onSnapshot(collection(db, 'contacts'), (s) => {
      setStats(prev => ({ ...prev, contacts: s.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'contacts'));

    const unsubscribeTasks = onSnapshot(query(collection(db, 'tasks'), limit(100)), (s) => {
      const active = s.docs.filter(d => d.data().status !== 'Resolved').length;
      setStats(prev => ({ ...prev, activeTasks: active }));
      
      // Get critical tasks
      const critical = s.docs
        .map(d => ({ id: d.id, ...d.data() } as CRMTask))
        .filter(t => (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Resolved')
        .slice(0, 3);
      setCriticalTasks(critical);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    const unsubscribeTravel = onSnapshot(query(collection(db, 'travelLogs'), orderBy('date', 'desc'), limit(3)), (s) => {
      setRecentTravel(s.docs.map(d => ({ id: d.id, ...d.data() } as TravelLog)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'travelLogs'));

    return () => {
      unsubscribeProjects();
      unsubscribeContacts();
      unsubscribeTasks();
      unsubscribeTravel();
    };
  }, []);

    const cards = [
      { label: 'Активные объекты', value: stats.projects, icon: Construction, trend: '+2 в этом месяце' },
      { label: 'Подрядчики', value: stats.contacts, icon: Users, trend: '4 на проверке' },
      { label: 'Текущие задачи', value: stats.activeTasks, icon: CheckSquare, trend: '2 в приоритете', warning: stats.activeTasks > 5 },
      { label: 'Telegram Бот', value: 'Активен', icon: MessageSquare, trend: 'Прямой ввод данных' },
    ];

  const handleSetupBot = async () => {
    try {
      const resp = await fetch('/api/telegram/setup');
      const data = await resp.json();
      alert('Telegram Бота: ' + (data.telegram_response?.ok ? 'Настроен успешно!' : 'Ошибка настройки.'));
    } catch (err) {
      alert('Ошибка при соединении с сервером');
    }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-0 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ПУЛЬТ УПРАВЛЕНИЯ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Оперативная аналитика v1.2 // Сектор 0-1</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
           <button 
             onClick={handleSetupBot}
             className="bg-bg text-brand border-2 border-brand px-6 py-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transform rotate-1 hover:rotate-0 transition-transform active:scale-95 italic neo-shadow-sm"
           >
             СИНХРОНИЗАЦИЯ ТГ БОТА
           </button>
           <div className="flex-1 md:flex-none bg-brand text-white px-6 py-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-center italic transform -rotate-1 shadow-md">
            СТАТУС: НОМИНАЛЬНЫЙ
           </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div 
           onClick={() => onNavigate?.('projects')}
           className="bg-bg border-4 border-dashed border-brand/20 p-6 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-solid hover:border-brand transition-all cursor-pointer"
         >
            <Plus className="w-10 h-10 mb-4 text-brand/20 group-hover:text-brand group-hover:rotate-90 transition-all" />
            <h4 className="text-lg font-black uppercase italic tracking-tight mb-2">Новый Объект</h4>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest italic group-hover:text-brand transition-colors">Добавить место или проект</p>
         </div>
         <div 
           onClick={() => onNavigate?.('contacts')}
           className="bg-bg border-4 border-dashed border-brand/20 p-6 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-solid hover:border-brand transition-all cursor-pointer"
         >
            <Users className="w-10 h-10 mb-4 text-brand/20 group-hover:text-brand group-hover:scale-110 transition-all" />
            <h4 className="text-lg font-black uppercase italic tracking-tight mb-2">Новый Контакт</h4>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest italic group-hover:text-brand transition-colors">Регистрация в базе</p>
         </div>
         <div 
           onClick={() => onNavigate?.('communication')}
           className="bg-bg border-4 border-dashed border-brand/20 p-6 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-solid hover:border-brand transition-all cursor-pointer"
         >
            <MessageSquare className="w-10 h-10 mb-4 text-brand/20 group-hover:text-brand transition-all" />
            <h4 className="text-lg font-black uppercase italic tracking-tight mb-2">Запись в Журнал</h4>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest italic group-hover:text-brand transition-colors">Лог разговора или встречи</p>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {cards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            key={i} 
            className="bg-white border-2 border-brand p-5 md:p-8 neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-brand/5 rotate-45 translate-x-8 -translate-y-8 group-hover:bg-brand/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <div className={`p-2.5 md:p-3 border-2 border-brand ${card.warning ? 'bg-red-600 text-white shadow-sm ring-4 ring-red-100' : 'bg-bg group-hover:bg-brand group-hover:text-white transition-all shadow-sm'}`}>
                <card.icon className="w-5 h-5 md:w-8 md:h-8" />
              </div>
              <TrendingUp className="hidden md:block w-5 h-5 text-gray-200 group-hover:text-brand transition-colors" />
            </div>
            <div className="text-2xl md:text-5xl font-black italic font-mono mb-1 md:mb-2 tracking-tighter">{card.value}</div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-black text-gray-500 mb-4 md:mb-6 leading-tight">{card.label}</div>
            <div className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-gray-400 bg-bg p-1.5 md:p-2 border border-brand/10 flex items-center gap-1.5 truncate">
               {card.warning && <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 animate-pulse" />}
               <span className="truncate italic">{card.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex items-center justify-between border-b-4 border-brand pb-3">
             <h3 className="text-xs md:text-base font-black uppercase tracking-[0.3em] italic flex items-center gap-3">
               <AlertCircle className="w-5 h-5 text-red-600" />
               КРИТИЧЕСКИЕ ОБНОВЛЕНИЯ
             </h3>
             <button className="text-[10px] uppercase tracking-widest font-black underline hover:text-red-600 transition-colors italic">СМОТРЕТЬ ВСЕ</button>
          </div>
          <div className="space-y-4 md:space-y-5">
            {criticalTasks.map((task, i) => (
              <div key={task.id} className="flex gap-4 md:gap-6 group cursor-pointer p-4 md:p-6 hover:bg-white transition-all border-2 border-transparent hover:border-brand hover:neo-shadow bg-white/50 backdrop-blur-sm">
                 <div className={`w-1.5 self-stretch group-hover:scale-y-110 transition-transform ${task.priority === 'Urgent' ? 'bg-red-600' : 'bg-brand'}`}></div>
                 <div className="flex-1 overflow-hidden">
                   <div className="text-xs md:text-sm font-black uppercase tracking-tight mb-2 truncate group-hover:text-brand transition-colors">{task.title}</div>
                   <div className="text-[10px] md:text-xs text-gray-500 mb-3 line-clamp-2 italic leading-relaxed">{task.description || 'Детали задачи не указаны.'}</div>
                   <div className="flex gap-6 items-center">
                     <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-gray-400 bg-bg px-2 py-0.5 border border-brand/5">
                       {task.createdAt && typeof (task.createdAt as any).toDate === 'function' 
                         ? (task.createdAt as any).toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) 
                         : 'ПОДГОТОВКА'} // // СЕГОДНЯ
                     </span>
                     <span className={`text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black ${task.priority === 'Urgent' ? 'text-red-600 animate-pulse' : 'text-brand'}`}>
                       {task.priority === 'Urgent' ? 'КРИТИЧЕСКИ' : 'ВЫСОКИЙ ПРИОРИТЕТ'}
                     </span>
                   </div>
                 </div>
              </div>
            ))}
            {criticalTasks.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-brand/10 text-gray-300 uppercase tracking-widest text-[10px] font-black italic">
                Критических задач на текущий момент нет
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-brand p-6 md:p-8 neo-shadow relative">
           <div className="absolute top-0 right-0 w-2 h-full bg-brand/5"></div>
           <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] italic mb-6 md:mb-8 border-b-2 border-brand pb-4 text-center">ГРАФИК ВЫЕЗДОВ</h3>
           <div className="space-y-6 md:space-y-8">
             {recentTravel.map((log, i) => (
               <div key={log.id} className="flex gap-5 group items-center">
                 <div className="font-mono text-[9px] md:text-[10px] font-black w-14 md:w-20 text-brand border-r-2 border-brand/10 pr-4">{log.date}</div>
                 <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] md:text-xs font-black uppercase tracking-tight mb-1 truncate group-hover:translate-x-1 transition-transform">{log.destination}</div>
                    <div className="text-[9px] md:text-[10px] text-gray-400 uppercase italic font-bold tracking-widest truncate">{log.purpose}</div>
                 </div>
               </div>
             ))}
             {recentTravel.length === 0 && (
               <div className="p-8 text-center border-2 border-dashed border-brand/5 text-gray-200 uppercase tracking-widest text-[8px] font-black italic">
                 План выездов не зафиксирован
               </div>
             )}
           </div>
           <button className="w-full mt-10 md:mt-12 bg-brand text-white py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none">
             ПОЛНЫЙ КАЛЕНДАРЬ
           </button>
        </div>
      </div>
    </div>
  );
}
