'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type Partner = {
    id: string;
    name: string;
};

type Props = {
    partners: Partner[];
    selectedPartnerId?: string;
};

export default function PartnerSelector({ partners, selectedPartnerId }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleChange = (partnerId: string) => {
        router.push(pathname + '?' + createQueryString('partner_id', partnerId));
    };

    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-gray-600">操作対象:</label>
            <select
                className="border rounded px-3 py-2 bg-white shadow-sm min-w-[200px]"
                value={selectedPartnerId || ''}
                onChange={(e) => handleChange(e.target.value)}
            >
                <option value="">すべての取引先</option>
                {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
