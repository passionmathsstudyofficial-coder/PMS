import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  Layers,
  ListOrdered,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MathFormula } from '@/components/content/MathFormula.jsx';
import { SOCIAL_ICONS } from '@/components/site/SocialIcons.jsx';
import { Button } from '@/components/ui/button';
import { HeroSection } from './HeroSection.jsx';
import { ReferenceBooksSection } from './Sections.jsx';


const CLASSES_DATA = [
  {
    number: 10,
    titleHi: uiText("कक्षा 10 गणित"),
    titleEn: uiText("Class 10 Maths"),
    get badge() { return uiText("बोर्ड परीक्षा 2025"); },
    color: 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30',
    tag: 'Board Special',
    topics: [uiText("वास्तविक संख्याएँ"), uiText("द्विघात समीकरण"), uiText("समांतर श्रेढ़ी (AP)"), uiText("त्रिकोणमिति")],
    url: '/class-10/maths',
    featured: true,
  },
  {
    number: 12,
    titleHi: uiText("कक्षा 12 गणित"),
    titleEn: uiText("Class 12 Maths"),
    get badge() { return uiText("सीनियर सेकेंडरी"); },
    color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
    tag: 'Calculus Special',
    topics: [uiText("संबंध एवं फलन"), uiText("आव्यूह व सारणिक"), uiText("सांतत्य एवं अवकलनीयता"), uiText("समाकलन")],
    url: '/class-12/maths',
    featured: true,
  },
  {
    number: 11,
    titleHi: uiText("कक्षा 11 गणित"),
    titleEn: uiText("Class 11 Maths"),
    get badge() { return uiText("फाउंडेशन"); },
    color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
    topics: [uiText("समुच्चय व संबंध"), uiText("त्रिकोणमितीय फलन"), uiText("सम्मिश्र संख्याएँ"), uiText("अनुक्रम तथा श्रेणी")],
    url: '/class-11/maths',
  },
  {
    number: 9,
    titleHi: uiText("कक्षा 9 गणित"),
    titleEn: uiText("Class 9 Maths"),
    get badge() { return uiText("माध्यमिक"); },
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    topics: [uiText("संख्या पद्धति"), uiText("बहुपद"), uiText("निर्देशांक ज्यामिति"), uiText("त्रिभुज एवं वृत्त")],
    url: '/class-9/maths',
  },
  {
    number: 8,
    titleHi: uiText("कक्षा 8 गणित"),
    titleEn: uiText("Class 8 Maths"),
    get badge() { return uiText("उच्च प्राथमिक"); },
    color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
    topics: [uiText("परिमेय संख्याएँ"), uiText("एक चर वाले रैखिक समीकरण"), uiText("चतुर्भुजों को समझना"), uiText("क्षेत्रमिति")],
    url: '/class-8/maths',
  },
  {
    number: 7,
    titleHi: uiText("कक्षा 7 गणित"),
    titleEn: uiText("Class 7 Maths"),
    get badge() { return uiText("उच्च प्राथमिक"); },
    color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30',
    topics: [uiText("पूर्णांक"), uiText("भिन्न एवं दशमलव"), uiText("सरल समीकरण"), uiText("रेखाएँ एवं कोण")],
    url: '/class-7/maths',
  },
  {
    number: 6,
    titleHi: uiText("कक्षा 6 गणित"),
    titleEn: uiText("Class 6 Maths"),
    get badge() { return uiText("आरंभिक गणित"); },
    color: 'from-teal-500/20 to-emerald-500/20 text-teal-400 border-teal-500/30',
    topics: [uiText("अपनी संख्याओं की जानकारी"), uiText("पूर्ण संख्याएँ"), uiText("संख्याओं के साथ खेलना"), uiText("आधारभूत ज्यामिति")],
    url: '/class-6/maths',
  },
];

