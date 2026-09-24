import { CONTACT_EMAIL } from '@/lib/config'
import { LegalPage } from './LegalPage'

// Template text. Have it reviewed by legal counsel before launch.
export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="September 2026">
      <section>
        <h2>Using AI101 Talents</h2>
        <p>By creating an account you agree to these terms and to our privacy policy. You must provide accurate information and keep your login details secure.</p>
      </section>
      <section>
        <h2>Candidates</h2>
        <ul>
          <li>You are responsible for the accuracy of your profile, CV and applications.</li>
          <li>You choose whether your profile appears in company search, and you decide whether to accept each contact request we forward to you.</li>
        </ul>
      </section>
      <section>
        <h2>Companies</h2>
        <ul>
          <li>Company accounts and job postings are reviewed by our team before they are published or can search candidates.</li>
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
        <p>Questions about these terms? Email <a className="font-semibold text-brand" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  )
}
