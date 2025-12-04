import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Calendar, 
  Clock, 
  AlertCircle, 
  LayoutGrid, 
  List, 
  Bell, 
  X, 
  ChevronRight,
  Filter,
  LogOut,
  Download
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

const isOverdue = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

const isDueSoon = (dateString, minutes = 15) => {
  if (!dateString) return false;
  const now = new Date();
  const due = new Date(dateString);
  const diff = due - now;
  return diff > 0 && diff <= minutes * 60 * 1000;
};

// --- Components ---

// 1. Toast Notification Component
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
    type === 'error' ? 'bg-red-500 text-white' : 
    type === 'success' ? 'bg-green-500 text-white' : 
    'bg-blue-600 text-white'
  }`}>
    {type === 'error' ? <AlertCircle size={20} /> : <Bell size={20} />}
    <p className="font-medium">{message}</p>
    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1">
      <X size={16} />
    </button>
  </div>
);

// 2. Add Task Modal
const AddTaskModal = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, description: desc, dueDate, priority, completed: false });
    setTitle('');
    setDesc('');
    setDueDate('');
    setPriority('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input 
              autoFocus
              type="text" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
            <input 
              type="datetime-local" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg capitalize text-sm font-medium border transition-colors ${
                    priority === p 
                      ? p === 'high' ? 'bg-red-100 border-red-500 text-red-700'
                      : p === 'medium' ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                      : 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-200 mt-4"
          >
            Create Task
          </button>
        </form>
      </div>
    </div>
  );
};

// 3. Install Help Modal
const InstallHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        <div className="p-8 text-center">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Download size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Install App</h2>
          <p className="text-gray-600 text-sm mb-6">
            To add this app to your home screen for a full-screen native experience:
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6 border border-gray-100">
            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <p className="text-sm text-gray-700">Tap the <span className="font-bold">Menu</span> (three dots) in your browser.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <p className="text-sm text-gray-700">Select <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span>.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Widget View Component
const WidgetView = ({ tasks, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const urgentTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      // Sort by due date (nulls last), then priority
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 3);

  return (
    <div className="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-light">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h1>
          <p className="text-slate-400 text-lg mt-1">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
          <X size={24} />
        </button>
      </div>

      <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Focus List</h2>
      
      <div className="space-y-4 flex-1">
        {urgentTasks.length > 0 ? urgentTasks.map(task => (
          <div key={task.id} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className={`w-1.5 h-10 rounded-full ${
                task.priority === 'high' ? 'bg-red-500' : 
                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div>
                <h3 className="text-xl font-medium leading-tight">{task.title}</h3>
                {task.dueDate && (
                  <div className="flex items-center gap-1.5 text-slate-300 text-sm mt-1">
                    <Clock size={14} />
                    {isOverdue(task.dueDate) ? <span className="text-red-400 font-bold">Overdue</span> : formatDate(task.dueDate)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-10 text-slate-500">
            <p className="text-lg">No urgent tasks.</p>
            <p className="text-sm">Enjoy your day!</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 text-center text-slate-500 text-xs">
        Widget Mode Active • Tap X to return
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'widget'
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'upcoming'
  const [notifiedTasks, setNotifiedTasks] = useState(new Set());
  
  // --- PWA & Mobile Configuration ---
  useEffect(() => {
    // 1. Set the App Title
    document.title = "TaskFlow";
    
    // 2. Inject Mobile Meta Tags for Native Feel
    const metaTags = [
      { name: 'theme-color', content: '#4338ca' }, // Matches the indigo header
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      // Prevents zooming on inputs which makes it feel like a real app
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' } 
    ];

    metaTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      } else {
        meta.content = content;
      }
    });
  }, []);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // RULE: Simple queries only. Sorting/Filtering done in memory for flexibility & robust rule adherence.
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Firestore error:", error);
      showToast("Error syncing tasks", "error");
    });

    return () => unsubscribe();
  }, [user]);

  // --- Reminder Logic ---
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    const checkReminders = () => {
      tasks.forEach(task => {
        if (!task.completed && task.dueDate && !notifiedTasks.has(task.id)) {
          if (isDueSoon(task.dueDate)) {
            // Trigger Notification
            if (Notification.permission === "granted") {
              new Notification("Task Due Soon!", { body: `${task.title} is due in less than 15 mins.` });
            }
            showToast(`Task due soon: ${task.title}`, "info");
            
            // Mark as notified so we don't spam
            setNotifiedTasks(prev => new Set(prev).add(task.id));
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, notifiedTasks]);


  // --- Actions ---
  const addTask = async (taskData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
        ...taskData,
        createdAt: serverTimestamp()
      });
      showToast("Task added successfully", "success");
    } catch (e) {
      showToast("Failed to add task", "error");
    }
  };

  const toggleComplete = async (task) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (e) {
      showToast("Update failed", "error");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
      showToast("Task deleted", "success");
    } catch (e) {
      showToast("Delete failed", "error");
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Filtering Logic ---
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // 1. Sort: Completed last, then by due date (asc), then by priority
    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    });

    // 2. Filter tabs
    const today = new Date().toDateString();
    if (filter === 'today') {
      result = result.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today);
    } else if (filter === 'upcoming') {
      result = result.filter(t => t.dueDate && new Date(t.dueDate) > new Date());
    } else if (filter === 'overdue') {
        result = result.filter(t => !t.completed && isOverdue(t.dueDate));
    }

    return result;
  }, [tasks, filter]);

  // --- Stats for Dashboard ---
  const stats = useMemo(() => {
      const pending = tasks.filter(t => !t.completed).length;
      const done = tasks.filter(t => t.completed).length;
      return { pending, done };
  }, [tasks]);


  // --- Render ---
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-indigo-600 animate-pulse">Loading TaskFlow...</div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* Widget Mode Overlay */}
      {viewMode === 'widget' && <WidgetView tasks={tasks} onClose={() => setViewMode('list')} />}

      {/* Install Help Modal */}
      <InstallHelpModal isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />

      {/* Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Main Header */}
      <header className="bg-indigo-700 text-white pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600 to-purple-800 opacity-90"></div>
        <div className="relative z-10 max-w-4xl mx-auto flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
                <p className="text-indigo-200 mt-1 text-sm">{stats.pending} pending, {stats.done} completed</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowInstallHelp(true)}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all text-white flex items-center gap-2 text-sm font-medium"
                    title="Install App"
                >
                    <Download size={20} />
                    <span className="hidden sm:inline">Install</span>
                </button>
                <button 
                    onClick={() => setViewMode('widget')}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all text-white flex items-center gap-2 text-sm font-medium"
                    title="Switch to Widget/Focus Mode"
                >
                    <LayoutGrid size={20} />
                    <span className="hidden sm:inline">Widget View</span>
                </button>
                {/* Notification Permission Request Button (only if needed/not granted) */}
                {("Notification" in window && Notification.permission === 'default') && (
                    <button 
                        onClick={() => Notification.requestPermission()}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm"
                        title="Enable Notifications"
                    >
                        <Bell size={20} />
                    </button>
                )}
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 pb-20">
        
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex overflow-x-auto gap-2 no-scrollbar">
            {['all', 'today', 'upcoming', 'overdue'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
            ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
            {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">All caught up!</h3>
                    <p className="text-gray-400 text-sm mt-1">No tasks found for this filter.</p>
                </div>
            ) : (
                filteredTasks.map(task => (
                    <div 
                        key={task.id}
                        className={`group bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:shadow-md transition-all ${
                            task.completed ? 'opacity-60 bg-gray-50' : 'hover:border-indigo-100'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <button 
                                onClick={() => toggleComplete(task)}
                                className={`mt-1 flex-shrink-0 transition-colors ${
                                    task.completed ? 'text-green-500' : 
                                    task.priority === 'high' ? 'text-red-400' : 
                                    task.priority === 'medium' ? 'text-yellow-400' : 'text-gray-300'
                                } hover:text-green-600`}
                            >
                                {task.completed ? <CheckCircle size={24} className="fill-current" /> : <Circle size={24} />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {task.title}
                                </h3>
                                {task.description && (
                                    <p className="text-sm text-gray-500 truncate mt-0.5">{task.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    {task.dueDate && (
                                        <div className={`flex items-center gap-1 text-xs ${
                                            !task.completed && isOverdue(task.dueDate) ? 'text-red-500 font-bold' : 
                                            !task.completed && isDueSoon(task.dueDate) ? 'text-orange-500 font-bold' :
                                            'text-gray-400'
                                        }`}>
                                            <Calendar size={12} />
                                            {formatDate(task.dueDate)}
                                        </div>
                                    )}
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                        task.priority === 'high' ? 'bg-red-100 text-red-600' :
                                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {task.priority}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => deleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-300 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 z-30"
      >
        <Plus size={24} />
      </button>

      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAdd={addTask}
      />

    </div>
  );
}
