import { CONTACT_EMAIL } from '@/lib/config'
import { LegalPage } from './LegalPage'

// Template text reflecting how the platform handles data. Have it reviewed by legal counsel before launch.
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="September 2026">
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
        <h2>How companies see your profile</h2>
        <p>If you make your profile visible, approved companies see an anonymized version: your applicant number, headline, experience, skills, tools, languages and location. They never see your name, email, phone, links or CV unless you accept a contact request and our team shares them as part of an introduction.</p>
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
        <p>From your account settings you can edit your profile, hide it from company search, export all your data as JSON, and permanently delete your account and files. For any other request, contact us at <a className="font-semibold text-brand" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  )
}
