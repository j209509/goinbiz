export interface GeneratedIdea {
  serviceName: string
  concept: string
  target: string
  revenueModel: string
  marketScore: number
  profitScore: number
  buzzScore: number
  overallScore: number
  mvp: string
  monetize: string
  expansion: string
  actionPlan: string

  // optional: "もっと詳しく" で追加生成される実行プラン
  executionPlan?: string
  costEstimate?: string
  channelStrategy?: string
  techStack?: string
  riskAndFailurePatterns?: string
}
