export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import {
  getInitiatives,
  createInitiative,
  getInitiativeStats,
} from '@/lib/firestore/initiatives';
import {
  InitiativeDetail,
  InitiativeFilters,
  InitiativeStatus,
  InitiativeCategory,
  Priority,
  CreateInitiativeData,
} from '@/lib/types/initiative';

function toSerializableDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serializeInitiative(initiative: InitiativeDetail) {
  const { currentVersionData, ...rest } = initiative as any;
  return {
    ...rest,
    dueDate: toSerializableDate(initiative.dueDate) || null,
    createdAt: toSerializableDate(initiative.createdAt),
    updatedAt: toSerializableDate(initiative.updatedAt),
    currentVersionData: currentVersionData
      ? {
          ...currentVersionData,
          dueDate: toSerializableDate(currentVersionData.dueDate) || null,
          createdAt: toSerializableDate(currentVersionData.createdAt),
        }
      : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParams = searchParams.getAll('status') as unknown as InitiativeStatus[];
    const categoryParams = searchParams.getAll('category') as unknown as InitiativeCategory[];
    const priorityParams = searchParams.getAll('priority') as unknown as Priority[];
    const assigneeParams = searchParams.getAll('assignee');
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const includeStats = searchParams.get('include_stats') === 'true';

    const filters: InitiativeFilters = {};
    if (statusParams && statusParams.length > 0) filters.status = statusParams as InitiativeStatus[];
    if (categoryParams && categoryParams.length > 0) filters.category = categoryParams as InitiativeCategory[];
    if (priorityParams && priorityParams.length > 0) filters.priority = priorityParams as Priority[];
    if (assigneeParams && assigneeParams.length > 0) filters.assignee = assigneeParams;
    if (searchQuery) filters.searchQuery = searchQuery;

    const initiatives = await getInitiatives(filters);
    const data = initiatives.map(serializeInitiative);

    if (includeStats) {
      const stats = await getInitiativeStats();
      return NextResponse.json({ success: true, data, stats, count: data.length });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to fetch initiatives:', error);
    return NextResponse.json(
      { error: '施策一覧の取得に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const required = ['title', 'category', 'status', 'priority', 'issue', 'cause', 'action'];
    const missing = required.filter((k) => !body?.[k]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `必須項目が不足しています: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const dueDateValue: Date | undefined = body.dueDate ? new Date(body.dueDate) : undefined;

    const data: CreateInitiativeData = {
      title: body.title,
      category: body.category as InitiativeCategory,
      status: body.status as InitiativeStatus,
      priority: body.priority as Priority,
      assignee: body.assignee || undefined,
      dueDate: dueDateValue,
      issue: body.issue,
      cause: body.cause,
      action: body.action,
      result: body.result || '',
      createdBy: body.createdBy || undefined,
    } as any;

    const id = await createInitiative(data);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create initiative:', error);
    return NextResponse.json(
      { error: '施策の作成に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}



