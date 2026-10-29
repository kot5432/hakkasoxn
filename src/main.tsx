import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, Check, FlaskConical, History, RotateCcw, Sparkles } from 'lucide-react';
import { studyMethods, methodName } from './data/methods';
import { clearExperiments, loadExperiments, saveExperiments } from './data/storage';
import { wordSets } from './data/wordSets';
import { LEARNING_DURATION_SECONDS } from './domain/constants';
import { countRememberedAnswers } from './domain/scoring';
import type { ExperimentRecord, Screen, StudyMethodId, WordItem } from './domain/types';
import './style.css';

interface ActiveExperiment {
  id: string;
  date: string;
  methods: [StudyMethodId, StudyMethodId];
  prediction: StudyMethodId;
  wordSetIds: [string, string];
  scores: number[];
  answersByRound: [boolean[], boolean[]];
}

const screenFromPath = (pathname: string): Screen => {
  if (pathname === '/experiment/new') return 'setup';
  if (pathname.endsWith('/study')) return 'study';
  if (pathname.endsWith('/test')) return 'quiz';
  if (pathname.endsWith('/result')) return 'result';
  if (pathname === '/history') return 'history';
  return 'home';
};

const routeFor = (screen: Screen, experimentId?: string): string => {
  if (screen === 'setup') return '/experiment/new';
  if (screen === 'history') return '/history';
  if (screen === 'study') return `/experiment/${experimentId}/study`;
  if (screen === 'quiz') return `/experiment/${experimentId}/test`;
  if (screen === 'result') return `/experiment/${experimentId}/result`;
  return '/';
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = screenFromPath(location.pathname);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>(loadExperiments);
  const [selectedMethods, setSelectedMethods] = useState<StudyMethodId[]>([]);
  const [prediction, setPrediction] = useState<StudyMethodId>();
  const [active, setActive] = useState<ActiveExperiment>();
  const [round, setRound] = useState<0 | 1>(0);
  const [secondsLeft, setSecondsLeft] = useState(LEARNING_DURATION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  useEffect(() => {
    if (!timerRunning || timerDeadline === null) return;
    const updateRemainingTime = () => {
      const remaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
      setSecondsLeft((current) => current === remaining ? current : remaining);
      if (remaining === 0) {
        setTimerRunning(false);
        setTimerDeadline(null);
      }
    };
    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(timerId);
  }, [timerDeadline, timerRunning]);

  useEffect(() => {
    if (['study', 'quiz', 'result'].includes(screen) && !active) {
      navigate('/', { replace: true });
      return;
    }
    if (active && active.scores.length >= 2 && ['study', 'quiz'].includes(screen)) {
      navigate(routeFor('result', active.id), { replace: true });
      return;
    }
    if (active && screen === 'quiz' && secondsLeft > 0) {
      navigate(routeFor('study', active.id), { replace: true });
      return;
    }
    if (active && screen === 'result' && active.scores.length < 2) {
      navigate(routeFor('study', active.id), { replace: true });
    }
  }, [active, navigate, screen, secondsLeft]);

  const go = (target: Screen, experimentId = active?.id) => navigate(routeFor(target, experimentId));
  const currentSet = active ? wordSets.find((set) => set.id === active.wordSetIds[round]) : undefined;
  const currentWords = currentSet?.words ?? wordSets[0].words;

  function startNewExperiment() {
    setTimerRunning(false);
    setTimerDeadline(null);
    setSecondsLeft(LEARNING_DURATION_SECONDS);
    setSelectedMethods([]);
    setPrediction(undefined);
    setActive(undefined);
    go('setup');
  }

  function toggleMethod(id: StudyMethodId) {
    if (selectedMethods.includes(id)) {
      setSelectedMethods((current) => current.filter((methodId) => methodId !== id));
      if (prediction === id) setPrediction(undefined);
      return;
    }
    if (selectedMethods.length < 2) setSelectedMethods((current) => [...current, id]);
  }

  function beginExperiment() {
    if (selectedMethods.length !== 2 || !prediction || !selectedMethods.includes(prediction)) return;
    const [firstMethod, secondMethod] = selectedMethods as [StudyMethodId, StudyMethodId];
    const firstSetIndex = Math.floor(Math.random() * wordSets.length);
    let secondSetIndex = Math.floor(Math.random() * wordSets.length);
    if (firstSetIndex === secondSetIndex) secondSetIndex = (secondSetIndex + 1) % wordSets.length;
    const record: ActiveExperiment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      methods: [firstMethod, secondMethod],
      prediction,
      wordSetIds: [wordSets[firstSetIndex].id, wordSets[secondSetIndex].id],
      scores: [],
      answersByRound: [[], []],
    };
    setActive(record);
    setRound(0);
    setSecondsLeft(LEARNING_DURATION_SECONDS);
    setTimerDeadline(null);
    setTimerRunning(false);
    go('study', record.id);
  }

  function openQuiz() {
    setTimerRunning(false);
    setTimerDeadline(null);
    setQuestionIndex(0);
    setAnswers([]);
    setAnswerVisible(false);
    go('quiz');
  }

  function toggleStudyTimer() {
    if (secondsLeft <= 0) return;
    if (timerRunning && timerDeadline !== null) {
      setSecondsLeft(Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000)));
      setTimerRunning(false);
      setTimerDeadline(null);
      return;
    }
    setTimerDeadline(Date.now() + secondsLeft * 1000);
    setTimerRunning(true);
  }
  function submitAnswer(remembered: boolean) {
    if (!active) return;
    const completedAnswers = [...answers, remembered];
    setAnswers(completedAnswers);
    setAnswerVisible(false);
    if (questionIndex < currentWords.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const score = countRememberedAnswers(completedAnswers);
    const nextScores = [...active.scores, score];
    const nextAnswers: [boolean[], boolean[]] = round === 0
      ? [completedAnswers, []]
      : [active.answersByRound[0], completedAnswers];
    if (round === 0) {
      setActive({ ...active, scores: nextScores, answersByRound: nextAnswers });
      setRound(1);
      setSecondsLeft(LEARNING_DURATION_SECONDS);
      setTimerDeadline(null);
      setTimerRunning(false);
      go('study');
      return;
    }

    const completed: ExperimentRecord = {
      id: active.id,
      date: active.date,
      methods: active.methods,
      prediction: active.prediction,
      wordSetIds: active.wordSetIds,
      studyDurationSeconds: [LEARNING_DURATION_SECONDS, LEARNING_DURATION_SECONDS],
      immediateScores: [nextScores[0], nextScores[1]],
      immediateAnswers: nextAnswers,
      completedAt: new Date().toISOString(),
    };
    const nextExperiments = [completed, ...experiments];
    saveExperiments(nextExperiments);
    setExperiments(nextExperiments);
    setActive({ ...active, scores: nextScores, answersByRound: nextAnswers });
    go('result');
  }

  function deleteExperiments() {
    if (!window.confirm('実験履歴をすべて削除しますか？')) return;
    clearExperiments();
    setExperiments([]);
  }

  return (
    <div className="app">
      <header>
        <button className="brand" onClick={() => go('home')} aria-label="まなびラボ ホーム">
          <span><FlaskConical size={20} /></span>
          <b>まなびラボ<small>STUDY METHOD LAB</small></b>
        </button>
        <button className={`nav ${screen === 'history' ? 'nav-active' : ''}`} onClick={() => go('history')}>
          <History size={17} /> 実験履歴 <i>{experiments.length}</i>
        </button>
      </header>
      <main>
        {screen === 'home' && <HomeScreen onStart={startNewExperiment} onHistory={() => go('history')} />}
        {screen === 'setup' && <SetupScreen
          selectedMethods={selectedMethods}
          prediction={prediction}
          onToggleMethod={toggleMethod}
          onPredict={setPrediction}
          onStart={beginExperiment}
          onBack={() => go('home')}
        />}
        {screen === 'study' && active && <StudyScreen
          active={active}
          round={round}
          words={currentWords}
          secondsLeft={secondsLeft}
          timerRunning={timerRunning}
          onToggleTimer={toggleStudyTimer}
          onContinue={openQuiz}
        />}
        {screen === 'quiz' && active && <QuizScreen
          round={round}
          words={currentWords}
          questionIndex={questionIndex}
          answerVisible={answerVisible}
          onShowAnswer={() => setAnswerVisible(true)}
          onAnswer={submitAnswer}
        />}
        {screen === 'result' && active && <ResultScreen active={active} onHome={() => go('home')} onHistory={() => go('history')} onRetry={startNewExperiment} />}
        {screen === 'history' && <HistoryScreen experiments={experiments} onStart={startNewExperiment} onDelete={deleteExperiments} />}
      </main>
      <footer>まなびラボ <span>結果は、あなたの次のヒント。</span></footer>
    </div>
  );
}

