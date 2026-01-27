import Link from 'next/link';
import { getDashboardMetrics } from './inventory/actions';

export default async function Home() {
  const metrics = await getDashboardMetrics();

  // Helper for formatting currency
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl space-y-8">

        {/* Header */}
        <div className="text-center sm:text-left border-b pb-6 border-gray-200">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
            <span className="block text-lg font-medium text-gray-500 mt-1">Otsu Denki Portal</span>
          </h1>
        </div>

        {/* 1. KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Today's Sales */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border-l-4 border-blue-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">本日の出荷実績</dt>
                    <dd>
                      <div className="text-2xl font-bold text-gray-900">¥{fmt(metrics.today.amount)}</div>
                      <div className="text-sm text-gray-500">{metrics.today.count} 件</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 px-5 py-3">
              <div className="text-sm text-blue-700">
                <span className="font-bold">{metrics.today.date}</span> (JST)
              </div>
            </div>
          </div>

          {/* Monthly Sales */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border-l-4 border-green-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">今月の売上 ({metrics.month.yyyymm})</dt>
                    <dd>
                      <div className="text-2xl font-bold text-gray-900">¥{fmt(metrics.month.amount)}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-green-50 px-5 py-3">
              <div className="text-sm text-green-700">
                今月残り日数: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}日
              </div>
            </div>
          </div>

          {/* System Status (Dummy for layout balance) */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border-l-4 border-purple-500 hidden lg:block">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">システム状態</dt>
                    <dd>
                      <div className="text-lg font-bold text-green-600">正常稼働中</div>
                      <div className="text-sm text-gray-500">Version: 2026.01.27</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick Actions */}
        <div>
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">クイックアクション (業務メニュー)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link href="/inventory" className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📥</span>
              <span className="font-bold text-gray-700">部材受入</span>
            </Link>
            <Link href="/inventory" className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🏭</span>
              <span className="font-bold text-gray-700">加工実績</span>
            </Link>
            <Link href="/inventory" className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🚚</span>
              <span className="font-bold text-gray-700">出荷登録</span>
            </Link>
            <Link href="/partners" className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🏢</span>
              <span className="font-bold text-gray-700">取引先管理</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3. Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">最近の動き (Activity)</h3>
            </div>
            <ul className="divide-y divide-gray-200 max-h-[400px] overflow-auto">
              {metrics.recentMovements.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-500 text-center">履歴がありません</li>
              )}
              {metrics.recentMovements.map((m: any) => (
                <li key={m.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.products?.name} <span className="text-gray-400 font-normal">({m.products?.product_code})</span>
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${m.movement_type === 'shipping' ? 'bg-green-100 text-green-800' :
                          m.movement_type === 'repair' ? 'bg-blue-100 text-blue-800' :
                            m.movement_type === 'dispose' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}>
                        {m.movement_type}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {m.quantity_change > 0 ? '+' : ''}{m.quantity_change.toLocaleString()} items
                        {m.reason && <span className="ml-2 text-xs bg-gray-100 px-1 rounded truncate max-w-[150px]">{m.reason}</span>}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-500 sm:mt-0">
                      <p>{new Date(m.created_at).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Recent Shipments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">最近の出荷 (Shipments)</h3>
            </div>
            <ul className="divide-y divide-gray-200 max-h-[400px] overflow-auto">
              {metrics.recentShipments.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-500 text-center">履歴がありません</li>
              )}
              {metrics.recentShipments.map((s: any) => (
                <li key={s.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{s.partners?.name}</p>
                      <p className="text-xs text-gray-500">出荷日: {s.shipment_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">¥{fmt(s.total_amount)}</p>
                      <Link href={`/shipments/${s.id}/print`} className="text-xs text-blue-600 hover:underline">
                        納品書印刷
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <Link href="/inventory" className="text-sm text-blue-600 font-bold hover:underline">すべての履歴は在庫管理画面へ &rarr;</Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
