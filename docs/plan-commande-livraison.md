# Plan d'implémentation — Commande client à distance + paiement en ligne

**Statut :** brouillon de réflexion, rien n'est codé. À relire à tête reposée.
**Dernière mise à jour :** 2026-08-14

---

## 1. Contexte

Aujourd'hui, Comptoir est un outil **100 % interne** : les commandes sont créées par le staff depuis le dashboard (`MenuTabContent` → `createOrder`), rattachées à une table et à un `owner_email`. Il n'existe :
- aucune route publique / non-authentifiée,
- aucun compte client, aucune donnée de client final dans le schéma,
- aucun encaissement géré par la plateforme elle-même (le staff enregistre un paiement déjà reçu au comptoir).

**Objectif de cette fonctionnalité :** permettre à un client final de passer commande à distance (sans venir en salle), de **payer en ligne au moment de la commande**, et de se faire livrer.

## 2. Décisions actées

| Sujet | Décision |
|---|---|
| Paiement | **Prépaiement en ligne** (Mobile Money / passerelle), pas de paiement à la livraison pour la v1 |
| Qui détient l'argent | Comptoir **ne doit pas** encaisser pour le compte des restaurants (voir §5) — chaque restaurant garde son propre compte marchand |
| Qui livre physiquement | **Non tranché.** Le modèle de données doit rester agnostique de ce choix pour ne pas nécessiter de réécriture plus tard |

## 3. Ce que ça change dans la nature du produit

C'est la première fois que la plateforme :
1. expose une route **publique, non authentifiée**,
2. traite des **données personnelles de client final** (nom, téléphone, adresse) — ce qui rend fausses les CGU/politique de confidentialité rédigées précédemment, qui affirment explicitement le contraire (voir §8),
3. **fait transiter de l'argent** au moment de la commande, ce qui introduit des obligations de rigueur (idempotence, vérification serveur, remboursement) qui n'existaient pas dans le flux actuel (encaissement manuel constaté a posteriori par le staff).

## 4. Parcours cible

**Client (nouveau, public) :**
1. Accède à un lien/QR public propre à chaque restaurant (ex. `comptoir.app/r/[slug-restaurant]`).
2. Consulte le menu (déjà structuré via la table `dishes`, en lecture seule ici).
3. Compose son panier, renseigne : nom, téléphone, adresse de livraison.
4. Paie en ligne (Mobile Money / carte via la passerelle du restaurant).
5. Reçoit une confirmation (SMS/WhatsApp minimum pour la v1 — pas de tracking live requis au départ).

**Restaurant (existant, dashboard) :**
6. La commande apparaît dans `OrdersTabContent`, marquée comme commande "en ligne" et "Payée", avec l'adresse de livraison.
7. Le staff organise la livraison **avec les moyens du bord** tant que le modèle de livraison n'est pas tranché (téléphone, WhatsApp, livreur habituel) — aucun nouvel écran requis pour cette partie en v1.

## 5. Paiement en ligne — le vrai chantier

### 5.1 Qui détient l'argent ?

Deux modèles possibles, décision à confirmer avant de coder quoi que ce soit :

- **Option A — sous-compte marchand par restaurant (recommandé).** Chaque restaurant ouvre son propre compte chez le prestataire de paiement. Comptoir orchestre le checkout avec les identifiants de CE restaurant ; l'argent va directement au restaurant. Comptoir ne touche jamais les fonds → reste un pur éditeur logiciel, cohérent avec les CGU actuelles ("Comptoir n'est pas partie aux transactions").
- **Option B — Comptoir centralise puis reverse.** Comptoir encaisse tout sur un compte unique puis reverse à chaque restaurant. Se rapproche d'un établissement de paiement (agrément potentiellement requis en zone CEMAC/BEAC, KYC des restaurants, gestion de trésorerie de tiers). Beaucoup plus lourd juridiquement et techniquement.

→ **Option A retenue par défaut** pour la suite de ce document, sauf changement d'avis.

### 5.2 Choix de passerelle

Plutôt que d'intégrer Orange Money et MTN Mobile Money séparément (certification marchand distincte pour chacun), privilégier un **agrégateur** couvrant Mobile Money + carte en une seule intégration. Pistes à évaluer sérieusement avant de choisir (frais, fiabilité des webhooks, support, couverture Cameroun) :
- CinetPay
- Notch Pay
- Semoa / Smobilpay

**Critères d'évaluation à faire :** frais par transaction, délai de règlement au restaurant, qualité de la documentation webhook, existence d'un mode sandbox, support en français, réputation auprès d'autres commerces camerounais.

