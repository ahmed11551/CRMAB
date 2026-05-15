import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Construction, Users, CheckSquare, MessageSquare, TrendingUp, AlertCircle, Clock, MapPin, Plus, DollarSign, ArrowRight, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CRMTask, TravelLog, Financial, Communication, Project } from '../types.ts';

export default function Dashboard({ onNavigate }: { onNavigate?: (s: any) => void }) {
  const [stats, setStats] = useState({
    projects: 0,
    contacts: 0,
    activeTasks: 0,
    totalBalance: 0,
  });

  const [criticalTasks, setCriticalTasks] = useState<CRMTask[]>([]);
  const [recentTravel, setRecentTravel] = useState<TravelLog[]>([]);
  const [recentComms, setRecentComms] = useState<Communication[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const fetchHealth = async () => {
      try {
        const resp = await fetch('/api/health');
        const data = await resp.json();
        setHealthStatus(data);
      } catch (e) { console.error("Health check failed"); }
    };
    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 10000);
    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (s) => {
      setStats(prev => ({ ...prev, projects: s.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'projects'));

    const unsubscribeContacts = onSnapshot(collection(db, 'contacts'), (s) => {
      setStats(prev => ({ ...prev, contacts: s.size }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'contacts'));

    const unsubscribeTasks = onSnapshot(query(collection(db, 'tasks'), limit(100)), (s) => {
      const active = s.docs.filter(d => d.data().status !== 'Resolved').length;
      setStats(prev => ({ ...prev, activeTasks: active }));
      
      const critical = s.docs
        .map(d => ({ id: d.id, ...d.data() } as CRMTask))
        .filter(t => (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Resolved')
        .slice(0, 4);
      setCriticalTasks(critical);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    const unsubscribeTravel = onSnapshot(query(collection(db, 'travelLogs'), orderBy('date', 'desc'), limit(4)), (s) => {
      setRecentTravel(s.docs.map(d => ({ id: d.id, ...d.data() } as TravelLog)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'travelLogs'));

    const unsubscribeFinance = onSnapshot(collection(db, 'financials'), (s) => {
      const balance = s.docs.reduce((acc, d) => {
        const tx = d.data() as Financial;
        if (tx.type === 'Income') return acc + tx.amount;
        if (tx.type === 'Expense') return acc - tx.amount;
        return acc;
      }, 0);
      setStats(prev => ({ ...prev, totalBalance: balance }));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'financials'));

    const unsubscribeComms = onSnapshot(query(collection(db, 'communications'), orderBy('timestamp', 'desc'), limit(3)), (s) => {
      setRecentComms(s.docs.map(d => ({ id: d.id, ...d.data() } as Communication)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'communications'));

    return () => {
      clearInterval(timer);
      clearInterval(healthInterval);
      unsubscribeProjects();
      unsubscribeContacts();
      unsubscribeTasks();
      unsubscribeTravel();
      unsubscribeFinance();
      unsubscribeComms();
    };
  }, []);

  const cards = [
    { label: 'АКТИВНЫЕ ОБЪЕКТЫ', value: stats.projects, icon: Construction, color: 'text-brand', trend: 'В ПРЕДЕЛАХ НОРМЫ' },
    { label: 'БАЗА КОНТАКТОВ', value: stats.contacts, icon: Users, color: 'text-blue-600', trend: 'СИНХРОНИЗИРОВАНО' },
    { label: 'ОПЕРАТИВНЫЕ ЗАДАЧИ', value: stats.activeTasks, icon: CheckSquare, color: 'text-red-600', trend: stats.activeTasks > 5 ? 'ПЕРЕГРУЗКА' : 'НОМИНАЛЬНО', warning: stats.activeTasks > 5 },
    { label: 'БАЛАНС СРЕДСТВ', value: `${stats.totalBalance.toLocaleString()} ₽`, icon: DollarSign, color: 'text-green-600', trend: 'ФИНАНСОВЫЙ КОНТРОЛЬ' },
  ];

  const handleSetupBot = async () => {
    try {
      const resp = await fetch('/api/telegram/setup');
      const data = await resp.json();
      alert('Telegram Бота: ' + (data.telegram_response?.ok ? 'Настроен успешно!' : 'Ошибка настройки.'));
    } catch (err) { alert('Ошибка при соединении с сервером'); }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-6 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-8 border-brand pb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter mb-2 leading-none flex items-center gap-4">
            ПУЛЬТ УПРАВЛЕНИЯ
            <Shield className="w-8 h-8 md:w-12 md:h-12 text-brand animate-pulse" />
          </h1>
          <div className="flex items-center gap-4 text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">
            <span>ОПЕРАТИВНАЯ АНАЛИТИКА v2.0</span>
            <span className="w-2 h-2 bg-brand rounded-full"></span>
            <span>СИСТЕМА АКТИВНА</span>
            <span className="w-2 h-2 bg-brand rounded-full"></span>
            <span className="font-mono">{currentTime.toLocaleTimeString('ru-RU')}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto relative z-10">
           <button 
             onClick={handleSetupBot}
             className="bg-white text-brand border-4 border-brand px-8 py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transform hover:rotate-0 transition-all active:scale-95 italic neo-shadow shadow-brand-strong"
           >
             СИНХРОНИЗАЦИЯ ТГ БОТА
           </button>
           <div className="flex-1 md:flex-none bg-brand text-white px-8 py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-center italic shadow-xl flex items-center gap-2">
            <Zap className="w-4 h-4 fill-current" />
            СТАТУС: {healthStatus?.status === 'ok' ? 'НОМИНАЛЬНЫЙ' : 'ИНИЦИАЛИЗАЦИЯ...'}
           </div>
        </div>
        <div className="absolute top-0 right-0 opacity-[0.02] pointer-events-none -translate-y-1/2 translate-x-1/2">
          <Construction className="w-[600px] h-[600px]" />
        </div>
      </div>

      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border-4 border-brand p-4 neo-shadow-sm italic font-black uppercase text-[9px] tracking-widest">
           <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${healthStatus.firebase?.admin ? 'bg-green-500' : 'bg-red-500'}`}></div>
             БАЗА ДАННЫХ: {healthStatus.firebase?.admin ? 'ПОДКЛЮЧЕНО' : 'ОШИБКА'}
           </div>
           <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${healthStatus.telegram?.tokenStatus?.includes('Verified') ? 'bg-green-500' : 'bg-red-500'}`}></div>
             ТГ БОТ: {healthStatus.telegram?.tokenStatus || 'ПРОВЕРКА...'}
           </div>
           <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${healthStatus.ai?.configured ? 'bg-green-500' : 'bg-red-500'}`}></div>
             AI ЯДРО: {healthStatus.ai?.configured ? 'АКТИВНО' : 'НЕ НАСТРОЕНО'}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'НОВЫЙ ОБЪЕКТ', icon: Plus, action: () => onNavigate?.('projects') },
           { label: 'ДОБАВИТЬ КОНТАКТ', icon: Users, action: () => onNavigate?.('contacts') },
           { label: 'ФИКСИРОВАТЬ СВЯЗЬ', icon: MessageSquare, action: () => onNavigate?.('communication') },
           { label: 'НОВАЯ ТРАНЗАКЦИЯ', icon: DollarSign, action: () => onNavigate?.('financials') },
         ].map((act, i) => (
           <button 
            key={i}
            onClick={act.action}
            className="flex items-center justify-center gap-4 bg-bg border-4 border-dashed border-brand/20 p-6 group hover:bg-white hover:border-solid hover:border-brand transition-all neo-shadow-sm hover:shadow-none"
           >
             <act.icon className="w-6 h-6 text-brand/20 group-hover:text-brand group-hover:scale-110 transition-all" />
             <span className="text-sm font-black uppercase italic tracking-tighter group-hover:text-brand">{act.label}</span>
           </button>
         ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
        {cards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            key={i} 
            className="bg-white border-4 border-brand p-8 md:p-10 neo-shadow hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all group cursor-pointer relative overflow-hidden font-black italic"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 opacity-[0.03] rotate-45 translate-x-10 -translate-y-10 group-hover:opacity-10 transition-all`}>
               <card.icon className="w-full h-full" />
            </div>
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className={`p-4 border-4 border-brand bg-bg shadow-sm group-hover:bg-brand group-hover:text-white transition-all`}>
                <card.icon className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 text-gray-100 group-hover:text-brand transition-colors" />
            </div>
            <div className={`text-3xl md:text-5xl font-mono mb-2 tracking-tighter ${card.color} group-hover:scale-110 transition-transform origin-left uppercase`}>{card.value}</div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-gray-400 mb-6 group-hover:text-brand">{card.label}</div>
            <div className={`text-[10px] uppercase tracking-widest font-black text-gray-400 border-t-2 border-brand/5 pt-4 flex items-center gap-2`}>
               {card.warning && <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />}
               <span className="truncate">{card.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b-4 border-brand pb-4">
             <h3 className="text-base md:text-xl font-black uppercase tracking-[0.4em] italic flex items-center gap-4">
               <AlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
               КРИТИЧЕСКИЕ ОБНОВЛЕНИЯ
             </h3>
             <button onClick={() => onNavigate?.('tasks')} className="text-[10px] uppercase tracking-widest font-black underline hover:text-red-600 transition-colors italic">СМОТРЕТЬ ВСЕ</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {criticalTasks.map((task) => (
              <div key={task.id} className="bg-white border-4 border-brand p-8 neo-shadow-sm hover:translate-x-2 transition-all group cursor-pointer relative overflow-hidden font-black italic">
                 <div className={`absolute top-0 left-0 bottom-0 w-2 ${task.priority === 'Urgent' ? 'bg-red-600' : 'bg-brand'}`}></div>
                 <h4 className="text-lg md:text-xl uppercase tracking-tighter mb-4 truncate group-hover:text-brand">{task.title}</h4>
                 <p className="text-[11px] md:text-xs text-gray-400 mb-6 line-clamp-2 leading-relaxed uppercase tracking-tight">{task.description || 'ДЕТАЛИ НЕ УКАЗАНЫ.'}</p>
                 <div className="flex justify-between items-center bg-bg p-3 border-2 border-brand/5 shadow-inner">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-mono">
                      {task.createdAt && typeof (task.createdAt as any).toDate === 'function' 
                        ? (task.createdAt as any).toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) 
                        : 'READY'} 
                    </span>
                    <span className={`text-[9px] uppercase tracking-[0.2em] ${task.priority === 'Urgent' ? 'text-red-600 animate-pulse' : 'text-brand'}`}>
                      {task.priority === 'Urgent' ? 'КРИТИЧЕСКИ' : 'PRIORITY HIGH'}
                    </span>
                 </div>
              </div>
            ))}
            {criticalTasks.length === 0 && (
              <div className="col-span-full p-20 text-center border-4 border-dashed border-brand/10 text-gray-300 font-black italic uppercase tracking-widest">
                ОПЕРАТИВНЫЕ УГРОЗЫ ОТСУТСТВУЮТ
              </div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-white border-4 border-brand p-10 neo-shadow relative group">
             <div className="absolute top-0 left-0 w-full h-2 bg-brand/5"></div>
             <h3 className="text-sm md:text-base font-black uppercase tracking-[0.3em] italic mb-8 border-b-4 border-brand pb-4 text-center">ПЛАН ВЫЕЗДОВ</h3>
             <div className="space-y-8">
               {recentTravel.map((log) => (
                 <div key={log.id} className="flex gap-6 group/item items-center border-b-2 border-brand/5 pb-4 last:border-0">
                   <div className="font-mono text-[10px] font-black w-24 text-brand group-hover/item:text-red-600 transition-colors uppercase italic">{log.date}</div>
                   <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-black uppercase italic tracking-tight mb-1 truncate group-hover/item:translate-x-2 transition-transform duration-300">{log.destination}</div>
                      <div className="text-[10px] text-gray-400 uppercase italic font-black tracking-widest truncate">{log.purpose}</div>
                   </div>
                 </div>
               ))}
               {recentTravel.length === 0 && (
                 <div className="p-10 text-center border-2 border-dashed border-brand/5 text-gray-300 font-black italic uppercase tracking-widest text-[10px]">
                   ЛОГИ НЕ ЗАФИКСИРОВАНЫ
                 </div>
               )}
             </div>
             <button onClick={() => onNavigate?.('travel')} className="w-full mt-10 bg-brand text-white py-5 text-[10px] font-black uppercase tracking-[0.3em] italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none">
               ВЕСЬ МАРШРУТ
             </button>
          </div>

          <div className="bg-bg border-4 border-brand p-10 neo-shadow-sm group">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] italic mb-6 text-brand">RECENT UPDATES</h3>
            <div className="space-y-6">
              {recentComms.map((comm) => (
                <div key={comm.id} className="flex gap-4 items-start group/comm">
                  <div className="w-10 h-10 bg-white border-2 border-brand flex items-center justify-center flex-shrink-0 group-hover/comm:bg-brand group-hover/comm:text-white transition-colors">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-black italic uppercase tracking-tight text-gray-600 line-clamp-2 leading-tight">{comm.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
