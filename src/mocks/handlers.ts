import { http, HttpResponse } from 'msw';
import { templates } from './db';

// ────────────────────────────────────────────────────────────────────────────
// Типы
// ────────────────────────────────────────────────────────────────────────────

type TemplateRecord = {
  idTemplate: number;
  nameTemplate: string;
  idGroup: number;
  nameGroup: string;
  status: number | null;
  dateCreate: string;
};

/** Ответ ручки «родители» */
type TemplateGroup = {
  idGroup: number;
  nameGroup: string;
  subRows?: TemplateRecord[];
};

/** Ответ ручки «дети» (полная структура) */
type Template = TemplateRecord;

// ────────────────────────────────────────────────────────────────────────────
// Утилиты
// ────────────────────────────────────────────────────────────────────────────

async function getAllRows(): Promise<TemplateRecord[]> {
  const all = await templates.findMany();
  return all.map((r) => ({
    idTemplate: r.idTemplate as number,
    nameTemplate: r.nameTemplate as string,
    idGroup: r.idGroup as number,
    nameGroup: r.nameGroup as string,
    status: (r.status as number | null) ?? null,
    dateCreate: r.dateCreate as string,
  }));
}

/** Родители: idTemplate === idGroup */
function getGroupRecords(all: TemplateRecord[]): TemplateRecord[] {
  return all.filter((r) => r.idTemplate === r.idGroup);
}

/** Дети конкретной группы */
function getChildRecords(
  all: TemplateRecord[],
  groupId: number,
): TemplateRecord[] {
  return all.filter(
    (r) => r.idGroup === groupId && r.idTemplate !== groupId,
  );
}

/** TemplateRecord → TemplateGroup (только idGroup + nameGroup) */
function toGroup(r: TemplateRecord): TemplateGroup {
  return { idGroup: r.idGroup, nameGroup: r.nameGroup };
}

/** TemplateRecord → Template (полная структура) */
function toTemplate(r: TemplateRecord): Template {
  return {
    idTemplate: r.idTemplate,
    nameTemplate: r.nameTemplate,
    idGroup: r.idGroup,
    nameGroup: r.nameGroup,
    status: r.status,
    dateCreate: r.dateCreate,
  };
}

