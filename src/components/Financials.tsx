import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { DollarSign, Plus, ArrowUpRight, ArrowDownLeft, Wallet, Construction, User, Trash2, Search, Filter, X, TrendingUp, Calculator } from 'lucide-react';
import { Financial, Project, Contact } from '../types.ts';

export default function Financials() {
  const [txs, setTxs] = useState<Financial[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  const [newTx, setNewTx] = useState({ 
    amount: 0, 
    type: 'Expense' as const, 
    description: '', 
    status: 'Paid', 
    projectId: '', 
    contactId: '', 
    date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    const q = query(collection(db, 'financials'), orderBy('date', 'desc'));
    const unsubTxs = onSnapshot(q, (s) => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() } as Financial))), (err) => handleFirestoreError(err, OperationType.GET, 'financials'));
    onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), (err) => handleFirestoreError(err, OperationType.GET, 'projects'));
    onSnapshot(collection(db, 'contacts'), (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as Contact))), (err) => handleFirestoreError(err, OperationType.GET, 'contacts'));
    return () => unsubTxs();
  }, []);

  const filteredTxs = useMemo(() => {
    let result = txs;

    if (typeFilter) {
      result = result.filter(tx => tx.type === typeFilter);
    }

    if (projectFilter) {
      result = result.filter(tx => tx.projectId === projectFilter);
    }

    const search = searchQuery.toLowerCase().trim();
    if (search) {
      result = result.filter(tx => 
        tx.description.toLowerCase().includes(search) ||
        (projects.find(p => p.id === tx.projectId)?.name || '').toLowerCase().includes(search) ||
        (contacts.find(c => c.id === tx.contactId)?.name || '').toLowerCase().includes(search)
      );
    }

    return result;
  }, [txs, typeFilter, projectFilter, searchQuery, projects, contacts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'financials';
    try {
      await addDoc(collection(db, path), { ...newTx, amount: Number(newTx.amount), createdAt: serverTimestamp() });
      setIsAdding(false);
      setNewTx({ amount: 0, type: 'Expense', description: '', status: 'Paid', projectId: '', contactId: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить эту транзакцию из реестра?')) return;
    try {
      await deleteDoc(doc(db, 'financials', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `financials/${id}`);
    }
  };

  const totals = useMemo(() => {
    return txs.reduce((acc, tx) => {
      if (tx.type === 'Income') acc.income += tx.amount;
      else if (tx.type === 'Expense') acc.expenses += tx.amount;
      else if (tx.type === 'Debt') acc.debt += tx.amount;
      return acc;
    }, { income: 0, expenses: 0, debt: 0 });
  }, [txs]);

  const typeMap: Record<string, string> = {
    'Income': 'Доход',
    'Expense': 'Расход',
    'Debt': 'Долг'
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ФИНАНСОВЫЙ БАЛАНС</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Анализ фискального цикла</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          НОВАЯ ТРАНЗАКЦИЯ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        <div className="bg-white border-4 border-brand p-8 neo-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rotate-45 translate-x-12 -translate-y-12 transition-all group-hover:scale-150"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Входящий капитал</div>
              <ArrowUpRight className="w-6 h-6 text-green-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter relative z-10 leading-none group-hover:text-green-600 transition-colors uppercase">{totals.income.toLocaleString()} ₽</div>
        </div>
        <div className="bg-white border-4 border-brand p-8 neo-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rotate-45 translate-x-12 -translate-y-12 transition-all group-hover:scale-150"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Исходящий поток</div>
              <ArrowDownLeft className="w-6 h-6 text-red-500 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter relative z-10 leading-none group-hover:text-red-600 transition-colors uppercase">{totals.expenses.toLocaleString()} ₽</div>
        </div>
        <div className="bg-bg border-4 border-brand p-8 neo-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rotate-45 translate-x-12 -translate-y-12 transition-all group-hover:scale-150"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Обязательства (Долг)</div>
              <Wallet className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter text-orange-600 relative z-10 leading-none uppercase group-hover:text-orange-700 transition-colors">{totals.debt.toLocaleString()} ₽</div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по транзакциям..." 
              className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12 min-w-[160px]"
            >
              <option value="">ВСЕ ТИПЫ</option>
              {Object.entries(typeMap).map(([key, label]) => (
                <option key={key} value={key}>{label.toUpperCase()}</option>
              ))}
            </select>
            <select 
              value={projectFilter || ''}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="px-6 py-4 border-2 border-brand text-[10px] font-black uppercase tracking-widest italic transition-all neo-shadow-sm hover:shadow-none bg-white appearance-none cursor-pointer pr-12 min-w-[160px]"
            >
              <option value="">ВСЕ ОБЪЕКТЫ</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
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
           <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 border-2 border-brand neo-shadow-sm">
             <Calculator className="w-6 h-6" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">ЗАПИСЬ В ФИНАНСОВУЮ КНИГУ</h3>
           <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Тип транзакции</label>
                  <select value={newTx.type} onChange={e => setNewTx({...newTx, type:e.target.value as any})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                    <option value="Income">Доход</option>
                    <option value="Expense">Расход</option>
                    <option value="Debt">Долг</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Сумма (₽)</label>
                  <input type="number" required value={newTx.amount} onChange={e => setNewTx({...newTx, amount:Number(e.target.value)})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 <div>
                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Объект / Проект</label>
                    <select value={newTx.projectId} onChange={e => setNewTx({...newTx, projectId:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                      <option value="">Общие / Оверхед</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Контрагент</label>
                    <select value={newTx.contactId} onChange={e => setNewTx({...newTx, contactId:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                      <option value="">Повседневные расходы</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Описание транзакции</label>
                <input required value={newTx.description} onChange={e => setNewTx({...newTx, description:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Назначение платежа..." />
              </div>
              <div className="flex gap-4 md:gap-8 pt-4">
                 <button type="submit" className="flex-1 bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm">ЗАФИКСИРОВАТЬ</button>
                 <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors uppercase">ОТМЕНА</button>
              </div>
           </form>
         </div>
      )}

      <div className="bg-white border-4 border-brand neo-shadow overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg border-b-4 border-brand">
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40">Дата</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40">Описание / Контекст</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40 text-center">Тип</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40 text-right">Сумма</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-brand/5">
              {filteredTxs.map(tx => (
                <tr key={tx.id} className="hover:bg-bg/50 transition-all group/row">
                  <td className="p-6 font-mono text-[10px] md:text-xs font-black text-gray-400 italic">{tx.date}</td>
                  <td className="p-6">
                     <div className="text-base md:text-xl font-black uppercase tracking-tighter text-brand italic group-hover/row:translate-x-2 transition-transform duration-300">{tx.description}</div>
                     <div className="flex flex-wrap gap-4 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black italic text-gray-400 mt-2">
                        <span className="flex items-center gap-2 bg-white px-2 py-1 border border-brand/10 shadow-sm"><Construction className="w-3.5 h-3.5 text-brand" /> {projects.find(p => p.id === tx.projectId)?.name || 'ОВЕРХЕД'}</span>
                        <span className="flex items-center gap-2 bg-white px-2 py-1 border border-brand/10 shadow-sm"><User className="w-3.5 h-3.5 text-brand" /> {contacts.find(c => c.id === tx.contactId)?.name || 'БЕЗЛИЧНО'}</span>
                     </div>
                  </td>
                  <td className="p-6 text-center">
                     <span className={`text-[9px] md:text-[11px] font-black uppercase px-4 py-1.5 border-4 border-brand shadow-sm inline-block transform group-hover/row:rotate-0 transition-transform ${
                       tx.type === 'Income' ? 'bg-green-500 text-white -rotate-2' : 
                       tx.type === 'Debt' ? 'bg-orange-500 text-white rotate-2' : 'bg-red-600 text-white -rotate-2'
                     }`}>
                       {typeMap[tx.type] || tx.type}
                     </span>
                  </td>
                  <td className={`p-6 text-right font-black font-mono text-lg md:text-2xl transform transition-all duration-300 group-hover/row:scale-110 ${
                    tx.type === 'Income' ? 'text-green-600' : tx.type === 'Expense' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    <div className="flex items-center justify-end gap-2">
                      {tx.type === 'Income' ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> : null}
                      <span className="uppercase">{tx.type === 'Expense' ? '—' : '+'} {tx.amount.toLocaleString()} ₽</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                     <button onClick={() => handleDelete(tx.id)} className="p-3 text-gray-200 hover:text-red-600 hover:bg-red-50 transition-all rounded-none border-2 border-transparent hover:border-red-600">
                       <Trash2 className="w-5 h-5" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTxs.length === 0 && (
          <div className="p-32 text-center space-y-8 bg-white">
             <div className="w-24 h-24 bg-bg border-4 border-dashed border-brand/20 mx-auto flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform">
              <DollarSign className="w-12 h-12 text-gray-200" />
            </div>
             <div className="text-lg uppercase tracking-[0.6em] font-black text-gray-300 italic">НУЛЕВОЙ БАЛАНС // ОПЕРАЦИИ НЕ ЗАФИКСИРОВАНЫ</div>
          </div>
        )}
      </div>
    </div>
  );
}
