/**
 * Родительская запись (группа / вид растения).
 * Приходит из `/api/templates/roots`.
 *
 * У группы `idGroup === idTemplate` в БД, но в клиентский тип
 * `idTemplate` не входит — только `idGroup` и `nameGroup`.
 */
export type TemplateGroup = {
  idGroup: number;
  nameGroup: string;
  /** Дети приходят из `/api/templates/:idGroup/children` */
  subRows?: Template[];
};

/**
 * Дочерняя запись (конкретное растение).
 * Приходит из `/api/templates/:idGroup/children`.
 *
 * `idTemplate` уникален, используется как `getRowId` для детей.
 */
export type Template = {
  idTemplate: number;
  nameTemplate: string;
  idGroup: number;
  nameGroup: string;
  status: number | null;
  dateCreate: string;
  subRows?: Template[];
};

/**
 * Union-тип для `MRTTree`: узел дерева — либо группа, либо конкретное растение.
 *
 * Проверка «это группа?» — `!('idTemplate' in row)` (у группы нет `idTemplate`).
 */
export type TemplateTreeNode = TemplateGroup | Template;