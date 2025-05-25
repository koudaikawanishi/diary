import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // 今日の日付をセット
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (req.method) {

            case 'GET':
                // 今日の日記を取得
                const diaries = await prisma.diary.findMany({
                orderBy: { id: 'desc' },
                });
                return res.status(200).json(diaries);
            
            case 'POST': {
                // 日記の作成
                const { content } = req.body;
                if (!content) {
                    return res.status(400).json({
                        error: 'Content is required'
                    });
                }

                // 新規作成
                const created = await prisma.diary.create({
                    data: { content, date: today },
                });
                return res.status(201).json(created);
            }
                
            // case 'PUT': {
            //     const { content } = req.body;
            //     if (!content || content.length > 140) {
            //         return res.status(400).json({
            //         error: 'Content is required and max 140 chars',
            //         });
            //     };

            //     // 今日の日記があるか確認
            //     const existing = await prisma.diary.findUnique({
            //         where: { date: today }
            //     });

            //     if (existing) {
            //         // 更新
            //         const updated = await prisma.diary.update({
            //             where: { date: today },
            //             data: { content },  // 更新したいフィールドを指定
            //         });
            //         return res.status(200).json(updated);
            //     }else {
            //         return res.status(404).json({
            //             error: 'Diary entry not found for today',
            //         });
            //     }
            // }
            
            case 'DELETE':
                // 今日の日記を削除
                await prisma.diary.deleteMany({
                    where: { date: today },
                });
                return res.status(204).end();
            
            default:
                res.setHeader('Allow',['GET','POST','PUT','DELETE']);
                res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error: unknown) {
        res.status(500).json({
            error: 'Internal server error'
        });

        if (error instanceof Error) {
            console.error(error.message);
        } else if (error) {
            console.error(error);
        } else {
            console.error('Unknown error');
        }
    }
}