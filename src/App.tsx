import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Cloud,
  Flame,
  Globe2,
  Headphones,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  RotateCcw,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import { Language, LanguageId, languages, Word } from "./data";

type Screen = "welcome" | "home" | "study" | "premium" | "browse";
type Rating = "again" | "hard" | "know";

type WordProgress = {
  repetitions: number;
  intervalDays: number;
  ease: number;
  firstSeen: string;
  lastReviewed: string;
  nextReview: string;
  learned: boolean;
};

type StoredState = {
  languageId: LanguageId | null;
  progress: Partial<Record<LanguageId, Record<string, WordProgress>>>;
  streak: number;
  lastStudyDate?: string;
};

const STORAGE_KEY = "2000-words-state-v1";
const initialState: StoredState = {
  languageId: null,
  progress: {},
  streak: 0,
};

function readState(): StoredState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
  } catch {
    return initialState;
  }
}

function isDue(progress?: WordProgress) {
  return !progress || new Date(progress.nextReview).getTime() <= Date.now();
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

function schedule(progress: WordProgress | undefined, rating: Rating): WordProgress {
  const now = new Date();
  const previous = progress ?? {
    repetitions: 0,
    intervalDays: 0,
    ease: 2.5,
    firstSeen: now.toISOString(),
    lastReviewed: now.toISOString(),
    nextReview: now.toISOString(),
    learned: false,
  };

  let repetitions = previous.repetitions;
  let intervalDays = previous.intervalDays;
  let ease = previous.ease;
  let delayMs = 0;

  if (rating === "again") {
    repetitions = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    delayMs = 10 * 60 * 1000;
  } else if (rating === "hard") {
    repetitions += 1;
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2));
    ease = Math.max(1.3, ease - 0.15);
    delayMs = intervalDays * 24 * 60 * 60 * 1000;
  } else {
    repetitions += 1;
    intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(4, Math.round(intervalDays * ease));
    ease = Math.min(3, ease + 0.05);
    delayMs = intervalDays * 24 * 60 * 60 * 1000;
  }

  return {
    repetitions,
    intervalDays,
    ease,
    firstSeen: previous.firstSeen,
    lastReviewed: now.toISOString(),
    nextReview: new Date(now.getTime() + delayMs).toISOString(),
    learned: rating !== "again",
  };
}

