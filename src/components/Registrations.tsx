import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { UserCheck, Trash2, Smartphone, Hash, Calendar, Search, ShieldCheck } from 'lucide-react';

interface Registration {
  id: string;
  telegramId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  createdAt: any;
}

export default function Registrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'registrations'));
    return unsubscribe;
  }, []);

  const filtered = registrations.filter(r => 
    r.phoneNumber.includes(searchQuery) || 
    r.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить эту запись о регистрации?')) return;
    try {
      await deleteDoc(doc(db, 'registrations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
    }
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">РЕГИСТРАЦИИ ТГ</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Активированные боты: {registrations.length}</p>
        </div>
      </div>

      <div className="relative group max-w-xl">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по номеру или имени..." 
          className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((reg) => (
          <div key={reg.id} className="bg-white border-4 border-brand p-8 neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-brand/5 rotate-45 translate-x-8 -translate-y-8"></div>
             
             <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-brand text-white flex items-center justify-center neo-shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                  <UserCheck className="w-8 h-8" />
                </div>
                <button onClick={() => handleDelete(reg.id)} className="text-gray-200 hover:text-red-600 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
             </div>

             <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-6 truncate">{reg.firstName} {reg.lastName}</h3>
             
             <div className="space-y-4 font-mono">
                <div className="flex items-center gap-3 p-3 bg-bg border-2 border-brand/5">
                  <Smartphone className="w-4 h-4 text-brand" />
                  <span className="text-sm font-black italic">{reg.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-bg border-2 border-brand/5">
                  <Hash className="w-4 h-4 text-brand" />
                  <span className="text-[10px] font-black uppercase text-gray-400">ID: {reg.telegramId}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-bg border-2 border-brand/5">
                   <Calendar className="w-4 h-4 text-brand" />
                   <span className="text-[10px] font-black uppercase text-gray-400">{reg.createdAt ? new Date(reg.createdAt.toDate()).toLocaleString() : '---'}</span>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t-2 border-brand/10 flex items-center gap-2 text-green-600 font-black italic text-[10px] uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                ВЕРИФИКАЦИЯ ПРОЙДЕНА
             </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-20 text-center border-4 border-dashed border-brand/10 opacity-50 uppercase tracking-widest font-black italic italic">
           ЛОГИ РЕГИСТРАЦИЙ ПУСТЫ
        </div>
      )}
    </div>
  );
}
