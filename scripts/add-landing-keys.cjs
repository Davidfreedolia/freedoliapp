/**
 * add-landing-keys.cjs — adds Landing v2 i18n keys to all 3 locale files.
 * Run: node scripts/add-landing-keys.cjs
 */
const fs = require('fs')
const path = require('path')

const base = path.join(__dirname, '..', 'src', 'i18n', 'locales')

const translations = {
  es: {
    hero: {
      title: 'Gestiona tu negocio Amazon FBA desde un solo lugar',
      subtitle: 'Pipeline visual, calculadora de rentabilidad FBA, importación desde 16 herramientas y análisis IA. Todo integrado.',
      cta_primary: 'Empezar gratis',
      cta_secondary: 'Ver demo',
    },
    logos: { label: 'Importación compatible con:' },
    feature1: { title: 'Dashboard en tiempo real', text: 'Revenue, beneficio, margen neto e inventario — todo de un vistazo.' },
    feature2: { title: 'Pipeline de productos visual', text: 'Kanban con drag & drop, 7 fases del ciclo del producto.' },
    feature3: { title: 'Investigación con IA', text: 'La IA analiza ASINs, busca proveedores y genera informes de viabilidad.' },
    feature4: { title: 'Importa desde 16 herramientas', text: 'Migra de Sellerboard, Helium 10, Holded o cualquier Excel en minutos.' },
    feature5: { title: 'Finanzas desglosadas', text: 'COGS, fees FBA, PPC, envíos y devoluciones — separados por producto.' },
    feature6: { title: 'Asistente integrado', text: 'Responde tus dudas según la página donde estés. Sin esperas.' },
    visual_a: {
      title: 'Todo tu negocio Amazon en un solo lugar',
      text: 'Deja de alternar entre 10 herramientas. FreedoliApp centraliza tus datos en un dashboard único, en tiempo real.',
    },
    visual_b: {
      title: 'Decisión en 5 minutos, no en 5 horas',
      text: 'La IA calcula la rentabilidad real con tarifas FBA actualizadas y te dice si vale la pena invertir.',
    },
    step1: { title: 'Regístrate', text: 'Crea tu cuenta en 30 segundos' },
    step2: { title: 'Conecta', text: 'Importa desde Sellerboard, Helium 10 o Excel' },
    step3: { title: 'Analiza', text: 'La IA analiza productos y proveedores automáticamente' },
    step4: { title: 'Gestiona', text: 'Pipeline visual, finanzas y inventario centralizado' },
    step5: { title: 'Crece', text: 'Decide con datos, no con intuición' },
    how_it_works: { title: '¿Cómo funciona?' },
    testimonials: { title: 'Lo que dicen nuestros sellers' },
    testimonial_1: { name: 'Carlos M.', role: 'Seller Amazon ES · 3 años', text: 'Antes tardaba 2h en hacer el P&L mensual. Ahora lo veo en el dashboard en 10 segundos. No volvería atrás.' },
    testimonial_2: { name: 'Laura G.', role: 'Seller Amazon DE · 5 años', text: 'La calculadora FBA es increíble. Me dice exactamente qué margen tengo antes de hacer el pedido.' },
    testimonial_3: { name: 'Miquel F.', role: 'Seller Amazon FR+ES · 2 años', text: 'La importación desde Sellerboard fue instantánea. Todo mapeado, sin tocar nada a mano.' },
    testimonial_4: { name: 'Ana P.', role: 'Seller Amazon IT · 4 años', text: 'El pipeline visual me cambia la vida. Sé exactamente en qué fase está cada producto y quién tiene la pelota.' },
    testimonial_5: { name: 'Jordi B.', role: 'Seller Amazon UK · 1 año', text: 'Migré de 4 herramientas a FreedoliApp en un fin de semana. La IA de investigación superó mis expectativas.' },
    testimonial_6: { name: 'Sara V.', role: 'Seller Amazon ES · 6 años', text: 'El asistente contextual siempre sabe exactamente lo que necesito según la página donde estoy.' },
    testimonial_7: { name: 'Marc T.', role: 'Seller Amazon DE+FR · 3 años', text: 'Por primera vez tengo las finanzas de Amazon ordenadas de verdad. COGS, fees, PPC, todo por producto.' },
    testimonial_8: { name: 'Elena R.', role: 'Seller Amazon ES · 2 años', text: 'La IA me encontró un proveedor en 1688 que nunca habría encontrado sola. ROI brutal el primer mes.' },
  },

  en: {
    hero: {
      title: 'Manage your Amazon FBA business from one place',
      subtitle: 'Visual pipeline, FBA profitability calculator, import from 16 tools and AI analysis. All integrated.',
      cta_primary: 'Start for free',
      cta_secondary: 'Watch demo',
    },
    logos: { label: 'Compatible with:' },
    feature1: { title: 'Real-time Dashboard', text: 'Revenue, profit, net margin and inventory — all at a glance.' },
    feature2: { title: 'Visual Product Pipeline', text: 'Kanban with drag & drop, 7 product lifecycle phases.' },
    feature3: { title: 'AI-Powered Research', text: 'AI analyses ASINs, finds suppliers and generates viability reports.' },
    feature4: { title: 'Import from 16 Tools', text: 'Migrate from Sellerboard, Helium 10, Holded or any Excel in minutes.' },
    feature5: { title: 'Detailed Finances', text: 'COGS, FBA fees, PPC, shipping and returns — separated by product.' },
    feature6: { title: 'Built-in Assistant', text: "Answers your questions based on the page you're on. No waiting." },
    visual_a: {
      title: 'All your Amazon business in one place',
      text: 'Stop switching between 10 tools. FreedoliApp centralises your data in a single real-time dashboard.',
    },
    visual_b: {
      title: 'Decision in 5 minutes, not 5 hours',
      text: "AI calculates real profitability with updated FBA fees and tells you whether it's worth investing.",
    },
    step1: { title: 'Sign up', text: 'Create your account in 30 seconds' },
    step2: { title: 'Connect', text: 'Import from Sellerboard, Helium 10 or Excel' },
    step3: { title: 'Analyse', text: 'AI analyses products and suppliers automatically' },
    step4: { title: 'Manage', text: 'Visual pipeline, finances and centralised inventory' },
    step5: { title: 'Grow', text: 'Decide with data, not intuition' },
    how_it_works: { title: 'How does it work?' },
    testimonials: { title: 'What our sellers say' },
    testimonial_1: { name: 'Carlos M.', role: 'Seller Amazon ES · 3 years', text: 'I used to spend 2h doing the monthly P&L. Now I see it on the dashboard in 10 seconds. No going back.' },
    testimonial_2: { name: 'Laura G.', role: 'Seller Amazon DE · 5 years', text: 'The FBA calculator is incredible. It tells me exactly what margin I have before placing the order.' },
    testimonial_3: { name: 'Miquel F.', role: 'Seller Amazon FR+ES · 2 years', text: 'The import from Sellerboard was instant. Everything mapped, without touching anything manually.' },
    testimonial_4: { name: 'Ana P.', role: 'Seller Amazon IT · 4 years', text: 'The visual pipeline changes my life. I know exactly which phase each product is in.' },
    testimonial_5: { name: 'Jordi B.', role: 'Seller Amazon UK · 1 year', text: 'I migrated from 4 tools to FreedoliApp in a weekend. The AI research exceeded my expectations.' },
    testimonial_6: { name: 'Sara V.', role: 'Seller Amazon ES · 6 years', text: "The contextual assistant always knows exactly what I need based on the page I'm on." },
    testimonial_7: { name: 'Marc T.', role: 'Seller Amazon DE+FR · 3 years', text: 'For the first time I have Amazon finances properly organised. COGS, fees, PPC, all by product.' },
    testimonial_8: { name: 'Elena R.', role: 'Seller Amazon ES · 2 years', text: 'The AI found me a supplier on 1688 I would never have found alone. Brutal ROI the first month.' },
  },

  ca: {
    hero: {
      title: "Gestiona el teu negoci Amazon FBA des d'un sol lloc",
      subtitle: "Pipeline visual, calculadora de rendibilitat FBA, importació des de 16 eines i anàlisi IA. Tot integrat.",
      cta_primary: 'Comença gratis',
      cta_secondary: 'Veure demo',
    },
    logos: { label: 'Importació compatible amb:' },
    feature1: { title: 'Dashboard en temps real', text: "Revenue, benefici, marge net i inventari — tot d'un cop d'ull." },
    feature2: { title: 'Pipeline de productes visual', text: 'Kanban amb drag & drop, 7 fases del cicle del producte.' },
    feature3: { title: 'Recerca amb IA', text: 'La IA analitza ASINs, troba proveïdors i genera informes de viabilitat.' },
    feature4: { title: 'Importa des de 16 eines', text: 'Migra de Sellerboard, Helium 10, Holded o qualsevol Excel en minuts.' },
    feature5: { title: 'Finances desglossades', text: 'COGS, fees FBA, PPC, enviaments i devolucions — per producte.' },
    feature6: { title: 'Assistent integrat', text: 'Respon les teves dubtes segons la pàgina on estiguis. Sense esperes.' },
    visual_a: {
      title: 'Tot el teu negoci Amazon en un sol lloc',
      text: "Deixa d'alternar entre 10 eines. FreedoliApp centralitza les teves dades en un dashboard únic, en temps real.",
    },
    visual_b: {
      title: 'Decisió en 5 minuts, no en 5 hores',
      text: 'La IA calcula la rendibilitat real amb tarifes FBA actualitzades i et diu si val la pena invertir.',
    },
    step1: { title: "Registra't", text: 'Crea el teu compte en 30 segons' },
    step2: { title: 'Connecta', text: 'Importa des de Sellerboard, Helium 10 o Excel' },
    step3: { title: 'Analitza', text: 'La IA analitza productes i proveïdors automàticament' },
    step4: { title: 'Gestiona', text: 'Pipeline visual, finances i inventari centralitzat' },
    step5: { title: 'Creix', text: 'Decideix amb dades, no amb intuïció' },
    how_it_works: { title: 'Com funciona?' },
    testimonials: { title: 'El que diuen els nostres sellers' },
    testimonial_1: { name: 'Carlos M.', role: 'Seller Amazon ES · 3 anys', text: 'Abans tardava 2h a fer el P&L mensual. Ara ho veig al dashboard en 10 segons. No tornaria enrere.' },
    testimonial_2: { name: 'Laura G.', role: 'Seller Amazon DE · 5 anys', text: 'La calculadora FBA és increïble. Em diu exactament quin marge tinc abans de fer la comanda.' },
    testimonial_3: { name: 'Miquel F.', role: 'Seller Amazon FR+ES · 2 anys', text: 'La importació des de Sellerboard va ser instantània. Tot mapejat, sense tocar res a mà.' },
    testimonial_4: { name: 'Ana P.', role: 'Seller Amazon IT · 4 anys', text: 'El pipeline visual em canvia la vida. Sé exactament en quina fase és cada producte i qui té la pilota.' },
    testimonial_5: { name: 'Jordi B.', role: 'Seller Amazon UK · 1 any', text: 'Vaig migrar de 4 eines a FreedoliApp en un cap de setmana. La IA de recerca va superar les meves expectatives.' },
    testimonial_6: { name: 'Sara V.', role: 'Seller Amazon ES · 6 anys', text: "L'assistent contextual sempre sap exactament el que necessito segons la pàgina on estic." },
    testimonial_7: { name: 'Marc T.', role: 'Seller Amazon DE+FR · 3 anys', text: "Per primera vegada tinc les finances d'Amazon ordenades de debò. COGS, fees, PPC, tot per producte." },
    testimonial_8: { name: 'Elena R.', role: 'Seller Amazon ES · 2 anys', text: 'La IA em va trobar un proveïdor a 1688 que mai hauria trobat sola. ROI brutal el primer mes.' },
  },
}

;['es', 'en', 'ca'].forEach((lang) => {
  const file = path.join(base, lang + '.json')
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  Object.assign(data, translations[lang])
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  console.log(lang + ': +' + Object.keys(translations[lang]).length + ' keys → total ' + Object.keys(data).length)
})
