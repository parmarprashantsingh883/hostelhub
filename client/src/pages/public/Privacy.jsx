import LegalShell, { LegalSection } from './LegalShell';

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        This policy explains what personal data Quarters collects, why, and the rights you have over it
        — including under India’s Digital Personal Data Protection (DPDP) Act, 2023. For your
        organization’s residents and staff, the PG operator (the admin) is the data fiduciary and
        Quarters is the data processor acting on their instructions.
      </p>

      <LegalSection n="1" title="What we collect">
        <p>We collect only what the Service needs to work:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="font-medium text-slate-700">Account data</span> — name, email, phone, password (hashed), role.</li>
          <li><span className="font-medium text-slate-700">Operational data you enter</span> — rooms, residents, rent, complaints, visitors, documents and photos you upload.</li>
          <li><span className="font-medium text-slate-700">Payment metadata</span> — plan, billing status and gateway references (card details stay with Razorpay).</li>
          <li><span className="font-medium text-slate-700">Technical logs</span> — IP, timestamps and error diagnostics for security and reliability.</li>
        </ul>
      </LegalSection>

      <LegalSection n="2" title="Why we use it">
        <p>
          To provide and secure the Service, process payments, send transactional messages (rent
          reminders, receipts, notices) and comply with legal obligations. We do not sell your data or
          use it for advertising.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Your rights (DPDP)">
        <p>You can, at any time:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="font-medium text-slate-700">Access &amp; export</span> your data as JSON from <span className="font-medium text-slate-700">Profile → Privacy &amp; data → Download my data</span>.</li>
          <li><span className="font-medium text-slate-700">Correct</span> your details from your profile.</li>
          <li><span className="font-medium text-slate-700">Erase</span> — an admin can permanently delete the whole organization and all its data from the same screen. Residents and staff can request removal from their admin or by emailing us.</li>
          <li><span className="font-medium text-slate-700">Grievance</span> — contact our Data Protection point of contact below.</li>
        </ul>
      </LegalSection>

      <LegalSection n="4" title="Processors we rely on">
        <p>
          We share the minimum necessary with vetted processors: Razorpay (payments), Cloudinary
          (file storage), an email/SMS provider (notifications) and our cloud host and error-monitoring
          (Sentry). Each processes data only to perform its function for us.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Retention & security">
        <p>
          We keep data while your account is active and delete it on erasure, except records we must
          retain for legal or financial reasons. We protect data with encryption in transit, hashed
          passwords, role-based access, tenant isolation and rate limiting. No system is perfectly
          secure, but we work to keep yours safe.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Contact">
        <p>
          For any privacy question or to exercise a right, email{' '}
          <a href="mailto:hello@quarters.app" className="font-medium text-brand-600 hover:underline">hello@quarters.app</a>.
          We respond within the timelines the DPDP Act requires.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
