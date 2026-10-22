// The pages wrapped in PrivateRoute: signing out on one of them leaves it for the home page.
const GUARDED_PATHS = ['/account', '/admin', '/analyses', '/history']

export const isGuardedPath = (pathname: string): boolean =>
    GUARDED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
