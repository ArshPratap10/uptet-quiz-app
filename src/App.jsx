import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  HelpCircle, 
  Settings, 
  Bell, 
  User, 
  ChevronRight, 
  GraduationCap,
  RefreshCcw,
  Target,
  Map,
  Scale,
  Users,
  TrendingUp,
  Menu
} from 'lucide-react';
import questionsData from './data/questions.json';
import './App.css';

const availableSubjects = [...new Set(questionsData.map(q => q.subject))];

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [viewHistory, setViewHistory] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  // Quiz/Session State
  const [quizMode, setQuizMode] = useState('practice'); // 'practice' or 'test'
  const [desiredQuestionCount, setDesiredQuestionCount] = useState(999);
  const [resultsFilter, setResultsFilter] = useState('all'); 
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [appLang, setAppLang] = useState('hi'); // Default language is Hindi per user request
  const t = (en, hi) => appLang === 'hi' ? hi : en;
  
  const goToView = (nextView) => {
    setViewHistory(prev => [...prev, currentView]);
    setCurrentView(nextView);
  };

  const goBackView = () => {
    setViewHistory(prev => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      goToView(next);
      return prev.slice(0, -1);
    });
  };
  
  const [isSelectingChapters, setIsSelectingChapters] = useState(false);
  const [selectedMultiChapters, setSelectedMultiChapters] = useState(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); 
  const [checkedAnswers, setCheckedAnswers] = useState({}); 
  
  // Advanced State Tracking
  const [chapterSessions, setChapterSessions] = useState({});
  const [testHistory, setTestHistory] = useState([]);

  // Refs
  const stateRef = useRef({ chapterSessions, userAnswers, checkedAnswers, quizQuestions, currentQuestionIndex });
  const detailedSolutionsRef = useRef(null);

  // 1. On Mount: Load State
  useEffect(() => {
    const savedData = localStorage.getItem('uptetLMSData');
    if (savedData) {
       const parsed = JSON.parse(savedData);
       if (parsed.chapterSessions) setChapterSessions(parsed.chapterSessions);
       if (parsed.testHistory) setTestHistory(parsed.testHistory);
    }
  }, []);

  // Sync ref
  useEffect(() => {
    stateRef.current = { chapterSessions, userAnswers, checkedAnswers, quizQuestions, currentQuestionIndex };
  }, [chapterSessions, userAnswers, checkedAnswers, quizQuestions, currentQuestionIndex]);

  // Sync to LocalStorage function
  const saveMasterState = (newSessions, newHistory) => {
     const data = {
       chapterSessions: newSessions || chapterSessions,
       testHistory: newHistory || testHistory
     };
     localStorage.setItem('uptetLMSData', JSON.stringify(data));
  };

  // --- Session Managers ---

  const initPracticeSession = (chapter) => {
    // Resume or Create
    const existing = chapterSessions[chapter];
    
    if (existing) {
       // Resume or Upgrade?
       const totalAvailable = questionsData.filter(q => q.chapter === chapter).length;
       const sessionLen = existing.questions?.length || 0;
       
       // Detect if this is a "stuck" 10-question session while the dashboard suggests more
       if (sessionLen < totalAvailable && totalAvailable > 10 && desiredQuestionCount >= totalAvailable) {
           if (window.confirm(`${chapter} has ${totalAvailable} questions, but your current session only has ${sessionLen}. Would you like to restart to see all questions?`)) {
              resetChapterProgress(chapter, true); // True to skip confirm inside
              return; 
           }
       }
       
       setQuizQuestions(existing.questions);
       setUserAnswers(existing.userAnswers);
       setCheckedAnswers(existing.checkedAnswers);
       setCurrentQuestionIndex(existing.lastIndex || 0);
       setSelectedChapter(chapter);
       setQuizMode('practice');
       goToView('quiz');
    } else {
       // Create fresh session array
       let qs = questionsData.filter(q => q.chapter === chapter);
       if (!qs.length) { alert("No questions available."); return; }
       
       qs = qs.sort(() => 0.5 - Math.random());
       if (desiredQuestionCount < 999) {
           qs = qs.slice(0, desiredQuestionCount);
       }
       
       setQuizQuestions(qs);
       setCurrentQuestionIndex(0);
       setUserAnswers({});
       setCheckedAnswers({});
       setSelectedChapter(chapter);
       setQuizMode('practice');
       
       const newSession = {
          isCompleted: false,
          lastIndex: 0,
          questions: qs,
          userAnswers: {},
          checkedAnswers: {}
       };
       setChapterSessions(prev => { 
         const updated = { ...prev, [chapter]: newSession };
         saveMasterState(updated, null);
         return updated;
       });
       
       goToView('quiz');
    }
  };

  const resetChapterProgress = (chap, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Are you sure you want to reset your progress for ${chap}?`)) return;
    setChapterSessions(prev => {
       const next = { ...prev };
       delete next[chap];
       saveMasterState(next, testHistory);
       return next;
    });
  };

  const startCombinedSession = (mode) => {
      if (selectedMultiChapters.size === 0) return;
      const combinedQs = questionsData.filter(q => selectedMultiChapters.has(q.chapter));
      if (combinedQs.length === 0) return;
      
      let finalQs = combinedQs;
      if (desiredQuestionCount < 999) {
          finalQs = combinedQs.sort(() => 0.5 - Math.random()).slice(0, desiredQuestionCount);
      }
      
      setQuizQuestions(finalQs);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setCheckedAnswers({});
      
      const chapArray = Array.from(selectedMultiChapters);
      const suffix = mode === 'test' ? 'Test' : 'Practice';
      const titleStr = chapArray.length <= 2 ? chapArray.join(' & ') : `Combined ${suffix} (${chapArray.length} Modules)`;
      
      setSelectedChapter(titleStr);
      setQuizMode(mode);
      setIsSelectingChapters(false);
      setSelectedMultiChapters(new Set());
      goToView('quiz');
  };

  const startTestByYear = (year) => {
    let qs = questionsData.filter(q => q.year === year);
    if (!qs.length) { alert("No questions available."); return; }
    
    qs = qs.sort(() => 0.5 - Math.random()).slice(0, desiredQuestionCount);
    
    setQuizQuestions(qs);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCheckedAnswers({});
    setSelectedChapter(year + " Paper");
    setQuizMode('test');
    goToView('quiz');
  };
  
  // Custom revision mode using globally wrong answers from the specified subject
  const startTargetedRevision = (subject) => {
     const badQuestionIds = new Set();
     
     const subjectChapters = [...new Set(questionsData.filter(q => q.subject === subject).map(q => q.chapter))];
     
     subjectChapters.forEach(chap => {
       const session = chapterSessions[chap];
       if (session && session.checkedAnswers) {
         Object.keys(session.checkedAnswers).forEach(qId => {
            if (session.checkedAnswers[qId].isCorrect === false) {
               badQuestionIds.add(Number(qId));
            }
         });
       }
     });

     if (badQuestionIds.size === 0) {
        alert("You have no incorrect questions marked for this subject yet. Nice job!");
        return;
     }

     let qs = questionsData.filter(q => badQuestionIds.has(q.id));
     qs = qs.sort(() => 0.5 - Math.random());
     
     setQuizQuestions(qs);
     setCurrentQuestionIndex(0);
     setUserAnswers({});
     setCheckedAnswers({});
     setSelectedChapter(`${subject} (Mistakes Revision)`);
     setQuizMode('revision'); // specific mode so checkCurrentAnswer knows what to do
     
     goToView('quiz');
  };

  // --- Live Quiz Interaction ---

  const handleOptionSelect = (qId, optionIndex) => {
    if (quizMode === 'practice' && checkedAnswers[qId]) return; 
    
    setUserAnswers(prev => {
      const nextArgs = { ...prev, [qId]: optionIndex };
      
      // Persist immediately if in practice mode
      if (quizMode === 'practice' && selectedChapter && chapterSessions[selectedChapter]) {
          updateSessionMemory(nextArgs, null, null);
      }
      return nextArgs;
    });
  };

  const updateSessionMemory = (newAppAnswers, newCheckedAnswers, completedFlag) => {
      setChapterSessions(prev => {
         const chapter = stateRef.current.selectedChapter || selectedChapter;
         const currentSess = prev[chapter];
         if (!currentSess) return prev; // Probably in test or revision mode

         const updatedSession = {
           ...currentSess,
           lastIndex: stateRef.current.currentQuestionIndex,
           userAnswers: newAppAnswers || currentSess.userAnswers,
           checkedAnswers: newCheckedAnswers || currentSess.checkedAnswers,
           isCompleted: completedFlag !== null ? completedFlag : currentSess.isCompleted
         };

         const overall = { ...prev, [chapter]: updatedSession };
         saveMasterState(overall, null);
         return overall;
      });
  };

  const checkCurrentAnswer = () => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (userAnswers[currentQ.id] === undefined) return;

    const isCorrect = userAnswers[currentQ.id] === currentQ.correctOptionIndex;
    
    setCheckedAnswers(prev => {
      const nextChecked = { ...prev, [currentQ.id]: { isCorrect, correctIndex: currentQ.correctOptionIndex } };
      
      if (quizMode === 'practice') {
         updateSessionMemory(userAnswers, nextChecked, null);
      } 
      else if (quizMode === 'revision' && isCorrect) {
         // Correcting a mistake! Dig into original chapter session and fix it.
         setChapterSessions(oldSessions => {
            const originalChapter = currentQ.chapter;
            const currentObj = oldSessions[originalChapter];
            if (!currentObj || !currentObj.checkedAnswers) return oldSessions;

            const fixedChecked = {
               ...currentObj.checkedAnswers,
               [currentQ.id]: { isCorrect: true, correctIndex: currentQ.correctOptionIndex }
            };
            const fixedUserAnswers = {
               ...currentObj.userAnswers,
               [currentQ.id]: userAnswers[currentQ.id]
            };

            const newSessions = {
               ...oldSessions,
               [originalChapter]: {
                  ...currentObj,
                  checkedAnswers: fixedChecked,
                  userAnswers: fixedUserAnswers
               }
            };
            saveMasterState(newSessions, null);
            return newSessions;
         });
      }
      return nextChecked;
    });
  };

  const clearCurrentResponse = () => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (quizMode === 'practice' && checkedAnswers[currentQ.id]) return;
    
    const newAnswers = { ...userAnswers };
    delete newAnswers[currentQ.id];
    setUserAnswers(newAnswers);

    if (quizMode === 'practice') {
       updateSessionMemory(newAnswers, null, null);
    }
  };

  const navigateQuestion = (dir) => {
     let nextI = currentQuestionIndex + dir;
     if (nextI >= 0 && nextI < quizQuestions.length) {
         setCurrentQuestionIndex(nextI);
         if (quizMode === 'practice') {
             updateSessionMemory(null, null, null);
         }
     }
  };

  const submitFullTest = () => {
    const evaluated = {};
    let score = 0;
    
    quizQuestions.forEach(q => {
      const selected = userAnswers[q.id];
      if (selected !== undefined) {
         const isCorrect = selected === q.correctOptionIndex;
         evaluated[q.id] = { isCorrect, correctIndex: q.correctOptionIndex };
         if (isCorrect) score++;
      } else {
         evaluated[q.id] = { isCorrect: false, correctIndex: q.correctOptionIndex, skipped: true };
      }
    });
    
    setCheckedAnswers(evaluated);
    
    // Save to test history heavily so it can be re-loaded
    const historyObj = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      title: selectedChapter,
      score,
      total: quizQuestions.length,
      snapshotQuestions: quizQuestions,      // Saves the exact test
      snapshotUserAnswers: userAnswers,      // Saves what they picked
      snapshotCheckedAnswers: evaluated      // Saves the evaluation
    };
    
    setTestHistory(prev => {
      const newHist = [historyObj, ...prev];
      saveMasterState(chapterSessions, newHist);
      return newHist;
    });

    setResultsFilter('all');
    goToView('results');
  };

  const loadPastTestResults = (historyItem) => {
    setQuizQuestions(historyItem.snapshotQuestions || []);
    setUserAnswers(historyItem.snapshotUserAnswers || {});
    setCheckedAnswers(historyItem.snapshotCheckedAnswers || {});
    setSelectedChapter(historyItem.title);
    setResultsFilter('all');
    goToView('results');
  };

  const reattemptFiltered = (modes) => {
    const targetQuestionIds = new Set();
    
    quizQuestions.forEach(q => {
      const isAns = userAnswers[q.id] !== undefined;
      const isCor = checkedAnswers[q.id] && checkedAnswers[q.id].isCorrect;
      
      if (modes.includes('wrong') && isAns && !isCor) {
         targetQuestionIds.add(q.id);
      }
      if (modes.includes('skipped') && !isAns) {
         targetQuestionIds.add(q.id);
      }
    });

    if (targetQuestionIds.size === 0) return;

    let qs = quizQuestions.filter(q => targetQuestionIds.has(q.id));
    qs = qs.sort(() => 0.5 - Math.random());
    
    setQuizQuestions(qs);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCheckedAnswers({});
    
    // Create an explicit title based on modes
    let titleStr = "Reattempting: ";
    if (modes.includes('wrong') && modes.includes('skipped')) titleStr += "Incorrect & Skipped";
    else if (modes.includes('wrong')) titleStr += "Incorrect Only";
    else if (modes.includes('skipped')) titleStr += "Skipped Only";
    
    setSelectedChapter(titleStr);
    setQuizMode('revision'); 
    
    goToView('quiz');
  };

  // --- Render Functions ---

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ width: 32, height: 32, backgroundColor: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={20} />
        </div>
        ExamGOAL
      </div>
      
      <div className="sidebar-section">
        <div className={`sidebar-item ${currentView === 'dashboard' || currentView === 'history' ? 'active' : ''}`} onClick={() => goToView('dashboard')}>
          <LayoutDashboard size={20} /> {t("Dashboard", "डैशबोर्ड")}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">{t("Study", "अध्ययन")}</div>
        <div className={`sidebar-item ${currentView === 'subjects' || currentView === 'topic' ? 'active' : ''}`} onClick={() => goToView('subjects')}>
          <BookOpen size={20} /> {t("Subjects & Papers", "विषय और प्रश्नपत्र")}
        </div>
        <div className={`sidebar-item ${currentView === 'pyq' ? 'active' : ''}`} onClick={() => goToView('pyq')}>
          <History size={20} /> {t("Previous Year Questions", "पिछले वर्ष के प्रश्न पत्र")}
        </div>
        <div className={`sidebar-item ${currentView === 'syllabus' ? 'active' : ''}`} onClick={() => goToView('syllabus')}>
          <GraduationCap size={20} /> {t("Syllabus", "पाठ्यक्रम")}
        </div>
      </div>

      <div className="sidebar-section" style={{ marginTop: 'auto' }}>
        <div className="sidebar-item">
          <Settings size={20} /> {t("Settings", "सेटिंग्स")}
        </div>
        <div className="sidebar-item">
          <HelpCircle size={20} /> {t("Help & Feedback", "सहायता और प्रतिक्रिया")}
        </div>
      </div>
    </div>
  );

  const TopHeader = () => {
    const [darkMode, setDarkMode] = useState(() => {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true';
    });

    useEffect(() => {
      if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    return (
      <div className="top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <BookOpen size={24} />
           <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>ExamGOAL</div>
        </div>
        <div className="header-actions">
          {viewHistory.length > 0 && (
            <button className="btn-outline header-btn" onClick={goBackView}>
              ← Back
            </button>
          )}
          <button 
             className="btn-outline header-btn" 
             style={{ backgroundColor: 'var(--card-bg)', color: 'var(--primary)' }}
             onClick={() => setAppLang(appLang === 'hi' ? 'en' : 'hi')}
          >
            {appLang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
          </button>
          
          {/* Dark Mode Toggle Button */}
          <button 
            className="dark-mode-toggle header-btn"
            onClick={() => setDarkMode(!darkMode)}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <button className="btn-outline header-btn">{t("PYQ Tests", "PYQ टेस्ट")}</button>
          <button className="btn-outline header-btn">{t("Practice Test", "प्रैक्टिस टेस्ट")}</button>
          <Bell size={20} color="white" style={{ cursor: 'pointer', marginLeft: '1rem' }} />
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <User size={20} color="white" />
          </div>
        </div>
      </div>
    );
  };

  const GlobalSettingsBar = () => (
    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', display: 'flex', gap: '2rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
        Questions to generate: 
        <select 
          value={desiredQuestionCount} 
          onChange={(e) => setDesiredQuestionCount(Number(e.target.value))}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}
        >
          <option value={5}>5 Questions</option>
          <option value={10}>10 Questions</option>
          <option value={20}>20 Questions</option>
          <option value={50}>50 Questions</option>
          <option value={100}>100 Questions</option>
          <option value={999}>Max Available</option>
        </select>
      </label>
    </div>
  );

  const renderDashboard = () => (
    <div className="content-area">
      <h1 className="section-title">{t("Welcome Back", "वापसी पर स्वागत है")}</h1>
      <div className="grid-cards" style={{ marginBottom: '3rem' }}>
        <div className="subject-card" style={{ borderLeft: '4px solid var(--primary)' }}>
           <h3>{t("Tests Completed", "पूरे किए गए परीक्षण")}</h3>
           <p style={{ fontSize: '2rem', fontWeight: 700 }}>{testHistory.length}</p>
        </div>
        <div className="subject-card" style={{ borderLeft: '4px solid var(--success)' }}>
           <h3>{t("Chapters Mastered", "महारत हासिल अध्याय")}</h3>
           <p style={{ fontSize: '2rem', fontWeight: 700 }}>
              {Object.values(chapterSessions).filter(s => s.isCompleted).length}
           </p>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="subject-card">
          <div className="subject-card-title">
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
              <GraduationCap size={24} color="var(--primary)" />
            </div>
            {t("Chapter Wise Practice", "अध्याय वार अभ्यास")}
          </div>
          <div className="subject-card-meta">
            {t("Practice one chapter at a time with saved progress.", "एक-एक अध्याय के साथ अभ्यास करें और प्रगति सेव रहेगी।")}
          </div>
          <div className="subject-card-actions" style={{ flexDirection: 'column' }}>
            <button onClick={() => goToView('subjects')}>
              {t("Open Chapters", "अध्याय खोलें")} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <h2 className="section-title">{t("My Tests History", "मेरा परीक्षण इतिहास")}</h2>
      {testHistory.length === 0 ? (
         <p style={{ color: 'var(--text-muted)' }}>{t("You haven't completed any full tests yet.", "आपने अभी तक कोई पूर्ण परीक्षण पूरा नहीं किया है।")}</p>
      ) : (
        <div className="grid-cards">
           {testHistory.map(h => {
              const accuracy = h.total > 0 ? ((h.score / h.total) * 100).toFixed(2) : 0;
              const attempted = h.snapshotUserAnswers ? Object.keys(h.snapshotUserAnswers).length : h.total; // estimation flat if null
              
              return (
              <div 
                key={h.id} 
                style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                 <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{h.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{h.date}</div>
                 </div>
                 
                 <div className="pill-card">
                    <div className="pill" style={{ backgroundColor: 'var(--success-bg)' }}>
                       <span style={{ color: 'var(--success)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● SCORE</span>
                       <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{h.score}.00/{h.total}</span>
                    </div>
                    <div className="pill" style={{ backgroundColor: 'var(--primary-light)' }}>
                       <span style={{ color: 'var(--primary)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● ACCURACY</span>
                       <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{accuracy}%</span>
                    </div>
                    <div className="pill" style={{ backgroundColor: '#f3e8ff' }}> {/* Purple */}
                       <span style={{ color: '#9333ea', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● ATTEMPTED</span>
                       <span style={{ color: '#9333ea', fontSize: '1.1rem' }}>{attempted}/{h.total}</span>
                    </div>
                    <div className="pill" style={{ backgroundColor: '#ffedd5' }}> {/* Orange */}
                       <span style={{ color: '#ea580c', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>● TIME</span>
                       <span style={{ color: '#ea580c', fontSize: '1.1rem' }}>25:00</span>
                    </div>
                 </div>

                 <button 
                   onClick={() => loadPastTestResults(h)}
                   style={{ margin: '1rem', marginTop: '0', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.75rem', fontWeight: 600, width: 'calc(100% - 2rem)', cursor: 'pointer' }}
                 >
                   View Analysis
                 </button>
              </div>
           )})}
        </div>
      )}
    </div>
  );

  const renderSubjects = () => (
    <div className="content-area">
      <button className="btn-outline" style={{ marginBottom: '1rem' }} onClick={goBackView}>
        ← {t("Back", "वापस")}
      </button>
      <h1 className="section-title">{t("Chapter Wise Practice", "अध्याय वार अभ्यास")}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        {t("Choose a subject, then select a chapter to continue practice with saved progress.", "एक विषय चुनें, फिर अध्याय चुनकर सेव प्रगति के साथ अभ्यास जारी रखें।")}
      </p>
      <div className="grid-cards">
        {availableSubjects.map((sub, i) => {
            const subjectQuestions = questionsData.filter(q => q.subject === sub);
            const years = [...new Set(subjectQuestions.map(q => q.year))];
            
            // Calculate mistakes for this subject
            const subjectChapters = [...new Set(subjectQuestions.map(q => q.chapter))];
            let mistakeCount = 0;
            subjectChapters.forEach(chap => {
              if (chapterSessions[chap] && chapterSessions[chap].checkedAnswers) {
                Object.values(chapterSessions[chap].checkedAnswers).forEach(ans => {
                  if (ans.isCorrect === false) mistakeCount++;
                });
              }
            });

            return (
            <div key={i} className="subject-card">
              <div className="subject-card-title">
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <BookOpen size={24} color="var(--primary)" />
                </div>
                {sub}
              </div>
              <div className="subject-card-meta">
                Years: {years.sort().join(', ')} <br/>
                {mistakeCount > 0 && <span style={{ color: 'var(--error)', fontWeight: 600 }}>{mistakeCount} wrong answers requiring revision</span>}
              </div>
              
              <div className="subject-card-actions" style={{ flexDirection: 'column' }}>
                <button 
                   className="btn-outline" 
                   onClick={() => startTargetedRevision(sub)} 
                   disabled={mistakeCount === 0} 
                   style={{ borderColor: mistakeCount > 0 ? 'var(--error)' : 'var(--border)', color: mistakeCount > 0 ? 'var(--error)' : 'var(--text-muted)' }}
                >
                   <Target size={16}/> {t("Revise My Mistakes", "मेरी गलतियों को सुधारें")}
                </button>
                <button onClick={() => { setSelectedSubject(sub); goToView('topic'); }}>
                    {t("See Chapters", "अध्याय देखें")} <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderTopicSelection = () => {
    const chapters = [...new Set(questionsData.filter(q => q.subject === selectedSubject).map(q => q.chapter))];
    
    const handleChapterClick = (chap) => {
       if (isSelectingChapters) {
          const nextSet = new Set(selectedMultiChapters);
          if (nextSet.has(chap)) nextSet.delete(chap);
          else nextSet.add(chap);
          setSelectedMultiChapters(nextSet);
       } else {
          initPracticeSession(chap);
       }
    };

    return (
      <div className="content-area">
        <button className="btn-outline" style={{ marginBottom: '1.5rem' }} onClick={() => goToView('subjects')}>
           ← {t("Back to Workbooks", "वर्कबुक्स पर वापस जाएँ")}
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
           <h1 className="section-title" style={{ margin: 0 }}>{selectedSubject} {t("Modules", "मॉड्यूल")}</h1>
           <button 
             className="btn-outline" 
             style={{ backgroundColor: isSelectingChapters ? 'var(--primary-light)' : 'var(--card-bg)', borderColor: isSelectingChapters ? 'var(--primary)' : 'var(--border)', color: isSelectingChapters ? 'var(--primary)' : 'var(--text-main)', fontWeight: 600 }}
             onClick={() => {
                if (isSelectingChapters) {
                   setIsSelectingChapters(false);
                   setSelectedMultiChapters(new Set());
                } else {
                   setIsSelectingChapters(true);
                }
             }}
           >
              {isSelectingChapters ? t('Cancel Selection', 'चयन रद्द करें') : t('Select Multiple Chapters', 'कई अध्याय चुनें')}
           </button>
        </div>

        {isSelectingChapters && (
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--primary)', borderRadius: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, fontWeight: 600, color: 'var(--primary)' }}>
                 {selectedMultiChapters.size} {t("Modules Selected", "मॉड्यूल चयनित")}
              </div>
              <button 
                disabled={selectedMultiChapters.size === 0}
                style={{ opacity: selectedMultiChapters.size === 0 ? 0.5 : 1 }}
                onClick={() => startCombinedSession('practice')}
              >
                  {t("Combined Practice", "संयुक्त अभ्यास")}
              </button>
              <button 
                disabled={selectedMultiChapters.size === 0}
                style={{ opacity: selectedMultiChapters.size === 0 ? 0.5 : 1, backgroundColor: 'var(--error)' }}
                onClick={() => startCombinedSession('test')}
              >
                  {t("Combined Test", "संयुक्त परीक्षा")}
              </button>
           </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {chapters.map((chap, i) => {
            const topicQs = questionsData.filter(q => q.chapter === chap);
            const qCount = topicQs.length;
            const session = chapterSessions[chap] || { correct: 0, wrong: 0, total: 0 };
            
            // Calculate progress bar percentages
            const totalQCount = qCount > 0 ? qCount : 1;
            const correctPct = Math.min((session.correct / totalQCount) * 100, 100);
            const wrongPct = Math.min((session.wrong / totalQCount) * 100, 100 - correctPct);
            
            const isSelected = selectedMultiChapters.has(chap);

            return (
               <div key={i} onClick={() => handleChapterClick(chap)} style={{ 
                 backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--card-bg)', 
                 border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, 
                 borderRadius: '12px', 
                 cursor: 'pointer', 
                 overflow: 'hidden',
                 display: 'flex',
                 flexDirection: 'column',
                 boxShadow: 'var(--shadow-sm)',
                 transition: 'all 0.2s'
               }}>
                 <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    
                    {/* Checkbox Placeholder for Multi-Select */}
                    {isSelectingChapters && (
                       <div style={{ width: 24, height: 24, border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '4px', backgroundColor: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>✓</span>}
                       </div>
                    )}

                    {/* Left: Circled Qs Count */}
                    <div style={{ backgroundColor: 'var(--bg-main)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                       <span style={{ fontSize: '1.1rem', color: 'var(--text-main)', lineHeight: 1.2 }}>{qCount}</span>
                       <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Qs</span>
                    </div>

                    {/* Middle: Title and Badges */}
                    <div style={{ flex: 1 }}>
                       <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 500 }}>{chap}</h3>
                       <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <span style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)', color: 'var(--error)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{t("Topic-wise Qs", "विषय-वार प्रश्न")}</span>
                          {session.correct > 0 && <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{t("In Progress", "प्रगति में")}</span>}
                       </div>
                    </div>

                    {/* Right: Reset or Arrow */}
                    <div style={{ paddingRight: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       {session.questions?.length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); resetChapterProgress(chap); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                            title="Reset Chapter Progress"
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                             <RefreshCcw size={18} color="var(--text-muted)" />
                          </button>
                       )}
                       <span style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>→</span>
                    </div>
                 </div>

                 {/* Bottom Segmented Progress Bar */}
                 <div style={{ display: 'flex', height: '6px', width: '100%', backgroundColor: 'var(--border)' }}>
                    <div style={{ width: `${correctPct}%`, backgroundColor: 'var(--success)', transition: 'width 0.3s ease' }}></div>
                    <div style={{ width: `${wrongPct}%`, backgroundColor: 'var(--error)', transition: 'width 0.3s ease' }}></div>
                 </div>
               </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderPYQ = () => {
    const years = [...new Set(questionsData.map(q => q.year))].sort().reverse();
    return (
      <div className="content-area">
        <button className="btn-outline" style={{ marginBottom: "1.5rem" }} onClick={goBackView}>
          ← {t("Back", "वापस")}
        </button>
        <h1 className="section-title">{t("Exam Simulator", "परीक्षा सिम्युलेटर")}</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>{t("Run a proper test strictly evaluated at the end.", "एक पूरा परीक्षण चलाएं जो अंत में सख्ती से मूल्यांकित हो।")}</p>
        
        <div className="grid-cards">
          {years.map((year, i) => {
            return (
              <div key={i} className="subject-card">
                <div className="subject-card-title">
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <History size={24} color="var(--primary)" />
                  </div>
                  {year} Paper
                </div>
                <div className="subject-card-actions">
                  <button onClick={() => startTestByYear(year)}>Run Test Simulation</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!quizQuestions.length) return null;
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ) return null;
    
    const isAnswered = userAnswers[currentQ.id] !== undefined;
    const validation = checkedAnswers[currentQ.id];

    return (
      <div className="quiz-container">
        <div className="quiz-main">
          <div className="quiz-header">
            <span style={{ fontWeight: 600 }}>{selectedChapter}</span>
            <button className="btn-outline" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }} onClick={goBackView}>{t("Exit", "बाहर निकलें")}</button>
            <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 999 }}>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
          </div>

          <div className="question-text">
            {currentQuestionIndex + 1}. {currentQ.questionText}
          </div>

          <div className="options-container">
            {currentQ.options.map((opt, i) => {
              let btnClass = "option-btn";
              if (userAnswers[currentQ.id] === i) btnClass += " selected";
              
              if ((quizMode === 'practice' || quizMode === 'revision') && validation) {
                 if (i === validation.correctIndex) btnClass += " correct";
                 else if (userAnswers[currentQ.id] === i && !validation.isCorrect) btnClass += " incorrect";
              }

              return (
                <button 
                  key={i} 
                  className={btnClass}
                  onClick={() => handleOptionSelect(currentQ.id, i)}
                  disabled={(quizMode === 'practice' || quizMode === 'revision') && !!validation}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>

          {quizMode === 'practice' && validation && currentQ.explanation && (
            <div className="explanation-box">
              <div className="explanation-title">Explanation</div>
              <div>{currentQ.explanation}</div>
            </div>
          )}

          <div className="quiz-controls">
            <button className="btn-outline" onClick={clearCurrentResponse} disabled={!!validation || !isAnswered}>{t("Clear Response", "प्रतिक्रिया मिटाएं")}</button>
            <div className="quiz-controls-group">
               <button 
                  className="btn-outline" 
                  disabled={currentQuestionIndex === 0}
                  onClick={() => navigateQuestion(-1)}
                >{t("Previous", "पिछला")}</button>

               {(quizMode === 'practice' || quizMode === 'revision') && !validation ? (
                  <button onClick={checkCurrentAnswer} disabled={!isAnswered}>{t("Check Answer", "उत्तर जांचें")}</button>
               ) : (quizMode === 'practice' || quizMode === 'revision') && validation ? (
                  <button 
                    onClick={() => {
                      if (currentQuestionIndex < quizQuestions.length - 1) {
                        navigateQuestion(1);
                      } else {
                        goToView('subjects'); 
                      }
                    }}
                  >
                    {currentQuestionIndex < quizQuestions.length - 1 ? t('Next Question', 'अगला प्रश्न') : t('Finish Practice', 'अभ्यास समाप्त')}
                  </button>
               ) : null}

               {quizMode === 'test' && (
                 <>
                   {currentQuestionIndex < quizQuestions.length - 1 ? (
                      <button onClick={() => navigateQuestion(1)}>{t("Next", "अगला")}</button>
                   ) : (
                      <button style={{ backgroundColor: 'var(--success)' }} onClick={submitFullTest}>{t("Submit Test", "टेस्ट जमा करें")}</button>
                   )}
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Number Grid */}
        <div className="quiz-sidebar">
           <div className="quiz-sidebar-header">
             Logic Memory Tracker
           </div>
           <div className="quiz-grid">
             {quizQuestions.map((q, i) => {
               let cellClass = "grid-cell";
               if (i === currentQuestionIndex) cellClass += " active";
               else if ((quizMode === 'practice' || quizMode === 'revision') && checkedAnswers[q.id]) {
                 cellClass += checkedAnswers[q.id].isCorrect ? " correct-mark" : " wrong-mark";
               } else if (userAnswers[q.id] !== undefined) {
                 cellClass += " answered";
               }

               return (
                 <div key={i} className={cellClass} onClick={() => setCurrentQuestionIndex(i)}>
                   {i + 1}
                 </div>
               )
             })}
           </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    let score = 0;
    let wrong = 0;
    let skipped = 0;
    
    const correctIds = [];
    const wrongIds = [];
    const skippedIds = [];

    quizQuestions.forEach((q, i) => {
      const isAns = userAnswers[q.id] !== undefined;
      const isCor = checkedAnswers[q.id] && checkedAnswers[q.id].isCorrect;
      
      if (!isAns) {
         skipped++;
         skippedIds.push(i + 1);
      } else if (isCor) {
         score++;
         correctIds.push(i + 1);
      } else {
         wrong++;
         wrongIds.push(i + 1);
      }
    });

    const accuracy = quizQuestions.length > 0 ? ((score / quizQuestions.length) * 100).toFixed(0) : 0;
    const attemptedCount = score + wrong;

    const handleFilterClick = (filterVal) => {
       setResultsFilter(filterVal);
       setTimeout(() => {
          if (detailedSolutionsRef.current) {
             const yOffset = -80; // Offset for the fixed topbar
             const element = detailedSolutionsRef.current;
             const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
             window.scrollTo({ top: y, behavior: 'smooth' });
          }
       }, 50);
    };

    return (
      <div className="content-area">
        <button onClick={() => goToView('dashboard')} className="btn-outline" style={{ marginBottom: '1.5rem' }}>← Back to Dashboard</button>
        
        {/* SCORECARD UI */}
        <div className="performance-card">
           <div className="performance-header">
              <span>{selectedChapter}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Paper Test</span>
           </div>
           
           <div style={{ padding: '1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
              🏆 Your Performance
           </div>
           
           <div className="performance-body">
              {/* Left Side big score */}
              <div className="score-circle-container">
                 <div className="score-value">{score}.00</div>
                 <div style={{ color: 'var(--primary)', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>out of {quizQuestions.length}.00</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Score</div>
              </div>

              {/* Right Side breakdown */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                 <div style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Performance Overview</div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ backgroundColor: 'var(--success-bg)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                       <div style={{ color: 'white', backgroundColor: 'var(--success)', width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>✓</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{score}</div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>Correct</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--error-bg)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                       <div style={{ color: 'white', backgroundColor: 'var(--error)', width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>✕</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>{wrong}</div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 600 }}>Wrong</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--skipped-bg)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                       <div style={{ color: 'white', backgroundColor: 'var(--skipped)', width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>-</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{skipped}</div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Skipped</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* METRICS */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
           <div className="metrics-box">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <span style={{ color: 'var(--primary)' }}>●</span> Time
              </div>
              <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>25:00</div>
           </div>
           <div className="metrics-box">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <span style={{ color: 'var(--success)' }}>●</span> Accuracy
              </div>
              <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem' }}>{accuracy}%</div>
           </div>
           <div className="metrics-box">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <span style={{ color: '#9333ea' }}>●</span> Attempted
              </div>
              <div style={{ color: '#9333ea', fontWeight: 700, fontSize: '1.1rem' }}>{attemptedCount}/{quizQuestions.length}</div>
           </div>
           <div className="metrics-box">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <span style={{ color: 'var(--error)' }}>●</span> Negative
              </div>
              <div style={{ color: 'var(--error)', fontWeight: 700, fontSize: '1.1rem' }}>0.00</div>
           </div>
        </div>

        {/* ACTION BAR: REATTEMPT OPTIONS */}
        {(wrong > 0 || skipped > 0) && (
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {wrong > 0 && (
                 <button onClick={() => reattemptFiltered(['wrong'])} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                     Re-attempt Wrong Questions ({wrong})
                 </button>
              )}
              {skipped > 0 && (
                 <button onClick={() => reattemptFiltered(['skipped'])} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-muted)', border: '2px solid var(--skipped)', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                     Attempt Skipped ({skipped})
                 </button>
              )}
              {wrong > 0 && skipped > 0 && (
                 <button onClick={() => reattemptFiltered(['wrong', 'skipped'])} style={{ backgroundColor: 'var(--warning)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                     Re-attempt Both ({wrong + skipped})
                 </button>
              )}
           </div>
        )}

        {/* QUESTION MAP UI */}
        <h2 className="section-title">Question Map</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', alignItems: 'stretch' }}>
           
           <div className="q-map-box">
              <div className="q-map-header" style={{ backgroundColor: 'var(--success)' }}>
                 ✓ Correct Questions ({score})
              </div>
              <div className="q-map-body" style={{ minHeight: '100px', backgroundColor: 'var(--success-bg)' }}>
                 {correctIds.map(num => (
                    <div key={num} onClick={() => handleFilterClick(num)} className="q-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', cursor: 'pointer' }}>{num}</div>
                 ))}
                 {correctIds.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', width: '100%' }}>None</div>}
              </div>
              <div onClick={() => handleFilterClick('correct')} style={{ backgroundColor: 'var(--success)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                 View All Correct Questions <span>→</span>
              </div>
           </div>

           <div className="q-map-box">
              <div className="q-map-header" style={{ backgroundColor: 'var(--error)' }}>
                 ✕ Wrong Questions ({wrong})
              </div>
              <div className="q-map-body" style={{ minHeight: '100px', backgroundColor: 'var(--error-bg)' }}>
                 {wrongIds.map(num => (
                    <div key={num} onClick={() => handleFilterClick(num)} className="q-badge" style={{ backgroundColor: 'rgba(225, 29, 72, 0.2)', color: 'var(--error)', cursor: 'pointer' }}>{num}</div>
                 ))}
                 {wrongIds.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', width: '100%' }}>None</div>}
              </div>
              <div onClick={() => handleFilterClick('wrong')} style={{ backgroundColor: 'var(--error)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                 View All Wrong Questions <span>→</span>
              </div>
           </div>

           <div className="q-map-box">
              <div className="q-map-header" style={{ backgroundColor: 'var(--skipped)' }}>
                 ? Not Attempted ({skipped})
              </div>
              <div className="q-map-body" style={{ minHeight: '100px', backgroundColor: 'var(--skipped-bg)' }}>
                 {skippedIds.map(num => (
                    <div key={num} onClick={() => handleFilterClick(num)} className="q-badge" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', cursor: 'pointer' }}>{num}</div>
                 ))}
                 {skippedIds.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', width: '100%' }}>None</div>}
              </div>
              <div onClick={() => handleFilterClick('skipped')} style={{ backgroundColor: 'var(--skipped)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                 View Not Attempted <span>→</span>
              </div>
           </div>

        </div>

        {/* DETAILED EXPLANATIONS */}
        <div ref={detailedSolutionsRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
           <h2 className="section-title" style={{ margin: 0 }}>Detailed Solutions</h2>
           {resultsFilter !== 'all' && (
              <button 
                 onClick={() => setResultsFilter('all')} 
                 style={{ backgroundColor: 'var(--bg-main)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                 Show All Questions
              </button>
           )}
        </div>

        {quizQuestions.map((q, index) => {
          const val = checkedAnswers[q.id];
          const isCorrect = val && val.isCorrect;
          const userHasAnswered = userAnswers[q.id] !== undefined;

          // Filtering Logic
          if (resultsFilter === 'correct' && !isCorrect) return null;
          if (resultsFilter === 'wrong' && (!userHasAnswered || isCorrect)) return null;
          if (resultsFilter === 'skipped' && userHasAnswered) return null;
          if (typeof resultsFilter === 'number' && index + 1 !== resultsFilter) return null;

          return (
            <div key={q.id} style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              borderLeft: `4px solid ${isCorrect ? 'var(--success)' : (userHasAnswered ? 'var(--error)' : 'var(--skipped)')}`,
              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.05)' : (userHasAnswered ? 'rgba(239, 68, 68, 0.05)' : 'rgba(100, 116, 139, 0.05)'),
              borderRadius: '0 8px 8px 0'
            }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{index + 1}. {q.questionText}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oIndex) => {
                  let bgColor = 'var(--card-bg)';
                  let border = '1px solid var(--border)';
                  
                  if (oIndex === q.correctOptionIndex) {
                    bgColor = 'var(--success-bg)';
                    border = '1px solid var(--success)';
                  } else if (userHasAnswered && userAnswers[q.id] === oIndex && !isCorrect) {
                    bgColor = 'var(--error-bg)';
                    border = '1px solid var(--error)';
                  }

                  return (
                    <div key={oIndex} style={{ padding: '0.75rem', backgroundColor: bgColor, border, borderRadius: '8px', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>{String.fromCharCode(65 + oIndex)}.</span> 
                      <span>{opt} {userAnswers[q.id] === oIndex ? '(Your Answer)' : ''}</span>
                    </div>
                  );
                })}
              </div>
              
              {q.explanation && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}

      </div>
    );
  };

  const renderSyllabus = () => {
    const syllabusData = [
      {
        icon: <User size={24} color="var(--primary)" />,
        title: t("Child Development & Pedagogy (CDP)", "बाल विकास (CDP)"),
        topics: [
          t("Concept of development and its relationship with learning", "बाल विकास की अवधारणा और सीखने के साथ इसका संबंध"),
          t("Principles of the development of children", "बच्चों के विकास के सिद्धांत"),
          t("Influence of Heredity & Environment", "आनुवंशिकता और पर्यावरण का प्रभाव"),
          t("Socialization processes", "समाजीकरण प्रक्रियाएं"),
          t("Piaget, Kohlberg, and Vygotsky: Constructs and critical perspectives", "पियाजे, कोहलबर्ग, और वायगोत्स्की: निर्माण और समालोचनात्मक दृष्टिकोण"),
          t("Inclusive education and children with special needs", "समावेशी शिक्षा और विशेष आवश्यकता वाले बच्चे"),
          t("Learning and Pedagogy", "सीखने और शिक्षाशास्त्र")
        ]
      },
      {
        icon: <BookOpen size={24} color="var(--primary)" />,
        title: t("Hindi Language", "हिंदी भाषा"),
        topics: [
          t("Unseen passages (Prose & Poetry)", "अपठित अनुच्छेद (गद्यांश और पद्यांश)"),
          t("Nouns, Pronouns, Verbs, Adjectives", "संज्ञा, सर्वनाम, विशेषण, क्रिया, अव्यय"),
          t("Sandhi & Samas", "संधि और समास"),
          t("Antonyms, Synonyms, One-word substitution", "विलोम, पर्यायवाची, अनेकार्थी शब्द"),
          t("Idioms & Proverbs", "मुहावरे और लोकोक्तियाँ"),
          t("Language Pedagogy", "हिंदी शिक्षाशास्त्र (Language Pedagogy)")
        ]
      },
      {
        icon: <Map size={24} color="var(--primary)" />,
        title: t("Geography", "भूगोल"),
        topics: [
          t("Geography as a social study and as a science", "भूगोल एक सामाजिक अध्ययन और विज्ञान के रूप में"),
          t("Earth in the solar system", "सौर मंडल में पृथ्वी"),
          t("Globe, Latitudes & Longitudes", "ग्लोब, अक्षांश और देशांतर"),
          t("Earth and our environment", "पृथ्वी और हमारा पर्यावरण"),
          t("Geography of India: Physical features, climate, vegetation", "भारत का भूगोल: भौतिक स्वरूप, जलवायु, वनस्पति"),
          t("Agriculture and Resources", "कृषि और संसाधन")
        ]
      },
      {
        icon: <Users size={24} color="var(--primary)" />,
        title: t("Civics", "नागरिक शास्त्र"),
        topics: [
          t("Understanding Diversity", "विविधता की समझ"),
          t("Concept of Government", "सरकार की अवधारणा"),
          t("Local Government and Panchayati Raj", "स्थानीय स्वशासन और पंचायती राज"),
          t("Democracy", "लोकतंत्र"),
          t("State Government Operations", "राज्य सरकार के कार्य"),
          t("Understanding Media", "मीडिया को समझना")
        ]
      },
      {
        icon: <Scale size={24} color="var(--primary)" />,
        title: t("Political Science", "राजनीति विज्ञान"),
        topics: [
          t("The Indian Constitution", "भारतीय संविधान"),
          t("Fundamental Rights and Duties", "मौलिक अधिकार और कर्तव्य"),
          t("Parliamentary Government System", "संसदीय सरकार प्रणाली"),
          t("The Judiciary System", "न्यायपालिका"),
          t("Social Justice and the Marginalized", "सामाजिक न्याय और हाशिए पर रहने वाले वर्ग")
        ]
      },
      {
        icon: <TrendingUp size={24} color="var(--primary)" />,
        title: t("Economy", "अर्थशास्त्र"),
        topics: [
          t("Basic Economic Concepts", "बुनियादी आर्थिक अवधारणाएँ"),
          t("Features of the Indian Economy", "भारतीय अर्थव्यवस्था की विशेषताएँ"),
          t("National Income", "राष्ट्रीय आय"),
          t("Poverty and Unemployment", "गरीबी और बेरोजगारी"),
          t("Five Year Plans in India", "भारत में पंचवर्षीय योजनाएँ"),
          t("Agriculture and Industrial Sectors", "कृषि और औद्योगिक क्षेत्र")
        ]
      }
    ];

    return (
      <div className="content-area">
        <button className="btn-outline" style={{ marginBottom: "1.5rem" }} onClick={goBackView}>
          ← {t("Back", "वापस")}
        </button>
        <h1 className="section-title">{t("UPTET Master Syllabus", "UPTET मास्टर पाठ्यक्रम")}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {t("The complete detailed syllabus for Paper 2 targeting proper preparation.", "उचित तैयारी के लिए पेपर 2 का पूरा विस्तृत पाठ्यक्रम।")}
        </p>

        <div className="grid-cards">
          {syllabusData.map((sub, i) => (
             <div key={i} className="card" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
               <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-main)' }}>
                 <div style={{ backgroundColor: 'var(--card-bg)', padding: '0.5rem', borderRadius: '8px', display: 'flex', border: '1px solid var(--border)' }}>
                    {sub.icon}
                 </div>
                 <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{sub.title}</h2>
               </div>
               <div style={{ padding: '1.5rem' }}>
                 <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   {sub.topics.map((topic, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                         <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span> 
                         <span style={{ lineHeight: 1.4 }}>{topic}</span>
                      </li>
                   ))}
                 </ul>
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`layout-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      {/* Backdrop – tap outside to close sidebar */}
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

      {/* Animated Hamburger Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="toggle-sidebar"
      >
        <div className="hamburger">
          <span />
          <span />
          <span />
        </div>
      </button>

      <Sidebar />
      <div className="main-content">
        <TopHeader />
        {(currentView === 'topic' || currentView === 'pyq') && <GlobalSettingsBar />}

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'subjects' && renderSubjects()}
        {currentView === 'topic' && renderTopicSelection()}
        {currentView === 'pyq' && renderPYQ()}
        {currentView === 'quiz' && renderQuiz()}
        {currentView === 'results' && renderResults()}
        {currentView === 'syllabus' && renderSyllabus()}
      </div>
    </div>
  );
}
