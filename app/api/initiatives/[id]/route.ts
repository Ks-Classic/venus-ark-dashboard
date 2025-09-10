export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import {
  getInitiativeWithHistory,
  updateInitiative,
  deleteInitiative,
} from '@/lib/firestore/initiatives';
import { UpdateInitiativeData } from '@/lib/types/initiative';

function toSerializableDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function serializeInitiativeWithHistory(data: any) {
  return {
    ...data,
    dueDate: toSerializableDate(data.dueDate) || null,
    createdAt: toSerializableDate(data.createdAt),
    updatedAt: toSerializableDate(data.updatedAt),
    versions: Array.isArray(data.versions)
      ? data.versions.map((v: any) => ({
          ...v,
          dueDate: toSerializableDate(v.dueDate) || null,
          createdAt: toSerializableDate(v.createdAt),
        }))
      : [],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
    }

    const data = await getInitiativeWithHistory(id);
    if (!data) {
      return NextResponse.json({ error: '施策が見つかりません' }, { status: 404 });
    }
    return NextResponse.json(serializeInitiativeWithHistory(data));
  } catch (error: any) {
    console.error('Failed to fetch initiative with history:', error);
    return NextResponse.json(
      { error: '施策の取得に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
    }

    const body = await request.json();
    const payload: UpdateInitiativeData = {
      title: body.title,
      category: body.category,
      status: body.status,
      priority: body.priority,
      assignee: body.assignee,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      issue: body.issue,
      cause: body.cause,
      action: body.action,
      result: body.result,
      changeReason: body.changeReason,
      updatedBy: body.updatedBy,
    } as any;

    if (!payload.changeReason || payload.changeReason.trim() === '') {
      return NextResponse.json(
        { error: '変更理由は必須です' },
        { status: 400 }
      );
    }

    await updateInitiative(id, payload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update initiative:', error);
    return NextResponse.json(
      { error: '施策の更新に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
    }
    await deleteInitiative(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete initiative:', error);
    return NextResponse.json(
      { error: '施策の削除に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


