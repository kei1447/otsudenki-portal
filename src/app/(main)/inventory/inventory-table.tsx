'use client';

import { useState, useMemo } from 'react';
import { ColumnSettingsButton, useColumnSettings, type ColumnDefinition } from '@/components/ui/column-settings';

type ProductBase = {
    id: string; // or number depending on DB
    product_code: string;
    name: string;
    color_text?: string;
};

type Props<T extends ProductBase> = {
    products: T[];
    renderRow: (product: T, visibleColumns: string[]) => React.ReactNode;
    placeholder?: string;
    /** カスタムヘッダー行（テーブル全体を独自定義する場合に使用） */
    customHeader?: React.ReactNode;
    /** カラム数（カスタムヘッダー使用時のcolSpan対応） */
    columnCount?: number;
    /** テーブル識別子（列設定の保存に使用） */
    tableId?: string;
    /** 列定義（設定UI用）*/
    columnDefinitions?: ColumnDefinition[];
    /** 列設定を有効にするか */
    enableColumnSettings?: boolean;
};

export default function InventoryTable<T extends ProductBase>({
    products,
    renderRow,
    placeholder = '品番・品名・色で検索...',
    customHeader,
    columnCount = 4,
    tableId = 'default',
    columnDefinitions,
    enableColumnSettings = false,
}: Props<T>) {
    // デフォルトの列定義
    const defaultColumns: ColumnDefinition[] = [
        { id: 'product_code', label: '品番', defaultVisible: true },
        { id: 'name', label: '品名', defaultVisible: true },
        { id: 'color_text', label: '色・仕様', defaultVisible: true },
        { id: 'input', label: '操作入力', defaultVisible: true },
    ];

    const columns = columnDefinitions || defaultColumns;
    const { visibleColumns, isColumnVisible, toggleColumn, resetToDefault } = useColumnSettings(tableId, columns);

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

    // 可視列の数を計算
    const visibleColumnCount = enableColumnSettings ? visibleColumns.length : columnCount;

    // デフォルトヘッダー（customHeaderがない場合、列設定に応じて表示）
    const defaultHeader = (
        <tr>
            {isColumnVisible('product_code') && (
                <th
                    className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('product_code')}
                    style={{ width: '120px' }}
                >
                    品番 <Arrow active={sortKey === 'product_code'} dir={order} />
                </th>
            )}
            {isColumnVisible('name') && (
                <th
                    className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                    style={{ width: '200px' }}
                >
                    品名 <Arrow active={sortKey === 'name'} dir={order} />
                </th>
            )}
            {isColumnVisible('color_text') && (
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ width: '160px' }}>
                    色・仕様
                </th>
            )}
            {isColumnVisible('input') && (
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    操作入力
                </th>
            )}
        </tr>
    );

    return (
        <div className="space-y-4">
            {/* 検索バーと列設定 */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
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

                {enableColumnSettings && (
                    <ColumnSettingsButton
                        columns={columns}
                        visibleColumns={visibleColumns}
                        onToggle={toggleColumn}
                        onReset={resetToDefault}
                    />
                )}
            </div>

            {/* テーブル */}
            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                        {customHeader || defaultHeader}
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sorted.map((item) => renderRow(item, visibleColumns))}
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={visibleColumnCount || 4} className="px-4 py-8 text-center text-gray-400">
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


