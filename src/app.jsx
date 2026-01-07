import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { 
  Calculator, 
  Settings, 
  Plus, 
  Trash2, 
  PieChart,
  Maximize2,
  X,
  ChevronRight,
  BarChart3,
  Percent,
  GraduationCap // Added missing icon
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyC9rj3pbPrGDwe-G_BjBjBqlCPW14Zen2M",
  authDomain: "grade-calculator-cf0ad.firebaseapp.com",
  projectId: "grade-calculator-cf0ad",
  storageBucket: "grade-calculator-cf0ad.firebasestorage.app",
  messagingSenderId: "1058344859744",
  appId: "1:1058344859744:web:417d869b304b283f702b05"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'grade-calculator-default';

const getGPAPoints = (grade, type) => {
  if (typeof grade !== 'number' || isNaN(grade) || grade < 0 || type === 'NonGPA') return 0;
  let base = 0;
  if (grade >= 90) base = 4.0;
  else if (grade >= 80) base = 3.0;
  else if (grade >= 75) base = 2.0;
  else if (grade >= 70) base = 1.0;
  
  if (['AP', 'KAP', 'GT'].includes(type)) return base + 1.0;
  if (type === 'DC') return base + 0.5;
  return base;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calculator');
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [editingSW, setEditingSW] = useState(null);
  const [editingWeights, setEditingWeights] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        setIsLocalMode(true);
        setUser({ uid: 'local-user' });
        setLoading(false);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => { 
      if(u) { 
        setUser(u); 
        setIsLocalMode(false); 
      } 
    });
  }, []);

  useEffect(() => {
    if (!user || isLocalMode) {
      if (isLocalMode && courses.length === 0) {
        setCourses([{ 
          id: '1', name: 'English I', type: 'Aca', 
          weights: { major: 50, minor: 35, other: 15 },
          sixWeeks: Array(6).fill(null).map(() => ({ major: [], minor: [], other: [] })),
          exams: { sem1: null, sem2: null }
        }]);
      }
      setLoading(false);
      return;
    }
    return onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'courseData'), (s) => {
      if (s.exists()) setCourses(s.data().courses || []);
      setLoading(false);
    }, () => setLoading(false));
  }, [user, isLocalMode]);

  const saveData = async (updated) => {
    setCourses(updated);
    if (!user || isLocalMode) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'courseData'), { courses: updated });
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const getAvg = (grades) => (!grades || grades.length === 0) ? null : grades.reduce((a, b) => a + b, 0) / grades.length;

  const calculateSWGrade = (sw, weights) => {
    const m = getAvg(sw.major), n = getAvg(sw.minor), o = getAvg(sw.other);
    if (m === null && n === null && o === null) return null;
    let totalWeight = 0, earned = 0;
    if (m !== null) { earned += m * (weights.major / 100); totalWeight += weights.major; }
    if (n !== null) { earned += n * (weights.minor / 100); totalWeight += weights.minor; }
    if (o !== null) { earned += o * (weights.other / 100); totalWeight += weights.other; }
    return totalWeight === 0 ? 0 : (earned / totalWeight) * 100;
  };

  const calculateSemesterGrade = (course, semIdx) => {
    const range = semIdx === 0 ? [0, 1, 2] : [3, 4, 5];
    const swGrades = range.map(i => calculateSWGrade(course.sixWeeks[i], course.weights)).filter(g => g !== null);
    if (swGrades.length === 0) return null;
    const swAvg = swGrades.reduce((a, b) => a + b, 0) / swGrades.length;
    const exam = semIdx === 0 ? course.exams.sem1 : course.exams.sem2;
    if (exam === null || exam === undefined) return Math.round(swAvg);
    return Math.round((swAvg * 0.85) + (exam * 0.15));
  };

  const getFinalYearGrade = (course) => {
    const s1 = calculateSemesterGrade(course, 0);
    const s2 = calculateSemesterGrade(course, 1);
    if (s1 === null && s2 === null) return 0;
    if (s1 !== null && s2 !== null) return Math.round((s1 + s2) / 2);
    return s1 !== null ? s1 : (s2 || 0);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading GradePro...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Calculator size={20}/></div>
          <h1 className="text-xl font-black tracking-tighter">GRADEPRO</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('calculator')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'calculator' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Calculator</button>
          <button onClick={() => setActiveTab('stats')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'stats' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Analytics</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {activeTab === 'calculator' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Yearly Average</h2>
                <p className="text-3xl font-black text-slate-900">
                  {courses.length > 0 ? Math.round(courses.reduce((s, c) => s + getFinalYearGrade(c), 0) / courses.length) : 0}%
                </p>
              </div>
              <button onClick={() => saveData([...courses, { id: crypto.randomUUID(), name: 'New Course', type: 'Aca', weights: { major: 50, minor: 35, other: 15 }, sixWeeks: Array(6).fill(null).map(() => ({ major: [], minor: [], other: [] })), exams: { sem1: null, sem2: null } }])} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"><Plus size={18}/> Add Course</button>
            </div>

            {courses.map(course => (
              <div key={course.id} className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-transparent">
                  <div className="flex items-center gap-3">
                    <input className="bg-transparent text-xl font-black border-none focus:ring-0 w-48" value={course.name} onChange={(e) => saveData(courses.map(c => c.id === course.id ? {...c, name: e.target.value} : c))}/>
                    <button onClick={() => setEditingWeights(course)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Settings size={18}/></button>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Year Grade</span>
                      <p className="text-3xl font-black text-blue-600 tabular-nums">{getFinalYearGrade(course)}%</p>
                    </div>
                    <button onClick={() => saveData(courses.filter(c => c.id !== course.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[0, 1].map(semIdx => (
                    <div key={semIdx} className="space-y-4">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                        <h4 className="font-black text-[11px] text-slate-400 uppercase tracking-widest">Semester {semIdx + 1}</h4>
                        <span className="font-black text-slate-900 text-sm">{calculateSemesterGrade(course, semIdx) || '--'}% Avg</span>
                      </div>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(i => {
                          const actualIdx = semIdx === 0 ? i : i + 3;
                          const sw = course.sixWeeks[actualIdx];
                          const grade = calculateSWGrade(sw, course.weights);
                          return (
                            <button key={i} onClick={() => setEditingSW({ courseId: course.id, swIdx: actualIdx })} className="flex-1 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 p-3 rounded-2xl transition-all group">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">SW{actualIdx + 1}</p>
                              <p className="text-lg font-black text-slate-700">{grade ? Math.round(grade) : '--'}</p>
                            </button>
                          );
                        })}
                        <div className="w-16 bg-blue-50 rounded-2xl p-2 border border-blue-100 text-center">
                          <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Exam</p>
                          <input type="number" className="w-full bg-transparent text-center font-black text-blue-600 outline-none placeholder:text-blue-200" placeholder="--" value={semIdx === 0 ? (course.exams.sem1 ?? '') : (course.exams.sem2 ?? '')} onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            saveData(courses.map(c => c.id === course.id ? {...c, exams: semIdx === 0 ? {...c.exams, sem1: val} : {...c.exams, sem2: val}} : c));
                          }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 text-center flex flex-col items-center justify-center aspect-square">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6"><GraduationCap size={32}/></div>
              <h3 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Unweighted GPA</h3>
              <div className="text-8xl font-black text-slate-900 tracking-tighter mb-4">
                {(courses.reduce((s, c) => s + getGPAPoints(getFinalYearGrade(c), 'Aca'), 0) / (courses.length || 1)).toFixed(2)}
              </div>
            </div>
            <div className="bg-blue-600 p-8 rounded-[40px] shadow-xl shadow-blue-100 text-center flex flex-col items-center justify-center text-white aspect-square">
              <div className="w-16 h-16 bg-white/20 text-white rounded-3xl flex items-center justify-center mb-6"><PieChart size={32}/></div>
              <h3 className="text-blue-100 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Weighted GPA</h3>
              <div className="text-8xl font-black tracking-tighter mb-4">
                {(courses.reduce((s, c) => s + getGPAPoints(getFinalYearGrade(c), c.type), 0) / (courses.length || 1)).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </main>

      {editingWeights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl scale-in-center">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black">Grade Ratios</h3>
              <button onClick={() => setEditingWeights(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              {['major', 'minor', 'other'].map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">{cat}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-12 bg-white border border-slate-200 rounded-lg py-1 text-center font-black outline-none focus:border-blue-500" value={editingWeights.weights[cat]} onChange={(e) => {
                      const updated = {...editingWeights.weights, [cat]: parseInt(e.target.value) || 0};
                      saveData(courses.map(c => c.id === editingWeights.id ? {...c, weights: updated} : c));
                      setEditingWeights({...editingWeights, weights: updated});
                    }}/>
                    <span className="font-black text-slate-300">%</span>
                  </div>
                </div>
              ))}
              <div className={`text-center py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider ${Object.values(editingWeights.weights).reduce((a,b)=>a+b,0) === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                Total: {Object.values(editingWeights.weights).reduce((a,b)=>a+b,0)}% (Must be 100%)
              </div>
              <button onClick={() => setEditingWeights(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm mt-4">Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {editingSW && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-slate-900/20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{courses.find(c => c.id === editingSW.courseId)?.name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Six Weeks {editingSW.swIdx + 1} Assignments</p>
              </div>
              <button onClick={() => setEditingSW(null)} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-12 no-scrollbar">
              {['major', 'minor', 'other'].map(cat => {
                const course = courses.find(c => c.id === editingSW.courseId);
                const grades = course?.sixWeeks[editingSW.swIdx][cat] || [];
                const weight = course.weights[cat];
                const avg = getAvg(grades) || 0;
                return (
                  <div key={cat} className="animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cat === 'major' ? 'bg-blue-600' : cat === 'minor' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                        <h4 className="font-black uppercase text-xs tracking-[0.2em] text-slate-900">{cat} ({weight}%)</h4>
                      </div>
                      <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase mr-2">Category Avg</span>
                        <span className="font-black text-slate-900">{Math.round(avg)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      {grades.map((g, gIdx) => (
                        <div key={gIdx} className="group relative">
                          <input type="number" className="w-24 h-20 bg-slate-50 border border-slate-200 rounded-[20px] text-center font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all" value={g} onChange={(e) => {
                            const newGrades = [...grades];
                            newGrades[gIdx] = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 150);
                            saveData(courses.map(c => c.id === editingSW.courseId ? {...c, sixWeeks: c.sixWeeks.map((sw, sIdx) => sIdx === editingSW.swIdx ? {...sw, [cat]: newGrades} : sw)} : c));
                          }}/>
                          <button onClick={() => {
                            const newGrades = grades.filter((_, i) => i !== gIdx);
                            saveData(courses.map(c => c.id === editingSW.courseId ? {...c, sixWeeks: c.sixWeeks.map((sw, sIdx) => sIdx === editingSW.swIdx ? {...sw, [cat]: newGrades} : sw)} : c));
                          }} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"><X size={12}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newGrades = [...grades, 100];
                        saveData(courses.map(c => c.id === editingSW.courseId ? {...c, sixWeeks: c.sixWeeks.map((sw, sIdx) => sIdx === editingSW.swIdx ? {...sw, [cat]: newGrades} : sw)} : c));
                      }} className="w-24 h-20 border-2 border-dashed border-slate-200 rounded-[20px] flex items-center justify-center text-slate-300 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"><Plus size={28}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center rounded-t-[40px]">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Six Weeks Projected</p>
                <p className="text-4xl font-black">{Math.round(calculateSWGrade(courses.find(c => c.id === editingSW.courseId).sixWeeks[editingSW.swIdx], courses.find(c => c.id === editingSW.courseId).weights))}%</p>
              </div>
              <button onClick={() => setEditingSW(null)} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl">Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}