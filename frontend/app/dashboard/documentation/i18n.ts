export type DocumentationLang = 'ru' | 'tj';

export const documentationI18n = {
  ru: {
    language: 'Язык',
    tabs: {
      incoming: 'Входящие',
      outgoing: 'Исходящие',
      internal: 'Внутренние',
      approvals: 'Мои согласования',
      registry: 'Журнал регистрации',
      kinds: 'Типы документов',
    },
    titles: {
      incoming: 'Входящие документы',
      outgoing: 'Исходящие документы',
      internal: 'Внутренний документооборот',
      approvals: 'Очередь согласований',
    },
    common: {
      noDocuments: 'Документы не найдены',
      noStages: 'Этапы не найдены',
    },
    denied:
      'Раздел СЭД доступен пользователям с правом чтения документов.',
  },
  tj: {
    language: 'Забон',
    tabs: {
      incoming: 'Воридот',
      outgoing: 'Содирот',
      internal: 'Ҳуҷҷатҳои дохилӣ',
      approvals: 'Тасдиқҳои ман',
      registry: 'Дафтари бақайдгирӣ',
      kinds: 'Навъҳои ҳуҷҷат',
    },
    titles: {
      incoming: 'Ҳуҷҷатҳои воридотӣ',
      outgoing: 'Ҳуҷҷатҳои содиротӣ',
      internal: 'Гардиши дохилии ҳуҷҷатҳо',
      approvals: 'Навбати тасдиқ',
    },
    common: {
      noDocuments: 'Ҳуҷҷатҳо ёфт нашуданд',
      noStages: 'Марҳилаҳо ёфт нашуданд',
    },
    denied:
      'Бахши СЭД барои корбарони дорои ҳуқуқи хондани ҳуҷҷатҳо дастрас аст.',
  },
} as const;


