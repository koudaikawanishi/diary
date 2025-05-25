// pages/api/diary/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const diary = await prisma.diary.findUnique({
          where: { id: Number(id) },
        })

        if (!diary) {
          return res.status(404).json({ error: 'Diary not found' })
        }

        return res.status(200).json(diary)
      }

      case 'PUT': {
        const { content } = req.body
        if (!content) {
          return res.status(400).json({ error: 'Content is required' })
        }

        const updated = await prisma.diary.update({
          where: { id: Number(id) },
          data: { content },
        })

        return res.status(200).json(updated)
      }

      case 'DELETE': {
        await prisma.diary.delete({
          where: { id: Number(id) },
        })

        return res.status(204).end()
      }

      default:
        res.setHeader('Allow', ['PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
