import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST /api/staff/create
//
// Remplace l'ancien flux client (supabase.auth.signUp() appelé depuis le
// navigateur du owner) qui pouvait faire basculer la session active du
// navigateur vers le nouveau compte caissier. Ici, la création du compte se
// fait exclusivement côté serveur avec la clé service_role — la session du
// owner qui appelle cette route n'est jamais touchée.
//
// Toute donnée sensible (owner_email, statut actif) est dérivée du PROFIL DU
// SERVEUR de l'appelant (retrouvé via son cookie de session), jamais d'un
// champ envoyé dans le corps de la requête.
export async function POST(request) {
  try {
    const { name, email, password, phone } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
    }

    // 1. Identifier l'appelant à partir de son cookie de session Supabase.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Aucune écriture de cookie nécessaire pour un simple appel API.
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // 2. Vérifier que l'appelant est bien un owner actif — jamais un cashier,
    // jamais un compte suspendu. C'est cette vérification, pas le code
    // client, qui fait foi.
    const { data: callerProfile, error: profileError } = await supabase
      .from('restaurants')
      .select('role, is_active, owner_email, location')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.role !== 'owner' || !callerProfile.is_active) {
      return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 });
    }

    // 3. Créer le compte auth du caissier avec la clé service_role. Ce client
    // admin est isolé (persistSession: false) : il ne peut pas écraser la
    // session du navigateur appelant.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim(), role: 'cashier', phone: phone || null },
    });

    if (createError) {
      console.error('Erreur création auth caissier:', createError);
      return NextResponse.json(
        { error: "Impossible de créer ce compte (email déjà utilisé ?)." },
        { status: 400 }
      );
    }

    // 4. Créer le profil restaurants rattaché — owner_email vient du profil
    // serveur de l'appelant, jamais du corps de la requête.
    const { error: insertError } = await supabaseAdmin.from('restaurants').insert([{
      id: created.user.id,
      name: name.trim(),
      owner_email: callerProfile.owner_email,
      role: 'cashier',
      location: callerProfile.location,
      is_active: true,
    }]);

    if (insertError) {
      console.error('Erreur création profil caissier:', insertError);
      // Rollback : on supprime le compte auth orphelin plutôt que de laisser
      // un utilisateur sans profil restaurant.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: 'Impossible de créer le profil caissier.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur /api/staff/create:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
