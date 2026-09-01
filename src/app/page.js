"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sun, Moon, Menu, X } from "lucide-react";
import { getTheme, bodyFont, headFont } from "@/lib/theme";
import { useTheme } from "@/context/ThemeContext";
import BrandMark from "@/components/BrandMark";

// ---------------------------------------------------------------------------
// Landing page — refonte "Comptoir".
// Port fidèle de la maquette fournie (palette bleue oklch, Inter + Manrope,
// bandeau stats, grille fonctionnalités, section démo, témoignages, bandeau
// moyens de paiement, tarifs, FAQ en accordéon, CTA final, footer 4 colonnes).
// Contenu réel de Comptoir substitué à la copie générique de la maquette :
// témoignages/tarifs/moyens de paiement/stats sont ceux déjà établis pour ce
// produit — aucun faux client ni chiffre inventé n'a été repris tel quel.
// Jetons de couleur/typo partagés avec les pages connexion/inscription
// via src/lib/theme.js.
// ---------------------------------------------------------------------------

const stats = [
  { v: "5 min", l: "pour prendre l'outil en main" },
  { v: "24/7", l: "support local basé à Douala" },
  { v: "0", l: "vente perdue, même hors-ligne" },
];

const features = [
  { t: "Plan de salle interactif", d: "Visualisez votre établissement en temps réel, gérez les occupations et optimisez la rotation des tables." },
  { t: "Caisse & paiements", d: "Encaissez Mobile Money ou espèces en une seconde, avec une clôture de caisse simplifiée à chaque service." },
  { t: "Gestion des stocks", d: "Suivez vos ingrédients en temps réel et recevez une alerte avant la rupture de vos produits phares." },
  { t: "Rapports & historique", d: "Analysez vos marges et vos archives à 360°, avec vos plats vedettes et pics d'affluence en un coup d'œil." },
  { t: "RH & personnel", d: "Suivez le chiffre d'affaires par employé et maîtrisez votre masse salariale, accès sécurisés inclus." },
];

const paymentMethods = ["Orange Money", "MTN Money", "Wave", "Visa / Mastercard", "Espèces"];

const testimonials = [
  {
    q: "Le point de fin de journée est devenu un moment de plaisir. Tout est clair et précis.",
    name: "Mr Kouadio",
    role: "Gérant à Cocody",
    initials: "MK",
  },
  {
    q: "Je pilote mes 3 restaurants depuis mon smartphone avec une aisance incroyable.",
    name: "Jeanne",
    role: "Propriétaire Groupe",
    initials: "JN",
  },
  {
    q: "Le support VIP est exceptionnel. On sent que Comptoir comprend nos besoins réels.",
    name: "Bianca",
    role: "Hôtellerie Dakar",
    initials: "BC",
  },
];

const pricing = [
  {
    name: "Essence",
    sub: "Découverte",
    price: "Gratuit",
    period: "/ 7 jours",
    features: ["Caisse & plan de salle", "Menu & commandes", "1 utilisateur"],
    cta: "Essayer gratuitement",
    highlight: false,
  },
  {
    name: "Signature",
    sub: "Établissement en croissance",
    price: "15 000",
    period: "FCFA / mois",
    features: ["Tout Essence", "Rapports & historique illimité", "Comptes caissier illimités", "Support prioritaire"],
    cta: "Démarrer",
    highlight: true,
  },
  {
    name: "Elite",
    sub: "Groupes & multi-établissements",
    price: "150 000",
    period: "FCFA / an",
    features: ["Tout Signature", "Économies substantielles", "Priorité absolue support"],
    cta: "Nous contacter",
    highlight: false,
  },
];

