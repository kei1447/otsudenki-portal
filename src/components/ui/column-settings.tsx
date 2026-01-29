'use client';

import { useState, useEffect } from 'react';

// 列の定義
export type ColumnDefinition = {
    id: string;
    label: string;
    defaultVisible: boolean;
}

// フックの戻り値
type UseColumnSettingsResult = {
    visibleColumns: string[];
    isColumnVisible: (columnId: string) => boolean;
    toggleColumn: (columnId: string) => void;
    setAllColumns: (columnIds: string[]) => void;
    resetToDefault: () => void;
}

// ローカルストレージのキー
const STORAGE_KEY_PREFIX = 'otsudenki_table_columns_';

/**
 * テーブル列の表示設定を管理するカスタムフック
 * @param tableId テーブルの一意識別子
 * @param columns 列の定義配列
 */
export function useColumnSettings(
    tableId: string,
    columns: ColumnDefinition[]
): UseColumnSettingsResult {
    const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;

    // デフォルトの可視列
    const defaultVisibleColumns = columns
        .filter(c => c.defaultVisible)
        .map(c => c.id);

    const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns);

    // 初回マウント時にローカルストレージから読み込み
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as string[];
                // 有効なカラムIDのみをフィルター
                const validIds = new Set(columns.map(c => c.id));
                const filtered = parsed.filter(id => validIds.has(id));
                if (filtered.length > 0) {
                    setVisibleColumns(filtered);
                }
            }
        } catch (e) {
            console.warn('Failed to load column settings:', e);
        }
    }, [storageKey, columns]);

    // 変更時にローカルストレージに保存
    const saveToStorage = (cols: string[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(cols));
        } catch (e) {
            console.warn('Failed to save column settings:', e);
        }
    };

    const isColumnVisible = (columnId: string): boolean => {
        return visibleColumns.includes(columnId);
    };

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => {
            const newValue = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];
            saveToStorage(newValue);
            return newValue;
        });
    };

    const setAllColumns = (columnIds: string[]) => {
        setVisibleColumns(columnIds);
        saveToStorage(columnIds);
    };

    const resetToDefault = () => {
        setVisibleColumns(defaultVisibleColumns);
        saveToStorage(defaultVisibleColumns);
    };

    return {
        visibleColumns,
        isColumnVisible,
        toggleColumn,
        setAllColumns,
        resetToDefault,
    };
}

/**
 * 列設定UI
 */
type ColumnSettingsButtonProps = {
    columns: ColumnDefinition[];
    visibleColumns: string[];
    onToggle: (columnId: string) => void;
    onReset: () => void;
}

export function ColumnSettingsButton({
    columns,
    visibleColumns,
    onToggle,
    onReset,
}: ColumnSettingsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                title="表示列を設定"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                列設定
            </button>

            {isOpen && (
                <>
                    {/* オーバーレイ */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* ドロップダウン */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b">
                            <span className="font-bold text-sm text-gray-700">表示する列</span>
                            <button
                                onClick={() => {
                                    onReset();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                初期設定に戻す
                            </button>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {columns.map(col => (
                                <label
                                    key={col.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col.id)}
                                        onChange={() => onToggle(col.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
