'use client';

import { STAMP_GOAL } from '@/lib/constants';
import type { CustomerOverview } from '@/lib/types';

/** 뒤 4자리가 같은 고객이 여러 명일 때 고르는 팝업 */
export default function CustomerPicker({
  candidates,
  onPick,
  onClose,
}: {
  candidates: CustomerOverview[];
  onPick: (c: CustomerOverview) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-white p-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-deep">
          같은 뒤 4자리 고객이 <span className="tabular-nums">{candidates.length}</span>명입니다 — 고객을 선택해 주세요
        </p>
        <div className="mt-3 space-y-2">
          {candidates.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5 text-left transition-opacity active:opacity-80"
            >
              <span>
                <span className="block text-sm font-bold">{c.name}</span>
                <span className="mt-0.5 block text-xs text-sub tabular-nums">{c.phone}</span>
              </span>
              <span className="text-xs font-semibold text-sub tabular-nums whitespace-nowrap">
                도장 {c.progress}/{STAMP_GOAL}
                {c.coupons > 0 && <span className="text-flag"> · 무료 {c.coupons}회</span>}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-sub"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
