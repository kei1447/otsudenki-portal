'use client'

import { useState } from 'react'
import { updateUserRole } from './actions'

type Profile = {
  id: string
  email: string | null
  role: string
  created_at: string
}

export default function UserList({ 
  profiles, 
  currentUserRole 
}: { 
  profiles: Profile[], 
  currentUserRole: string 
}) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`権限を "${newRole}" に変更しますか？`)) return

    setIsUpdating(true)
    const result = await updateUserRole(userId, newRole)
    setIsUpdating(false)

    if (result.success) {
      alert(result.message)
    } else {
      alert(result.message)
    }
  }

  // 権限ラベルの変換ヘルパー
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者 (Admin)'
      case 'manager': return '承認者 (Manager)'
      case 'staff': return '一般 (Staff)'
      default: return role
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">現在の権限</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">権限変更</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {profiles.map((profile) => (
            <tr key={profile.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                {profile.email || '(No Email)'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  profile.role === 'admin' ? 'bg-purple-50 text-purple-700 ring-purple-700/10' :
                  profile.role === 'manager' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                  'bg-gray-50 text-gray-600 ring-gray-500/10'
                }`}>
                  {getRoleLabel(profile.role)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                {currentUserRole === 'admin' ? (
                  <select
                    value={profile.role}
                    onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                    disabled={isUpdating}
                    className="block w-full rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="staff">一般 (Staff)</option>
                    <option value="manager">承認者 (Manager)</option>
                    <option value="admin">管理者 (Admin)</option>
                  </select>
                ) : (
                  <span className="text-gray-400 text-xs">変更不可</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(profile.created_at).toLocaleDateString('ja-JP')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {profiles.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          ユーザーが見つかりません
        </div>
      )}
    </div>
  )
}