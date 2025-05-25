'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"

export default function EditDiaryPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params || {}

  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDiary = async () => {
      if (!id) return
      const res = await fetch(`/api/diary/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.content || "")
      } else {
        setError("日記が見つかりません")
      }
      setLoading(false)
    }
    fetchDiary()
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    const res = await fetch(`/api/diary/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      router.push("/diary")
    } else {
      const data = await res.json()
      setError(data.error || "更新に失敗しました")
    }
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">日記を編集</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full p-2 border rounded text-black"
          placeholder="たっぷり書いてください"
        />
        {error && <p className="text-red-500">{error}</p>}
        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            更新する
          </button>
          <button
            type="button"
            onClick={() => router.push("/diary")}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            キャンセル
          </button>
        </div>
      </form>
    </main>
  )
}
