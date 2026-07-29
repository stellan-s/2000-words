import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import {
  getLearningStats,
  getNextDueWord,
  initializeDatabase,
  reviewWord,
  type LearningStats,
  type VocabularyWord,
} from "./src/db/database";
import type { AppRating } from "./src/srs/scheduler";

const emptyStats: LearningStats = { learned: 0, due: 0, reviewsToday: 0, total: 2000 };

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider
        databaseName="2000-words.db"
        onInit={initializeDatabase}
        useSuspense
      >
        <LearningApp />
      </SQLiteProvider>
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator color="#527557" />
      <Text style={styles.loadingText}>Preparing Spanish vocabulary…</Text>
    </SafeAreaView>
  );
}

function LearningApp() {
  const db = useSQLiteContext();
  const [screen, setScreen] = useState<"home" | "study">("home");
  const [stats, setStats] = useState<LearningStats>(emptyStats);
  const [word, setWord] = useState<VocabularyWord | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setStats(await getLearningStats(db));
  }, [db]);

  const loadNext = useCallback(async () => {
    setWord(await getNextDueWord(db));
    setRevealed(false);
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startReview = async () => {
    await loadNext();
    setScreen("study");
  };

  const rate = async (rating: AppRating) => {
    if (!word || busy) return;
    setBusy(true);
    try {
      await reviewWord(db, word.id, rating);
      await Promise.all([loadNext(), refresh()]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {screen === "home" ? (
        <View style={styles.screen}>
          <View style={styles.nav}>
            <Text style={styles.navAction}>☰</Text>
            <Text style={styles.navTitle}>Spanish</Text>
            <Text style={styles.navAction}>⚙</Text>
          </View>

          <View style={styles.metrics}>
            <Metric label="learned" value={`${stats.learned} / ${stats.total}`} />
            <Metric label="Today’s reviews" value={String(stats.reviewsToday)} />
            <Metric label="Words due now" value={String(stats.due)} />
          </View>

          <Pressable style={styles.primaryButton} onPress={startReview}>
            <Text style={styles.primaryButtonText}>Review now</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.screen}>
          <View style={styles.nav}>
            <Pressable onPress={() => setScreen("home")} hitSlop={16}>
              <Text style={styles.close}>×</Text>
            </Pressable>
            <Text style={styles.progress}>{word ? `${word.rank} / 2000` : "Complete"}</Text>
            <Text style={styles.navAction}>•••</Text>
          </View>

          {word ? (
            <>
              <View style={styles.wordStage}>
                <Text style={styles.word}>{word.lemma}</Text>
                <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
              </View>

              <Pressable style={styles.reveal} onPress={() => setRevealed(true)}>
                <Text style={revealed ? styles.translation : styles.revealLabel}>
                  {revealed ? word.translation : "Tap to reveal meaning"}
                </Text>
              </Pressable>

              <View style={styles.example}>
                <Text style={styles.exampleSpanish}>{word.example}</Text>
                <Text style={styles.exampleEnglish}>{word.exampleTranslation}</Text>
              </View>

              <View style={styles.ratings}>
                <RatingButton label="Again" tone="again" disabled={busy} onPress={() => rate("again")} />
                <RatingButton label="Hard" tone="hard" disabled={busy} onPress={() => rate("hard")} />
                <RatingButton label="Know it" tone="know" disabled={busy} onPress={() => rate("know")} />
              </View>
            </>
          ) : (
            <View style={styles.complete}>
              <Text style={styles.completeTitle}>All caught up.</Text>
              <Text style={styles.completeCopy}>Come back when the next words are due.</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function RatingButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: "again" | "hard" | "know";
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.rating, styles[`rating_${tone}`]]}
    >
      <Text style={[styles.ratingText, styles[`ratingText_${tone}`]]}>{label}</Text>
    </Pressable>
  );
}

const colors = {
  paper: "#F9F8F5",
  ink: "#171B19",
  muted: "#817F7A",
  line: "#E2DFD8",
  green: "#527557",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.paper,
  },
  loadingText: { color: colors.muted, fontSize: 14 },
  screen: { flex: 1, paddingHorizontal: 25, paddingBottom: 20 },
  nav: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navTitle: { color: colors.ink, fontSize: 17, fontWeight: "500" },
  navAction: { color: colors.ink, fontSize: 21, width: 32, textAlign: "center" },
  close: { color: colors.ink, fontSize: 34, fontWeight: "300", lineHeight: 34 },
  progress: { color: colors.muted, fontSize: 13 },
  metrics: { marginTop: 38 },
  metric: {
    minHeight: 112,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  metricLabel: { color: colors.muted, fontSize: 14, marginBottom: 6 },
  metricValue: { color: colors.ink, fontSize: 29, fontWeight: "500" },
  primaryButton: {
    marginTop: "auto",
    height: 58,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  primaryButtonText: { color: "white", fontSize: 17, fontWeight: "500" },
  wordStage: { alignItems: "center", marginTop: 96 },
  word: { color: colors.ink, fontFamily: "Georgia", fontSize: 68 },
  partOfSpeech: { color: colors.muted, fontSize: 13, marginTop: 9 },
  reveal: {
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  revealLabel: { color: colors.muted, fontSize: 13 },
  translation: {
    color: colors.ink,
    fontFamily: "Georgia",
    fontSize: 25,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  example: {
    marginTop: 30,
    borderLeftColor: colors.green,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 15,
  },
  exampleSpanish: { color: colors.ink, fontFamily: "Georgia", fontSize: 19 },
  exampleEnglish: { color: colors.muted, fontSize: 14, marginTop: 6 },
  ratings: { marginTop: "auto", flexDirection: "row", gap: 9 },
  rating: {
    flex: 1,
    height: 94,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rating_again: { backgroundColor: "#F8EEEB" },
  rating_hard: { backgroundColor: "#F5F2EB" },
  rating_know: { backgroundColor: "#EEF1EA" },
  ratingText: { fontSize: 15 },
  ratingText_again: { color: "#AA4739" },
  ratingText_hard: { color: "#745F3D" },
  ratingText_know: { color: "#3F6145" },
  complete: { flex: 1, alignItems: "center", justifyContent: "center" },
  completeTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 38 },
  completeCopy: { color: colors.muted, marginTop: 10 },
});
