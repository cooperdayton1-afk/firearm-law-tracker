import { KEYWORD_CATEGORIES } from '../data/keywordCategories'

export function categorizeBill(matchedKeywords = []) {
  const lowerKeywords = matchedKeywords.map((k) => k.toLowerCase())

  for (const [category, categoryKeywords] of Object.entries(KEYWORD_CATEGORIES)) {
    const hasMatch = categoryKeywords.some((keyword) => lowerKeywords.includes(keyword))
    if (hasMatch) return category
  }

  return 'Uncategorized'
}