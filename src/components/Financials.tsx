import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { DollarSign, Plus, ArrowUpRight, ArrowDownLeft, Wallet, Construction, User, Trash2 } from 'lucide-react';
import { Financial, Project, Contact } from '../types.ts';

export default function Financials() {
  const [txs, setTxs] = useState<Financial[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ amount: 0, type: 'Expense', description: '', status: 'Paid', projectId: '', contactId: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const q = query(collection(db, 'financials'), orderBy('date', 'desc'));
    const unsubTxs = onSnapshot(q, (s) => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() } as Financial))), (err) => handleFirestoreError(err, OperationType.GET, 'financials'));
    onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), (err) => handleFirestoreError(err, OperationType.GET, 'projects'));
    onSnapshot(collection(db, 'contacts'), (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() } as Contact))), (err) => handleFirestoreError(err, OperationType.GET, 'contacts'));
    return () => unsubTxs();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'financials';
    try {
      await addDoc(collection(db, path), { ...newTx, createdAt: serverTimestamp() });
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

  const totals = txs.reduce((acc, tx) => {
    if (tx.type === 'Income') acc.income += tx.amount;
    else if (tx.type === 'Expense') acc.expenses += tx.amount;
    else if (tx.type === 'Debt') acc.debt += tx.amount;
    return acc;
  }, { income: 0, expenses: 0, debt: 0 });

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
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rotate-45 translate-x-12 -translate-y-12"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Входящий капитал</div>
              <ArrowUpRight className="w-6 h-6 text-green-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter relative z-10 leading-none">{totals.income.toLocaleString()} ₽</div>
        </div>
        <div className="bg-white border-4 border-brand p-8 neo-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rotate-45 translate-x-12 -translate-y-12"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Исходящий поток</div>
              <ArrowDownLeft className="w-6 h-6 text-red-500 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter relative z-10 leading-none">{totals.expenses.toLocaleString()} ₽</div>
        </div>
        <div className="bg-bg border-4 border-brand p-8 neo-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rotate-45 translate-x-12 -translate-y-12"></div>
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Обязательства (Долг)</div>
              <Wallet className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
           </div>
           <div className="text-4xl md:text-5xl font-black italic font-mono tracking-tighter text-orange-600 relative z-10 leading-none">{totals.debt.toLocaleString()} ₽</div>
        </div>
      </div>

      {isAdding && (
         <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-2xl relative">
           <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 border-2 border-brand">
             <DollarSign className="w-6 h-6" />
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

      <div className="bg-white border-4 border-brand neo-shadow overflow-hidden group">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg border-b-4 border-brand">
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40">Дата</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40">Описание / Контекст</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40">Тип</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40 text-right">Сумма</th>
                <th className="p-6 text-[11px] md:text-[13px] uppercase tracking-widest font-black italic text-brand/40 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brand/5">
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-bg transition-all group/row">
                  <td className="p-6 font-mono text-[10px] md:text-xs font-bold text-gray-500 italic">{tx.date}</td>
                  <td className="p-6">
                     <div className="text-sm md:text-base font-black uppercase tracking-tighter text-brand italic group-hover/row:translate-x-1 transition-transform">{tx.description}</div>
                     <div className="flex flex-wrap gap-4 text-[9px] md:text-[10px] uppercase tracking-widest font-black italic text-gray-400 mt-2">
                        <span className="flex items-center gap-2 bg-gray-50 px-2 py-0.5 border border-brand/5"><Construction className="w-3.5 h-3.5 text-brand" /> {projects.find(p => p.id === tx.projectId)?.name || 'Н/Д'}</span>
                        <span className="flex items-center gap-2 bg-gray-50 px-2 py-0.5 border border-brand/5"><User className="w-3.5 h-3.5 text-brand" /> {contacts.find(c => c.id === tx.contactId)?.name || 'Н/Д'}</span>
                     </div>
                  </td>
                  <td className="p-6">
                     <span className={`text-[9px] md:text-[11px] font-black uppercase px-3 py-1 border-2 border-brand shadow-sm inline-block transform -rotate-2 ${
                       tx.type === 'Income' ? 'bg-green-500 text-white' : 
                       tx.type === 'Debt' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
                     }`}>
                       {typeMap[tx.type] || tx.type}
                     </span>
                  </td>
                  <td className={`p-6 text-right font-black font-mono text-base md:text-xl transform transition-transform group-hover/row:scale-110 ${
                    tx.type === 'Income' ? 'text-green-600' : tx.type === 'Expense' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {tx.type === 'Expense' ? '—' : '+'} {tx.amount.toLocaleString()} ₽
                  </td>
                  <td className="p-6 text-right">
                     <button onClick={() => handleDelete(tx.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txs.length === 0 && (
          <div className="p-24 text-center space-y-4">
             <div className="w-20 h-20 bg-bg border-4 border-dashed border-brand/10 mx-auto flex items-center justify-center rounded-full">
              <DollarSign className="w-10 h-10 text-gray-200" />
            </div>
             <div className="text-sm uppercase tracking-[0.4em] font-black text-gray-300 italic">ЖУРНАЛ ТЕХНИЧЕСКИ ПУСТ</div>
          </div>
        )}
      </div>
    </div>

  );
}
