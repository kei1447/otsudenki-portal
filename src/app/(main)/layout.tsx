import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // ログインユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 万が一ログインしていない場合は弾く
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 左側：サイドバー */}
      <Sidebar user={user} />

      {/* 右側：メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
