"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  ArrowRight,
  LogIn,
  UserPlus,
  Star,
  ShieldCheck,
  Zap,
  Grid,
  CheckCircle2,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Heart,
  Sun,
  Moon,
  Clock,
  Crown,
  Smartphone,
  LayoutDashboard,
  Package,
  BarChart3,
  History,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Menu,
  X,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const appFeatures = [
    {
      title: "Facturation",
      desc: "Édition de tickets raffinée et gestion des tables fluide.",
      icon: <Receipt className="text-cyan-500" />,
    },
    {
      title: "Inventaire",
      desc: "Suivi haute précision de vos ressources précieuses.",
      icon: <Package className="text-blue-400" />,
    },
    {
      title: "Comptabilité",
      desc: "Bilan automatique pour une vision claire de votre succès.",
      icon: <TrendingUp className="text-emerald-400" />,
    },
    {
      title: "Analyses",
      desc: "Graphiques d'activité pour anticiper les tendances.",
      icon: <BarChart3 className="text-violet-400" />,
    },
    {
      title: "Caisse",
      desc: "Sécurisation totale de vos flux de trésorerie.",
      icon: <Wallet className="text-sky-400" />,
    },
    {
      title: "Historique",
      desc: "L'intégralité de vos archives accessibles instantanément.",
      icon: <History className="text-indigo-400" />,
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
            RestoPay
          </span>
        </div>

        {/* Menu Desktop */}
        <div className="hidden lg:flex items-center gap-10 text-sm font-medium tracking-wide opacity-70">
          <a href="#features" className="hover:opacity-100 transition-opacity">
            Services
          </a>
          <a href="#why" className="hover:opacity-100 transition-opacity">
            Pourquoi nous ?
          </a>
          <a href="#pricing" className="hover:opacity-100 transition-opacity">
            Tarifs
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
            {/* Bouton Connexion */}
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold border border-slate-500/20 hover:bg-slate-500/10 transition-all text-xs uppercase tracking-widest"
            >
              <LogIn size={16} /> Connexion
            </Link>

            {/* Bouton Inscription */}
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
            >
              <UserPlus size={16} /> Inscription
            </Link>
          </div>

          {/* Hamburger Menu Icon */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-cyan-500"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div
            className={`absolute top-full left-0 w-full p-8 flex flex-col gap-6 items-center shadow-2xl fade-in lg:hidden ${isDarkMode ? "bg-[#0a0a0a] border-b border-white/10" : "bg-white border-b border-slate-100"}`}
          >
            <a
              href="#features"
              onClick={() => setIsMenuOpen(false)}
              className="text-lg font-bold"
            >
              Services
            </a>
            <a
              href="#why"
              onClick={() => setIsMenuOpen(false)}
              className="text-lg font-bold"
            >
              Pourquoi nous ?
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMenuOpen(false)}
              className="text-lg font-bold"
            >
              Tarifs
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

      {/* --- HERO SECTION BACKGROUND --- */}
      <header className="relative min-h-screen flex items-center px-[8%] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1556742393-d75f468bfcb0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Ambiance Restaurant Luxe"
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 transition-all duration-1000 ${
              isDarkMode
                ? "bg-gradient-to-r from-[#030303] via-[#030303]/85 to-transparent"
                : "bg-gradient-to-r from-[#FAFBFF] via-[#FAFBFF]/85 to-transparent"
            }`}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 text-left">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md">
              <Star size={14} fill="currentColor" /> L'élite de la gestion
              africaine
            </div>
            <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-[900] leading-[1.05] tracking-tighter">
              Redéfinissez <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
                votre excellence.
              </span>
            </h1>
            <p className="max-w-xl text-lg sm:text-xl leading-relaxed opacity-80 font-medium italic">
              Bien plus qu'un logiciel de caisse. Une expérience de gestion
              fluide, intuitive et luxueuse pour les restaurateurs qui visent le
              sommet.
            </p>
            <div className="flex flex-wrap gap-6 pt-4">
              <Link
                href="/auth/signup"
                className="px-10 py-5 rounded-full  bg-[#00D9FF] text-white shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group"
              >
                Démarrer gratuitement{" "}
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex -space-x-3 items-center">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    className="w-10 h-10 rounded-full border-2 border-cyan-500/30 shadow-lg"
                    alt="user"
                  />
                ))}
                <span className="pl-5 text-sm font-bold opacity-70">
                  +500 gérants satisfaits
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      
      <div
        className={`py-12 border-y transition-colors ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
      >
        <div className="flex whitespace-nowrap animate-infinite-scroll items-center">
          {[...trustLogos, ...trustLogos].map((logo, i) => (
            <span
              key={i}
              className="mx-16 text-xl font-bold opacity-30 tracking-widest uppercase italic"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>

      {/* --- SECTION POURQUOI CHOISIR RESTOPAY --- */}
      <section id="why" className="py-32 px-[8%] max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8 text-left">
            <h2 className="text-4xl md:text-5xl font-[900] tracking-tighter leading-tight">
              Pourquoi l'élite choisit <br />{" "}
              <span className="text-cyan-500">RestoPay ?</span>
            </h2>
            <p className="text-lg opacity-60 font-light leading-relaxed">
              Nous avons fusionné la haute technologie avec les besoins réels
              des maquis et restaurants haut de gamme.
            </p>
            <div className="space-y-6">
              {[
                {
                  t: "Zéro Perte de Données",
                  d: "Synchronisation Cloud même avec une connexion instable.",
                },
                {
                  t: "Prise en main en 5 min",
                  d: "Une interface si intuitive que vos serveurs l'adorent déjà.",
                },
                {
                  t: "Support Local 24/7",
                  d: "Une équipe dédiée basée à Abidjan pour vous accompagner.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="mt-1 bg-cyan-500/20 p-1 rounded-full text-cyan-500 group-hover:scale-110 transition-transform">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.t}</h4>
                    <p className="text-sm opacity-50">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500 to-blue-600 blur-2xl opacity-10 rounded-full"></div>
            <img
              src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop"
              className="rounded-[40px] shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-1000"
              alt="Excellence Service"
            />
          </div>
        </div>
      </section>

      {/* --- SECTION SERVICES --- */}
  <section
  id="services"
  className={`py-32 px-[8%] max-w-[1600px] mx-auto space-y-60 transition-colors duration-500 ${isDarkMode ? "bg-[#030303]" : "bg-[#FAFBFF]"}`}
>
  {/* TITRE DE SECTION */}
  <div className="text-left lg:text-center mb-40 space-y-4">
    <h2 className="text-5xl md:text-8xl font-[900] tracking-tighter italic uppercase leading-none">
      L'Ingénierie du <span className="text-cyan-500">Succès.</span>
    </h2>
    <p className="opacity-40 max-w-2xl mx-auto font-light text-xl text-left lg:text-center">
      Une suite d'outils sculptée pour offrir une fluidité absolue à vos équipes et une clarté totale à votre direction.
    </p>
  </div>

  <div className="space-y-60">
    {/* 1. PLAN DE SALLE */}
    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
      <div className="flex-[0.8] space-y-8 text-left">
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 flex items-center justify-center text-cyan-500"><Grid size={32} /></div>
        <h3 className="text-5xl font-[900] tracking-tighter leading-tight uppercase italic text-left">Plan de Salle <br /> Interactif</h3>
        <p className="text-xl opacity-50 font-light leading-relaxed text-left">Visualisez votre établissement en temps réel. Gérez les occupations et optimisez la rotation avec une précision chirurgicale.</p>
        <div className="flex flex-col gap-4 font-black text-xs uppercase tracking-widest opacity-60 text-left">
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-cyan-500" /> Statut des tables en direct</span>
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-cyan-500" /> Gestion intuitive des additions</span>
        </div>
      </div>
      <div className="flex-[1.2] w-full group relative">
        <div className="absolute -inset-10 bg-cyan-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <img src="https://rljfqvmjrhsairduykww.supabase.co/storage/v1/object/public/logos/plandesalle.webp" alt="Plan de salle" className={`w-full h-auto rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${isDarkMode ? "shadow-black/50" : "shadow-slate-400/30"} grayscale-[15%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000 relative z-10`} />
      </div>
    </div>

    {/* 2. STOCKS & INVENTAIRE *
    <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
      <div className="flex-[0.8] space-y-8 text-left">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Package size={32} /></div>
        <h3 className="text-5xl font-[900] tracking-tighter leading-tight uppercase italic text-left">Stocks & <br /> Inventaire</h3>
        <p className="text-xl opacity-50 font-light leading-relaxed text-left">Suivi haute précision de vos ressources. Réduisez le gaspillage et soyez alerté avant la rupture de vos produits phares.</p>
        <div className="flex flex-col gap-4 font-black text-xs uppercase tracking-widest opacity-60 text-left">
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-500" /> Alertes de stock critique</span>
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-500" /> Valorisation automatique</span>
        </div>
      </div>
      <div className="flex-[1.2] w-full group relative">
        <div className="absolute -inset-10 bg-emerald-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <img src="/api/placeholder/1100/700" alt="Gestion Stocks" className={`w-full h-auto rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${isDarkMode ? "shadow-black/50" : "shadow-slate-400/30"} grayscale-[15%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000 relative z-10`} />
      </div>
    </div>
/}
    {/* 3. CAISSE & PAIEMENTS */}
    <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
      <div className="flex-[0.8] space-y-8 text-left">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-500"><Wallet size={32} /></div>
        <h3 className="text-5xl font-[900] tracking-tighter leading-tight uppercase italic text-left">Caisse & <br /> Flux Digitaux</h3>
        <p className="text-xl opacity-50 font-light leading-relaxed text-left">Une réconciliation automatique qui s'adapte à l'Afrique. Encaissez via Mobile Money ou espèces en une seconde.</p>
        <div className="flex flex-col gap-4 font-black text-xs uppercase tracking-widest opacity-60 text-left">
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-purple-500" /> Orange / MTN / Wave / Visa</span>
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-purple-500" /> Clôture de caisse simplifiée</span>
        </div>
      </div>
      <div className="flex-[1.2] w-full group relative">
        <div className="absolute -inset-10 bg-purple-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <img src="https://rljfqvmjrhsairduykww.supabase.co/storage/v1/object/public/logos/Caisse.webp" alt="Caisse Digitale" className={`w-full h-auto rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${isDarkMode ? "shadow-black/50" : "shadow-slate-400/30"} grayscale-[15%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000 relative z-10`} />
      </div>
    </div>

    {/* 4. ANALYTICS & HISTORIQUE  */}
    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
      <div className="flex-[0.8] space-y-8 text-left">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500"><BarChart3 size={32} /></div>
        <h3 className="text-5xl font-[900] tracking-tighter leading-tight uppercase italic text-left">Rapports & <br /> Historique</h3>
        <p className="text-xl opacity-50 font-light leading-relaxed text-left">Analysez vos marges et vos archives à 360°. Un journal de bord complet pour piloter votre croissance stratégique.</p>
        <div className="flex flex-col gap-4 font-black text-xs uppercase tracking-widest opacity-60 text-left">
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-blue-500" /> Export PDF & Historique illimité</span>
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-blue-500" /> Top plats & Pics d'affluence</span>
        </div>
      </div>
      <div className="flex-[1.2] w-full group relative">
        <div className="absolute -inset-10  bg-blue-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <img src="https://rljfqvmjrhsairduykww.supabase.co/storage/v1/object/public/logos/rapports.webp" alt="Dashboard" className={`w-full h-auto rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${isDarkMode ? "shadow-black/50" : "shadow-slate-400/30"} grayscale-[10%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-1000 relative z-10`} />
      </div>
    </div>

    {/* 5. RH & PERSONNEL */}
    <div className="flex flex-col  items-center gap-12 lg:gap-24">
      <div className="flex-[0.8] space-y-8 text-left">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500"><Users size={32} /></div>
        <h3 className="text-5xl font-[900] tracking-tighter leading-tight uppercase italic text-left">RH & <br /> Performances</h3>
        <p className="text-xl opacity-50 font-light leading-relaxed text-left">Suivez les performances de vos serveurs et maîtrisez votre masse salariale en un coup d'œil.</p>
        <div className="flex flex-col gap-4 font-black text-xs uppercase tracking-widest opacity-60 text-left">
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-red-500" /> Suivi du CA par employé</span>
          <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-red-500" /> Gestion des accès sécurisés</span>
        </div>
      </div>
      <div className="flex-[1.2] w-full group relative">
        <div className="absolute -inset-10 bg-red-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

       
      </div>
    </div>
  </div>
</section>

      {/* --- SECTION CTA --- */}
      <section className="py-32 px-[8%]">
        <div
          className={`max-w-6xl mx-auto rounded-[60px] p-12 md:p-24 relative overflow-hidden text-center border ${isDarkMode ? "bg-[#0a0a0a] border-white/5" : "bg-white border-slate-200 shadow-2xl"}`}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent opacity-50 pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full"></div>

          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter italic leading-none">
              Prêt à sculpter <br />
              <span className="text-[#00D9FF]">votre succès ?</span>
            </h2>

            <p className="opacity-50 max-w-2xl mx-auto text-lg md:text-xl font-light italic leading-relaxed">
              Rejoignez les établissements qui redéfinissent les standards de la
              gastronomie moderne. RestoPay est plus qu'un outil, c'est votre
              nouvel avantage compétitif.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-12 py-6 bg-[#00D9FF] text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all text-center"
              >
                Démarrer l'expérience
              </Link>

              <button
                className={`w-full sm:w-auto px-12 py-6 rounded-2xl border font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-white/5 ${isDarkMode ? "border-white/10 text-white" : "border-slate-200 text-slate-900"}`}
              >
                Voir la démo live
              </button>
            </div>

            <div className="pt-12 flex flex-wrap items-center justify-center gap-8 opacity-30 grayscale">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                Disponible sur
              </p>
              <div className="flex gap-6">
                <span className="font-black italic text-xl">Cloud</span>
                <span className="font-black italic text-xl">Desktop</span>
                <span className="font-black italic text-xl">Mobile</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section
        id="pricing"
        className="py-32 px-[8%] max-w-7xl mx-auto text-left"
      >
        <div className="text-center mb-20 space-y-3">
          <h2 className="text-4xl font-black tracking-tight text-left lg:text-center">
            Investissez dans votre Vision.
          </h2>
          <p className="opacity-50 font-light text-left lg:text-center">
            Le luxe de la sérénité à un prix transparent.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <PriceCard
            isDarkMode={isDarkMode}
            title="Essence"
            price="Gratuit"
            period="7 jours"
            desc="Découvrez le potentiel de RestoPay sans limites."
            icon={<Zap size={24} />}
          />
          <PriceCard
            isDarkMode={isDarkMode}
            title="Signature"
            price="15.000"
            period="FCFA / mois"
            desc="La formule préférée des établissements de prestige."
            highlight={true}
            icon={<Star size={24} />}
          />
          <PriceCard
            isDarkMode={isDarkMode}
            title="Elite"
            price="150.000"
            period="FCFA / an"
            desc="Priorité absolue et économies substantielles."
            icon={<Crown size={24} />}
          />
        </div>
      </section>

      {/* --- TÉMOIGNAGES--- */}
      <section
        id="testimonials"
        className={`py-32 px-[8%] transition-colors ${isDarkMode ? "bg-[#050505]" : "bg-white shadow-inner"}`}
      >
        <div className="max-w-7xl mx-auto text-center space-y-16">
          <h2 className="text-4xl font-black tracking-tighter italic text-left lg:text-center">
            "Un tournant pour nos établissements."
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Mr Kouadio"
              role="Gérante à Cocody"
              image="https://i.pravatar.cc/150?u=kouadio"
              text="Le point de fin de journée est devenu un moment de plaisir. Tout est clair et précis."
            />
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Jeanne"
              role="Propriétaire Groupe"
              image="https://i.pravatar.cc/150?u=jeanmarc"
              text="Je pilote mes 3 restaurants depuis mon smartphone avec une aisance incroyable."
            />
            <TestimonialCard
              isDarkMode={isDarkMode}
              name="Bianca."
              role="Hôtellerie Dakar"
              image="https://i.pravatar.cc/150?u=fatou"
              text="Le support VIP est exceptionnel. On sent que RestoPay comprend nos besoins réels."
            />
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
              <span>RestoPay</span>
            </div>
            <p className="text-sm opacity-50 max-w-xs leading-relaxed font-light text-left">
              L'élégance technologique au service de la gastronomie africaine.
            </p>
          </div>
          <div className="space-y-6 text-left">
            <h4 className="font-black text-lg uppercase tracking-widest text-cyan-500 text-left">
              Contact
            </h4>
            <div className="space-y-2 opacity-60 text-sm text-left">
                <p className="opacity-40 hover:opacity-100 transition-opacity">
                    <a 
                        href="mailto:srestopay@gmail.com" 
                        className="text-[#00D9FF] font-black  tracking-widest text-[15px] no-underline">
                                       srestopay@gmail.com
                    </a>
                </p>
              <p>Plateau, Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
          <div className="space-y-6 flex flex-col items-start lg:items-end">
            <h4 className="font-black text-lg uppercase tracking-widest text-cyan-500">
              Suivez-nous
            </h4>
            <div className="flex gap-5">
              <SocialLink
                isDarkMode={isDarkMode}
                icon={<Facebook size={20} />}
              />
              <SocialLink
                isDarkMode={isDarkMode}
                icon={<Instagram size={20} />}
              />
              <SocialLink
                isDarkMode={isDarkMode}
                icon={<Twitter size={20} />}
              />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">
          <p>© 2026 RestoPay Africa. Tous droits réservés.</p>
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
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

{
  /* --- SOUS-COMPOSANTS --- */
}

function PriceCard({
  isDarkMode,
  title,
  price,
  period,
  desc,
  highlight,
  icon,
}) {
  return (
    <div
      className={`relative p-12 rounded-[50px] border transition-all duration-700 flex flex-col text-left ${highlight ? "border-[#00D9FF] scale-105 shadow-3xl shadow-cyan-500/10 z-10" : "border-slate-500/10 opacity-80 hover:opacity-100"} ${isDarkMode ? (highlight ? "bg-white/[0.04]" : "bg-transparent") : "bg-white"}`}
    >
      {highlight && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-xl text-center">
          Prestige
        </div>
      )}
      <div
        className={`mb-8 w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-500/5 shadow-inner`}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-2 tracking-tight text-left">
        {title}
      </h3>
      <div className="mb-6 text-left">
        <span className="text-4xl font-black italic">{price}</span>
        <span className="text-xs opacity-40 ml-2 font-medium">{period}</span>
      </div>
      <p className="text-sm mb-10 flex-grow leading-relaxed opacity-50 font-light italic text-left">
        {desc}
      </p>
      <button
        className={`w-full py-5 rounded-full font-black transition-all text-xs tracking-widest uppercase ${highlight ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-white hover:shadow-cyan-500/40 shadow-xl" : isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
      >
        Sélectionner
      </button>
    </div>
  );
}

function TestimonialCard({ isDarkMode, name, role, text, image }) {
  return (
    <div
      className={`p-10 rounded-[40px] border transition-all text-left group ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100 shadow-sm"}`}
    >
      <div className="flex gap-1 text-cyan-500 mb-8 opacity-50 group-hover:opacity-100 transition-opacity">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill="currentColor" />
        ))}
      </div>
      <p className="mb-10 italic leading-relaxed opacity-60 font-light text-lg text-left">
        "{text}"
      </p>
      <div className="flex items-center gap-4 text-left">
        <img
          src={image}
          alt={name}
          className="w-12 h-12 rounded-full grayscale group-hover:grayscale-0 transition-all border border-cyan-500/30 shadow-md"
        />
        <div>
          <p className="font-black text-sm tracking-tight">{name}</p>
          <p className="text-[10px] opacity-30 uppercase tracking-[0.2em] font-bold">
            {role}
          </p>
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