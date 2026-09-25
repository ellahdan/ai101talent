import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { defineText, useT } from '@/i18n'

const text = defineText({
  eyebrow: 'Common questions',
  heading: "Let's clear things up.",
  faqs: [
  ['How does AI101 Talents work?', 'Create a profile, browse opportunities, and connect with teams looking for your skills.'],
  ['Is my profile visible to everyone?', 'You control your visibility. Companies see relevant information before an introduction is approved.'],
  ['What makes a good profile?', 'Show your strongest skills, the outcomes you have delivered, and the kind of work you want next.'],
  ['Can companies contact me directly?', 'No. Companies send a request to our team. We review it, forward it to you, and only make an introduction if you accept.'],
  ['What is my applicant number?', 'Every candidate gets a unique number like AI101-000123. Use it when you get in touch with us about your profile or applications.'],
  ],
}, {
  eyebrow: 'Häufige Fragen',
  heading: 'Wir klären das.',
  faqs: [
    ['Wie funktioniert AI101 Talents?', 'Erstellen Sie ein Profil, entdecken Sie Stellen und vernetzen Sie sich mit Teams, die Ihre Fähigkeiten suchen.'],
    ['Ist mein Profil für alle sichtbar?', 'Sie bestimmen Ihre Sichtbarkeit. Unternehmen sehen nur anonymisierte, relevante Informationen, bevor eine Vorstellung freigegeben wird.'],
    ['Was macht ein gutes Profil aus?', 'Zeigen Sie Ihre stärksten Fähigkeiten, die Ergebnisse, die Sie erzielt haben, und welche Arbeit Sie als Nächstes suchen.'],
    ['Können Unternehmen mich direkt kontaktieren?', 'Nein. Unternehmen senden eine Anfrage an unser Team. Wir prüfen sie, leiten sie an Sie weiter und stellen Sie nur vor, wenn Sie zustimmen.'],
    ['Was ist meine Bewerbernummer?', 'Jeder Kandidat erhält eine eindeutige Nummer wie AI101-000123. Geben Sie sie an, wenn Sie uns zu Ihrem Profil oder Ihren Bewerbungen kontaktieren.'],
  ],
})

export function Faq() {
  const [openFaq, setOpenFaq] = useState(0)
  const t = useT(text)

  return (
    <section aria-labelledby="faq-heading" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.eyebrow}</p>
        <h2 id="faq-heading" className="text-center text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.heading}</h2>
        <div className="mt-8 border-t border-foreground/15">
          {t.faqs.map(([question, answer], index) => {
            const open = openFaq === index
            return (
              <div key={index} className="border-b border-foreground/15">
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${index}`}
                    aria-expanded={open}
                    aria-controls={`faq-a-${index}`}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold"
                    onClick={() => setOpenFaq(open ? -1 : index)}
                  >
                    {question}
                    <ChevronDown className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} size={18} aria-hidden />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open && (
                    <m.div
                      id={`faq-a-${index}`}
                      role="region"
                      aria-labelledby={`faq-q-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-5 text-sm leading-relaxed text-foreground/65">{answer}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
