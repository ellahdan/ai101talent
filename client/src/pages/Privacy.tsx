import { CONTACT_EMAIL } from '@/lib/config'
import { useLang } from '@/i18n'
import { LegalPage } from './LegalPage'

// Template text reflecting how the platform handles data. Have both languages reviewed by legal counsel before launch.
export default function Privacy() {
  const { lang } = useLang()
  return lang === 'de' ? <PrivacyDe /> : <PrivacyEn />
}

const mail = <a className="font-semibold text-brand" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

function PrivacyEn() {
  return (
    <LegalPage title="Privacy policy">
      <section>
        <h2>Who we are</h2>
        <p>AI101 Talents connects candidates with companies. Every contact between a company and a candidate is reviewed and mediated by our team.</p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: email address and a securely hashed password.</li>
          <li>Profile details you provide: name, contact details, location, links, headline, skills, tools, languages, work history, education, availability and preferred work mode.</li>
          <li>Documents you upload: your CV and, optionally, a cover letter. We extract the text of your CV so our team can search it.</li>
          <li>Company details: company name, website, industry, size and a contact person.</li>
          <li>Activity records: applications, contact requests, messages with our team, and an audit log of who viewed or downloaded a CV.</li>
        </ul>
        <p className="mt-3">We never ask for, and do not let anyone search by, age, gender, marital status, nationality, religion or photos.</p>
      </section>
      <section>
        <h2>Who can see your profile</h2>
        <p>If you make your profile visible, an anonymized version appears in our talent search, which visitors can browse without an account: your applicant number, headline, years of experience, skills, tools, languages, location, availability, job titles with years, and education. Your name, email, phone, links, employers, descriptions and CV are never shown. Only approved companies can ask to contact you, and they receive your details only if you accept a request and our team shares them as part of an introduction.</p>
      </section>
      <section>
        <h2>Why we use your data</h2>
        <ul>
          <li>To process your applications and match you with relevant opportunities.</li>
          <li>To forward contact requests to you and arrange introductions you accept.</li>
          <li>To send service emails such as confirmations, verification and password resets.</li>
          <li>To keep the platform secure and prevent misuse.</li>
        </ul>
        <p className="mt-3">We rely on your consent, which you give when you create your profile. You can withdraw it at any time by deleting your account.</p>
      </section>
      <section>
        <h2>Storage and retention</h2>
        <p>Documents are stored privately and are only available through short-lived links to authorized staff. Profiles that have been inactive for 24 months are deleted automatically, together with their files.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>From your account settings you can edit your profile, hide it from talent search, export all your data as JSON, and permanently delete your account and files. For any other request, contact us at {mail}.</p>
      </section>
    </LegalPage>
  )
}

function PrivacyDe() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2>Wer wir sind</h2>
        <p>AI101 Talents bringt Kandidaten und Unternehmen zusammen. Jeder Kontakt zwischen einem Unternehmen und einem Kandidaten wird von unserem Team geprüft und vermittelt.</p>
      </section>
      <section>
        <h2>Welche Daten wir erheben</h2>
        <ul>
          <li>Kontodaten: E-Mail-Adresse und ein sicher gehashtes Passwort.</li>
          <li>Profilangaben, die Sie machen: Name, Kontaktdaten, Standort, Links, Titel, Fähigkeiten, Tools, Sprachen, Berufserfahrung, Ausbildung, Verfügbarkeit und bevorzugtes Arbeitsmodell.</li>
          <li>Hochgeladene Dokumente: Ihr Lebenslauf und optional ein Anschreiben. Wir extrahieren den Text Ihres Lebenslaufs, damit unser Team ihn durchsuchen kann.</li>
          <li>Unternehmensdaten: Firmenname, Website, Branche, Größe und ein Ansprechpartner.</li>
          <li>Aktivitätsdaten: Bewerbungen, Kontaktanfragen, Nachrichten mit unserem Team sowie ein Protokoll, wer einen Lebenslauf angesehen oder heruntergeladen hat.</li>
        </ul>
        <p className="mt-3">Wir fragen niemals nach Alter, Geschlecht, Familienstand, Staatsangehörigkeit, Religion oder Fotos und lassen niemanden danach suchen.</p>
      </section>
      <section>
        <h2>Wer Ihr Profil sehen kann</h2>
        <p>Wenn Sie Ihr Profil sichtbar schalten, erscheint eine anonymisierte Version in unserer Talentsuche, die Besucher auch ohne Konto durchsuchen können: Ihre Bewerbernummer, Ihr Titel, Ihre Berufsjahre, Fähigkeiten, Tools, Sprachen, Ihr Standort, Ihre Verfügbarkeit, Positionsbezeichnungen mit Jahreszahlen und Ihre Ausbildung. Name, E-Mail-Adresse, Telefonnummer, Links, Arbeitgeber, Tätigkeitsbeschreibungen und Lebenslauf werden nie angezeigt. Nur freigegebene Unternehmen können eine Kontaktanfrage stellen. Ihre Daten erhalten sie nur, wenn Sie der Anfrage zustimmen und unser Team sie im Rahmen einer Vorstellung weitergibt.</p>
      </section>
      <section>
        <h2>Wofür wir Ihre Daten verwenden</h2>
        <ul>
          <li>Um Ihre Bewerbungen zu bearbeiten und Sie mit passenden Möglichkeiten zusammenzubringen.</li>
          <li>Um Kontaktanfragen an Sie weiterzuleiten und Vorstellungen zu organisieren, denen Sie zustimmen.</li>
          <li>Um Service-E-Mails wie Bestätigungen, Verifizierungen und Passwort-Zurücksetzungen zu senden.</li>
          <li>Um die Plattform sicher zu halten und Missbrauch zu verhindern.</li>
        </ul>
        <p className="mt-3">Rechtsgrundlage ist Ihre Einwilligung, die Sie beim Erstellen Ihres Profils erteilen. Sie können sie jederzeit widerrufen, indem Sie Ihr Konto löschen.</p>
      </section>
      <section>
        <h2>Speicherung und Aufbewahrung</h2>
        <p>Dokumente werden vertraulich gespeichert und sind nur über kurzlebige Links für berechtigte Mitarbeitende zugänglich. Profile, die 24 Monate lang inaktiv waren, werden samt ihrer Dateien automatisch gelöscht.</p>
      </section>
      <section>
        <h2>Ihre Rechte</h2>
        <p>In Ihren Kontoeinstellungen können Sie Ihr Profil bearbeiten, es in der Talentsuche ausblenden, alle Ihre Daten als JSON exportieren sowie Ihr Konto und Ihre Dateien dauerhaft löschen. Für alle anderen Anliegen erreichen Sie uns unter {mail}.</p>
      </section>
    </LegalPage>
  )
}
