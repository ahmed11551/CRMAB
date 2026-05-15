import { useState, useEffect } from 'react';
import React from 'react';
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
  Bell,
  Share2
} from 'lucide-react';
import { auth, db } from './lib/firebase.ts';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

// Components (I will define these next)
import Dashboard from './components/Dashboard.tsx';
import Contacts from './components/Contacts.tsx';
import Projects from './components/Projects.tsx';
import Tasks from './components/Tasks.tsx';
import CommunicationLogs from './components/CommunicationLogs.tsx';
import Financials from './components/Financials.tsx';
import TravelLogs from './components/TravelLogs.tsx';
import ReminderOverlay from './components/ReminderOverlay.tsx';

type Section = 'dashboard' | 'contacts' | 'projects' | 'tasks' | 'communication' | 'financials' | 'travel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState<string>(localStorage.getItem('buildsync_user_name') || 'Аноним');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous login failed:", err);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleUpdateName = (name: string) => {
    setUserName(name);
    localStorage.setItem('buildsync_user_name', name);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-xl font-mono animate-pulse uppercase tracking-[0.2em] font-black">Загрузка системы BuildSync...</div>
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
    <div className="flex h-screen w-full bg-bg text-brand font-sans selection:bg-brand selection:text-white flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-brand/30 backdrop-blur-md z-[40]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile / Sidebar for Desktop */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:relative inset-y-0 left-0 w-[280px] bg-white border-r-4 border-brand flex flex-col z-[50] shadow-2xl md:shadow-none"
          >
            <div className="p-8 border-b-4 border-brand bg-bg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand text-white neo-shadow-sm">
                    <Construction className="w-8 h-8" />
                  </div>
                  <span className="font-black text-2xl tracking-tighter uppercase italic leading-none">BUILDSYNC</span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="md:hidden p-2 text-brand hover:rotate-90 transition-transform"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="text-[9px] opacity-60 uppercase tracking-[0.3em] font-black italic">Конструкторский Стек // АКТИВЕН</div>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as Section);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
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

            <div className="p-6 border-t-4 border-brand bg-white relative">
              <div className="mb-6 p-4 border-2 border-dashed border-brand/20 bg-brand/5 rounded-sm">
                <div className="text-[8px] font-black uppercase tracking-widest text-brand/40 mb-3 italic">Shared Session Link</div>
                <div className="flex gap-2 items-center">
                  <input 
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-white border-2 border-brand p-2 text-[8px] font-mono truncate uppercase text-brand/60 cursor-pointer focus:ring-0 focus:border-brand"
                  />
                  <button 
                    onClick={handleShare}
                    className="p-2 bg-brand text-white neo-shadow-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    {copyFeedback ? <CheckSquare className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
                  </button>
                </div>
                {copyFeedback && (
                  <div className="mt-2 text-[8px] font-black uppercase text-green-600 italic animate-bounce">✓ Ссылка в буфере</div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-5 p-3 border-2 border-brand bg-bg/50 group">
                <div className="w-10 h-10 border-2 border-brand bg-brand text-white flex items-center justify-center font-black">
                  {userName[0]}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => handleUpdateName(e.target.value)}
                    className="text-[10px] font-black uppercase leading-tight bg-transparent border-none outline-none focus:ring-0 w-full"
                    placeholder="ВАШЕ ИМЯ"
                  />
                  <div className="text-[8px] opacity-60 truncate font-mono uppercase font-bold text-brand italic">
                    ID: {user?.uid.slice(0, 8)}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 border-2 border-red-200 py-3 hover:bg-red-50 transition-all neo-interactive"
              >
                <LogOut className="w-4 h-4" />
                Сменить сессию
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>


      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="h-20 bg-white border-b-4 border-brand flex items-center justify-between px-6 md:px-10 z-30 w-full shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-bg border-2 border-brand hover:translate-x-0.5 hover:translate-y-0.5 transition-all shadow-none neo-shadow-sm active:shadow-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden xs:flex p-1.5 bg-brand text-white mr-1 border-2 border-brand">
               <Construction className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xs md:text-xl font-black uppercase italic tracking-tighter truncate leading-none">
                {menuItems.find(m => m.id === activeSection)?.label}
              </h2>
              <div className="text-[8px] font-black opacity-30 tracking-[0.2em] italic uppercase mt-1 hidden md:block">Shared Workspace // CLOUD</div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
            <button 
              onClick={handleShare}
              className={`flex px-3 md:px-4 py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic neo-shadow-sm items-center gap-2 transition-all ${copyFeedback ? 'bg-green-600 text-white' : 'bg-brand text-white'} hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none`}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copyFeedback ? 'ГОТОВО' : 'ПРИГЛАСИТЬ'}</span>
            </button>
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
               <div className="w-10 h-10 border-2 border-brand shadow-sm bg-brand text-white flex items-center justify-center font-black">
                 {userName[0]}
               </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 relative bg-bg/30 pb-32 md:pb-12 border-t-2 border-brand/5 custom-scrollbar scroll-smooth">
          <div className="absolute top-0 right-0 p-2 text-[7px] text-gray-300 font-mono hidden md:block">BUILD_ID: AI_AG_LITE</div>
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
              {activeSection === 'tasks' && <Tasks userName={userName} />}
              {activeSection === 'communication' && <CommunicationLogs userName={userName} />}
              {activeSection === 'financials' && <Financials />}
              {activeSection === 'travel' && <TravelLogs />}
            </motion.div>
          </AnimatePresence>
          <ReminderOverlay />
        </div>

        {/* Mobile Navigation Spacer */}
        <div className="h-20 md:hidden flex-shrink-0" />

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