function App() {
  const [stored, setStored] = useState<StoredState>(readState);
  const [selectedId, setSelectedId] = useState<LanguageId>(stored.languageId ?? "es");
  const [screen, setScreen] = useState<Screen>(stored.languageId ? "home" : "welcome");
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [stored]);

  const language = languages.find((item) => item.id === selectedId) ?? languages[0];
  const languageProgress = stored.progress[selectedId] ?? {};
  const learnedCount = Object.values(languageProgress).filter((item) => item.learned).length;
  const dueWords = useMemo(
    () => language.words.filter((word) => isDue(languageProgress[word.id])),
    [language, languageProgress],
  );
  const studyWords = dueWords.length ? dueWords : language.words;
  const currentWord = studyWords[studyIndex % studyWords.length];

  const goHome = () => {
    setScreen("home");
    setMenuOpen(false);
    setRevealed(false);
  };

  const chooseLanguage = (id: LanguageId) => {
    setSelectedId(id);
  };

  const startLanguage = () => {
    setStored((current) => ({ ...current, languageId: selectedId }));
    setScreen("home");
  };

  const beginStudy = () => {
    setStudyIndex(0);
    setSessionCount(0);
    setRevealed(false);
    setScreen("study");
  };

  const rateWord = (rating: Rating) => {
    const today = dayKey();
    setStored((current) => {
      const previousDate = current.lastStudyDate;
      const nextStreak =
        previousDate === today
          ? current.streak
          : previousDate === yesterdayKey()
            ? current.streak + 1
            : 1;
      return {
        ...current,
        languageId: selectedId,
        streak: nextStreak,
        lastStudyDate: today,
        progress: {
          ...current.progress,
          [selectedId]: {
            ...(current.progress[selectedId] ?? {}),
            [currentWord.id]: schedule(current.progress[selectedId]?.[currentWord.id], rating),
          },
        },
      };
    });
    setSessionCount((count) => count + 1);
    setStudyIndex((index) => index + 1);
    setRevealed(false);
  };

  const speak = (word: Word) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.term);
    utterance.lang = language.locale;
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

  const resetProgress = () => {
    setStored((current) => ({
      ...current,
      progress: { ...current.progress, [selectedId]: {} },
      streak: 0,
      lastStudyDate: undefined,
    }));
    setMenuOpen(false);
  };

  return (
    <main className="app-shell">
      <section className="app-frame" aria-label="2000 Words vocabulary app">
        <div className={`screen screen-${screen}`} key={screen}>
          {screen === "welcome" && (
            <WelcomeScreen
              selectedId={selectedId}
              onChoose={chooseLanguage}
              onStart={startLanguage}
            />
          )}

          {screen === "home" && (
            <HomeScreen
              language={language}
              learnedCount={learnedCount}
              dueCount={dueWords.length}
              streak={stored.streak}
              onReview={beginStudy}
              onBrowse={() => setScreen("browse")}
              onPremium={() => setScreen("premium")}
              onMenu={() => setMenuOpen(true)}
            />
          )}

          {screen === "study" && (
            <StudyScreen
              word={currentWord}
              position={sessionCount + 1}
              total={Math.max(dueWords.length, language.words.length)}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onSpeak={() => speak(currentWord)}
              onRate={rateWord}
              onClose={goHome}
            />
          )}

          {screen === "premium" && <PremiumScreen onBack={goHome} />}

          {screen === "browse" && (
            <BrowseScreen
              language={language}
              progress={languageProgress}
              onBack={goHome}
              onSpeak={speak}
            />
          )}
        </div>

        {menuOpen && (
          <div className="sheet-backdrop" onClick={() => setMenuOpen(false)}>
            <aside className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-heading">
                <h2>Languages</h2>
                <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <div className="sheet-languages">
                {languages.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === selectedId ? "sheet-language active" : "sheet-language"}
                    onClick={() => {
                      setSelectedId(item.id);
                      setStored((current) => ({ ...current, languageId: item.id }));
                      setMenuOpen(false);
                    }}
                  >
                    <span>{item.name}</span>
                    {item.id === selectedId && <Check size={18} />}
                  </button>
                ))}
              </div>
              <button className="reset-button" onClick={resetProgress}>
                <RotateCcw size={17} />
                Reset {language.name} progress
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function WelcomeScreen({
  selectedId,
  onChoose,
  onStart,
}: {
  selectedId: LanguageId;
  onChoose: (id: LanguageId) => void;
  onStart: () => void;
}) {
  const selected = languages.find((item) => item.id === selectedId)!;
  return (
    <div className="welcome">
      <header className="brand-lockup">
        <h1>2000<br />Words</h1>
        <span className="brand-rule" />
        <p>Learn the 2,000 most<br />useful words in any language.</p>
      </header>
      <div className="language-list">
        {languages.map((language) => (
          <button
            key={language.id}
            className={language.id === selectedId ? "language-row selected" : "language-row"}
            onClick={() => onChoose(language.id)}
          >
            <span className="language-marker">{language.marker}</span>
            <span>{language.name}</span>
            <ChevronRight size={20} strokeWidth={1.4} />
          </button>
        ))}
      </div>
      <button className="primary-button" onClick={onStart}>
        Start with {selected.name}
      </button>
    </div>
  );
}

function HomeScreen({
  language,
  learnedCount,
  dueCount,
  streak,
  onReview,
  onBrowse,
  onPremium,
  onMenu,
}: {
  language: Language;
  learnedCount: number;
  dueCount: number;
  streak: number;
  onReview: () => void;
  onBrowse: () => void;
  onPremium: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="home">
      <nav className="top-nav">
        <button className="icon-button" onClick={onMenu} aria-label="Open language menu"><Menu size={24} /></button>
        <strong>{language.name}</strong>
        <button className="icon-button" onClick={onPremium} aria-label="Open premium"><Settings size={22} /></button>
      </nav>
      <div className="metrics">
        <Metric icon={<BookOpen />} tone="sage">
          <div className="learned-number"><strong>{learnedCount}</strong><span>/ 2000</span></div>
          <small>learned</small>
        </Metric>
        <Metric icon={<CalendarDays />} tone="sand">
          Today’s reviews: <strong>{dueCount}</strong>
        </Metric>
        <Metric icon={<Flame />} tone="sage">
          Current streak: <strong>{streak} {streak === 1 ? "day" : "days"}</strong>
        </Metric>
        <Metric icon={<Clock3 />} tone="sand">
          Words due now: <strong>{dueCount}</strong>
        </Metric>
      </div>
      <div className="home-actions">
        <button className="primary-button" onClick={onReview}>Review now</button>
        <button className="text-button" onClick={onBrowse}>Browse words</button>
      </div>
    </div>
  );
}

