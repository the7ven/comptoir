import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Routes qui exigent une session Supabase valide.
// Le contrôle fin des rôles (owner/cashier/is_super_admin) reste géré
// par les pages elles-mêmes + les policies RLS : ce middleware ne fait
// qu'empêcher un visiteur non authentifié d'atteindre ces routes.
const PROTECTED_PATHS = ['/dashboard', '/admin'];

export async function proxy(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si les variables d'env sont absentes, on ne bloque pas le build/dev
  // mais on laisse passer sans session (les pages redirigeront elles-mêmes).
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT : getUser() (et non getSession()) revalide le token auprès
  // de Supabase Auth plutôt que de faire confiance au cookie tel quel.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
