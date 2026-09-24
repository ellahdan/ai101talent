import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  ['How does AI101 Talents work?', 'Create a profile, browse opportunities, and connect with teams looking for your skills.'],
  ['Is my profile visible to everyone?', 'You control your visibility. Companies see relevant information before an introduction is approved.'],
  ['What makes a good profile?', 'Show your strongest skills, the outcomes you have delivered, and the kind of work you want next.'],
  ['Can companies contact me directly?', 'No. Companies send a request to our team. We review it, forward it to you, and only make an introduction if you accept.'],
  ['What is my applicant number?', 'Every candidate gets a unique number like AI101-000123. Use it when you get in touch with us about your profile or applications.'],
]

export function Faq() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <section aria-labelledby="faq-heading" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[.14em] text-brand">Common questions</p>
        <h2 id="faq-heading" className="text-center text-3xl font-medium tracking-[-.05em] sm:text-5xl">Let's clear things up.</h2>
        <div className="mt-8 border-t border-foreground/15">
          {faqs.map(([question, answer], index) => {
            const open = openFaq === index
            return (
              <div key={question} className="border-b border-foreground/15">
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
