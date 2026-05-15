import { useState, useEffect } from 'react';
import { 
  Users, 
  Construction, 
  CheckSquare, 
  MessageSquare, 
  DollarSign, 
  Plane, 
  LayoutDashboard,
  Plus,
  LogOut,
  Menu,
  X,
  Search,
  Bell
} from 'lucide-react';
import { auth, db } from './lib/firebase.ts';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

// Components (I will define these next)
import Dashboard from './components/Dashboard.tsx';
import Contacts from './components/Contacts.tsx';
import Projects from './components/Projects.tsx';
import Tasks from './components/Tasks.tsx';
import CommunicationLogs from './components/CommunicationLogs.tsx';
import Financials from './components/Financials.tsx';
import TravelLogs from './components/TravelLogs.tsx';

type Section = 'dashboard' | 'contacts' | 'projects' | 'tasks' | 'communication' | 'financials' | 'travel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user) {
        console.log("Logged in:", result.user.email);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        alert("Окно авторизации было закрыто. Пожалуйста, попробуйте снова и завершите вход.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore duplicate popup requests
      } else {
        alert("Ошибка входа: " + err.message + "\nПопробуйте открыть приложение в новом окне.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-xl font-mono animate-pulse uppercase tracking-[0.2em] font-black">Загрузка системы BuildSync...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg font-sans p-4">
        <div className="w-full max-w-md bg-white border-2 border-brand p-10 neo-shadow transform -rotate-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rotate-45 translate-x-16 -translate-y-16"></div>
          
          <Construction className="w-16 h-16 mb-8 text-brand relative z-10" />
          <h1 className="text-4xl font-black mb-3 tracking-tighter uppercase italic leading-none relative z-10">BuildSync CRM</h1>
          <p className="text-sm text-gray-600 mb-10 leading-relaxed font-medium relative z-10">
            Для входа в систему и автоматической регистрации используйте ваш корпоративный или личный Google-аккаунт.
          </p>

          <button 
            onClick={handleLogin}
            className="w-full bg-brand text-white py-5 px-8 hover:bg-gray-800 transition-all flex items-center justify-center gap-3 group font-black tracking-widest uppercase italic neo-shadow-sm active:translate-x-1 active:translate-y-1 active:shadow-none mb-8 relative z-10"
          >
            Войти через Google
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>

          <div className="space-y-4 p-5 bg-gray-50 border-2 border-dashed border-brand/20 relative z-10">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-brand italic">Как это работает?</h4>
             <ul className="text-[10px] space-y-2 font-bold text-gray-500 uppercase italic">
               <li className="flex gap-2"><span>1.</span> <span>Авторизация через Google API</span></li>
               <li className="flex gap-2"><span>2.</span> <span>Автоматическое создание профиля</span></li>
               <li className="flex gap-2"><span>3.</span> <span>Доступ к объектам и журналам 24/7</span></li>
               <li className="flex gap-2 pt-3 border-t border-brand/10">
                 <MessageSquare className="w-4 h-4 text-brand" />
                 <span>Или отправьте /start боту для регистрации</span>
               </li>
             </ul>
          </div>

          <div className="mt-10 pt-6 border-t-2 border-brand text-[10px] uppercase tracking-[0.3em] font-black text-gray-400 italic">
            Система v1.2.0 // Слой Авторизации
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
    { id: 'projects', label: 'Объекты', icon: Construction },
    { id: 'contacts', label: 'Контакты', icon: Users },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare },
    { id: 'communication', label: 'Связь', icon: MessageSquare },
    { id: 'financials', label: 'Финансы', icon: DollarSign },
    { id: 'travel', label: 'Поездки', icon: Plane },
  ];

  return (
    <div className="flex h-screen bg-bg text-brand font-sans selection:bg-brand selection:text-white flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:flex bg-white border-r-2 border-brand flex-col overflow-hidden z-30"
          >
            <div className="p-8 border-b-2 border-brand bg-bg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand text-white">
                  <Construction className="w-8 h-8" />
                </div>
                <span className="font-black text-2xl tracking-tighter uppercase italic">BUILDSYNC</span>
              </div>
              <div className="text-[9px] opacity-60 uppercase tracking-[0.3em] font-black italic">Конструкторский Стек</div>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as Section)}
                  className={`w-full flex items-center gap-4 px-4 py-4 text-xs font-black transition-all border-2 ${
                    activeSection === item.id 
                    ? 'bg-brand text-white italic border-brand translate-x-2 neo-shadow-sm' 
                    : 'text-gray-500 border-transparent hover:border-brand hover:text-brand'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'rotate-3' : ''}`} />
                  <span className="uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-6 border-t-2 border-brand bg-white">
              <div className="flex items-center gap-3 mb-5 p-3 border-2 border-brand bg-bg/50">
                <img src={user.photoURL || ''} alt="" className="w-10 h-10 border-2 border-brand" />
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] font-black truncate uppercase leading-tight">{user.displayName}</div>
                  <div className="text-[8px] opacity-60 truncate font-mono uppercase font-bold">{user.email}</div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 border-2 border-red-200 py-3 hover:bg-red-50 transition-all neo-interactive"
              >
                <LogOut className="w-4 h-4" />
                Выход из системы
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative">
        <header className="h-20 bg-white border-b-2 border-brand flex items-center justify-between px-6 md:px-10 sticky top-0 z-20 w-full shadow-sm">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:block p-2 bg-bg border-2 border-brand hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:shadow-none neo-shadow-sm"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="md:hidden p-1.5 bg-brand text-white mr-1 border-2 border-brand">
               <Construction className="w-6 h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter truncate leading-none">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative group hidden xl:block">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
              <input 
                type="text" 
                placeholder="Глобальный поиск..." 
                className="pl-12 pr-6 py-3 bg-bg border-2 border-transparent focus:border-brand focus:bg-white outline-none w-72 text-xs transition-all italic font-bold uppercase tracking-wider"
              />
            </div>
            <button className="relative p-2.5 bg-bg border-2 border-brand hover:translate-x-0.5 hover:translate-y-0.5 transition-all neo-shadow-sm font-black flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <span className="hidden lg:block text-[10px] uppercase italic">События</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border-2 border-brand"></span>
            </button>
            <div className="md:hidden flex items-center">
               <img src={user.photoURL || ''} alt="" className="w-10 h-10 border-2 border-brand shadow-sm" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 relative bg-bg/30">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className="max-w-7xl mx-auto"
            >
              {activeSection === 'dashboard' && <Dashboard onNavigate={setActiveSection} />}
              {activeSection === 'contacts' && <Contacts />}
              {activeSection === 'projects' && <Projects />}
              {activeSection === 'tasks' && <Tasks />}
              {activeSection === 'communication' && <CommunicationLogs />}
              {activeSection === 'financials' && <Financials />}
              {activeSection === 'travel' && <TravelLogs />}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-brand flex items-center justify-around h-20 px-4 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all relative px-2 ${
                activeSection === item.id ? 'text-brand' : 'text-gray-400'
              }`}
            >
              <div className={`p-2 border-2 transition-all ${activeSection === item.id ? 'bg-brand text-white border-brand rotate-6 scale-110 shadow-sm' : 'bg-transparent border-transparent'}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[7px] font-black uppercase tracking-[0.2em]">{item.label.slice(0, 6)}</span>
              {activeSection === item.id && (
                <motion.div layoutId="mobile-indicator" className="absolute -bottom-1 w-full h-1 bg-brand" />
              )}
            </button>
          ))}
          <button
             onClick={() => setActiveSection('financials')}
             className={`flex flex-col items-center justify-center gap-1.5 transition-all relative px-2 ${
              activeSection === 'financials' ? 'text-brand' : 'text-gray-400'
            }`}
          >
            <div className={`p-2 border-2 transition-all ${activeSection === 'financials' ? 'bg-brand text-white border-brand -rotate-6 scale-110 shadow-sm' : 'bg-transparent border-transparent'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">Фин</span>
          </button>
        </nav>
      </main>
    </div>


  );
}