/** ДД.ММ.ГГГГ → timestamp (0, если строки нет) */
function parseDate(s: string): number {
  if (!s) return 0;
  const parts = s.split('.');
  const d = Number(parts[0] ?? 1);
  const m = Number(parts[1] ?? 1);
  const y = Number(parts[2] ?? 1970);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Значение для сортировки записи по имени поля.
 * Для групп, где поля нет, — фолбэк на nameGroup / null.
 */
function getRecordSortValue(
  row: TemplateRecord,
  field: string,
): string | number | null {
  const isGroup = row.idTemplate === row.idGroup;
  switch (field) {
    case 'idTemplate':
      return isGroup ? row.idGroup : row.idTemplate;
    case 'idGroup':
      return row.idGroup;
    case 'nameTemplate':
      return isGroup ? row.nameGroup : row.nameTemplate;
    case 'nameGroup':
      return row.nameGroup;
    case 'status':
      return isGroup ? null : row.status;
    case 'dateCreate':
      return isGroup ? null : row.dateCreate;
    default:
      return (row as unknown as Record<string, unknown>)[field] as
        | string
        | number
        | null;
  }
}

function compareSortValues(
  a: string | number | null,
  b: string | number | null,
  field: string,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (field === 'dateCreate') {
    return parseDate(String(a)) - parseDate(String(b));
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) > String(b) ? 1 : -1;
}

function sortRecords(
  rows: TemplateRecord[],
  field: string,
  direction: 'ASC' | 'DESC',
): TemplateRecord[] {
  return [...rows].sort((a, b) => {
    const va = getRecordSortValue(a, field);
    const vb = getRecordSortValue(b, field);
    return compareSortValues(va, vb, field) * (direction === 'ASC' ? 1 : -1);
  });
}

/** Сортировка дерева (группы + их subRows) */
function sortGroupTree(
  tree: TemplateGroup[],
  field: string,
  direction: 'ASC' | 'DESC',
): TemplateGroup[] {
  const sortedGroups = [...tree].sort((a, b) => {
    const va = getRecordSortValue(
      {
        idTemplate: a.idGroup,
        nameTemplate: a.nameGroup,
        idGroup: a.idGroup,
        nameGroup: a.nameGroup,
        status: null,
        dateCreate: '',
      },
      field,
    );
    const vb = getRecordSortValue(
      {
        idTemplate: b.idGroup,
        nameTemplate: b.nameGroup,
        idGroup: b.idGroup,
        nameGroup: b.nameGroup,
        status: null,
        dateCreate: '',
      },
      field,
    );
    return compareSortValues(va, vb, field) * (direction === 'ASC' ? 1 : -1);
  });
  return sortedGroups.map((g) => {
    if (!g.subRows) return g;
    const sortedChildren = [...g.subRows].sort((a, b) => {
      const va = getRecordSortValue(a, field);
      const vb = getRecordSortValue(b, field);
      return compareSortValues(va, vb, field) * (direction === 'ASC' ? 1 : -1);
    });
    return { ...g, subRows: sortedChildren };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────────────────────

export const handlers = [
  /**
   * Родители.
   * Возвращает TemplateGroup[] — только { idGroup, nameGroup } (+ subRows при поиске).
   */
  http.get('/api/templates/roots', async ({ request }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get('size') ?? 10);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const sortField = url.searchParams.get('sortField') ?? 'idGroup';
    const sortDirection = (url.searchParams.get('sortDirection') ??
      'ASC') as 'ASC' | 'DESC';
    const searchTerm = url.searchParams.get('searchTerm') ?? '';

    const allRows = await getAllRows();
    const groups = getGroupRecords(allRows);

    console.log(
      `[roots] db=${allRows.length} groups=${groups.length} ` +
        `size=${size} offset=${offset} ` +
        `sort=${sortField} ${sortDirection} searchTerm="${searchTerm}"`,
    );

    // ── Режим поиска ────────────────────────────────────────────────────
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();

      const matchedGroupIds = new Set<number>();
      const matchedChildIds = new Set<number>();

      for (const g of groups) {
        if (g.nameGroup.toLowerCase().includes(lower)) {
          matchedGroupIds.add(g.idGroup);
        }
      }

      for (const c of allRows) {
        if (c.idTemplate === c.idGroup) continue; // пропускаем группы
        if (
          c.nameTemplate.toLowerCase().includes(lower) ||
          c.nameGroup.toLowerCase().includes(lower)
        ) {
          matchedChildIds.add(c.idTemplate);
          matchedGroupIds.add(c.idGroup);
        }
      }

      console.log(
        `[roots] search: matchedGroups=${matchedGroupIds.size} ` +
          `matchedChildren=${matchedChildIds.size}`,
      );

      if (matchedGroupIds.size === 0) {
        return HttpResponse.json({ rows: [], total: 0 });
      }

      let tree: TemplateGroup[] = groups
        .filter((g) => matchedGroupIds.has(g.idGroup))
        .map((g) => {
          const children = getChildRecords(allRows, g.idGroup).filter((c) =>
            matchedChildIds.has(c.idTemplate),
          );
          return {
            idGroup: g.idGroup,
            nameGroup: g.nameGroup,
            ...(children.length > 0
              ? { subRows: children.map(toTemplate) }
              : {}),
          };
        });

      tree = sortGroupTree(tree, sortField, sortDirection);

      const total = tree.length;
      const paged = tree.slice(offset, offset + size);
      return HttpResponse.json({ rows: paged, total });
    }

    // ── Обычный режим: только группы, без subRows ───────────────────────
    const sortedGroups = sortRecords(groups, sortField, sortDirection);
    const total = sortedGroups.length;
    const paged = sortedGroups.slice(offset, offset + size);

    console.log(`[roots] normal: total=${total} paged=${paged.length}`);
    return HttpResponse.json({
      rows: paged.map(toGroup),
      total,
    });
  }),

  /**
   * Дети.
   * Возвращает Template[] — полная структура (idTemplate, nameTemplate,
   * idGroup, nameGroup, status, dateCreate).
   */
  http.get('/api/templates/:idGroup/children', async ({ params }) => {
    const groupId = Number(params.idGroup);
    const allRows = await getAllRows();
    const children = getChildRecords(allRows, groupId);
    console.log(`[children] groupId=${groupId} count=${children.length}`);
    return HttpResponse.json({ rows: children.map(toTemplate) });
  }),

  /** Удаление (для контекстного меню) */
  http.delete('/api/templates/:idTemplate', async ({ params }) => {
    const id = Number(params.idTemplate);
    await templates.deleteMany((q) => q.where({ idTemplate: id }));
    console.log(`[delete] idTemplate=${id}`);
    return HttpResponse.json({ success: true });
  }),
];