const KEY_PILLARS = [
  {
    icon: CheckCircle2,
    get title() { return uiText("100% निःशुल्क NCERT हल"); },
    get desc() { return uiText("कक्षा 6 से 12 तक के प्रत्येक अध्याय व प्रश्नावली का संपूर्ण हल बिना किसी शुल्क के।"); },
    accent: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    icon: ListOrdered,
    get title() { return uiText("चरणबद्ध (Step-by-Step) व्याख्या"); },
    get desc() { return uiText("प्रत्येक प्रश्न में दिया है → सूत्र → गणना चरण → अंतिम उत्तर का स्पष्ट प्रारूप।"); },
    accent: 'text-brand bg-brand/10',
  },
  {
    icon: Compass,
    get title() { return uiText("सटीक आरेख व ग्राफ"); },
    get desc() { return uiText("ज्यामिति, त्रिभुज, वृत्त व ग्राफ के स्पष्ट और स्वच्छ आरेख ताकि परीक्षा में पूरे अंक मिलें।"); },
    accent: 'text-amber-500 bg-amber-500/10',
  },
  {
    icon: GraduationCap,
    get title() { return uiText("द्विभाषी अध्ययन (Hindi + English)"); },
    get desc() { return uiText("हिंदी और English माध्यम दोनों के विद्यार्थियों के लिए सरल व सुगम भाषा में सामग्री।"); },
    accent: 'text-cyan-500 bg-cyan-500/10',
  },
];

const FAQS = [
  {
    q: uiText("क्या Passion Maths Study की सभी अध्ययन सामग्री निःशुल्क है?"),
    a: uiText("हाँ! कक्षा 6 से 12 तक के सभी NCERT हल, नोट्स, महत्वपूर्ण सूत्र और वीडियो लेक्चर्स पूरी तरह से 100% निःशुल्क हैं।"),
  },
  {
    q: uiText("क्या यह नया NCERT 2024–25 पाठ्यक्रम पर आधारित है?"),
    a: uiText("हाँ, हमारी सभी प्रश्नावलियाँ और अध्याय NCERT 2024-25 के नवीनतम युक्तियुक्त (Rationalised) पाठ्यक्रम के अनुसार तैयार किए गए हैं।"),
  },
  {
    q: uiText("दैनिक अपडेट्स और नोट्स के लिए WhatsApp Channel से कैसे जुड़ें?"),
    a: uiText("पेज पर दिए गए \"Join WhatsApp Channel\" बटन पर क्लिक करें। वहाँ आपको दैनिक सूत्र पत्रक (Formula Sheets), परीक्षा सूचनाएँ और नए हल मिलेंगे।"),
  },
  {
    q: uiText("क्या गणित के सूत्र और नोट्स भी उपलब्ध हैं?"),
    a: uiText("हाँ, प्रत्येक कक्षा के लिए अध्याय-वार महत्वपूर्ण सूत्र और परीक्षा उपयोगी नोट्स व्यवस्थित रूप से उपलब्ध कराए गए हैं।"),
  },
];