function HomeScreen({ onStart, onHistory }: { onStart: () => void; onHistory: () => void }) {
  return (
    <section className="hero">
      <div>
        <label><Sparkles size={15} /> 自分に合う勉強法を見つけよう</label>
        <h1>勉強法を、<br /><em>実験</em>してみよう。</h1>
        <p>2つの方法を同じ時間だけ試して、結果を比べる。<br />あなたに合う学び方を見つける、小さな実験室です。</p>
        <button className="primary" onClick={onStart}>実験をはじめる <ArrowRight size={17} /></button>
        <small>◷ 約15分　 ·　英単語10問 × 2セット</small>
      </div>
      <div className="hero-art">
        <div className="paper"><small>今日のミニ実験　　READY</small><h2>remember</h2><p>思い出す</p><hr /><div className="bars"><i /><i /><i /><i /><i /></div><small>小さな実験が、大きな発見に。</small></div>
        <aside>自分の結果が<br /><b>いちばんのヒント ✨</b></aside>
      </div>
      <div className="steps"><span>① 方法を選ぶ</span><b>›</b><span>② 5分ずつ学ぶ</span><b>›</b><span>③ 結果を比べる</span></div>
      <button className="home-history" onClick={onHistory}>これまでの実験を見る <ArrowRight size={14} /></button>
    </section>
  );
}

