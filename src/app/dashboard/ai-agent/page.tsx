"use client"

import AgentsEditor from '@/components/agents/AgentsEditor'
import styles from './ai-agent.module.css'

export default function AiAgentPage() {
  return (
    <div className={styles.pageRoot}>
      <AgentsEditor showList={false} />
    </div>
  )
}