### 5.3 Flux technique

1. Le restaurant configure ses identifiants marchand dans **Paramètres** (`SettingsTabContent` existe déjà — y ajouter une section "Paiement en ligne").
2. Le client valide son panier → redirection/widget de paiement de la passerelle.
3. Le client paie → la passerelle notifie Comptoir par **webhook serveur**.
4. Comptoir **vérifie la signature du webhook** et interroge si besoin l'API de la passerelle pour confirmer le statut — ne jamais faire confiance à un statut renvoyé depuis le navigateur du client.
5. Seulement à ce moment, la commande passe au statut `payée` et devient visible/actionnable côté staff.

### 5.4 Cas à couvrir dès la conception

- Paiement en attente (client parti sans finaliser)
- Paiement échoué
- Paiement dupliqué (double clic, webhook rejoué) → idempotence obligatoire sur la référence de transaction
- Remboursement / annulation après paiement (ex. plat en rupture) — process manuel acceptable en v1, mais le champ de statut doit le permettre
- Réconciliation : pouvoir retrouver, pour une transaction donnée côté passerelle, la commande Comptoir correspondante

## 6. Modèle de données envisagé

### Sur `orders` (nouveaux champs)

| Champ | Rôle |
|---|---|
| `source` | `"staff"` (existant) vs `"client"` (nouveau) |
| `delivery_type` | `dine_in` / `pickup` / `delivery` |
| `customer_name`, `customer_phone` | coordonnées du client final |
| `delivery_address` | adresse texte (géoloc précise = amélioration ultérieure) |
| `payment_status` | `pending` / `paid` / `failed` / `refunded` |
| `payment_reference` | référence transaction côté passerelle, pour réconciliation |

### Nouvelle table légère, séparée : `deliveries` (ou équivalent)

Reliée à `orders` par clé étrangère, mais **volontairement détachée** du cœur commande/paiement — c'est elle qui portera plus tard le mode de livraison retenu (rôle "Livreur" interne, dispatch manuel amélioré, ou API tierce), sans toucher au modèle `orders` déjà en prod à ce moment-là.

## 7. Sécurité / RLS

- Nouvelle policy Supabase autorisant un **insert anonyme** sur `orders`, strictement scopée : un visiteur peut créer sa propre commande, jamais lire ou modifier celles des autres.
- Protection anti-abus sur la route publique (rate limiting) — sans ça, n'importe qui peut spammer un restaurant de fausses commandes.
- Le passage au statut `paid` ne doit **jamais** être atteignable directement par le client (uniquement via le webhook serveur vérifié).

## 8. Impact sur les documents déjà rédigés

Les CGU et la politique de confidentialité (brouillons PDF sur le Bureau) devront être révisées avant toute mise en ligne de cette fonctionnalité :
- La politique de confidentialité affirme actuellement que le Service **ne collecte pas** de données de client final → devient faux.
- Les CGU affirment que Comptoir **n'encaisse jamais** → à nuancer : avec l'option A, Comptoir orchestre le paiement mais ne détient pas les fonds ; la clause doit le refléter précisément.
- Ajouter : conditions de remboursement/annulation, responsabilité en cas d'échec de paiement, traitement de la donnée client final (durée de conservation, finalité).

## 9. Découpage en phases

**Phase 1 — Commande à distance + paiement en ligne**
- Route publique menu + panier + checkout
- Intégration passerelle (option A, un seul prestataire pour commencer)
- Commande visible côté dashboard, statut `payée`
- Livraison gérée hors app par le restaurant
- *Valeur livrée sans attendre la décision sur le mode de livraison.*

**Phase 2 — Mode de livraison formel**
- Une fois le modèle choisi : rôle "Livreur" interne (le plus probable vu l'existant, sur le modèle du rôle `cashier`) ou dispatch manuel amélioré
- Suivi de statut de livraison dans le dashboard

**Phase 3 — Améliorations**
- Notifications temps réel client
- Tracking éventuel
- Coursier tiers via API si un service exploitable existe à Douala

## 10. Questions encore ouvertes

- [ ] Quelle passerelle de paiement précisément (dépend de l'évaluation §5.2) ?
- [ ] Mode de livraison (Phase 2) — à trancher plus tard, sans bloquer la Phase 1
- [ ] Le lien public par restaurant : slug lisible, ou lié à un QR généré par table pour capter aussi la commande en salle sans staff (usage différent, à clarifier si pertinent) ?
- [ ] Politique de remboursement en cas d'annulation par le restaurant (plat indisponible, etc.)