function SetupScreen({ selectedMethods, prediction, onToggleMethod, onPredict, onStart, onBack }: {
  selectedMethods: StudyMethodId[];
  prediction?: StudyMethodId;
  onToggleMethod: (id: StudyMethodId) => void;
  onPredict: (id: StudyMethodId | undefined) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const canStart = selectedMethods.length === 2 && !!prediction && selectedMethods.includes(prediction);
  return (
    <section className="flow">
      <button className="back" onClick={onBack}><ArrowLeft size={16} /> ホームへ</button>
      <div className="heading"><label>STEP 1 · EXPERIMENT SETUP</label><h2>比べたい勉強法を選ぼう</h2><p>気になる方法を2つ選んでください。<b>{selectedMethods.length} / 2</b></p></div>
      <div className="methods">
        {studyMethods.map((method) => {
          const selected = selectedMethods.includes(method.id);
          const disabled = !selected && selectedMethods.length === 2;
          return <button key={method.id} type="button" aria-pressed={selected} disabled={disabled} className={`method ${selected ? 'selected' : ''}`} onClick={() => onToggleMethod(method.id)}>
            <span>{method.emoji}</span><b>{method.name}</b><small>{method.description}</small>{selected && <i><Check size={14} /></i>}
          </button>;
        })}
      </div>
      <div className="callout"><span>💡</span><div><b>結果は人それぞれ</b><p>正解の勉強法を決めるのではなく、今回のあなたの結果を比べます。</p></div></div>
      <div className="heading prediction-heading"><label>STEP 2 · YOUR PREDICTION</label><h2>どちらが覚えられそう？</h2><p>実験前の予想を記録します。</p></div>
      {selectedMethods.length === 2 ? <div className="guesses">{selectedMethods.map((id) => {
        const method = studyMethods.find((item) => item.id === id)!;
        return <button key={id} type="button" aria-pressed={prediction === id} className={prediction === id ? 'selected' : ''} onClick={() => onPredict(prediction === id ? undefined : id)}>
          <span>{method.emoji}</span>{method.name}{prediction === id && <Check size={15} />}
        </button>;
      })}</div> : <p className="setup-hint">まず、比較する勉強法を2つ選んでください。</p>}
      <div className="center"><button disabled={!canStart} className="primary" onClick={onStart}>実験を始める <ArrowRight size={17} /></button></div>
    </section>
  );
}

function StudyScreen({ active, round, words, secondsLeft, timerRunning, onToggleTimer, onContinue }: {
  active: ActiveExperiment;
  round: 0 | 1;
  words: WordItem[];
  secondsLeft: number;
  timerRunning: boolean;
  onToggleTimer: () => void;
  onContinue: () => void;
}) {
  const method = studyMethods.find((item) => item.id === active.methods[round])!;
  const wordSet = wordSets.find((set) => set.id === active.wordSetIds[round])!;
  const progressPercent = ((LEARNING_DURATION_SECONDS - secondsLeft) / LEARNING_DURATION_SECONDS) * 100;
  return (
    <section className="flow">
      <div className="heading"><label>ROUND {round + 1} / 2 · LEARN</label><h2>{method.name}で学ぼう</h2><p>{method.description}</p></div>
      <div className="method-instructions"><b>この方法でやってみよう</b><ol>{method.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></div>
      <div className="timer">
        <small>学習時間 · 5 MINUTES</small>
        <strong role="timer" aria-label={`残り${Math.floor(secondsLeft / 60)}分${secondsLeft % 60}秒`} aria-live="off">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}<i>:</i>{String(secondsLeft % 60).padStart(2, '0')}</strong>
        <div className="timer-progress" role="progressbar" aria-label="5分間の学習進捗" aria-valuemin={0} aria-valuemax={LEARNING_DURATION_SECONDS} aria-valuenow={LEARNING_DURATION_SECONDS - secondsLeft}><i style={{ width: `${progressPercent}%` }} /></div>
        <p>表示された単語を使って、アプリの外で学習しましょう。</p>
        {secondsLeft === 0 ? <><p className="timer-state" role="status">学習時間が終わりました。確認テストへ進みましょう。</p><button className="primary" onClick={onContinue}>確認テストへ <ArrowRight size={16} /></button></> : <><p className="timer-state" role="status">{timerRunning ? '学習時間を計測中です。' : secondsLeft < LEARNING_DURATION_SECONDS ? '一時停止中です。準備ができたら再開しましょう。' : '準備ができたら学習タイマーを開始してください。'}</p><button className="primary" onClick={onToggleTimer}>{timerRunning ? '一時停止　Ⅱ' : secondsLeft < LEARNING_DURATION_SECONDS ? '学習を再開　▶' : '学習を開始　▶'}</button></>}
      </div>
      <div className="wordbox"><b>📖 {wordSet.title} <small>{words.length} WORDS</small></b><div>{words.map((word) => <p key={word.id}><strong>{word.english}</strong><span>{method.id === 'recall' ? '••••••' : word.japanese}</span></p>)}</div></div>
    </section>
  );
}
function QuizScreen({ round, words, questionIndex, answerVisible, onShowAnswer, onAnswer }: {
  round: 0 | 1;
  words: WordItem[];
  questionIndex: number;
  answerVisible: boolean;
  onShowAnswer: () => void;
  onAnswer: (remembered: boolean) => void;
}) {
  const word = words[questionIndex];
  return (
    <section className="flow"><div className="heading"><label>ROUND {round + 1} · QUICK CHECK</label><h2>意味を思い出してみよう</h2><p>答えを見る前に、頭の中で意味を考えてください。</p></div>
      <div className="quiz"><small>QUESTION {questionIndex + 1} / {words.length}</small><div className="progress"><i style={{ width: `${((questionIndex + 1) / words.length) * 100}%` }} /></div><strong>{word.english}</strong>
        {answerVisible ? <><div className="answer">正解<b>{word.japanese}</b></div><p>覚えていましたか？正直に選んでください。</p><div className="row"><button onClick={() => onAnswer(true)}>✓ 覚えていた</button><button onClick={() => onAnswer(false)}>✕ 覚えていなかった</button></div></> : <><p>意味を思い出したら、答えを見てみましょう。</p><button className="primary" onClick={onShowAnswer}>答えを見る <ArrowRight size={16} /></button></>}
      </div><p className="note">このテストは自己採点式です。正直な振り返りに使いましょう。</p>
    </section>
  );
}

function ResultScreen({ active, onHome, onHistory, onRetry }: { active: ActiveExperiment; onHome: () => void; onHistory: () => void; onRetry: () => void }) {
  const scores: [number, number] = [active.scores[0] ?? 0, active.scores[1] ?? 0];
  const winnerIndex = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
  const predictionWasRight = winnerIndex !== null && active.methods[winnerIndex] === active.prediction;
  const comment = winnerIndex === null
    ? `今回はどちらも${scores[0] * 10}%で同じ結果でした。別の問題セットでも試してみましょう。`
    : `今回の実験では「${methodName(active.methods[winnerIndex])}」の正答率が${Math.abs(scores[0] - scores[1]) * 10}ポイント高い結果でした。${predictionWasRight ? '実験前の予想と一致しました。' : '実験前の予想とは異なる結果でした。'}`;
  const chartData = active.methods.map((method, index) => ({ name: methodName(method), 正答率: scores[index] * 10 }));
  return (
    <section className="flow"><div className="heading"><label>YOUR EXPERIMENT RESULT</label><h2>今回の実験、おつかれさま！</h2><p>{new Date(active.date).toLocaleDateString('ja-JP')} の結果です。</p></div>
      <div className="scores">{active.methods.map((method, index) => <article key={method}><b>{methodName(method)} {active.prediction === method && <small>あなたの予想</small>}</b><strong>{scores[index] * 10}%</strong><p>{scores[index]} / 10 問 正解</p></article>)}</div>
      <div className="chart"><b>正答率を比べる <small>自己採点による今回の結果</small></b><ResponsiveContainer width="100%" height={230}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Bar dataKey="正答率" fill="#789877" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="callout">✨ {comment}<br />次は別の問題セットでも試してみましょう。</div><p className="note">自己採点による結果です。問題の難しさや集中度でも変わるため、勉強法の効果を証明するものではありません。</p>
      <div className="row center"><button className="secondary" onClick={onHome}>ホームへ</button><button className="secondary" onClick={onHistory}>実験履歴へ</button><button className="primary" onClick={onRetry}><RotateCcw size={16} /> もう一度実験する</button></div>
    </section>
  );
}

function HistoryScreen({ experiments, onStart, onDelete }: { experiments: ExperimentRecord[]; onStart: () => void; onDelete: () => void }) {
  return (
    <section className="flow"><div className="heading"><label>YOUR LAB NOTE</label><h2>実験履歴</h2><p>これまでの実験を振り返りましょう。</p></div>
      {!experiments.length ? <div className="empty"><span>🧪</span><b>まだ実験履歴がありません</b><p>最初の実験を始めて、自分の学び方を比べてみましょう。</p><button className="primary" onClick={onStart}>実験をはじめる <ArrowRight size={16} /></button></div> : <>
        {experiments.map((experiment) => <article className="history" key={experiment.id}><small>{new Date(experiment.date).toLocaleDateString('ja-JP')}</small>{experiment.methods.map((method, index) => <p key={method}>{methodName(method)}<b>{experiment.immediateScores[index] * 10}%</b></p>)}<small>予想：{methodName(experiment.prediction)}</small></article>)}
        <button className="link" onClick={onDelete}>履歴をすべて削除</button>
      </>}
    </section>
  );
}

function Root() {
  return <BrowserRouter><App /></BrowserRouter>;
}

createRoot(document.getElementById('root')!).render(<Root />);