export function DefaultHomeContent() {
  useUiLanguage();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="relative overflow-hidden">
      {/* ─── HERO SECTION (Modern Interactive Hero with AI Ganit Mitra) ─── */}
      <HeroSection section={{}} />

      {/* ─── WHATSAPP & COMMUNITY BANNER CARD ─── */}
      <section className="container-page -mt-8 relative z-20">
        <div className="rounded-3xl border border-[#25D366]/30 bg-gradient-to-r from-[#25D366]/15 via-card to-[#FF0000]/10 p-6 sm:p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30">
                <SOCIAL_ICONS.whatsapp className="size-8" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-extrabold sm:text-2xl">{' '}{uiText("Passion Maths Study Official Channels")}{' '}</h2>
                  <span className="rounded-full bg-[#25D366]/20 px-2.5 py-0.5 text-xs font-extrabold text-[#25D366] ring-1 ring-[#25D366]/40">{uiText("Active")}</span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{' '}{uiText("दैनिक सूत्र, नए वीडियो लेक्चर्स, NCERT अभ्यास प्रश्न और बोर्ड परीक्षा की तैयारी सामग्री सीधे प्राप्त करें।")}{' '}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://whatsapp.com/channel/0029Vb8ePtV6xCSKZnaBfu0N"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#20bd5a] hover:shadow-lg active:scale-95"
              >
                <SOCIAL_ICONS.whatsapp className="size-5" />
                <span>{uiText("Join WhatsApp Channel")}</span>
              </a>
              <a
                href="https://youtube.com/@passionmathsstudy?si=tc1BLKqOF3RTZnnc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#FF0000]/40 bg-[#FF0000]/10 px-5 py-3 text-sm font-bold text-[#FF0000] transition hover:bg-[#FF0000] hover:text-white active:scale-95"
              >
                <SOCIAL_ICONS.youtube className="size-5" />
                <span>{uiText("Subscribe YouTube")}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLASSES SHOWCASE (6 to 12) ─── */}
      <section id="classes" className="container-page scroll-mt-24 py-16 sm:py-24">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            <GraduationCap className="size-3.5" />{' '}{uiText("NCERT कक्षा 6 से 12")}{' '}</div>
          <h2 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">{' '}{uiText("अपनी कक्षा का चयन करें")}{' '}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{' '}{uiText("प्रत्येक कक्षा के अध्याय-वार संपूर्ण हल, प्रश्नावली समाधान, नोट्स और महत्वपूर्ण प्रश्न।")}{' '}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CLASSES_DATA.map((cls) => (
            <Link
              key={cls.number}
              to={cls.url}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl ${
                cls.featured ? 'ring-2 ring-brand/30 sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`grid size-12 place-items-center rounded-2xl font-heading text-lg font-black border ${cls.color}`}>
                    {cls.number}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    {uiText(cls.badge)}
                  </span>
                </div>

                <h3 className="mt-4 font-heading text-xl font-extrabold group-hover:text-brand transition">
                  {uiText(cls.titleHi)}
                </h3>

                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {cls.topics.map((t, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-brand/60" />
                      <span>{uiText(t)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4 text-xs font-bold text-brand">
                <span>{uiText("समाधान देखें")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── REFERENCE BOOKS SHOWCASE ─── */}
      <ReferenceBooksSection section={{}} />

      {/* ─── KEY PILLARS / WHY PMS ─── */}
      <section className="border-y bg-muted/30 py-16 sm:py-24">
        <div className="container-page">
          <div className="text-center">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{' '}{uiText("विशेषताएँ")}{' '}</span>
            <h2 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">{' '}{uiText("Passion Maths Study क्यों चुनें?")}{' '}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{' '}{uiText("गणित को कठिन नहीं, रोचक और समझने में आसान बनाने के लिए तैयार की गई विशेष शिक्षण पद्धति।")}{' '}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="rounded-3xl border bg-card p-6 shadow-sm transition hover:shadow-md">
                  <span className={`grid size-12 place-items-center rounded-2xl ${p.accent}`}>
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-bold">{p.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── QUICK FORMULA PREVIEW ─── */}
      <section className="container-page py-16 sm:py-20">
        <div className="rounded-3xl border bg-gradient-to-br from-card via-muted/40 to-card p-6 sm:p-10 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{' '}{uiText("महत्वपूर्ण सूत्र झलक")}{' '}</span>
              <h2 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">{' '}{uiText("कक्षा 10 व 12 के सबसे महत्वपूर्ण सूत्र")}{' '}</h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{' '}{uiText("परीक्षा में सीधे पूछे जाने वाले और प्रश्नों को हल करने के मुख्य नियम।")}{' '}</p>
            </div>
            <Button asChild size="default" className="rounded-xl font-bold self-start lg:self-auto">
              <Link to="/class-10/maths">{uiText("सभी सूत्र एवं नोट्स देखें")}</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/80 p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground">{uiText("समांतर श्रेढ़ी (AP) n-वाँ पद")}</p>
              <div className="mt-3">
                <MathFormula latex="a_n = a + (n-1)d" display={true} />
              </div>
            </div>
            <div className="rounded-2xl border bg-background/80 p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground">{uiText("त्रिकोणमितीय सर्वसमिका")}</p>
              <div className="mt-3">
                <MathFormula latex="\sin^2\theta + \cos^2\theta = 1" display={true} />
              </div>
            </div>
            <div className="rounded-2xl border bg-background/80 p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground">{uiText("द्विघात सूत्र (श्रीधराचार्य)")}</p>
              <div className="mt-3">
                <MathFormula latex="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" display={true} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section className="border-t bg-muted/20 py-16 sm:py-24">
        <div className="container-page max-w-3xl">
          <div className="text-center">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{' '}{uiText("संदेह निवारण")}{' '}</span>
            <h2 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">{' '}{uiText("अक्सर पूछे जाने वाले प्रश्न (FAQ)")}{' '}</h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => (
              <div key={index} className="rounded-2xl border bg-card p-4 transition-all">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="flex w-full items-center justify-between text-left text-sm font-bold sm:text-base"
                >
                  <span>{uiText(faq.q)}</span>
                  <ChevronDown
                    className={`size-5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      openFaq === index ? 'rotate-180 text-brand' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {uiText(faq.a)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
