// Interface translations. Add a language by adding one object here; missing keys fall back to English.
import { formTranslations } from "./formTranslations.js";
import { aiTranslations } from "./aiTranslations.js";
import { v9Translations } from "./v9Translations.js";
import { v15Translations } from "./v15Translations.js";

export const LANGUAGES = { en: "English", ur: "اردو", sd: "سنڌي", es: "Español", fr: "Français" };

export const translations = {
  en: {
    "nav.about": "About", "nav.contact": "Contact", "nav.leaderboard": "Leaderboard",
    "nav.donorLogin": "Donor login", "nav.patientLogin": "Patient login", "nav.hospitalLogin": "Hospital login",
    "nav.dashboard": "My dashboard", "nav.logout": "Log out",
    "hero.eyebrow": "Blood bank & donor network",
    "hero.title": "Every two seconds, someone needs blood.",
    "hero.lede": "LifeFlow is a modern blood bank platform that checks real hospital stock first, and only reaches out to the nearest matching donors for whatever is genuinely still short.",
    "stat.donors": "registered donors", "stat.hospitals": "partner hospitals", "stat.bags": "bags donated", "stat.rating": "average platform rating",
    "about.title": "One shared, transparent record for every donation",
    "start.title": "Join LifeFlow in the way that fits you",
    "start.donor": "Become a donor", "start.need": "I need blood", "start.hospital": "Register hospital",
    "why.title": "Built for the moment blood is needed most",
    "how.title": "How the app works", "how.donors": "For donors", "how.seekers": "For hospitals & patients",
    "contact.title": "Talk to the LifeFlow team",
    "ai.title": "Responsible AI", "ai.subtitle": "AI helps people; it never decides for them.",
    "footer.involved": "Get involved", "footer.explore": "Explore", "footer.contact": "Contact",
    "footer.tagline": "A modern blood bank and donor network connecting patients, hospitals, and donors in real time.",
    "offline": "You're offline — showing saved pages. Actions will be sent when you're back online.",
    "push.enable": "Enable alerts", "push.on": "Alerts on",
  },
  ur: {
    "nav.about": "ہمارے بارے میں", "nav.contact": "رابطہ", "nav.leaderboard": "لیڈر بورڈ",
    "nav.donorLogin": "ڈونر لاگ اِن", "nav.patientLogin": "مریض لاگ اِن", "nav.hospitalLogin": "ہسپتال لاگ اِن",
    "nav.dashboard": "میرا ڈیش بورڈ", "nav.logout": "لاگ آؤٹ",
    "hero.eyebrow": "بلڈ بینک اور ڈونر نیٹ ورک",
    "hero.title": "ہر دو سیکنڈ میں کسی کو خون کی ضرورت ہوتی ہے۔",
    "hero.lede": "لائف فلو ایک جدید بلڈ بینک پلیٹ فارم ہے جو پہلے ہسپتالوں کا اصل اسٹاک دیکھتا ہے، اور صرف کمی کے لیے قریبی موزوں ڈونرز سے رابطہ کرتا ہے۔",
    "stat.donors": "رجسٹرڈ ڈونرز", "stat.hospitals": "شراکت دار ہسپتال", "stat.bags": "عطیہ کیے گئے بیگ", "stat.rating": "اوسط ریٹنگ",
    "about.title": "ہر عطیے کا ایک مشترکہ، شفاف ریکارڈ",
    "start.title": "اپنے مطابق لائف فلو میں شامل ہوں",
    "start.donor": "ڈونر بنیں", "start.need": "مجھے خون چاہیے", "start.hospital": "ہسپتال رجسٹر کریں",
    "why.title": "اس لمحے کے لیے بنایا گیا جب خون سب سے زیادہ درکار ہو",
    "how.title": "ایپ کیسے کام کرتی ہے", "how.donors": "ڈونرز کے لیے", "how.seekers": "ہسپتالوں اور مریضوں کے لیے",
    "contact.title": "لائف فلو ٹیم سے بات کریں",
    "ai.title": "ذمہ دار اے آئی", "ai.subtitle": "اے آئی لوگوں کی مدد کرتی ہے؛ فیصلہ ان کا اپنا رہتا ہے۔",
    "footer.involved": "شامل ہوں", "footer.explore": "مزید دیکھیں", "footer.contact": "رابطہ",
    "footer.tagline": "ایک جدید بلڈ بینک جو مریضوں، ہسپتالوں اور ڈونرز کو فوری طور پر جوڑتا ہے۔",
    "offline": "آپ آف لائن ہیں — محفوظ صفحات دکھائے جا رہے ہیں۔ انٹرنیٹ آنے پر عمل بھیج دیے جائیں گے۔",
    "push.enable": "الرٹس آن کریں", "push.on": "الرٹس آن ہیں",
  },
  sd: {
    "nav.about": "اسان بابت", "nav.contact": "رابطو", "nav.leaderboard": "ليڊر بورڊ",
    "nav.donorLogin": "ڊونر لاگ اِن", "nav.patientLogin": "مريض لاگ اِن", "nav.hospitalLogin": "اسپتال لاگ اِن",
    "nav.dashboard": "منھنجو ڊيش بورڊ", "nav.logout": "لاگ آئوٽ",
    "hero.eyebrow": "بلڊ بئنڪ ۽ ڊونر نيٽ ورڪ",
    "hero.title": "هر ٻن سيڪنڊن ۾ ڪنھن کي رت جي ضرورت پوي ٿي.",
    "hero.lede": "لائف فلو هڪ جديد بلڊ بئنڪ پليٽ فارم آهي جيڪو پهرين اسپتالن جو اصل اسٽاڪ ڏسي ٿو، ۽ رڳو کوٽ لاءِ ويجهن مناسب ڊونرز سان رابطو ڪري ٿو.",
    "stat.donors": "رجسٽرڊ ڊونرز", "stat.hospitals": "ڀائيوار اسپتال", "stat.bags": "ڏنل بيگ", "stat.rating": "اوسط ريٽنگ",
    "about.title": "هر عطيي جو هڪ گڏيل، شفاف رڪارڊ",
    "start.title": "پنھنجي مطابق لائف فلو ۾ شامل ٿيو",
    "start.donor": "ڊونر بڻجو", "start.need": "مون کي رت گهرجي", "start.hospital": "اسپتال رجسٽر ڪريو",
    "why.title": "ان گهڙيءَ لاءِ ٺهيل جڏهن رت سڀ کان وڌيڪ گهربل هجي",
    "how.title": "ايپ ڪيئن ڪم ڪري ٿي", "how.donors": "ڊونرز لاءِ", "how.seekers": "اسپتالن ۽ مريضن لاءِ",
    "contact.title": "لائف فلو ٽيم سان ڳالهايو",
    "ai.title": "ذميوار اي آءِ", "ai.subtitle": "اي آءِ ماڻھن جي مدد ڪري ٿي؛ فيصلو انھن جو پنھنجو رهي ٿو.",
    "footer.involved": "شامل ٿيو", "footer.explore": "وڌيڪ ڏسو", "footer.contact": "رابطو",
    "footer.tagline": "هڪ جديد بلڊ بئنڪ جيڪو مريضن، اسپتالن ۽ ڊونرز کي فوري طور ڳنڍي ٿو.",
    "offline": "توهان آف لائن آهيو — محفوظ صفحا ڏيکاريا پيا وڃن. انٽرنيٽ ايندي ئي ڪم موڪليا ويندا.",
    "push.enable": "الرٽ آن ڪريو", "push.on": "الرٽ آن آهن",
  },
  es: {
    "nav.about": "Acerca de", "nav.contact": "Contacto", "nav.leaderboard": "Clasificación",
    "nav.donorLogin": "Acceso donante", "nav.patientLogin": "Acceso paciente", "nav.hospitalLogin": "Acceso hospital",
    "nav.dashboard": "Mi panel", "nav.logout": "Cerrar sesión",
    "hero.eyebrow": "Banco de sangre y red de donantes",
    "hero.title": "Cada dos segundos, alguien necesita sangre.",
    "hero.lede": "LifeFlow es una plataforma moderna de banco de sangre que primero revisa el stock real de los hospitales y solo contacta a los donantes cercanos para lo que realmente falta.",
    "stat.donors": "donantes registrados", "stat.hospitals": "hospitales asociados", "stat.bags": "bolsas donadas", "stat.rating": "valoración media",
    "about.title": "Un registro compartido y transparente de cada donación",
    "start.title": "Únete a LifeFlow de la forma que mejor te convenga",
    "start.donor": "Ser donante", "start.need": "Necesito sangre", "start.hospital": "Registrar hospital",
    "why.title": "Creado para el momento en que más se necesita sangre",
    "how.title": "Cómo funciona la app", "how.donors": "Para donantes", "how.seekers": "Para hospitales y pacientes",
    "contact.title": "Habla con el equipo de LifeFlow",
    "ai.title": "IA responsable", "ai.subtitle": "La IA ayuda a las personas; nunca decide por ellas.",
    "footer.involved": "Participa", "footer.explore": "Explorar", "footer.contact": "Contacto",
    "footer.tagline": "Un banco de sangre moderno que conecta pacientes, hospitales y donantes en tiempo real.",
    "offline": "Sin conexión — mostrando páginas guardadas. Las acciones se enviarán al volver a conectarte.",
    "push.enable": "Activar alertas", "push.on": "Alertas activas",
  },
  fr: {
    "nav.about": "À propos", "nav.contact": "Contact", "nav.leaderboard": "Classement",
    "nav.donorLogin": "Connexion donneur", "nav.patientLogin": "Connexion patient", "nav.hospitalLogin": "Connexion hôpital",
    "nav.dashboard": "Mon tableau de bord", "nav.logout": "Se déconnecter",
    "hero.eyebrow": "Banque de sang et réseau de donneurs",
    "hero.title": "Toutes les deux secondes, quelqu'un a besoin de sang.",
    "hero.lede": "LifeFlow est une plateforme moderne de banque de sang qui vérifie d'abord les stocks réels des hôpitaux, puis ne contacte les donneurs proches que pour le manque réel.",
    "stat.donors": "donneurs inscrits", "stat.hospitals": "hôpitaux partenaires", "stat.bags": "poches données", "stat.rating": "note moyenne",
    "about.title": "Un dossier partagé et transparent pour chaque don",
    "start.title": "Rejoignez LifeFlow à votre façon",
    "start.donor": "Devenir donneur", "start.need": "J'ai besoin de sang", "start.hospital": "Inscrire un hôpital",
    "why.title": "Conçu pour le moment où le sang est le plus nécessaire",
    "how.title": "Comment fonctionne l'application", "how.donors": "Pour les donneurs", "how.seekers": "Pour les hôpitaux et patients",
    "contact.title": "Parlez à l'équipe LifeFlow",
    "ai.title": "IA responsable", "ai.subtitle": "L'IA aide les personnes ; elle ne décide jamais à leur place.",
    "footer.involved": "S'impliquer", "footer.explore": "Explorer", "footer.contact": "Contact",
    "footer.tagline": "Une banque de sang moderne qui relie patients, hôpitaux et donneurs en temps réel.",
    "offline": "Hors ligne — pages enregistrées affichées. Les actions seront envoyées au retour de la connexion.",
    "push.enable": "Activer les alertes", "push.on": "Alertes activées",
  },
};

// Merge the form / dashboard sentences into each language.
Object.keys(formTranslations).forEach((lang) => {
  translations[lang] = { ...(translations[lang] || {}), ...formTranslations[lang] };
});

// v6 AI feature sentences (weekly report, ETA, camp predictor, voice assistant, slip scanner, health chat).
Object.keys(aiTranslations).forEach((lang) => {
  translations[lang] = { ...(translations[lang] || {}), ...aiTranslations[lang] };
});

// v9: install banner, backups, and the sentences that were still English in Urdu / Sindhi.
Object.keys(v15Translations).forEach((lang) => {
  translations[lang] = { ...(translations[lang] || {}), ...v15Translations[lang] };
});
Object.keys(v9Translations).forEach((lang) => {
  translations[lang] = { ...(translations[lang] || {}), ...v9Translations[lang] };
});
