import { useLeaveGuardStore } from '@/contexts/stores/leaveGuardStore'

export const LEAVE_PROMPT = 'Leave this page? The video you uploaded won’t be kept.'

// In-app navigation asks with the browser's own dialog, as a reload or a closed tab does (useLeaveGuard).
export const isLeaveConfirmed = (): boolean => !useLeaveGuardStore.getState().isGuarded || window.confirm(LEAVE_PROMPT)
