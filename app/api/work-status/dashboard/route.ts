export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { WorkStatusDashboard } from '@/lib/types/work_status_report';
import { Member } from '@/lib/types/member';
import { Project } from '@/lib/types/project';
import { MemberStatus, JobCategory, ProjectStatus } from '@/lib/types/enums';

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const now = new Date();
    
    // 現在稼働中のメンバーを取得（稼働 + 学習開始）
    const workingSnapshot = await adminDb
      .collection('members')
      .where('status', '==', MemberStatus.WORKING)
      .get();
    
    const learningStartedSnapshot = await adminDb
      .collection('members')
      .where('status', '==', MemberStatus.LEARNING_STARTED)
      .get();
    
    // 両方のスナップショットを結合
    const allActiveDocs = [...workingSnapshot.docs, ...learningStartedSnapshot.docs];
    
    const activeMembers = allActiveDocs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        jobCategory: data.jobCategory as JobCategory,
        currentProject: data.currentProject as string | undefined
      };
    });

    // アクティブなプロジェクトを取得
    const projectsSnapshot = await adminDb
      .collection('projects')
      .where('status', '==', ProjectStatus.ACTIVE)
      .get();
    
    const activeProjects = projectsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        name: data.name || 'Unknown Project'
      };
    });

    // 職種別集計
    const byCategory: Record<JobCategory, number> = {
      [JobCategory.SNS_OPERATION]: 0,
      [JobCategory.VIDEO_CREATOR]: 0,
      [JobCategory.AI_WRITER]: 0,
      [JobCategory.PHOTOGRAPHY_STAFF]: 0,
    };
    
    activeMembers.forEach(member => {
      if (member.jobCategory in byCategory) {
        byCategory[member.jobCategory as JobCategory]++;
      }
    });

    // プロジェクト別集計
    const byProject = activeProjects.map(project => ({
      projectId: project.id,
      projectName: project.name,
      memberCount: activeMembers.filter(m => m.currentProject === project.id).length
    }));

    // 今週・今月の動きを計算（簡易版）
    const thisWeek = {
      newWork: 0,
      switching: 0,
      projectRelease: 0,
      contractTermination: 0,
    };
    
    const thisMonth = {
      newWork: 0,
      switching: 0,
      projectRelease: 0,
      contractTermination: 0,
    };

    // アラート生成（簡易版）
    const alerts: WorkStatusDashboard['alerts'] = [];
    
    // 高離職率アラート
    const turnoverRate = allActiveDocs.length > 0 ? 
      (thisMonth.contractTermination / allActiveDocs.length) * 100 : 0;
    
    if (turnoverRate > 10) {
      alerts.push({
        type: 'high_turnover',
        message: `今月の離職率が${turnoverRate.toFixed(1)}%と高くなっています`,
        severity: 'warning'
      });
    }

    const dashboard: WorkStatusDashboard = {
      currentDate: now,
      activeMembers: {
        total: activeMembers.length,
        byCategory,
        byProject
      },
      thisWeek,
      thisMonth,
      alerts
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('ダッシュボードデータ取得エラー:', error);
    return NextResponse.json(
      { error: 'ダッシュボードデータの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 