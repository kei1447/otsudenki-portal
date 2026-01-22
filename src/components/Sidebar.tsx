'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type User = {
  email?: string;
};

export default function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // --- ステート管理 ---
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // 初期化時にlocalStorageからピン留め設定を読み込む
  useEffect(() => {
    const savedPin = localStorage.getItem('sidebar-pinned');
    if (savedPin !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPinned(savedPin === 'true');
    }
  }, []);

  // ピン留め切り替え
  const togglePin = () => {
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem('sidebar-pinned', String(newState));
  };

  // ログアウト処理
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // 表示状態の判定
  const isExpanded = isPinned || isHovered;

  // --- メニュー定義 (グループ化) ---
  const menuGroups = [
    {
      title: null, // タイトルなし (ホームなど)
      items: [
        {
          name: 'ホーム',
          href: '/',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          ),
        },
      ],
    },
    {
      title: '販売・製造', // 業務系グループ
      items: [
        {
          name: '業務管理',
          href: '/inventory',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          ),
        },
        {
          name: '納品書管理',
          href: '/shipments',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          ),
        },
        {
          name: '請求書発行',
          href: '/invoices',
          // ★追加: 請求書
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        },
        {
          name: '在庫調整',
          href: '/inventory/adjustment',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          ),
        },
      ],
    },
    {
      title: 'マスタ管理', // 設定系グループ
      items: [
        {
          name: '取引先マスタ',
          href: '/partners',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          ),
        },
        {
          name: '製品マスタ',
          href: '/products',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          ),
        },
        {
          name: '製品単価リスト',
          href: '/prices',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        },
        {
          name: 'ユーザー管理',
          href: '/users',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
            />
          ),
        },
      ],
    },
  ];

  return (
    <div
      className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-16'
        } relative z-20`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ヘッダー */}
      <div className="flex h-16 items-center justify-between px-4 bg-gray-800 flex-shrink-0">
        {isExpanded ? (
          <span className="text-xl font-bold tracking-wider truncate">
            Otsu Denki
          </span>
        ) : (
          <span className="text-xl font-bold mx-auto">OD</span>
        )}

        {isExpanded && (
          <button
            onClick={togglePin}
            className={`p-1 rounded-md hover:bg-gray-700 transition-colors ${isPinned ? 'text-indigo-400' : 'text-gray-400'}`}
            title={isPinned ? 'サイドバーを固定解除' : 'サイドバーを固定'}
          >
            {isPinned ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* メニューリスト */}
      <nav className="flex-1 py-4 px-2 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {/* グループタイトル (展開時のみ表示) */}
            {group.title && isExpanded && (
              <p className="px-3 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {/* 区切り線 (縮小時はタイトル代わり) */}
            {group.title && !isExpanded && (
              <div className="my-2 border-t border-gray-700 mx-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                  >
                    <div
                      className={`min-w-[1.25rem] w-5 h-5 flex items-center justify-center ${isActive ? 'text-white' : 'text-gray-400'}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        {item.icon}
                      </svg>
                    </div>
                    <span
                      className={`ml-3 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* フッター */}
      <div className="border-t border-gray-800 p-4 flex-shrink-0">
        <div
          className={`flex items-center ${!isExpanded ? 'justify-center' : ''}`}
        >
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          {isExpanded && (
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-white truncate max-w-[10rem]">
                {user?.email}
              </p>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-white mt-1"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
