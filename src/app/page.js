"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  ArrowRight,
  LogIn,
  UserPlus,
  Star,
  Zap,
  Crown,
  Grid,
  Wallet,
  BarChart3,
  Users,
  CheckCircle2,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Heart,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const trustLogos = [
    "Gastro d'Or",
    "Maquis Pro",
    "Abidjan Grill",
    "Sénégal Délices",
    "Douala Fast",
    "Bistro 225",
    "Le Krystal",
    "Yamoussoukro Food",
  ];

  const services = [
    {
      title: "Plan de Salle Interactif",
      desc: "Visualisez votre établissement en temps réel, gérez les occupations et optimisez la rotation des tables.",
      icon: <Grid size={20} />,
    },
    {
      title: "Caisse & Flux Digitaux",
      desc: "Encaissez Mobile Money ou espèces en une seconde, avec une clôture de caisse simplifiée à chaque service.",
      icon: <Wallet size={20} />,
    },
    {
      title: "Rapports & Historique",
      desc: "Analysez vos marges et vos archives à 360°, avec vos plats vedettes et pics d'affluence en un coup d'œil.",
      icon: <BarChart3 size={20} />,
    },
    {
      title: "RH & Performances",
      desc: "Suivez le chiffre d'affaires par employé et maîtrisez votre masse salariale, accès sécurisés inclus.",
      icon: <Users size={20} />,
    },
  ];

  const stats = [
    { v: "500+", l: "restaurants gérés" },
    { v: "5 min", l: "pour prendre l'outil en main" },
    { v: "24/7", l: "support local basé à Abidjan" },
    { v: "0", l: "vente perdue, même hors-ligne" },
  ];

  const paymentMethods = ["Orange Money", "MTN Money", "Wave", "Visa / Mastercard", "Espèces"];

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

  return (
    <div
      className={`min-h-screen transition-all duration-1000 font-[family-name:var(--font-lexend)] overflow-x-hidden ${isDarkMode ? "bg-[#030303] text-white/90" : "bg-[#FAFBFF] text-slate-800"}`}
    >
      {/* --- NAVBAR --- */}
      <nav
        className={`fixed top-0 w-full z-[100] flex justify-between items-center px-[8%] py-6 backdrop-blur-xl border-b transition-all ${isDarkMode ? "bg-black/20 border-white/5" : "bg-white/40 border-slate-200/50"}`}
      >
        <div className="flex items-center gap-3 text-2xl font-black tracking-tight group cursor-pointer">
          <div className="bg-gradient-to-tr from-[#00D9FF] to-[#0066FF] p-2 rounded-2xl shadow-lg shadow-cyan-500/20 group-hover:rotate-12 transition-transform duration-500">
            <ChefHat size={28} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Comptoir
          </span>
        </div>

        {/* Menu Desktop */}
        <div className="hidden lg:flex items-center gap-10 text-sm font-medium tracking-wide opacity-70">
          <a href="#services" className="hover:opacity-100 transition-opacity">
            Services
          </a>
          <a href="#pricing" className="hover:opacity-100 transition-opacity">
            Tarifs
          </a>
          <a href="#faq" className="hover:opacity-100 transition-opacity">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-slate-500/10 transition-colors"
          >
            {isDarkMode ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-indigo-600" />
            )}
          </button>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold border border-slate-500/20 hover:bg-slate-500/10 transition-all text-xs uppercase tracking-widest"
            >
              <LogIn size={16} /> Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
            >
              <UserPlus size={16} /> Inscription
            </Link>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-cyan-500"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {isMenuOpen && (
          <div
            className={`absolute top-full left-0 w-full p-8 flex flex-col gap-6 items-center shadow-2xl fade-in lg:hidden ${isDarkMode ? "bg-[#0a0a0a] border-b border-white/10" : "bg-white border-b border-slate-100"}`}
          >
            <a href="#services" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">
              Services
            </a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">
              Tarifs
            </a>
            <a href="#faq" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold">
              FAQ
            </a>
            <div className="w-full flex flex-col gap-4 pt-4 border-t border-white/10">
              <Link
                href="/auth/login"
                className={`w-full text-center py-4 rounded-2xl font-bold border ${isDarkMode ? "border-white/10" : "border-slate-200"}`}
              >
                Connexion
              </Link>
              <Link
                href="/auth/signup"
                className="w-full text-center py-4 rounded-2xl bg-cyan-500 text-white font-black"
              >
                S'inscrire
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO --- */}
      <header className="relative pt-40 pb-24 px-[8%] overflow-hidden">
        {/* Un seul geste signature : le halo cyan, réservé au hero */}
        <div className="absolute -top-40 -right-40 w-[42rem] h-[42rem] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="max-w-2xl space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-bold tracking-[0.2em] uppercase">
              <Star size={14} fill="currentColor" /> L'élite de la gestion africaine
            </div>
            <h1 className="text-[clamp(2.5rem,5.5vw,4rem)] font-[900] leading-[1.05] tracking-tighter">
              Redéfinissez{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
                votre excellence.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed opacity-70">
              La caisse, le plan de salle et les rapports de votre restaurant, réunis dans une console pensée pour aller vite — même avec une connexion instable.
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <Link
                href="/auth/signup"
                className="px-9 py-4 rounded-full bg-[#00D9FF] text-black font-black text-sm shadow-2xl shadow-cyan-500/20 hover:scale-105 transition-all flex items-center gap-3 group"
              >
                Démarrer gratuitement
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["MK", "JN", "BC"].map((initials) => (
                    <div
                      key={initials}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${isDarkMode ? "bg-cyan-500/10 border-[#030303] text-cyan-400" : "bg-cyan-50 border-white text-cyan-600"}`}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="text-sm font-bold opacity-60">+500 gérants satisfaits</span>
              </div>
            </div>
          </div>

          {/* Aperçu produit abstrait — pas de photo stock, la vraie substance du tableau de bord */}
          <div className="relative">
            <div className={`rounded-[32px] border p-5 ${isDarkMode ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200 shadow-2xl"}`}>
              <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-slate-50 border-slate-100"}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Recettes du jour</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="px-6 pt-6 pb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Total encaissé</p>
                  <p className="text-3xl font-black tracking-tighter">
                    1 240 500 <span className="text-sm opacity-30 font-medium">F CFA</span>
                  </p>
                </div>
                <div className="flex items-end gap-1.5 px-6 h-20 pb-5">
                  {[38, 52, 44, 70, 60, 88, 76, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/30 to-[#00D9FF]" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
                <div className={`px-6 py-5 space-y-3 border-t ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
                  {[
                    ["Bistro 225", "2 150 000 F"],
                    ["Gastro d'Or", "1 240 000 F"],
                    ["Abidjan Grill", "890 500 F"],
                  ].map(([name, amount]) => (
                    <div key={name} className="flex items-center gap-3 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]"></span>
                      <span className="flex-1 opacity-60 font-bold">{name}</span>
                      <span className="font-black">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-2.5 rounded-2xl bg-[#00D9FF] text-black text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
              <CheckCircle2 size={13} /> Synchronisé à l'instant
            </div>
          </div>
        </div>
      </header>

      {/* --- TRUST STRIP --- */}
      <div className={`py-10 border-y transition-colors ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="flex whitespace-nowrap animate-infinite-scroll items-center">
          {[...trustLogos, ...trustLogos].map((logo, i) => (
            <span key={i} className="mx-16 text-lg font-bold opacity-30 tracking-widest uppercase">
              {logo}
            </span>
          ))}
        </div>
      </div>

      {/* --- STATS --- */}
      <div className={`py-14 px-[8%] border-b ${isDarkMode ? "bg-white/[0.015] border-white/5" : "bg-slate-50 border-slate-100"}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.l}>
              <p className="text-3xl md:text-4xl font-black tracking-tighter text-[#00D9FF]">{s.v}</p>
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-40 mt-2">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- SERVICES --- */}
      <section id="services" className="py-28 px-[8%] max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">Ce que couvre Comptoir</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            Une suite, quatre métiers du restaurant.
          </h2>
          <p className="opacity-50 max-w-xl mx-auto">
            Sculptée pour offrir une fluidité absolue à vos équipes, et une clarté totale à votre direction.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((s) => (
            <div
              key={s.title}
              className={`p-7 rounded-[28px] border transition-all hover:-translate-y-1 text-left ${isDarkMode ? "bg-white/[0.02] border-white/5 hover:border-cyan-500/30" : "bg-white border-slate-100 shadow-sm hover:border-cyan-500/30"}`}
            >
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 mb-5">
                {s.icon}
              </div>
              <h3 className="font-bold text-[15px] mb-2">{s.title}</h3>
              <p className="text-sm opacity-50 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- MOYENS DE PAIEMENT --- */}
      <section className="pb-28 px-[8%] max-w-4xl mx-auto text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-6">
          Encaissez avec les moyens de paiement de vos clients
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {paymentMethods.map((m) => (
            <span
              key={m}
              className={`px-5 py-2.5 rounded-full border text-sm font-bold ${isDarkMode ? "bg-white/[0.02] border-white/10 text-white/70" : "bg-white border-slate-200 text-slate-600"}`}
            >
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-28 px-[8%] max-w-7xl mx-auto text-left">
        <div className="text-center mb-16 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">Tarifs</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            Des offres simples, sans surprise.
          </h2>
          <p className="opacity-50">7 jours d'essai gratuit sur Essence. Sans engagement sur Signature et Elite.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <PriceCard
            isDarkMode={isDarkMode}
            title="Essence"
            price="Gratuit"
            period="7 jours"
            desc="Découvrez le potentiel de Comptoir sans limites."
            icon={<Zap size={20} />}
          />
          <PriceCard
            isDarkMode={isDarkMode}
            title="Signature"
            price="15 000"
            period="FCFA / mois"
            desc="La formule préférée des établissements de prestige."
            highlight={true}
            icon={<Star size={20} />}
          />
          <PriceCard
            isDarkMode={isDarkMode}
            title="Elite"
            price="150 000"
            period="FCFA / an"
            desc="Priorité absolue et économies substantielles."
            icon={<Crown size={20} />}
          />
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-28 px-[8%] max-w-3xl mx-auto">
        <div className="text-center mb-14 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">Questions fréquentes</p>
          <h2 className="text-4xl font-black tracking-tighter">Tout ce qu'il faut savoir.</h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                key={item.q}
                className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
              >
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-bold text-sm bg-transparent border-none cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-cyan-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className="grid transition-all duration-300"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm opacity-50 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- TÉMOIGNAGES --- */}
      <section
        id="testimonials"
        className={`py-28 px-[8%] transition-colors ${isDarkMode ? "bg-[#050505]" : "bg-white shadow-inner"}`}
      >
        <div className="max-w-7xl mx-auto text-center space-y-14">
          <h2 className="text-4xl font-black tracking-tighter">"Un tournant pour nos établissements."</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Mr Kouadio"
              role="Gérant à Cocody"
              initials="MK"
              text="Le point de fin de journée est devenu un moment de plaisir. Tout est clair et précis."
            />
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Jeanne"
              role="Propriétaire Groupe"
              initials="JN"
              text="Je pilote mes 3 restaurants depuis mon smartphone avec une aisance incroyable."
            />
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Bianca"
              role="Hôtellerie Dakar"
              initials="BC"
              text="Le support VIP est exceptionnel. On sent que Comptoir comprend nos besoins réels."
            />
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-28 px-[8%]">
        <div
          className={`max-w-5xl mx-auto rounded-[32px] p-12 md:p-20 relative overflow-hidden text-center border ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-slate-200 shadow-2xl"}`}
        >
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
              Prêt à sculpter <span className="text-[#00D9FF]">votre succès ?</span>
            </h2>
            <p className="opacity-50 max-w-xl mx-auto text-lg">
              Rejoignez les établissements qui redéfinissent la gestion de restaurant.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-3 px-10 py-5 bg-[#00D9FF] text-black rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              Démarrer gratuitement <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer
        className={`border-t transition-colors pt-24 pb-12 px-[8%] ${isDarkMode ? "border-white/5 bg-[#030303]" : "border-slate-200 bg-white"}`}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-20 mb-20 text-left">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-2xl font-black tracking-tight text-left">
              <ChefHat size={32} className="text-[#00D9FF]" />
              <span>Comptoir</span>
            </div>
            <p className="text-sm opacity-50 max-w-xs leading-relaxed font-light text-left">
              L'élégance technologique au service de la gastronomie africaine.
            </p>
          </div>
          <div className="space-y-6 text-left">
            <h4 className="font-black text-lg uppercase tracking-widest text-cyan-500 text-left">Contact</h4>
            <div className="space-y-2 opacity-60 text-sm text-left">
              <p className="opacity-40 hover:opacity-100 transition-opacity">
                <a href="mailto:srestopay@gmail.com" className="text-[#00D9FF] font-black tracking-widest text-[15px] no-underline">
                  srestopay@gmail.com
                </a>
              </p>
              <p>Plateau, Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
          <div className="space-y-6 flex flex-col items-start lg:items-end">
            <h4 className="font-black text-lg uppercase tracking-widest text-cyan-500">Suivez-nous</h4>
            <div className="flex gap-5">
              <SocialLink isDarkMode={isDarkMode} icon={<Facebook size={20} />} />
              <SocialLink isDarkMode={isDarkMode} icon={<Instagram size={20} />} />
              <SocialLink isDarkMode={isDarkMode} icon={<Twitter size={20} />} />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">
          <p>© 2026 Comptoir Africa. Tous droits réservés.</p>
          <div className="flex items-center gap-2">
            <span>By</span>
            <span className="text-[#00D9FF]">Corneille Nkwel</span>
            <Heart size={10} className="text-red-500 fill-red-500" />
          </div>
        </div>
      </footer>

      {/* --- WHATSAPP --- */}
      <a
        href="https://wa.me/2250757471552"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-10 right-10 z-[200] flex items-center justify-center w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all shadow-green-500/20"
      >
        <MessageCircle size={30} fill="white" />
      </a>

      <style jsx global>{`
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes infinite-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 50s linear infinite;
        }
      `}</style>
    </div>
  );
}

{
  /* --- SOUS-COMPOSANTS --- */
}

function PriceCard({ isDarkMode, title, price, period, desc, highlight, icon }) {
  return (
    <div
      className={`relative p-10 rounded-[32px] border transition-all flex flex-col text-left ${highlight ? "border-[#00D9FF] shadow-2xl shadow-cyan-500/10" : isDarkMode ? "border-white/5" : "border-slate-100"} ${isDarkMode ? (highlight ? "bg-white/[0.03]" : "bg-white/[0.01]") : "bg-white"}`}
    >
      {highlight && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#00D9FF] text-black text-[10px] font-black uppercase px-5 py-1.5 rounded-full tracking-widest text-center">
          Le plus choisi
        </div>
      )}
      <div className="mb-6 w-11 h-11 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-500">
        {icon}
      </div>
      <h3 className="text-xl font-black mb-1 tracking-tight text-left">{title}</h3>
      <div className="mb-5 text-left">
        <span className="text-3xl font-black">{price}</span>
        <span className="text-xs opacity-40 ml-2 font-medium">{period}</span>
      </div>
      <p className="text-sm mb-8 flex-grow leading-relaxed opacity-50 text-left">{desc}</p>
      <Link
        href="/auth/signup"
        className={`w-full py-4 rounded-full font-black transition-all text-xs tracking-widest uppercase text-center ${highlight ? "bg-[#00D9FF] text-black hover:shadow-cyan-500/40 shadow-xl" : isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
      >
        {price === "Gratuit" ? "Essayer gratuitement" : "Démarrer"}
      </Link>
    </div>
  );
}

function TestimonialCard({ isDarkMode, name, role, text, initials }) {
  return (
    <div
      className={`p-9 rounded-[28px] border transition-all text-left ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
    >
      <div className="flex gap-1 text-cyan-500 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill="currentColor" />
        ))}
      </div>
      <p className="mb-8 leading-relaxed opacity-60 text-[15px] text-left">"{text}"</p>
      <div className="flex items-center gap-3 text-left">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black border ${isDarkMode ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-100 text-cyan-600"}`}
        >
          {initials}
        </div>
        <div>
          <p className="font-black text-sm tracking-tight">{name}</p>
          <p className="text-[10px] opacity-30 uppercase tracking-[0.2em] font-bold">{role}</p>
        </div>
      </div>
    </div>
  );
}

function SocialLink({ isDarkMode, icon }) {
  return (
    <a
      href="#"
      className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${isDarkMode ? "bg-white/5 border-white/10 hover:border-cyan-500 text-white/50 hover:text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-cyan-500 hover:text-cyan-500"}`}
    >
      {icon}
    </a>
  );
}