const faqItems = [
  {
    q: "Combien de temps faut-il pour être opérationnel ?",
    a: "La plupart des équipes prennent l'outil en main en moins de 5 minutes. Ajoutez votre menu et votre plan de salle, vous encaissez le jour même.",
  },
  {
    q: "Comptoir fonctionne-t-il si ma connexion internet est instable ?",
    a: "Oui — la synchronisation cloud est pensée pour les connexions africaines : vos ventes ne se perdent jamais, même en cas de coupure.",
  },
  {
    q: "Quels moyens de paiement puis-je encaisser ?",
    a: "Orange Money, MTN Money, Wave, Visa/Mastercard et espèces, avec une clôture de caisse automatique à la fin du service.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non. L'offre Essence est gratuite 7 jours sans carte bancaire, et les abonnements Signature et Elite sont sans engagement.",
  },
  {
    q: "Puis-je donner un accès limité à mes caissiers ?",
    a: "Oui, chaque membre de l'équipe a un accès dédié avec des droits adaptés à son rôle (caisse, menu, rapports).",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const C = getTheme(isDarkMode);

  return (
    <div style={{ width: "100%", overflowX: "hidden", background: C.bg, color: C.ink, fontFamily: bodyFont, transition: "background .3s, color .3s" }}>
      {/* ---------------- NAV ---------------- */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "color-mix(in oklch, " + C.bg + " 90%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark size={32} color={C.accent} />
            <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>Comptoir</span>
          </div>

          <nav
            className="landing-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
              fontSize: 15,
              fontWeight: 500,
              color: C.muted,
            }}
          >
            <a href="#fonctionnalites" className="landing-link" style={{ color: "inherit", "--hover-color": C.accent }}>Fonctionnalités</a>
            <a href="#tarifs" className="landing-link" style={{ color: "inherit", "--hover-color": C.accent }}>Tarifs</a>
            <a href="#temoignages" className="landing-link" style={{ color: "inherit", "--hover-color": C.accent }}>Témoignages</a>
            <a href="#faq" className="landing-link" style={{ color: "inherit", "--hover-color": C.accent }}>FAQ</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Passer au thème clair" : "Passer au thème sombre"}
              title={isDarkMode ? "Thème clair" : "Thème sombre"}
              style={{
                width: 38, height: 38, borderRadius: 999, border: `1px solid ${C.line}`, background: C.surface,
                color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
              }}
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="landing-nav-auth" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/auth/login" className="landing-link" style={{ fontSize: 15, fontWeight: 600, color: C.muted, whiteSpace: "nowrap", "--hover-color": C.accent }}>Se connecter</Link>
              <Link
                href="/auth/signup"
                className="landing-btn-solid"
                style={{ background: C.accent, color: C.accentInk, padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 15, whiteSpace: "nowrap" }}
              >
                Essai gratuit
              </Link>
            </div>
            <button
              className="landing-nav-toggle"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
              style={{
                display: "none",
                width: 38, height: 38, borderRadius: 999, border: `1px solid ${C.line}`, background: C.surface,
                color: C.ink, alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="landing-nav-mobile-panel"
            style={{
              borderTop: `1px solid ${C.line}`,
              padding: "8px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {[
              ["#fonctionnalites", "Fonctionnalités"],
              ["#tarifs", "Tarifs"],
              ["#temoignages", "Témoignages"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="landing-link"
                style={{ color: C.ink, fontSize: 16, fontWeight: 600, padding: "12px 4px", borderBottom: `1px solid ${C.line}`, "--hover-color": C.accent }}
              >
                {label}
              </a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="landing-btn-outline"
                style={{ textAlign: "center", fontSize: 15, fontWeight: 600, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, "--hover-bg": C.wash, "--hover-color": C.accent }}
              >
                Se connecter
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="landing-btn-solid"
                style={{ textAlign: "center", background: C.accent, color: C.accentInk, padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 15 }}
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ---------------- HERO ---------------- */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "168px 24px 128px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "inline-block", background: C.wash, color: C.accentDark, fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 999, marginBottom: 20 }}>
            Conçu pour les restaurants qui visent le sommet
          </div>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(34px, 4.2vw, 52px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
            La gestion de votre restaurant, enfin simple.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: C.muted, margin: "0 0 32px", maxWidth: 520 }}>
            Comptoir réunit caisse, plan de salle, stocks et rapports dans une console pensée pour aller vite — même avec une connexion instable.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/auth/signup" className="landing-btn-solid" style={{ background: C.accent, color: C.accentInk, padding: "14px 28px", borderRadius: 8, fontWeight: 700, fontSize: 16 }}>
              Essai gratuit 7 jours
            </Link>
            <a href="#fonctionnalites" className="landing-btn-outline" style={{ border: `1px solid ${C.line}`, color: C.ink, padding: "14px 28px", borderRadius: 8, fontWeight: 700, fontSize: 16, "--hover-bg": C.wash, "--hover-color": C.accent }}>
              Découvrir l'outil
            </a>
          </div>
          <p style={{ fontSize: 13, color: C.faint, margin: "16px 0 0" }}>Sans carte bancaire. Sans engagement.</p>
        </div>

        {/* Aperçu produit — tableau de bord réel, pas une photo stock */}
        <div style={{ width: "100%", height: 420, borderRadius: 16, background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 20px 50px -20px oklch(0.2 0.02 255 / 0.15)", padding: 16 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 12, background: C.wash, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.faint }}>Recettes du jour</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            </div>
            <div style={{ padding: "20px 20px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.faint, margin: "0 0 4px" }}>Total encaissé</p>
              <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, fontFamily: headFont }}>
                1 240 500 <span style={{ fontSize: 13, color: C.faint, fontWeight: 600 }}>F CFA</span>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: "0 20px", height: 70 }}>
              {[38, 52, 44, 70, 60, 88, 76, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: "4px 4px 0 0", background: `linear-gradient(${C.accent}, oklch(0.52 0.19 255 / 0.25))`, height: `${h}%` }} />
              ))}
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${C.line}`, marginTop: "auto" }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.faint, marginBottom: 2 }}>Répartition par encaissement</span>
              {[
                ["Espèces", "420 000 F", "oklch(0.65 0.16 155)"],
                ["Wave", "510 000 F", C.accent],
                ["Orange Money", "310 500 F", "oklch(0.7 0.16 55)"],
              ].map(([name, amount, dotColor]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: C.muted, fontWeight: 600 }}>{name}</span>
                  <span style={{ fontWeight: 800 }}>{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section style={{ background: C.panel, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, textAlign: "center" }}>
          {stats.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: headFont, fontWeight: 800, fontSize: 34, color: C.accentInk }}>{s.v}</div>
              <div style={{ fontSize: 13, color: C.accentInkMuted, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section id="fonctionnalites" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto 56px", textAlign: "center" }}>
          <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Tout ce qu'il faut pour piloter votre restaurant
          </h2>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.6, margin: 0 }}>Cinq métiers du restaurant, un seul tableau de bord.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {features.map((f) => (
            <div key={f.t} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: C.wash, marginBottom: 20 }} />
              <h3 style={{ fontFamily: headFont, fontWeight: 700, fontSize: 19, margin: "0 0 10px" }}>{f.t}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C.muted, margin: 0 }}>{f.d}</p>
            </div>
          ))}
          <div style={{ borderRadius: 14, padding: 32, background: C.accent, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ fontFamily: headFont, fontWeight: 700, fontSize: 19, margin: "0 0 10px", color: C.accentInk }}>Et bien plus</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: C.accentInkMuted, margin: 0 }}>
              Sécurité des données, accès mobile pour vos équipes et support local — tout est pensé pour votre quotidien.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- DEMO ---------------- */}
      <section style={{ background: C.wash, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 56, alignItems: "center" }}>
          <img
            src="https://rljfqvmjrhsairduykww.supabase.co/storage/v1/object/public/logos/dashboardcomptoir.webp"
            alt="tableau de bord "
            style={{ width: "100%", height: 400, objectFit: "cover", borderRadius: 16, border: `1px solid ${C.line}` }}
          />
          <div>
            <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(26px, 2.8vw, 34px)", letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Un tableau de bord pensé pour aller vite
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                "Vue claire de vos ventes et de votre plan de salle en un coup d'œil.",
                "Alertes automatiques sur les stocks critiques et les écarts de caisse.",
                "Accès mobile pour vos serveurs et caissiers, même hors-ligne.",
              ].map((txt) => (
                <div key={txt} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, marginTop: 8, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: C.ink }}>{txt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TÉMOIGNAGES ---------------- */}
      <section id="temoignages" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto 56px", textAlign: "center" }}>
          <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-0.02em", margin: 0 }}>
            Ce qu'en disent nos clients
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {testimonials.map((t) => (
            <div key={t.name} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, color: C.ink }}>&ldquo;{t.q}&rdquo;</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.wash, color: C.accentDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0, border: `1px solid ${C.line}` }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: C.faint }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- MOYENS DE PAIEMENT ---------------- */}
      <section style={{ background: C.wash, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, margin: "0 auto 48px", textAlign: "center" }}>
            <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(26px, 2.8vw, 34px)", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
              Encaissez avec les moyens de paiement de vos clients
            </h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>Orange Money, MTN Money, Wave, cartes ou espèces — tout se synchronise automatiquement.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            {paymentMethods.map((m) => (
              <div key={m} style={{ background: C.surface, borderRadius: 12, padding: 20, textAlign: "center", fontWeight: 700, fontSize: 14, color: C.muted }}>
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- TARIFS ---------------- */}
      <section id="tarifs" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto 56px", textAlign: "center" }}>
          <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Des tarifs simples, sans surprise
          </h2>
          <p style={{ fontSize: 17, color: C.muted, margin: 0 }}>7 jours d'essai gratuit sur Essence. Sans engagement sur Signature et Elite.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "stretch" }}>
          {pricing.map((p) => (
            <div
              key={p.name}
              style={{
                border: p.highlight ? `2px solid ${C.accent}` : `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 36,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {p.highlight && (
                <div style={{ position: "absolute", top: -14, left: 36, background: C.accent, color: C.accentInk, fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 999 }}>
                  Le plus choisi
                </div>
              )}
              <h3 style={{ fontFamily: headFont, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>{p.name}</h3>
              <p style={{ fontSize: 14, color: C.faint, margin: "0 0 24px" }}>{p.sub}</p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 38 }}>{p.price}</span>
                <span style={{ fontSize: 15, color: C.faint }}> {p.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, fontSize: 14, color: C.ink, flex: 1 }}>
                {p.features.map((f) => (
                  <div key={f}>✓ {f}</div>
                ))}
              </div>
              <Link
                href="/auth/signup"
                className={p.highlight ? "landing-btn-solid" : "landing-btn-outline"}
                style={{
                  background: p.highlight ? C.accent : "transparent",
                  border: p.highlight ? "none" : `1px solid ${C.line}`,
                  color: p.highlight ? C.accentInk : C.ink,
                  padding: 12,
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 15,
                  textAlign: "center",
                  "--hover-bg": C.wash,
                  "--hover-color": C.accent,
                }}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" style={{ maxWidth: 800, margin: "0 auto", padding: "96px 24px" }}>
        <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-0.02em", margin: "0 0 40px", textAlign: "center" }}>
          Questions fréquentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqItems.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: bodyFont,
                    color: C.ink,
                    textAlign: "left",
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{ fontSize: 20, color: C.faint, flexShrink: 0, marginLeft: 16 }}>{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div style={{ padding: "0 24px 20px", fontSize: 15, lineHeight: 1.6, color: C.muted }}>{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- CTA FINAL ---------------- */}
      <section style={{ background: C.panel, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: "clamp(28px, 3vw, 36px)", color: C.accentInk, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Prêt à simplifier la gestion de votre restaurant ?
          </h2>
          <p style={{ fontSize: 17, color: C.accentInkMuted, margin: "0 0 32px" }}>7 jours d'essai gratuit. Sans carte bancaire.</p>
          <Link href="/auth/signup" className="landing-btn-solid" style={{ display: "inline-block", background: C.accentInk, color: C.panel, padding: "14px 32px", borderRadius: 8, fontWeight: 700, fontSize: 16 }}>
            Démarrer l'essai gratuit
          </Link>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <BrandMark size={28} color={C.accent} />
            <span style={{ fontFamily: headFont, fontWeight: 800, fontSize: 19 }}>Comptoir</span>
          </div>
          <p style={{ fontSize: 14, color: C.faint, maxWidth: 280, lineHeight: 1.6, margin: 0 }}>
            L&apos;élégance technologique au service de la gastronomie africaine.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Produit</div>
          <a href="#fonctionnalites" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>Fonctionnalités</a>
          <a href="#tarifs" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>Tarifs</a>
          <a href="#temoignages" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>Témoignages</a>
          <a href="#faq" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>FAQ</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Contact</div>
          <a href="tel:+237698710659" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>+237 6 98 71 06 59</a>
          <a href="mailto:supportcomptoir@gmail.com" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>supportcomptoir@gmail.com</a>
          <span style={{ color: C.faint, fontSize: 14 }}>Douala, Cameroun</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Légal</div>
          <Link href="/cgu" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>Conditions Générales d&apos;Utilisation</Link>
          <Link href="/confidentialite" className="landing-link" style={{ color: C.muted, fontSize: 14, "--hover-color": C.accent }}>Politique de confidentialité</Link>
        </div>
      </footer>
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "20px 24px", textAlign: "center", fontSize: 13, color: C.faint }}>
        © 2026 Comptoir Africa. Tous droits réservés. — By Corneille Nkwel
      </div>

      {/* ---------------- WHATSAPP ---------------- */}
      <a
        href="https://wa.me/237698710659"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 100,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px -8px rgba(0,0,0,0.35)",
        }}
        aria-label="Contacter le support WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4c-4.35 0-7.9 3.53-7.9 7.87a7.84 7.84 0 0 0 1.05 3.93L4 20l4.32-1.13a7.9 7.9 0 0 0 3.73.95h.01c4.35 0 7.9-3.53 7.9-7.87a7.83 7.83 0 0 0-2.36-5.63Zm-5.55 12.1h-.01a6.58 6.58 0 0 1-3.35-.92l-.24-.14-2.49.65.67-2.43-.16-.25a6.53 6.53 0 0 1-1-3.46c0-3.62 2.96-6.56 6.6-6.56a6.57 6.57 0 0 1 6.58 6.57c0 3.62-2.96 6.56-6.6 6.56Zm3.6-4.92c-.2-.1-1.17-.58-1.35-.64-.18-.07-.32-.1-.45.1-.13.2-.51.64-.63.77-.12.13-.23.15-.43.05-.2-.1-.85-.32-1.62-1.02-.6-.53-1-1.2-1.12-1.4-.12-.2-.01-.31.09-.4.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.06-.13.03-.25-.02-.35-.05-.1-.45-1.1-.62-1.5-.16-.4-.33-.34-.45-.35h-.38c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.67s.72 1.94.82 2.07c.1.13 1.4 2.15 3.4 3 .48.2.85.33 1.14.42.48.15.91.13 1.26.08.38-.06 1.17-.48 1.34-.94.16-.46.16-.86.11-.94-.05-.08-.18-.13-.38-.23Z"/></svg>
      </a>
    </div>
  );
}
