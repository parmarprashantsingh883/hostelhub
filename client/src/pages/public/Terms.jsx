import LegalShell, { LegalSection } from './LegalShell';

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <p>
        These terms govern your use of Quarters (“the Service”), a property-management platform
        for PGs, hostels and co-living operators. By creating an account you agree to them. If you
        are accepting on behalf of a business, you confirm you are authorised to bind it.
      </p>

      <LegalSection n="1" title="Accounts">
        <p>
          You are responsible for your account, keeping your password secure, and all activity under
          it. The person who registers an organization is its owner (admin) and controls the residents
          and staff added to it. You must provide accurate information and be at least 18 years old.
        </p>
      </LegalSection>

      <LegalSection n="2" title="Acceptable use">
        <p>
          Don’t use the Service to break the law, infringe others’ rights, upload malware, attempt to
          breach security or access data that isn’t yours, or resell the Service without permission.
          You are responsible for the lawfulness of the resident and staff data you upload.
        </p>
      </LegalSection>

      <LegalSection n="3" title="Plans, billing & trials">
        <p>
          Paid plans are billed in advance per the pricing shown at sign-up. Free trials convert to a
          paid plan only if you choose one; we do not auto-charge a card you never entered. You can
          cancel anytime — access continues until the end of the period you have paid for. Fees are
          non-refundable except where required by law. Payments are processed by Razorpay; we never
          store your full card details.
        </p>
      </LegalSection>

      <LegalSection n="4" title="Your data">
        <p>
          Your organization’s data belongs to you. You grant us a limited licence to host and process
          it solely to provide the Service. You can export it or delete your organization at any time
          from <span className="font-medium text-slate-700">Profile → Privacy &amp; data</span>. See our
          Privacy Policy for how we handle personal data under India’s DPDP Act.
        </p>
      </LegalSection>

      <LegalSection n="5" title="Availability & changes">
        <p>
          We work to keep the Service available but do not guarantee uninterrupted access, and we may
          change or discontinue features. We’ll give reasonable notice of material changes to these
          terms; continued use after a change means you accept it.
        </p>
      </LegalSection>

      <LegalSection n="6" title="Liability">
        <p>
          The Service is provided “as is”. To the maximum extent permitted by law, Quarters is not
          liable for indirect or consequential losses, and our total liability is limited to the fees
          you paid in the previous 12 months. Nothing here excludes liability that cannot be excluded
          by law.
        </p>
      </LegalSection>

      <LegalSection n="7" title="Termination">
        <p>
          You may stop using the Service and delete your organization at any time. We may suspend or
          terminate accounts that violate these terms. On termination, your data is deleted per our
          Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection n="8" title="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:hello@quarters.app" className="font-medium text-brand-600 hover:underline">hello@quarters.app</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
