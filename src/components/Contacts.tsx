import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { Plus, Search, Filter, Mail, Phone, MessageCircle, Send, ExternalLink, Users, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Contact } from '../types.ts';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByRole, setGroupByRole] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Contractor': true,
    'Client': true,
    'Team': true,
    'Vendor': true,
    'Unspecified': true
  });
  
  const [newContact, setNewContact] = useState({ 
    name: '', 
    role: 'Contractor', 
    email: '', 
    phone: '', 
    whatsapp: '', 
    telegram: '', 
    address: '', 
    notes: '' 
  });

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'contacts'));
    return unsubscribe;
  }, []);

  const filteredContacts = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    if (!search) return contacts;
    return contacts.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.role.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  }, [contacts, searchQuery]);

  const groupedContacts = useMemo(() => {
    if (!groupByRole) return { 'Все': filteredContacts };
    return filteredContacts.reduce((acc, contact) => {
      const role = contact.role || 'Unspecified';
      if (!acc[role]) acc[role] = [];
      acc[role].push(contact);
      return acc;
    }, {} as Record<string, Contact[]>);
  }, [filteredContacts, groupByRole]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'contacts';
    try {
      await addDoc(collection(db, path), {
        ...newContact,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewContact({ name: '', role: 'Contractor', email: '', phone: '', whatsapp: '', telegram: '', address: '', notes: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот контакт?')) return;
    try {
      await deleteDoc(doc(db, 'contacts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `contacts/${id}`);
    }
  };

  const roleMap: Record<string, string> = {
    'Contractor': 'Подрядчики',
    'Client': 'Клиенты',
    'Team': 'Команда',
    'Vendor': 'Поставщики',
    'Unspecified': 'Прочие'
  };

  const toggleGroup = (role: string) => {
    setExpandedGroups(prev => ({ ...prev, [role]: !prev[role] }));
  };

  return (
    <div className="space-y-10 md:space-y-16 pb-24 md:pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-brand pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none">ПЕРСОНАЛ И CRM</h1>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] md:text-xs font-black italic">Управляемые активы: {contacts.length}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand text-white px-8 py-5 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic hover:bg-gray-800 transition-all neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="w-5 h-5" />
          РЕГИСТРАЦИЯ ПЕРСОНАЛА
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
         <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, роли, email..." 
              className="w-full bg-white border-2 border-brand pl-12 pr-6 py-4 text-sm focus:outline-none italic font-bold uppercase tracking-wider neo-shadow-sm focus:shadow-none transition-all" 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand"
              >
                <X className="w-4 h-4" />
              </button>
            )}
         </div>
         <button 
           onClick={() => setGroupByRole(!groupByRole)}
           className={`px-8 py-4 border-2 border-brand flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] italic transition-all neo-shadow-sm hover:shadow-none ${groupByRole ? 'bg-brand text-white' : 'bg-white'}`}
         >
           <Filter className="w-4 h-4" />
           {groupByRole ? 'СНЯТЬ ГРУППИРОВКУ' : 'ГРУППИРОВАТЬ ПО РОЛЯМ'}
         </button>
      </div>

      {isAdding && (
        <div className="bg-white border-4 border-brand p-8 md:p-12 neo-shadow max-w-4xl relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-brand text-white flex items-center justify-center -rotate-12 neo-shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-10 border-b-4 border-brand pb-4">РЕГИСТРАЦИЯ НОВОЙ ЗАПИСИ</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Полное имя *</label>
                <input required value={newContact.name} onChange={e => setNewContact({...newContact, name:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Иванов Иван Иванович" />
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Классификация</label>
                <select value={newContact.role} onChange={e => setNewContact({...newContact, role:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none appearance-none cursor-pointer">
                  <option value="Contractor">Подрядчик</option>
                  <option value="Client">Клиент</option>
                  <option value="Team">Команда</option>
                  <option value="Vendor">Поставщик</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Протокол</label>
                <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="ivan@buildsync.ru" />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Основной телефон</label>
                <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="+7 (999) 000-00-00" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">WhatsApp</label>
                  <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="Номер без +" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Telegram</label>
                  <input value={newContact.telegram} onChange={e => setNewContact({...newContact, telegram:e.target.value})} className="w-full bg-bg border-2 border-brand p-4 text-sm italic font-bold outline-none focus:bg-white transition-colors" placeholder="@username" />
                </div>
              </div>
              <div className="flex gap-4 md:gap-8 pt-6">
                <button type="submit" className="flex-1 bg-brand text-white py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic active:scale-95 transition-all neo-shadow-sm">СОХРАНИТЬ</button>
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border-2 border-brand py-5 md:py-4 text-xs font-black uppercase tracking-[0.2em] italic hover:bg-gray-100 transition-colors">ОТМЕНА</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-12">
        {(Object.entries(groupedContacts) as [string, Contact[]][]).map(([role, members]) => (
          <div key={role} className="space-y-6">
            {groupByRole && (
              <button 
                onClick={() => toggleGroup(role)}
                className="flex items-center gap-4 group cursor-pointer"
              >
                <div className="bg-brand text-white p-1 neo-shadow-sm group-hover:bg-gray-800 transition-colors">
                  {expandedGroups[role] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-widest text-brand">
                  {roleMap[role] || role} <span className="text-gray-300 ml-2">[{members.length}]</span>
                </h3>
                <div className="h-0.5 bg-brand/10 flex-1"></div>
              </button>
            )}

            {(!groupByRole || expandedGroups[role]) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                {members.map((contact) => (
                  <div key={contact.id} className="bg-white border-2 border-brand p-8 neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/10 rotate-45 translate-x-6 -translate-y-6"></div>
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="w-14 h-14 border-2 border-brand flex items-center justify-center bg-bg group-hover:bg-brand group-hover:text-white transition-all neo-shadow-sm">
                          <Users className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="px-2 py-1 border-2 border-brand text-[8px] md:text-[9px] font-black uppercase italic bg-green-500 text-white shadow-sm transform -rotate-12">
                            АКТИВЕН
                          </div>
                          <button 
                            onClick={() => handleDelete(contact.id)}
                            className="p-1 text-gray-200 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                    
                    <div className="mb-10 overflow-hidden relative z-10">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 truncate group-hover:text-brand transition-colors leading-none">{contact.name}</h3>
                        <div className="text-[11px] text-gray-400 font-black uppercase tracking-widest italic mb-6 border-l-4 border-brand/10 pl-3">{roleMap[contact.role] || contact.role}</div>
                        
                        <div className="space-y-4">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-xs text-gray-500 truncate font-bold font-mono hover:text-brand transition-colors">
                              <Mail className="w-4 h-4 flex-shrink-0 text-brand" />
                              <span className="truncate underline decoration-brand/20">{contact.email}</span>
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-xs text-gray-500 font-bold font-mono hover:text-brand transition-colors">
                              <Phone className="w-4 h-4 flex-shrink-0 text-brand" />
                              <span className="underline decoration-brand/20">{contact.phone}</span>
                            </a>
                          )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-t-2 border-brand/10 pt-6 relative z-10">
                        <div className="flex gap-4">
                          {/* Quick Message Links */}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} title="Email">
                              <Mail className="w-5 h-5 text-gray-300 hover:text-brand hover:scale-110 transition-all cursor-pointer" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} title="Call">
                              <Phone className="w-5 h-5 text-gray-300 hover:text-brand hover:scale-110 transition-all cursor-pointer" />
                            </a>
                          )}
                          {contact.whatsapp && (
                            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="WhatsApp">
                              <MessageCircle className="w-5 h-5 text-green-500 hover:scale-110 transition-all cursor-pointer" />
                            </a>
                          )}
                          {contact.telegram && (
                            <a href={`https://t.me/${contact.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" title="Telegram">
                              <Send className="w-5 h-5 text-blue-500 hover:scale-110 transition-all cursor-pointer" />
                            </a>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button className="p-2 border-2 border-brand hover:bg-brand hover:text-white transition-all neo-shadow-sm hover:shadow-none"><ExternalLink className="w-4 h-4" /></button>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {members.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-brand/5 text-gray-200 uppercase tracking-widest text-[10px] font-black italic">
                Нет подходящих записей в этой категории
              </div>
            )}
          </div>
        ))}

        {filteredContacts.length === 0 && (
          <div className="p-16 md:p-24 text-center space-y-6 border-4 border-dashed border-brand/20 bg-white/50 neo-shadow">
            <div className="w-16 h-16 bg-bg border-2 border-brand mx-auto flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-sm uppercase tracking-[0.3em] font-black text-gray-400 italic">Сведения о персонале по вашему запросу не обнаружены</div>
          </div>
        )}
      </div>
    </div>
  );
}

