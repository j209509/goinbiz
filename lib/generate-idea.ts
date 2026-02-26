import type { GeneratedIdea } from "@/lib/types"

const ideaTemplates: Record<string, GeneratedIdea> = {
  default: {
    serviceName: "KingyoBox",
    concept:
      "金魚の品種をサブスクリプションで定期的に届ける、新感覚ペットサービス",
    target: "20〜30代の一人暮らし社会人",
    revenueModel: "月額2,980円のサブスクリプション + 水槽・餌のEC販売",
    marketScore: 72,
    profitScore: 65,
    buzzScore: 88,
    overallScore: 75,
    mvp: "LPでメールアドレスを収集し、月1回金魚と飼育キットを配送。まずは3品種から開始し、Instagramで飼育写真のコミュニティを形成する。",
    monetize:
      "基本プラン（月額2,980円）で金魚1匹+餌を定期配送。プレミアムプラン（月額5,980円）で希少品種や水槽デコレーションを追加。法人向けオフィス癒し金魚プランも展開。",
    expansion:
      "金魚以外の小型観賞魚への展開、AR金魚鑑賞アプリ、金魚カフェとのコラボ、ふるさと納税との連携（金魚の産地PR）。",
    actionPlan:
      "Week1: LP作成とSNSアカウント開設 → Week2: 金魚養殖業者との提携交渉 → Week3: 配送テスト（知人10名） → Week4: クラウドファンディング開始",
  },
}

export function generateIdea(word1: string, word2: string): GeneratedIdea {
  const marketScore = Math.floor(Math.random() * 40) + 50
  const profitScore = Math.floor(Math.random() * 40) + 45
  const buzzScore = Math.floor(Math.random() * 40) + 55
  const overallScore = Math.round(
    marketScore * 0.35 + profitScore * 0.35 + buzzScore * 0.3
  )

  const serviceNames = [
    `${word1.slice(0, 3)}${word2.slice(0, 3)}Lab`,
    `${word1}Pro`,
    `${word2}×${word1}`,
    `Neo${word1}`,
    `${word1}Hub`,
  ]

  const serviceName =
    serviceNames[Math.floor(Math.random() * serviceNames.length)]

  return {
    serviceName,
    concept: `${word1}の要素を${word2}に掛け合わせた、まったく新しい${word2}体験を提供するサービス`,
    target: "20〜40代のトレンドに敏感なアーリーアダプター層",
    revenueModel: `月額制サブスクリプション + ${word1}関連商品のEC販売`,
    marketScore,
    profitScore,
    buzzScore,
    overallScore,
    mvp: `まずはLPを作成し、${word1}×${word2}のコンセプトを訴求。SNSでバズを狙いつつ、テストユーザー50名を募集してβ版を提供する。`,
    monetize: `基本プラン（月額1,980円）で${word2}の基本機能を提供。プレミアムプラン（月額4,980円）で${word1}を活かした特別体験を追加。法人向けプランも展開。`,
    expansion: `${word1}の他カテゴリへの横展開、AIによる${word2}の自動最適化、${word1}コミュニティの形成、海外展開（特に東南アジア市場）。`,
    actionPlan: `Week1: コンセプト設計とLP公開 → Week2: ${word1}関連の業者・専門家との提携 → Week3: β版テスト開始 → Week4: フィードバック反映と正式ローンチ準備`,
  }
}