function Metric({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <div className="metric">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div className="metric-copy">{children}</div>
    </div>
  );
}

function StudyScreen({
  word,
  position,
  total,
  revealed,
  onReveal,
  onSpeak,
  onRate,
  onClose,
}: {
  word: Word;
  position: number;
  total: number;
  revealed: boolean;
  onReveal: () => void;
  onSpeak: () => void;
  onRate: (rating: Rating) => void;
  onClose: () => void;
}) {
  return (
    <div className="study">
      <nav className="top-nav">
        <button className="icon-button" onClick={onClose} aria-label="Close review"><X size={25} /></button>
        <span />
        <button className="icon-button" aria-label="More options"><MoreHorizontal size={24} /></button>
      </nav>
      <div className="study-progress">{position} / {total}</div>
      <div className="word-stage">
        <h1>{word.term}</h1>
        <button className="sound-button" onClick={onSpeak} aria-label={`Hear ${word.term}`}>
          <Volume2 size={30} />
        </button>
      </div>
      <button className={revealed ? "reveal revealed" : "reveal"} onClick={onReveal}>
        <span>{revealed ? word.translation : "Tap to reveal meaning"}</span>
        <i />
      </button>
      <div className="example">
        <p>{word.example}</p>
        <span>{word.exampleTranslation}</span>
      </div>
      <div className="ratings" aria-label="Rate this word">
        <button className="again" onClick={() => onRate("again")}>Again</button>
        <button className="hard" onClick={() => onRate("hard")}>Hard</button>
        <button className="know" onClick={() => onRate("know")}>Know it</button>
      </div>
    </div>
  );
}

function PremiumScreen({ onBack }: { onBack: () => void }) {
  const rows = [
    { icon: <Globe2 />, label: "Languages", free: "1", premium: "Unlimited" },
    { icon: <Cloud />, label: "Cloud sync", free: "—", premium: <Check size={17} /> },
    { icon: <LockKeyhole />, label: "Backup & restore", free: "—", premium: <Check size={17} /> },
    { icon: <BookOpen />, label: "Vocabulary size", free: "2,000", premium: "5,000–10,000" },
    { icon: <Headphones />, label: "Audio packs", free: "—", premium: <Check size={17} /> },
  ];
  return (
    <div className="premium">
      <nav className="top-nav">
        <button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={23} /></button>
        <span />
        <span />
      </nav>
      <header className="premium-heading">
        <h1>Premium</h1>
        <p>More languages. More words.<br />Peace of mind.</p>
      </header>
      <div className="comparison">
        <div className="comparison-head"><span /><span>Free</span><span>Premium</span></div>
        {rows.map((row) => (
          <div className="comparison-row" key={row.label}>
            <span className="feature-label">{row.icon}{row.label}</span>
            <span>{row.free}</span>
            <span className="premium-cell">{row.premium}</span>
          </div>
        ))}
      </div>
      <div className="premium-actions">
        <button className="primary-button" onClick={() => alert("Purchases are not enabled in this MVP.")}>Upgrade to Premium</button>
        <small>One-time purchase. Yours forever.</small>
        <button className="text-button" onClick={() => alert("No purchase was found on this device.")}>Restore purchase</button>
      </div>
    </div>
  );
}

function BrowseScreen({
  language,
  progress,
  onBack,
  onSpeak,
}: {
  language: Language;
  progress: Record<string, WordProgress>;
  onBack: () => void;
  onSpeak: (word: Word) => void;
}) {
  return (
    <div className="browse">
      <nav className="top-nav">
        <button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={23} /></button>
        <strong>{language.name} words</strong>
        <span className="nav-spacer" />
      </nav>
      <div className="browse-intro">
        <span>{language.words.length} sample words</span>
        <p>The production library will contain 2,000 carefully curated entries.</p>
      </div>
      <div className="word-list">
        {language.words.map((word) => (
          <button className="word-row" key={word.id} onClick={() => onSpeak(word)}>
            <span>
              <strong>{word.term}</strong>
              <small>{word.translation}</small>
            </span>
            <span className={progress[word.id]?.learned ? "word-status learned" : "word-status"}>
              {progress[word.id]?.learned ? <Check size={16} /> : <Volume2 size={16} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
