import handler from '../../pages/api/diary';
import { createMocks, RequestMethod } from 'node-mocks-http';
import prisma from '../../lib/prisma';

// 今日の日付を0時0分0秒0ミリ秒に設定するヘルパー関数
const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('/api/diary API Endpoint', () => {
    let today: Date;

    beforeAll(() => {
        today = getToday();
    });

    beforeEach(async () => {
        // 各テストの前に、今日のデータをクリーンアップ
        await prisma.diary.deleteMany({ where: { date: today } });
    });

    afterAll(async () => {
        // 全テスト終了後にPrisma接続を閉じる
        await prisma.diary.deleteMany({ where: { date: today } }); //念のため最後にも削除
        await prisma.$disconnect();
    });

    // --- GET /api/diary ---
    describe('GET /api/diary', () => {
        // Test ID: GET-001
        it('should return 200 and the diary entry if it exists for today', async () => {
            const newDiary = await prisma.diary.create({
                data: {
                    content: '今日のテスト日記',
                    date: today,
                },
            });

            const { req, res } = createMocks({
                method: 'GET',
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(200);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe('今日のテスト日記');
            expect(new Date(responseData.date)).toEqual(today);
        });

        // Test ID: GET-002
        it('should return 200 and null if no diary entry exists for today', async () => {
            const { req, res } = createMocks({
                method: 'GET',
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(200);
            expect(res._getData()).toBe('null'); // prisma.findUnique は見つからない場合 null を返す
        });
    });

    // --- POST /api/diary ---
    describe('POST /api/diary', () => {
        // Test ID: POST-001
        it('should return 201 and create a new diary entry with valid content', async () => {
            const { req, res } = createMocks({
                method: 'POST',
                body: {
                    content: '新しい日記のエントリです。',
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(201);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe('新しい日記のエントリです。');
            expect(new Date(responseData.date)).toEqual(today);

            // Verify in DB
            const dbEntry = await prisma.diary.findUnique({ where: { date: today } });
            expect(dbEntry).not.toBeNull();
            expect(dbEntry?.content).toBe('新しい日記のエントリです。');
        });

        // Test ID: POST-002
        it('should return 400 if content is empty', async () => {
            const { req, res } = createMocks({
                method: 'POST',
                body: {
                    content: '',
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // Test ID: POST-003
        it('should return 400 if content is not provided', async () => {
            const { req, res } = createMocks({
                method: 'POST',
                body: {}, // content is missing
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // Test ID: POST-004
        it('should return 400 if content is longer than 140 characters', async () => {
            const longContent = 'a'.repeat(141);
            const { req, res } = createMocks({
                method: 'POST',
                body: {
                    content: longContent,
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // Test ID: POST-005
        it('should return 201 if content is exactly 140 characters', async () => {
            const content = 'a'.repeat(140);
            const { req, res } = createMocks({
                method: 'POST',
                body: {
                    content: content,
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(201);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe(content);
        });

        // Test ID: POST-006 (フォールスルーの挙動確認)
        // シナリオ1: 既存データがあり、リクエストボディにcontentがない場合 (PUTのバリデーションエラーを期待)
        it('should fall through to PUT and return 400 if diary exists and POST request has no content (due to fallthrough)', async () => {
            // 最初に日記を作成
            await prisma.diary.create({
                data: { content: '既存の日記', date: today },
            });

            const { req, res } = createMocks({
                method: 'POST', // 既存データに対して再度POST
                body: {}, // contentなし
            });

            await handler(req, res);
            // フォールスルーしてPUTのcontentバリデーションに引っかかることを期待
            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // シナリオ2: 既存データがあり、リクエストボディにcontentがある場合 (PUTの更新処理が実行されることを期待)
        it('should fall through to PUT and return 200 (update) if diary exists and POST request has content (due to fallthrough)', async () => {
            // 最初に日記を作成
            await prisma.diary.create({
                data: { content: '既存の日記', date: today },
            });

            const { req, res } = createMocks({
                method: 'POST', // 既存データに対して再度POST
                body: { content: 'POST経由で更新された日記' },
            });

            await handler(req, res);
            // フォールスルーしてPUTの更新処理が実行されることを期待
            expect(res._getStatusCode()).toBe(200);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe('POST経由で更新された日記');

            const dbEntry = await prisma.diary.findUnique({ where: { date: today } });
            expect(dbEntry?.content).toBe('POST経由で更新された日記');
        });
    });

    // --- PUT /api/diary ---
    describe('PUT /api/diary', () => {
        // Test ID: PUT-001
        it('should return 200 and update the diary entry if it exists', async () => {
            await prisma.diary.create({
                data: { content: '更新前内容', date: today },
            });

            const { req, res } = createMocks({
                method: 'PUT',
                body: {
                    content: '更新された日記です。',
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(200);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe('更新された日記です。');

            const dbEntry = await prisma.diary.findUnique({ where: { date: today } });
            expect(dbEntry?.content).toBe('更新された日記です。');
        });

        // Test ID: PUT-002
        it('should return 400 if content is empty for update', async () => {
            await prisma.diary.create({
                data: { content: '更新前内容', date: today },
            });
            const { req, res } = createMocks({
                method: 'PUT',
                body: {
                    content: '',
                },
            });
            await handler(req, res);
            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // Test ID: PUT-003
        it('should return 400 if content is not provided for update', async () => {
            await prisma.diary.create({
                data: { content: '更新前内容', date: today },
            });
            const { req, res } = createMocks({
                method: 'PUT',
                body: {},
            });
            await handler(req, res);
            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });


        // Test ID: PUT-004
        it('should return 400 if content is longer than 140 chars for update', async () => {
            await prisma.diary.create({
                data: { content: '更新前内容', date: today },
            });
            const longContent = 'b'.repeat(141);
            const { req, res } = createMocks({
                method: 'PUT',
                body: {
                    content: longContent,
                },
            });
            await handler(req, res);
            expect(res._getStatusCode()).toBe(400);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Content is required and max 140 chars' });
        });

        // Test ID: PUT-005
        it('should return 200 if content is exactly 140 chars for update', async () => {
            await prisma.diary.create({
                data: { content: '更新前内容', date: today },
            });
            const content = 'b'.repeat(140);
            const { req, res } = createMocks({
                method: 'PUT',
                body: {
                    content: content,
                },
            });
            await handler(req, res);
            expect(res._getStatusCode()).toBe(200);
            const responseData = JSON.parse(res._getData());
            expect(responseData.content).toBe(content);
        });

        // Test ID: PUT-006
        it('should return 404 if diary entry to update does not exist', async () => {
            const { req, res } = createMocks({
                method: 'PUT',
                body: {
                    content: '存在しない日記の更新',
                },
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(404);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Diary entry not found for today' });
        });
    });

    // --- DELETE /api/diary ---
    describe('DELETE /api/diary', () => {
        // Test ID: DEL-001
        it('should return 204 and delete the diary entry if it exists', async () => {
            await prisma.diary.create({
                data: { content: '削除される日記', date: today },
            });

            const { req, res } = createMocks({
                method: 'DELETE',
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(204);
            expect(res._getData()).toBe(''); // No content

            const dbEntry = await prisma.diary.findUnique({ where: { date: today } });
            expect(dbEntry).toBeNull();
        });

        // Test ID: DEL-002
        it('should return 204 even if no diary entry exists to delete', async () => {
            const { req, res } = createMocks({
                method: 'DELETE',
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(204);
            expect(res._getData()).toBe('');
        });
    });

    // --- Other HTTP Methods ---
    describe('Other HTTP Methods', () => {
        // Test ID: OTH-001
        it('should return 405 for disallowed HTTP methods like PATCH', async () => {
            const { req, res } = createMocks({
                method: 'PATCH' as RequestMethod, // キャストしてPATCHを許可
                body: {
                    content: 'some content',
                }
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(405);
            expect(res._getHeaders().allow).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
            expect(res._getData().toString().trim()).toBe(`Method PATCH Not Allowed`);
        });
    });

    // --- Error Handling ---
    describe('Error Handling', () => {
        // Test ID: ERR-001 (GET)
        it('should return 500 if Prisma fails during GET', async () => {
            const findUniqueMock = jest.spyOn(prisma.diary, 'findUnique').mockRejectedValueOnce(new Error('Simulated DB Error'));

            const { req, res } = createMocks({ method: 'GET' });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            findUniqueMock.mockRestore();
        });

        // Test ID: ERR-001 (POST - findUnique part)
        it('should return 500 if Prisma fails during POST (findUnique)', async () => {
            const findUniqueMock = jest.spyOn(prisma.diary, 'findUnique').mockRejectedValueOnce(new Error('Simulated DB Error'));

            const { req, res } = createMocks({
                method: 'POST',
                body: { content: 'test' }
            });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            findUniqueMock.mockRestore();
        });

        // Test ID: ERR-001 (POST - create part)
        it('should return 500 if Prisma fails during POST (create)', async () => {
            // findUniqueは成功するが、createで失敗するケース
            jest.spyOn(prisma.diary, 'findUnique').mockResolvedValueOnce(null);
            const createMock = jest.spyOn(prisma.diary, 'create').mockRejectedValueOnce(new Error('Simulated DB Error'));

            const { req, res } = createMocks({
                method: 'POST',
                body: { content: 'test' }
            });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            createMock.mockRestore();
            jest.spyOn(prisma.diary, 'findUnique').mockRestore();
        });


        // Test ID: ERR-001 (PUT - findUnique part)
        it('should return 500 if Prisma fails during PUT (findUnique)', async () => {
            const findUniqueMock = jest.spyOn(prisma.diary, 'findUnique').mockRejectedValueOnce(new Error('Simulated DB Error'));

            const { req, res } = createMocks({
                method: 'PUT',
                body: { content: 'test update' }
            });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            findUniqueMock.mockRestore();
        });

        // Test ID: ERR-001 (PUT - update part)
        it('should return 500 if Prisma fails during PUT (update)', async () => {
             // findUniqueは成功するが、updateで失敗するケース
            jest.spyOn(prisma.diary, 'findUnique').mockResolvedValueOnce({id: 'some-id', date: today, content: 'old content', createdAt: new Date(), updatedAt: new Date()});
            const updateMock = jest.spyOn(prisma.diary, 'update').mockRejectedValueOnce(new Error('Simulated DB Error'));


            const { req, res } = createMocks({
                method: 'PUT',
                body: { content: 'test update' }
            });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            updateMock.mockRestore();
            jest.spyOn(prisma.diary, 'findUnique').mockRestore();
        });


        // Test ID: ERR-001 (DELETE)
        it('should return 500 if Prisma fails during DELETE', async () => {
            const deleteManyMock = jest.spyOn(prisma.diary, 'deleteMany').mockRejectedValueOnce(new Error('Simulated DB Error'));

            const { req, res } = createMocks({ method: 'DELETE' });
            await handler(req, res);

            expect(res._getStatusCode()).toBe(500);
            expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });

            deleteManyMock.mockRestore();
        });
    });
});