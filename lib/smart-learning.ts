export interface WordProgress {
  word: string
  attempts: number
  correct: number
  accuracy: number
  lastSeen: number
  masteryLevel: "learning" | "practiced" | "mastered"
  introducedAt: number
}

export interface SmartLearningState {
  currentWordIndex: number // How many words from vocabulary we've introduced
  wordProgress: Record<string, WordProgress>
  sessionStarted: number
  totalWordsIntroduced: number
}

export class SmartLearningEngine {
  static readonly INITIAL_WORDS = 8 // Start with 8 most common words
  static readonly MASTERY_THRESHOLD = 0.8 // 80% accuracy
  static readonly MIN_ATTEMPTS_FOR_MASTERY = 5
  static readonly EXPANSION_THRESHOLD = 0.7 // 70% of current words should be practiced/mastered
  static readonly NEW_WORDS_PER_EXPANSION = 3
  static readonly REVIEW_PROBABILITY = 0.2 // 20% chance to review mastered words

  static initializeProgress(vocabulary: any[], learningPoolSize: number): SmartLearningState {
    const state: SmartLearningState = {
      currentWordIndex: Math.min(learningPoolSize, vocabulary.length),
      wordProgress: {},
      sessionStarted: Date.now(),
      totalWordsIntroduced: Math.min(learningPoolSize, vocabulary.length),
    }

    // Initialize progress for first words
    for (let i = 0; i < state.currentWordIndex; i++) {
      const word = vocabulary[i]
      state.wordProgress[word.italian] = {
        word: word.italian,
        attempts: 0,
        correct: 0,
        accuracy: 0,
        lastSeen: 0,
        masteryLevel: "learning",
        introducedAt: Date.now(),
      }
    }

    return state
  }

  static updateWordProgress(state: SmartLearningState, word: string, isCorrect: boolean): SmartLearningState {
    const progress = state.wordProgress[word] || {
      word,
      attempts: 0,
      correct: 0,
      accuracy: 0,
      lastSeen: 0,
      masteryLevel: "learning" as const,
      introducedAt: Date.now(),
    }

    progress.attempts += 1
    if (isCorrect) progress.correct += 1
    progress.accuracy = progress.correct / progress.attempts
    progress.lastSeen = Date.now()

    // Update mastery level
    if (progress.attempts >= this.MIN_ATTEMPTS_FOR_MASTERY && progress.accuracy >= this.MASTERY_THRESHOLD) {
      progress.masteryLevel = "mastered"
    } else if (progress.attempts >= 3 && progress.accuracy >= 0.6) {
      progress.masteryLevel = "practiced"
    }

    return {
      ...state,
      wordProgress: {
        ...state.wordProgress,
        [word]: progress,
      },
    }
  }

  static shouldExpandVocabulary(state: SmartLearningState, vocabulary: any[]): boolean {
    if (state.currentWordIndex >= vocabulary.length) return false

    const currentWords = Object.values(state.wordProgress)
    const practicedOrMastered = currentWords.filter(
      (p) => p.masteryLevel === "practiced" || p.masteryLevel === "mastered",
    ).length

    return practicedOrMastered / currentWords.length >= this.EXPANSION_THRESHOLD
  }

  static expandVocabulary(state: SmartLearningState, vocabulary: any[], learningPoolSize: number): SmartLearningState {
    const newWordCount = Math.min(
      this.NEW_WORDS_PER_EXPANSION,
      Math.min(vocabulary.length - state.currentWordIndex, learningPoolSize - Object.keys(state.wordProgress).length),
    )

    const newState = { ...state }

    for (let i = 0; i < newWordCount; i++) {
      const wordIndex = state.currentWordIndex + i
      if (wordIndex < vocabulary.length) {
        const word = vocabulary[wordIndex]
        newState.wordProgress[word.italian] = {
          word: word.italian,
          attempts: 0,
          correct: 0,
          accuracy: 0,
          lastSeen: 0,
          masteryLevel: "learning",
          introducedAt: Date.now(),
        }
      }
    }

    newState.currentWordIndex += newWordCount
    newState.totalWordsIntroduced += newWordCount

    return newState
  }

  static selectNextWord(state: SmartLearningState, vocabulary: any[]): any | null {
    const availableWords = vocabulary.slice(0, state.currentWordIndex)
    if (availableWords.length === 0) return null

    const wordProgresses = availableWords.map(
      (word) =>
        state.wordProgress[word.italian] || {
          word: word.italian,
          attempts: 0,
          correct: 0,
          accuracy: 0,
          lastSeen: 0,
          masteryLevel: "learning" as const,
          introducedAt: Date.now(),
        },
    )

    // Separate words by mastery level
    const learningWords = wordProgresses.filter((p) => p.masteryLevel === "learning")
    const practicedWords = wordProgresses.filter((p) => p.masteryLevel === "practiced")
    const masteredWords = wordProgresses.filter((p) => p.masteryLevel === "mastered")

    // Decide whether to review or practice
    const shouldReview = Math.random() < this.REVIEW_PROBABILITY && masteredWords.length > 0

    let selectedProgress: WordProgress

    if (shouldReview) {
      // Review a mastered word (prefer least recently seen)
      selectedProgress = masteredWords.sort((a, b) => a.lastSeen - b.lastSeen)[0]
    } else {
      // Practice current words (prioritize learning, then practiced)
      const practicePool = learningWords.length > 0 ? learningWords : practicedWords
      if (practicePool.length === 0) {
        // Fallback to mastered words
        selectedProgress = masteredWords[Math.floor(Math.random() * masteredWords.length)]
      } else {
        // Prioritize words with lower accuracy
        selectedProgress = practicePool.sort((a, b) => a.accuracy - b.accuracy)[0]
      }
    }

    return availableWords.find((word) => word.italian === selectedProgress.word)
  }

  static getProgressStats(state: SmartLearningState) {
    const progresses = Object.values(state.wordProgress)
    const learning = progresses.filter((p) => p.masteryLevel === "learning").length
    const practiced = progresses.filter((p) => p.masteryLevel === "practiced").length
    const mastered = progresses.filter((p) => p.masteryLevel === "mastered").length

    return {
      total: progresses.length,
      learning,
      practiced,
      mastered,
      overallAccuracy:
        progresses.length > 0 ? progresses.reduce((sum, p) => sum + p.accuracy, 0) / progresses.length : 0,
    }
  }
}
