import { CONTACT_EMAIL } from '@/lib/config'
import { useLang } from '@/i18n'
import { LegalPage } from './LegalPage'

// Template text. Have both languages reviewed by legal counsel before launch.
export default function Terms() {
  const { lang } = useLang()
  return lang === 'de' ? <TermsDe /> : <TermsEn />
}

const mail = <a className="font-semibold text-brand" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

function TermsEn() {
  return (
    <LegalPage title="Terms of use">
      <section>
        <h2>Using AI101 Talents</h2>
        <p>By creating an account you agree to these terms and to our privacy policy. You must provide accurate information and keep your login details secure.</p>
      </section>
      <section>
        <h2>Candidates</h2>
        <ul>
          <li>You are responsible for the accuracy of your profile, CV and applications.</li>
          <li>You choose whether your anonymized profile appears in talent search, and you decide whether to accept each contact request we forward to you.</li>
        </ul>
      </section>
      <section>
        <h2>Companies</h2>
        <ul>
          <li>Company accounts and job postings are reviewed by our team before they are published or can contact candidates.</li>
          <li>All contact with candidates goes through our team. Do not try to identify or contact candidates outside the platform.</li>
          <li>Search must focus on skills and experience. Discrimination on any protected characteristic is prohibited.</li>
          <li>We may limit, suspend or close accounts that misuse the platform.</li>
        </ul>
      </section>
      <section>
        <h2>Our role</h2>
        <p>We review and mediate introductions but are not a party to any employment or service agreement between a company and a candidate.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about these terms? Email {mail}.</p>
      </section>
    </LegalPage>
  )
}

function TermsDe() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <section>
        <h2>Nutzung von AI101 Talents</h2>
        <p>Mit der Erstellung eines Kontos akzeptieren Sie diese Nutzungsbedingungen und unsere Datenschutzerklärung. Sie müssen zutreffende Angaben machen und Ihre Zugangsdaten sicher aufbewahren.</p>
      </section>
      <section>
        <h2>Kandidaten</h2>
        <ul>
          <li>Sie sind für die Richtigkeit Ihres Profils, Ihres Lebenslaufs und Ihrer Bewerbungen verantwortlich.</li>
          <li>Sie entscheiden, ob Ihr anonymisiertes Profil in der Talentsuche erscheint und ob Sie jede Kontaktanfrage annehmen, die wir an Sie weiterleiten.</li>
        </ul>
      </section>
      <section>
        <h2>Unternehmen</h2>
        <ul>
          <li>Unternehmenskonten und Stellenanzeigen werden von unserem Team geprüft, bevor sie veröffentlicht werden oder Kandidaten kontaktieren können.</li>
          <li>Jeder Kontakt mit Kandidaten läuft über unser Team. Versuchen Sie nicht, Kandidaten außerhalb der Plattform zu identifizieren oder zu kontaktieren.</li>
          <li>Die Suche muss sich auf Fähigkeiten und Erfahrung konzentrieren. Diskriminierung aufgrund geschützter Merkmale ist verboten.</li>
          <li>Wir können Konten, die die Plattform missbrauchen, einschränken, sperren oder schließen.</li>
        </ul>
      </section>
      <section>
        <h2>Unsere Rolle</h2>
        <p>Wir prüfen und vermitteln Vorstellungen, sind aber nicht Partei eines Arbeits- oder Dienstleistungsvertrags zwischen einem Unternehmen und einem Kandidaten.</p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>Fragen zu diesen Nutzungsbedingungen? Schreiben Sie an {mail}.</p>
      </section>
    </LegalPage>
  )
}
