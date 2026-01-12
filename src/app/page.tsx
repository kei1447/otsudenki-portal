import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  
  // 試しにパートナーテーブルを読み込んでみる（まだデータは空ですがエラーが出ないか確認）
  const { data: partners, error } = await supabase.from('partners').select('*')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Otsu Denki Portal</h1>
      <div className="bg-gray-100 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">DB接続テスト</h2>
        {error ? (
          <p className="text-red-500">エラー発生: {error.message}</p>
        ) : (
          <p className="text-green-600">
            接続成功！現在の取引先登録数: <strong>{partners?.length ?? 0}</strong> 件
          </p>
        )}
      </div>
    </div>
  )
}