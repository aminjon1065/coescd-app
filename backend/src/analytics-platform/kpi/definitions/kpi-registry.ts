export interface KpiDefinition {
  code: string;
  nameRu: string;
  description?: string;
  formula: string;
  unit: string;
  thresholds: { warning: number; critical: number; direction: 'up_bad' | 'down_bad' };
  scopeLevels: string[];
  refreshCron: string;
}

export const KPI_REGISTRY: KpiDefinition[] = [
  {
    code: 'INC_TOTAL_30D',
    nameRu: 'ЧС за 30 дней',
    formula: `SELECT COUNT(*)::numeric FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL '30 days'`,
    unit: 'штук',
    thresholds: { warning: 50, critical: 100, direction: 'up_bad' },
    scopeLevels: ['global', 'oblast'],
    refreshCron: '0 * * * *',
  },
  {
    code: 'INC_AVG_RESPONSE_7D',
    nameRu: 'Ср. время реагирования (7 дн.)',
    formula: `SELECT COALESCE(ROUND(AVG(response_time_min)),0)::numeric FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL '7 days'`,
    unit: 'минут',
    thresholds: { warning: 45, critical: 90, direction: 'up_bad' },
    scopeLevels: ['global', 'oblast', 'rayon'],
    refreshCron: '0 * * * *',
  },
  {
    code: 'INC_FATALITY_RATE',
    nameRu: 'Уровень смертности (%)',
    formula: `SELECT COALESCE(ROUND(SUM(fatalities)::numeric/NULLIF(SUM(affected_count),0)*100,2),0) FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL '30 days'`,
    unit: '%',
    thresholds: { warning: 1.0, critical: 3.0, direction: 'up_bad' },
    scopeLevels: ['global', 'oblast'],
    refreshCron: '0 */6 * * *',
  },
  {
    code: 'RES_UTILIZATION_RATE',
    nameRu: 'Использование ресурсов',
    formula: `SELECT COALESCE(ROUND(COUNT(CASE WHEN returned_at IS NULL THEN 1 END)::numeric/NULLIF(COUNT(*),0)*100,1),0) FROM anl_fact_resource_deployment WHERE deployed_at > NOW() - INTERVAL '7 days'`,
    unit: '%',
    thresholds: { warning: 80, critical: 95, direction: 'up_bad' },
    scopeLevels: ['global', 'department'],
    refreshCron: '0 */1 * * *',
  },
  {
    code: 'EDM_PENDING_APPROVALS',
    nameRu: 'Документы на согласовании',
    formula: `SELECT COUNT(*)::numeric FROM edm_v2_documents WHERE status = 'approval'`,
    unit: 'штук',
    thresholds: { warning: 20, critical: 50, direction: 'up_bad' },
    scopeLevels: ['global', 'department'],
    refreshCron: '*/15 * * * *',
  },
  {
    code: 'INC_SEVERITY_AVG_7D',
    nameRu: 'Средняя степень ЧС (7 дн.)',
    formula: `SELECT COALESCE(ROUND(AVG(severity)::numeric,2),0) FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL '7 days'`,
    unit: 'баллов (1-5)',
    thresholds: { warning: 3.0, critical: 4.0, direction: 'up_bad' },
    scopeLevels: ['global', 'oblast'],
    refreshCron: '0 * * * *',
  },
  {
    code: 'INC_AFFECTED_30D',
    nameRu: 'Пострадавших за 30 дней',
    formula: `SELECT COALESCE(SUM(affected_count),0)::numeric FROM anl_fact_incidents WHERE occurred_at > NOW() - INTERVAL '30 days'`,
    unit: 'человек',
    thresholds: { warning: 1000, critical: 5000, direction: 'up_bad' },
    scopeLevels: ['global', 'oblast'],
    refreshCron: '0 */3 * * *',
  },
];
