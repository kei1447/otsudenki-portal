'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPartners } from '../../partners/actions';
import { getInventoryForAdjustment, adjustInventory } from '../actions';

type InventoryItem = {
    product_id: number;
    product_code: string | null;
    name: string;
    color_text: string | null;
    stock_raw: number;
    stock_finished: number;
    stock_defective: number;
};

type Partner = {
    id: string;
    name: string;
    partner_code: string | null;
};

export default function InventoryAdjustmentPage() {
    const router = useRouter();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [editedInventory, setEditedInventory] = useState<Record<number, Partial<InventoryItem>>>({});
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 取引先リスト読み込み
    useEffect(() => {
        const loadPartners = async () => {
            const data = await getPartners();
            setPartners(data);
        };
        loadPartners();
    }, []);

    // 在庫データ読み込み
    const loadInventory = useCallback(async () => {
        if (!selectedPartnerId) {
            setInventory([]);
            return;
        }
        setIsLoading(true);
        const data = await getInventoryForAdjustment(selectedPartnerId);
        setInventory(data);
        setEditedInventory({});
        setIsLoading(false);
    }, [selectedPartnerId]);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    // 入力変更ハンドラ
    const handleChange = (productId: number, field: keyof InventoryItem, value: string) => {
        const numValue = parseInt(value) || 0;
        setEditedInventory((prev) => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: numValue,
            },
        }));
    };

    // 現在の値を取得（編集済みなら編集値、そうでなければ元値）
    const getValue = (item: InventoryItem, field: keyof InventoryItem) => {
        if (editedInventory[item.product_id]?.[field] !== undefined) {
            return editedInventory[item.product_id][field];
        }
        return item[field];
    };

    // 変更があるかチェック
    const hasChanges = (item: InventoryItem) => {
        const edited = editedInventory[item.product_id];
        if (!edited) return false;
        return (
            (edited.stock_raw !== undefined && edited.stock_raw !== item.stock_raw) ||
            (edited.stock_finished !== undefined && edited.stock_finished !== item.stock_finished) ||
            (edited.stock_defective !== undefined && edited.stock_defective !== item.stock_defective)
        );
    };

    // 保存処理
    const handleSave = async () => {
        const changedItems = inventory.filter(hasChanges);
        if (changedItems.length === 0) {
            alert('変更がありません');
            return;
        }

        if (!confirm(`${changedItems.length}件の在庫を調整しますか？`)) return;

        setIsSubmitting(true);
        const adjustments = changedItems.map((item) => ({
            productId: item.product_id,
            stock_raw: (editedInventory[item.product_id]?.stock_raw ?? item.stock_raw) as number,
            stock_finished: (editedInventory[item.product_id]?.stock_finished ?? item.stock_finished) as number,
            stock_defective: (editedInventory[item.product_id]?.stock_defective ?? item.stock_defective) as number,
        }));

        const res = await adjustInventory(selectedPartnerId, adjustments, reason || undefined);
        alert(res.message);

        if (res.success) {
            setEditedInventory({});
            setReason('');
            loadInventory();
            router.refresh();
        }
        setIsSubmitting(false);
    };

    // リセット
    const handleReset = () => {
        setEditedInventory({});
        setReason('');
    };

    const changedCount = inventory.filter(hasChanges).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">在庫調整</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        期首在庫設定や棚卸差異調整に使用します
                    </p>
                </div>
            </div>

            {/* 取引先選択 */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    取引先を選択
                </label>
                <select
                    className="w-full md:w-1/2 border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                >
                    <option value="">-- 取引先を選択してください --</option>
                    {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.partner_code ? `[${p.partner_code}] ` : ''}
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 在庫テーブル */}
            {selectedPartnerId && (
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700">
                            製品一覧
                            {changedCount > 0 && (
                                <span className="ml-2 text-sm text-orange-600">
                                    ({changedCount}件 変更あり)
                                </span>
                            )}
                        </h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="調整理由（任意）"
                                className="border border-gray-300 rounded px-3 py-1 text-sm w-48"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                            <button
                                onClick={handleReset}
                                className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                            >
                                リセット
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSubmitting || changedCount === 0}
                                className="px-4 py-1 bg-indigo-600 text-white font-bold rounded text-sm hover:bg-indigo-500 disabled:opacity-50"
                            >
                                保存
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : inventory.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            この取引先には製品が登録されていません
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                                            品番
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                                            品名
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                                            色
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-28">
                                            部材在庫
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-28">
                                            完成品在庫
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-28">
                                            不良在庫
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {inventory.map((item) => {
                                        const changed = hasChanges(item);
                                        return (
                                            <tr
                                                key={item.product_id}
                                                className={changed ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                                            >
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                    {item.product_code || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-800">
                                                    {item.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {item.color_text || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`w-full text-center border rounded px-2 py-1 text-sm ${editedInventory[item.product_id]?.stock_raw !== undefined &&
                                                            editedInventory[item.product_id]?.stock_raw !== item.stock_raw
                                                            ? 'border-orange-400 bg-orange-50'
                                                            : 'border-gray-300'
                                                            }`}
                                                        value={getValue(item, 'stock_raw') ?? 0}
                                                        onChange={(e) =>
                                                            handleChange(item.product_id, 'stock_raw', e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`w-full text-center border rounded px-2 py-1 text-sm ${editedInventory[item.product_id]?.stock_finished !== undefined &&
                                                            editedInventory[item.product_id]?.stock_finished !== item.stock_finished
                                                            ? 'border-orange-400 bg-orange-50'
                                                            : 'border-gray-300'
                                                            }`}
                                                        value={getValue(item, 'stock_finished') ?? 0}
                                                        onChange={(e) =>
                                                            handleChange(item.product_id, 'stock_finished', e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`w-full text-center border rounded px-2 py-1 text-sm ${editedInventory[item.product_id]?.stock_defective !== undefined &&
                                                            editedInventory[item.product_id]?.stock_defective !== item.stock_defective
                                                            ? 'border-orange-400 bg-orange-50'
                                                            : 'border-gray-300'
                                                            }`}
                                                        value={getValue(item, 'stock_defective') ?? 0}
                                                        onChange={(e) =>
                                                            handleChange(item.product_id, 'stock_defective', e.target.value)
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
