import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { CRMTask } from '../types.ts';
import { Bell, X, CheckSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReminderOverlay() {
  const [allPotentialReminders, setAllPotentialReminders] = useState<CRMTask[]>([]);
  const [activeReminders, setActiveReminders] = useState<CRMTask[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('reminderDismissed', '==', false));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPending = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CRMTask));
      setAllPotentialReminders(allPending);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'tasks'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setActiveReminders(allPotentialReminders.filter(t => t.reminderAt && new Date(t.reminderAt) <= now));
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [allPotentialReminders]);

  const dismissReminder = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        reminderDismissed: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'Resolved',
        reminderDismissed: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 md:right-8 z-[100] flex flex-col gap-4 max-w-sm w-full">
      <AnimatePresence>
        {activeReminders.map((reminder) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="bg-white border-4 border-brand p-6 neo-shadow relative group"
          >
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-brand text-white flex items-center justify-center -rotate-12 neo-shadow-sm">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            
            <button 
              onClick={() => dismissReminder(reminder.id)}
              className="absolute top-2 right-2 p-1 text-gray-300 hover:text-brand transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-brand" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand italic">НАПОМИНАНИЕ</span>
              </div>
              <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-2">
                {reminder.title}
              </h4>
              {reminder.description && (
                <p className="text-[10px] text-gray-500 line-clamp-2 uppercase italic font-bold">
                  {reminder.description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => completeTask(reminder.id)}
                className="flex-1 bg-brand text-white py-2 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
              >
                <CheckSquare className="w-3 h-3" />
                ВЫПОЛНЕНО
              </button>
              <button 
                onClick={() => dismissReminder(reminder.id)}
                className="flex-1 border-2 border-brand py-2 text-[10px] font-black uppercase tracking-widest italic hover:bg-gray-50 transition-colors"
              >
                ПРИНЯТО
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
