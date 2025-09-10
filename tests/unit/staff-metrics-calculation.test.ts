/**
 * StaffMetrics 計算ロジック ユニットテスト
 * 
 * テスト対象:
 * - enhanced-work-status-aggregation.ts の計算ロジック
 * - weekly_reports.ts の StaffMetrics 変換ロジック
 */

import { generateWeeklyWorkStatusDetail } from '../../lib/analytics/enhanced-work-status-aggregation';
import { Member, WorkHistory } from '../../lib/types/member';
import { MemberStatus, WorkStatus, JobCategory } from '../../lib/types/enums';

describe('StaffMetrics Calculation Logic', () => {
  // テストデータ生成ヘルパー
  function createMockMember(
    id: string,
    name: string,
    status: MemberStatus,
    workHistory: Partial<WorkHistory>[] = []
  ): Member {
    return {
      id,
      name,
      status,
      jobCategory: JobCategory.SNS_OPERATION,
      email: `${id}@example.com`,
      applicationDate: new Date('2024-01-01'),
      hireDate: new Date('2024-02-01'),
      workHistory: workHistory.map((history, index) => ({
        id: `${id}-history-${index}`,
        memberName: name,
        startDate: history.startDate || new Date('2024-02-01'),
        endDate: history.endDate,
        projectName: history.projectName || 'テスト案件',
        managementNumber: history.managementNumber || `TEST-${index}`,
        workType: history.workType || WorkStatus.NEW_WORK,
        ...history
      }))
    };
  }

  describe('基本的な計算ロジック', () => {
    test('新規稼働者の計算が正しく行われる', () => {
      const members: Member[] = [
        // 2025年1月第1週に新規稼働開始
        createMockMember('member1', '新規太郎', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-06'), // 月曜日
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 2025年1月第1週に新規稼働開始
        createMockMember('member2', '新規花子', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-07'), // 火曜日
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 前週から継続稼働
        createMockMember('member3', '継続次郎', MemberStatus.WORKING, [
          {
            startDate: new Date('2024-12-30'), // 前年末
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      
      // 選択週（3番目の週）のデータを確認
      const targetWeek = result.weekDetails[2];
      
      expect(targetWeek.newStarted).toBe(2); // 新規太郎 + 新規花子
      expect(targetWeek.totalWorkers).toBe(3); // 全員稼働中
      expect(targetWeek.switching).toBe(0); // 切り替えなし
    });

    test('切り替え稼働者の計算が正しく行われる', () => {
      const members: Member[] = [
        // 切り替え稼働（前案件終了 → 新案件開始）
        createMockMember('member1', '切替太郎', MemberStatus.WORKING, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-05'), // 日曜日終了
            workType: WorkStatus.NEW_WORK,
            projectName: '前案件'
          },
          {
            startDate: new Date('2025-01-06'), // 月曜日開始
            workType: WorkStatus.SWITCHING,
            projectName: '新案件'
          }
        ]),
        // 継続稼働
        createMockMember('member2', '継続花子', MemberStatus.WORKING, [
          {
            startDate: new Date('2024-12-01'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      expect(targetWeek.switching).toBe(1); // 切替太郎
      expect(targetWeek.newStarted).toBe(0); // 新規稼働なし
      expect(targetWeek.totalWorkers).toBe(2); // 全員稼働中
    });

    test('案件終了者の計算が正しく行われる', () => {
      const members: Member[] = [
        // 案件終了（プロジェクト解除）
        createMockMember('member1', '終了太郎', MemberStatus.PROJECT_RELEASED, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-10'), // 金曜日終了
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 契約終了
        createMockMember('member2', '契約花子', MemberStatus.CONTRACT_ENDED, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-08'), // 水曜日終了
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 継続稼働
        createMockMember('member3', '継続次郎', MemberStatus.WORKING, [
          {
            startDate: new Date('2024-12-01'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      expect(targetWeek.projectEnded).toBe(1); // 終了太郎
      expect(targetWeek.contractEnded).toBe(1); // 契約花子
      expect(targetWeek.totalEnded).toBe(2); // 合計終了者
      expect(targetWeek.totalWorkers).toBe(1); // 継続次郎のみ
    });
  });

  describe('境界値テスト', () => {
    test('週の境界での稼働開始・終了が正しく判定される', () => {
      const members: Member[] = [
        // 週末（日曜日）に開始
        createMockMember('member1', '日曜開始', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-05'), // 日曜日
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 週始め（月曜日）に開始
        createMockMember('member2', '月曜開始', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-06'), // 月曜日
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 週末（日曜日）に終了
        createMockMember('member3', '日曜終了', MemberStatus.PROJECT_RELEASED, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-05'), // 日曜日
            workType: WorkStatus.NEW_WORK
          }
        ]),
        // 週始め（月曜日）に終了
        createMockMember('member4', '月曜終了', MemberStatus.PROJECT_RELEASED, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-06'), // 月曜日
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      // 2025年1月第1週は1月6日（月）〜1月12日（日）
      expect(targetWeek.newStarted).toBe(1); // 月曜開始のみカウント
      expect(targetWeek.projectEnded).toBe(1); // 月曜終了のみカウント
    });

    test('空のメンバー配列でもエラーが発生しない', () => {
      const members: Member[] = [];
      
      expect(() => {
        const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
        expect(result.weekDetails).toHaveLength(4);
        expect(result.weekDetails[2].totalWorkers).toBe(0);
        expect(result.weekDetails[2].newStarted).toBe(0);
        expect(result.weekDetails[2].switching).toBe(0);
        expect(result.weekDetails[2].totalEnded).toBe(0);
      }).not.toThrow();
    });
  });

  describe('複雑なシナリオ', () => {
    test('同一週内での複数の状態変更が正しく処理される', () => {
      const members: Member[] = [
        // 週の途中で案件切り替え
        createMockMember('member1', '週内切替', MemberStatus.WORKING, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-08'), // 水曜日終了
            workType: WorkStatus.NEW_WORK,
            projectName: '前案件'
          },
          {
            startDate: new Date('2025-01-09'), // 木曜日開始
            workType: WorkStatus.SWITCHING,
            projectName: '新案件'
          }
        ]),
        // 週の途中で新規開始後、すぐ終了
        createMockMember('member2', '短期稼働', MemberStatus.PROJECT_RELEASED, [
          {
            startDate: new Date('2025-01-07'), // 火曜日開始
            endDate: new Date('2025-01-10'), // 金曜日終了
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      expect(targetWeek.switching).toBe(1); // 週内切替
      expect(targetWeek.newStarted).toBe(1); // 短期稼働の新規開始
      expect(targetWeek.projectEnded).toBe(1); // 短期稼働の終了
      expect(targetWeek.totalWorkers).toBe(1); // 週内切替のみ継続
    });

    test('複数の職種混在でも正しく計算される', () => {
      const members: Member[] = [
        createMockMember('sns1', 'SNS太郎', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-06'),
            workType: WorkStatus.NEW_WORK
          }
        ]),
        {
          ...createMockMember('video1', '動画花子', MemberStatus.WORKING, [
            {
              startDate: new Date('2025-01-07'),
              workType: WorkStatus.NEW_WORK
            }
          ]),
          jobCategory: JobCategory.VIDEO_CREATOR
        },
        {
          ...createMockMember('ai1', 'AI次郎', MemberStatus.WORKING, [
            {
              startDate: new Date('2025-01-08'),
              workType: WorkStatus.NEW_WORK
            }
          ]),
          jobCategory: JobCategory.AI_WRITER
        }
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      expect(targetWeek.newStarted).toBe(3); // 全職種の新規稼働
      expect(targetWeek.totalWorkers).toBe(3); // 全員稼働中
    });
  });

  describe('データ検証', () => {
    test('計算結果の整合性が保たれる', () => {
      const members: Member[] = [
        createMockMember('member1', 'テスト1', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-06'),
            workType: WorkStatus.NEW_WORK
          }
        ]),
        createMockMember('member2', 'テスト2', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-07'),
            workType: WorkStatus.SWITCHING
          }
        ]),
        createMockMember('member3', 'テスト3', MemberStatus.PROJECT_RELEASED, [
          {
            startDate: new Date('2024-12-01'),
            endDate: new Date('2025-01-10'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      const targetWeek = result.weekDetails[2];
      
      // 整合性チェック
      expect(targetWeek.totalStarted).toBe(targetWeek.newStarted + targetWeek.switching);
      expect(targetWeek.totalEnded).toBe(targetWeek.projectEnded + targetWeek.contractEnded);
      
      // 数値の妥当性チェック
      expect(targetWeek.totalWorkers).toBeGreaterThanOrEqual(0);
      expect(targetWeek.newStarted).toBeGreaterThanOrEqual(0);
      expect(targetWeek.switching).toBeGreaterThanOrEqual(0);
      expect(targetWeek.totalEnded).toBeGreaterThanOrEqual(0);
    });

    test('週次詳細データの構造が正しい', () => {
      const members: Member[] = [
        createMockMember('member1', 'テスト', MemberStatus.WORKING, [
          {
            startDate: new Date('2025-01-06'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      const result = generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      
      // 基本構造チェック
      expect(result).toHaveProperty('year', 2025);
      expect(result).toHaveProperty('month', 1);
      expect(result).toHaveProperty('weekDetails');
      expect(result.weekDetails).toHaveLength(4);
      
      // 各週詳細の構造チェック
      result.weekDetails.forEach((week, index) => {
        expect(week).toHaveProperty('weekLabel');
        expect(week).toHaveProperty('weekNumber', index + 1);
        expect(week).toHaveProperty('totalWorkers');
        expect(week).toHaveProperty('newStarted');
        expect(week).toHaveProperty('switching');
        expect(week).toHaveProperty('totalEnded');
        expect(week).toHaveProperty('projectEnded');
        expect(week).toHaveProperty('contractEnded');
        expect(week).toHaveProperty('startedMembers');
        expect(week).toHaveProperty('endedMembers');
        expect(week).toHaveProperty('otherItems');
        
        expect(Array.isArray(week.startedMembers)).toBe(true);
        expect(Array.isArray(week.endedMembers)).toBe(true);
        expect(Array.isArray(week.otherItems)).toBe(true);
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('不正な日付データでもエラーが発生しない', () => {
      const members: Member[] = [
        createMockMember('member1', 'テスト', MemberStatus.WORKING, [
          {
            startDate: new Date('invalid-date'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      expect(() => {
        generateWeeklyWorkStatusDetail(members, 2025, 1, 1);
      }).not.toThrow();
    });

    test('未来の年月でも正しく計算される', () => {
      const members: Member[] = [
        createMockMember('member1', 'テスト', MemberStatus.WORKING, [
          {
            startDate: new Date('2030-01-06'),
            workType: WorkStatus.NEW_WORK
          }
        ])
      ];

      expect(() => {
        const result = generateWeeklyWorkStatusDetail(members, 2030, 1, 1);
        expect(result.year).toBe(2030);
        expect(result.month).toBe(1);
      }).not.toThrow();
    });
  });
}); 