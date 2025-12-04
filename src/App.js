import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "taskflow-public";

// --- Add Task Modal ---
const AddTaskModal = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), completed: false });
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4">New Task</h2>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task..."
            className="w-full border px-3 py-2 rounded mb-4"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Add Task</button>
        </form>
        <button onClick={onClose} className="mt-2 text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Firebase auth
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Fetch tasks
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    return onSnapshot(q, snapshot => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const addTask = async (task) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      ...task,
      createdAt: serverTimestamp()
    });
  };

  const deleteTask = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>

      {tasks.length === 0 && <p>No tasks yet.</p>}

      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center justify-between bg-white p-3 rounded shadow">
            <span className={`${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
            <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700">
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg"
      >
        <Plus size={24} />
      </button>

      <AddTaskModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addTask} />
    </div>
  );
}
