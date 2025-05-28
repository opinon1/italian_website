export interface Language {
  code: string
  name: string
  flag: string
  wordKey: string
}

export const AVAILABLE_LANGUAGES: Language[] = [
  {
    code: "italian",
    name: "Italian",
    flag: "🇮🇹",
    wordKey: "italian",
  },
  {
    code: "german",
    name: "German",
    flag: "🇩🇪",
    wordKey: "german",
  },
]

export const getLanguageConfig = (languageCode: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.code === languageCode) || AVAILABLE_LANGUAGES[0]
}
