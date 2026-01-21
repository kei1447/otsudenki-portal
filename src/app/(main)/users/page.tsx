import { createClient } from '@/utils/supabase/server';
import UserList from './user-list';

export default async function UsersPage() {
  const supabase = await createClient();

  // プロフィール一覧を取得
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-red-500">データ取得エラー: {error.message}</div>
    );
  }

  // 自分の情報を取得（自分がadminかどうか判定するため）
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserRole =
    profiles?.find((p) => p.id === user?.id)?.role || 'staff';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="text-gray-600 mt-2">
          システムを利用するユーザーの権限を設定します。
        </p>
      </div>

      <UserList profiles={profiles || []} currentUserRole={currentUserRole} />
    </div>
  );
}
