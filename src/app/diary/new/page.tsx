'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewDiaryPage() {
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      router.push('/diary') // 登録後、一覧に戻る
    } else {
      const data = await res.json()
      setError(data.error || "登録に失敗しました")
    }
  }

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">日記を書く</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            登録する
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
