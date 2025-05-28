"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, EyeOff, Globe, Brain, Target, TrendingUp } from "lucide-react"
import { AVAILABLE_LANGUAGES, type Language } from "@/data/languages"
import { SmartLearningEngine, type SmartLearningState } from "@/lib/smart-learning"

interface VocabularyItem {
  [key: string]: string // This allows for dynamic language keys (italian, german, etc.)
  english: string
  spanish: string
  definition: string
  sentence: string
  sentenceTranslation: string
}

// Fisher-Yates shuffle algorithm for better randomization
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface AppSettings {
  selectedLanguage: Language
  learningMode: "manual" | "smart"
  wordRangeStart: number
  wordRangeEnd: number
  questionsPerSession: number
  learningPoolSize: number
}

const defaultSettings: AppSettings = {
  selectedLanguage: AVAILABLE_LANGUAGES[0],
  learningMode: "manual",
  wordRangeStart: 1,
  wordRangeEnd: 50,
  questionsPerSession: 10,
  learningPoolSize: 15,
}

export default function LanguageLearningApp() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  useEffect(() => {
    const storedSettings = localStorage.getItem("app-settings")
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("app-settings", JSON.stringify(settings))
  }, [settings])

  const [vocabularyData, setVocabularyData] = useState<VocabularyItem[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showHints, setShowHints] = useState(false)
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [shuffledVocabulary, setShuffledVocabulary] = useState<VocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [smartState, setSmartState] = useState<SmartLearningState | null>(null)
  const [currentSmartWord, setCurrentSmartWord] = useState<VocabularyItem | null>(null)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const { learningMode } = settings

  // Load vocabulary data when language changes
  useEffect(() => {
    const loadVocabulary = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/data/${settings.selectedLanguage.code}/vocabulary.json`)
        if (!response.ok) {
          throw new Error(`Failed to load vocabulary: ${response.status}`)
        }
        const data = await response.json()
        setVocabularyData(data)
      } catch (error) {
        console.error("Error loading vocabulary:", error)
        setVocabularyData([])
      } finally {
        setIsLoading(false)
      }
    }

    loadVocabulary()
  }, [settings.selectedLanguage])

  // Memoize the full vocabulary to avoid re-importing on every render
  const fullVocabulary: VocabularyItem[] = useMemo(() => vocabularyData, [vocabularyData])

  // Initialize smart learning when vocabulary loads
  useEffect(() => {
    if (fullVocabulary.length > 0 && settings.learningMode === "smart") {
      const savedState = localStorage.getItem(`smart-learning-${settings.selectedLanguage.code}`)
      let state: SmartLearningState

      if (savedState) {
        state = JSON.parse(savedState)
      } else {
        state = SmartLearningEngine.initializeProgress(fullVocabulary, settings.learningPoolSize)
      }

      setSmartState(state)
      const nextWord = SmartLearningEngine.selectNextWord(state, fullVocabulary)
      setCurrentSmartWord(nextWord)
      setIsLoading(false)
    }
  }, [fullVocabulary, settings.learningMode, settings.selectedLanguage, settings.learningPoolSize])

  // Initialize shuffled vocabulary when vocabulary data or range changes (manual mode)
  useEffect(() => {
    if (fullVocabulary.length > 0 && settings.learningMode === "manual") {
      const initializeQuiz = () => {
        const maxWords = fullVocabulary.length
        const validStart = Math.max(1, Math.min(settings.wordRangeStart, maxWords))
        const validEnd = Math.max(validStart, Math.min(settings.wordRangeEnd, maxWords))

        const rangeVocabulary = fullVocabulary.slice(validStart - 1, validEnd)
        const shuffled = shuffleArray(rangeVocabulary)
        const sessionQuestions = shuffled.slice(0, Math.min(settings.questionsPerSession, shuffled.length))

        setShuffledVocabulary(sessionQuestions)
        setCurrentQuestion(0)
        setUserAnswer("")
        setShowHints(false)
        setFeedback(null)
        setShowAnswer(false)
        setScore(0)
        setQuestionsAnswered(0)
        setIsLoading(false)
      }

      initializeQuiz()
    }
  }, [
    fullVocabulary,
    settings.questionsPerSession,
    settings.wordRangeStart,
    settings.wordRangeEnd,
    settings.learningMode,
  ])

  const currentWord = settings.learningMode === "smart" ? currentSmartWord : shuffledVocabulary[currentQuestion]

  const checkAnswer = () => {
    if (!currentWord) return

    const correctAnswer = currentWord[settings.selectedLanguage.wordKey]
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase()
    setFeedback(isCorrect ? "correct" : "incorrect")
    setShowAnswer(true)

    if (isCorrect) {
      setScore(score + 1)
    }

    // Update smart learning progress
    if (learningMode === "smart" && smartState) {
      const updatedState = SmartLearningEngine.updateWordProgress(smartState, correctAnswer, isCorrect)

      // Check if we should expand vocabulary
      if (SmartLearningEngine.shouldExpandVocabulary(updatedState, fullVocabulary)) {
        const expandedState = SmartLearningEngine.expandVocabulary(
          updatedState,
          fullVocabulary,
          settings.learningPoolSize,
        )
        setSmartState(expandedState)
        localStorage.setItem(`smart-learning-${settings.selectedLanguage.code}`, JSON.stringify(expandedState))
      } else {
        setSmartState(updatedState)
        localStorage.setItem(`smart-learning-${settings.selectedLanguage.code}`, JSON.stringify(updatedState))
      }
    }

    setQuestionsAnswered(questionsAnswered + 1)
  }

  const nextQuestion = () => {
    if (learningMode === "smart" && smartState) {
      // Smart mode: select next word intelligently
      const nextWord = SmartLearningEngine.selectNextWord(smartState, fullVocabulary)
      setCurrentSmartWord(nextWord)
      setUserAnswer("")
      setShowHints(false)
      setFeedback(null)
      setShowAnswer(false)
    } else {
      // Manual mode: go to next question in sequence
      if (currentQuestion < shuffledVocabulary.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setUserAnswer("")
        setShowHints(false)
        setFeedback(null)
        setShowAnswer(false)
      }
    }
  }

  const resetQuiz = () => {
    if (learningMode === "smart") {
      // Reset smart learning progress
      const newState = SmartLearningEngine.initializeProgress(fullVocabulary, settings.learningPoolSize)
      setSmartState(newState)
      localStorage.setItem(`smart-learning-${settings.selectedLanguage.code}`, JSON.stringify(newState))
      const nextWord = SmartLearningEngine.selectNextWord(newState, fullVocabulary)
      setCurrentSmartWord(nextWord)
      setScore(0)
      setQuestionsAnswered(0)
      setUserAnswer("")
      setShowHints(false)
      setFeedback(null)
      setShowAnswer(false)
    } else {
      // Manual mode reset
      if (fullVocabulary.length > 0) {
        setIsLoading(true)
        const maxWords = fullVocabulary.length
        const validStart = Math.max(1, Math.min(settings.wordRangeStart, maxWords))
        const validEnd = Math.max(validStart, Math.min(settings.wordRangeEnd, maxWords))

        const rangeVocabulary = fullVocabulary.slice(validStart - 1, validEnd)
        const shuffled = shuffleArray(rangeVocabulary)
        const sessionQuestions = shuffled.slice(0, Math.min(settings.questionsPerSession, shuffled.length))

        setShuffledVocabulary(sessionQuestions)
        setCurrentQuestion(0)
        setUserAnswer("")
        setShowHints(false)
        setFeedback(null)
        setShowAnswer(false)
        setScore(0)
        setQuestionsAnswered(0)
        setIsLoading(false)
      }
    }
  }

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleLanguageChange = (language: Language) => {
    updateSetting("selectedLanguage", language)
    setCurrentQuestion(0)
    setUserAnswer("")
    setShowHints(false)
    setFeedback(null)
    setShowAnswer(false)
    setScore(0)
    setQuestionsAnswered(0)
  }

  const isQuizComplete = learningMode === "manual" && currentQuestion === shuffledVocabulary.length - 1 && showAnswer

  const smartStats = smartState ? SmartLearningEngine.getProgressStats(smartState) : null

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !showAnswer) {
      checkAnswer()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {settings.selectedLanguage.flag} Learn {settings.selectedLanguage.name}
          </h1>
          <p className="text-gray-600">
            Practice {settings.selectedLanguage.name.toLowerCase()} vocabulary with contextual sentences
          </p>
        </div>

        {/* Language Selection */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Select Language:</h3>
              </div>
              <div className="flex gap-2">
                {AVAILABLE_LANGUAGES.map((language) => (
                  <Button
                    key={language.code}
                    variant={settings.selectedLanguage.code === language.code ? "default" : "outline"}
                    onClick={() => handleLanguageChange(language)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-lg">{language.flag}</span>
                    {language.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Mode Selection */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Learning Mode:</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={settings.learningMode === "smart" ? "default" : "outline"}
                  onClick={() => updateSetting("learningMode", "smart")}
                  className="flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Smart Mode
                </Button>
                <Button
                  variant={settings.learningMode === "manual" ? "default" : "outline"}
                  onClick={() => updateSetting("learningMode", "manual")}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Manual Mode
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {settings.learningMode === "smart"
                ? "AI adapts to your progress, introducing new words as you master current ones"
                : "Choose specific word ranges to practice"}
            </p>
          </CardContent>
        </Card>

        {/* Smart Mode Settings */}
        {learningMode === "smart" && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Learning Pool Size</h3>
                  <Input
                    type="number"
                    value={settings.learningPoolSize}
                    onChange={(e) =>
                      updateSetting("learningPoolSize", Math.max(5, Number.parseInt(e.target.value) || 5))
                    }
                    min={5}
                    max={fullVocabulary.length}
                    className="w-24 text-sm"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  The number of words actively in your learning pool. New words will be added as you master existing
                  ones.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart Mode Progress */}
        {learningMode === "smart" && smartStats && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-800">Learning Progress</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{smartStats.total}</div>
                    <div className="text-sm text-gray-600">Words Introduced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{smartStats.learning}</div>
                    <div className="text-sm text-gray-600">Learning</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{smartStats.practiced}</div>
                    <div className="text-sm text-gray-600">Practiced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{smartStats.mastered}</div>
                    <div className="text-sm text-gray-600">Mastered</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Accuracy</span>
                    <span>{Math.round(smartStats.overallAccuracy * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${smartStats.overallAccuracy * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Mode Settings */}
        {learningMode === "manual" && (
          <Card className="mb-4">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">Word Range (by frequency)</h3>
                <p className="text-sm text-gray-600">
                  Total vocabulary: {fullVocabulary.length} words • Current range:{" "}
                  {Math.max(1, Math.min(settings.wordRangeStart, fullVocabulary.length))} -{" "}
                  {Math.max(settings.wordRangeStart, Math.min(settings.wordRangeEnd, fullVocabulary.length))} (
                  {Math.max(
                    0,
                    Math.min(settings.wordRangeEnd, fullVocabulary.length) -
                      Math.max(1, Math.min(settings.wordRangeStart, fullVocabulary.length)) +
                      1,
                  )}{" "}
                  words)
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Essential 1-50", start: 1, end: 50, id: "1-50" },
                    { label: "Basic 1-100", start: 1, end: 100, id: "1-100" },
                    { label: "Intermediate 1-200", start: 1, end: 200, id: "1-200" },
                    { label: "Advanced 1-500", start: 1, end: 500, id: "1-500" },
                    { label: "Expert 501-1000", start: 501, end: 1000, id: "501-1000" },
                    { label: "Comprehensive 1-1000", start: 1, end: 1000, id: "1-1000" },
                    { label: "All Words", start: 1, end: fullVocabulary.length, id: "all" },
                  ].map((preset) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateSetting("wordRangeStart", preset.start)
                        updateSetting("wordRangeEnd", Math.min(preset.end, fullVocabulary.length))
                        setSelectedPreset(preset.id)
                      }}
                      disabled={preset.start > fullVocabulary.length}
                      className={`text-xs transition-all ${
                        selectedPreset === preset.id ? "bg-blue-600 text-white shadow-md" : "hover:bg-blue-50"
                      }`}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Custom range:</label>
                  <Input
                    type="number"
                    value={settings.wordRangeStart}
                    onChange={(e) => {
                      updateSetting("wordRangeStart", Math.max(1, Number.parseInt(e.target.value) || 1))
                      setSelectedPreset(null)
                    }}
                    min={1}
                    max={fullVocabulary.length}
                    className="w-20 text-sm"
                    disabled={currentQuestion > 0 && !isQuizComplete}
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="number"
                    value={settings.wordRangeEnd}
                    onChange={(e) => {
                      updateSetting(
                        "wordRangeEnd",
                        Math.max(settings.wordRangeStart, Number.parseInt(e.target.value) || settings.wordRangeStart),
                      )
                      setSelectedPreset(null)
                    }}
                    min={settings.wordRangeStart}
                    max={fullVocabulary.length}
                    className="w-20 text-sm"
                    disabled={currentQuestion > 0 && !isQuizComplete}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-800">Questions per session</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    id="questions-per-session"
                    value={settings.questionsPerSession}
                    onChange={(e) => updateSetting("questionsPerSession", Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    disabled={currentQuestion > 0 && !isQuizComplete}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option
                      value={Math.min(settings.wordRangeEnd - settings.wordRangeStart + 1, fullVocabulary.length)}
                    >
                      All in range (
                      {Math.min(settings.wordRangeEnd - settings.wordRangeStart + 1, fullVocabulary.length)})
                    </option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                {learningMode === "smart"
                  ? `Question ${questionsAnswered + 1}`
                  : `Question ${currentQuestion + 1} of ${shuffledVocabulary.length}`}
              </CardTitle>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Score: {score}/{learningMode === "smart" ? questionsAnswered || 1 : shuffledVocabulary.length}
              </Badge>
            </div>
            {learningMode === "manual" && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / shuffledVocabulary.length) * 100}%` }}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-gray-600">Loading {settings.selectedLanguage.name.toLowerCase()} vocabulary...</p>
                </div>
              </div>
            ) : !currentWord ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  No vocabulary available for {settings.selectedLanguage.name}. Please check your vocabulary file.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">{currentWord.sentence}</h2>
                  <p className="text-gray-600 italic">"{currentWord.sentenceTranslation}"</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Definition:</h3>
                  <p className="text-blue-700">{currentWord.definition}</p>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" onClick={() => setShowHints(!showHints)} className="w-full">
                    {showHints ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showHints ? "Hide Hints" : "Show Hints"}
                  </Button>

                  {showHints && (
                    <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-yellow-800">🇬🇧 English:</span>
                        <span className="text-yellow-700">{currentWord.english}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-yellow-800">🇪🇸 Spanish:</span>
                        <span className="text-yellow-700">{currentWord.spanish}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Type the missing ${settings.selectedLanguage.name.toLowerCase()} word...`}
                      disabled={showAnswer}
                      className="text-lg"
                    />
                    {!showAnswer ? (
                      <Button onClick={checkAnswer} disabled={!userAnswer.trim()}>
                        Check
                      </Button>
                    ) : (
                      (learningMode === "smart" || currentQuestion < shuffledVocabulary.length - 1) && (
                        <Button onClick={nextQuestion}>Next</Button>
                      )
                    )}
                  </div>

                  {feedback && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        feedback === "correct" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                      }`}
                    >
                      {feedback === "correct" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="font-semibold">
                        {feedback === "correct"
                          ? "Correct! Well done!"
                          : `Incorrect. The answer is "${currentWord[settings.selectedLanguage.wordKey]}"`}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
