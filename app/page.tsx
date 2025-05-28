"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, EyeOff, RotateCcw } from "lucide-react"
import vocabularyData from "@/data/vocabulary.json"

interface VocabularyItem {
  italian: string
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

export default function ItalianLearningApp() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showHints, setShowHints] = useState(false)
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [questionsPerSession, setQuestionsPerSession] = useState(10)
  const [shuffledVocabulary, setShuffledVocabulary] = useState<VocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Memoize the full vocabulary to avoid re-importing on every render
  const fullVocabulary: VocabularyItem[] = useMemo(() => vocabularyData, [])

  // Initialize shuffled vocabulary on component mount
  useEffect(() => {
    const initializeQuiz = () => {
      setIsLoading(true)
      const shuffled = shuffleArray(fullVocabulary)
      const sessionQuestions = shuffled.slice(0, Math.min(questionsPerSession, shuffled.length))
      setShuffledVocabulary(sessionQuestions)
      setIsLoading(false)
    }

    initializeQuiz()
  }, [fullVocabulary, questionsPerSession])

  const currentWord = shuffledVocabulary[currentQuestion]

  const checkAnswer = () => {
    const isCorrect = userAnswer.toLowerCase().trim() === currentWord.italian.toLowerCase()
    setFeedback(isCorrect ? "correct" : "incorrect")
    setShowAnswer(true)

    if (isCorrect) {
      setScore(score + 1)
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < shuffledVocabulary.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setUserAnswer("")
      setShowHints(false)
      setFeedback(null)
      setShowAnswer(false)
    }
  }

  const resetQuiz = () => {
    setIsLoading(true)
    const shuffled = shuffleArray(fullVocabulary)
    const sessionQuestions = shuffled.slice(0, Math.min(questionsPerSession, shuffled.length))
    setShuffledVocabulary(sessionQuestions)
    setCurrentQuestion(0)
    setUserAnswer("")
    setShowHints(false)
    setFeedback(null)
    setShowAnswer(false)
    setScore(0)
    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showAnswer) {
      checkAnswer()
    } else if (e.key === "Enter" && showAnswer && currentQuestion < shuffledVocabulary.length - 1) {
      nextQuestion()
    }
  }

  const isQuizComplete = currentQuestion === shuffledVocabulary.length - 1 && showAnswer

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🇮🇹 Learn Italian</h1>
          <p className="text-gray-600">Practice Italian vocabulary with contextual sentences</p>
        </div>

        {/* Session Settings */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-800">Session Settings</h3>
                <p className="text-sm text-gray-600">Total vocabulary: {fullVocabulary.length} words</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="questions-per-session" className="text-sm font-medium text-gray-700">
                  Questions per session:
                </label>
                <select
                  id="questions-per-session"
                  value={questionsPerSession}
                  onChange={(e) => setQuestionsPerSession(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  disabled={currentQuestion > 0 && !isQuizComplete}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={fullVocabulary.length}>All ({fullVocabulary.length})</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                Question {currentQuestion + 1} of {shuffledVocabulary.length}
              </CardTitle>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Score: {score}/{shuffledVocabulary.length}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / shuffledVocabulary.length) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-gray-600">Preparing your questions...</p>
                </div>
              </div>
            ) : !currentWord ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No vocabulary available. Please check your vocabulary file.</p>
              </div>
            ) : (
              <>
                {/* Italian Sentence */}
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">{currentWord.sentence}</h2>
                  <p className="text-gray-600 italic">"{currentWord.sentenceTranslation}"</p>
                </div>

                {/* Definition */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Definition:</h3>
                  <p className="text-blue-700">{currentWord.definition}</p>
                </div>

                {/* Hints */}
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

                {/* Answer Input */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type the missing Italian word..."
                      disabled={showAnswer}
                      className="text-lg"
                    />
                    {!showAnswer ? (
                      <Button onClick={checkAnswer} disabled={!userAnswer.trim()}>
                        Check
                      </Button>
                    ) : (
                      currentQuestion < shuffledVocabulary.length - 1 && <Button onClick={nextQuestion}>Next</Button>
                    )}
                  </div>

                  {/* Feedback */}
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
                          : `Incorrect. The answer is "${currentWord.italian}"`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quiz Complete */}
                {isQuizComplete && (
                  <div className="text-center space-y-4 p-6 bg-green-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-green-800">Quiz Complete! 🎉</h3>
                    <p className="text-green-700 text-lg">
                      Final Score: {score} out of {shuffledVocabulary.length} (
                      {Math.round((score / shuffledVocabulary.length) * 100)}%)
                    </p>
                    <Button onClick={resetQuiz} className="mt-4">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
