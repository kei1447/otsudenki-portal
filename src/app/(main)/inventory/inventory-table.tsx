'use client';

import { useState, useMemo } from 'react';

type ProductBase = {
    id: string; // or number depending on DB
    product_code: string;
    name: string;
    color_text?: string;
};

type Props<T extends ProductBase> = {
    products: T[];
    renderRow: (product: T) => React.ReactNode;
    placeholder?: string;
};

export default function InventoryTable<T extends ProductBase>({
    products,
    renderRow,
    placeholder = '品番・品名・色で検索...',
}: Props<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<'product_code' | 'name'>('product_code');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    // フィルタリング
    const filtered = useMemo(() => {
        if (!searchTerm) return products;
        const lower = searchTerm.toLowerCase();
        return products.filter((p) =>
            p.product_code.toLowerCase().includes(lower) ||
            p.name.toLowerCase().includes(lower) ||
            (p.color_text && p.color_text.toLowerCase().includes(lower))
        );
    }, [products, searchTerm]);

    // ソート
    const sorted = useMemo(() => {
        const list = [...filtered];
        list.sort((a, b) => {
            const valA = (a[sortKey] || '').toString().toLowerCase();
            const valB = (b[sortKey] || '').toString().toLowerCase();
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }, [filtered, sortKey, order]);

    const handleSort = (key: 'product_code' | 'name') => {
        if (sortKey === key) {
            setOrder(order === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setOrder('asc');
        }
    };

    const Arrow = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => {
        if (!active) return <span className="text-gray-300 ml-1">⇅</span>;
        return <span className="text-blue-600 ml-1">{dir === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className="space-y-4">
            {/* 検索バー */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="border rounded px-3 py-2 w-full max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="text-sm text-gray-500">
                    {sorted.length} 件表示
                </div>
            </div>

            {/* テーブル */}
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('product_code')}
                                style={{ width: '120px' }}
                            >
                                品番 <Arrow active={sortKey === 'product_code'} dir={order} />
                            </th>
                            <th
                                className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('name')}
                                style={{ width: '200px' }}
                            >
                                品名 <Arrow active={sortKey === 'name'} dir={order} />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ width: '160px' }}>
                                色・仕様
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                操作入力
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sorted.map((item) => renderRow(item))}
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                    データが見つかりません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
