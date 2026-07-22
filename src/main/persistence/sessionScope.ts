let activeScope = 'offline'

export function setSessionScope(scope: string): void {
  activeScope = scope.trim() || 'offline'
}

export function getSessionScope(): string {
  return activeScope
}

export function userScopeKey(userId: string): string {
  return `user:${userId}`
}
