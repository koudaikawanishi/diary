'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Pencil, Plus } from "lucide-react"

type Diary = {
  id: number
  content: string
  date: string
  createdAt: string
}

export default function DiaryPage() {
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDiaries()
  }, [])

  const fetchDiaries = async () => {
    const res = await fetch('/api/diary', { cache: 'no-store' })
    const data = await res.json()
    setDiaries(data)
    setLoading(false)
  }

  const deleteDiary = async (id: number) => {
    const confirmDelete = confirm('この日記を削除しますか？')
    if (!confirmDelete) return

    await fetch(`/api/diary/${id}`, {
      method: 'DELETE',
    })

    fetchDiaries()
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">日記帳</h1>
        <button
          onClick={() => router.push('/diary/new')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          <Plus size={15} />
        </button>
      </div>

      {diaries.length === 0 ? (
        <p>日記がまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {diaries.map((diary) => (
            <li key={diary.id} className="border rounded p-4 relative">
              <p className="text-gray-700">{diary.content}</p>
              <p className="text-sm text-gray-500 mt-2">
                作成日: {new Date(diary.createdAt).toLocaleString()}
              </p>
                  {/* 編集・削除ボタンを右下に配置 */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                    onClick={() => router.push(`/diary/edit/${diary.id}`)}
                    className="text-gray-400 hover:text-blue-500"
                >
                    <Pencil size={20} />
                </button>
                {/* ゴミ箱アイコン */}
                <button
                    onClick={() => deleteDiary(diary.id)}
                    className="text-gray-400 hover:text-red-600"
                >
                    <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
