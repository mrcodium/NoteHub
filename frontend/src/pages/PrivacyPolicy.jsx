import BaseHeader from "@/components/BaseHeader";
import React from "react";

const PrivacyPolicy = () => {
  return (
    <>
      <BaseHeader />
      <div className="mt-14 tiptap max-w-screen-md m-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy – NoteHub</h1>

        <p className="italic mb-6">Last Updated: July 20, 2025</p>

        <h3 className="text-xl font-semibold mb-2">1. Introduction</h3>
        <p className="mb-4">
          Welcome to <strong>NoteHub</strong> ("we", "our", "us"). We value your
          privacy and are committed to protecting your personal information.
          This Privacy Policy explains how we collect, use, and protect your
          data when you use our application.
        </p>

        <h3 className="text-xl font-semibold mb-2">
          2. What Information We Collect
        </h3>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Account Information</strong>: Email address, name (if you
            sign in via Google).
          </li>
          <li>
            <strong>Content</strong>: Notes, documents, and any media you upload
            or create.
          </li>
          <li>
            <strong>Usage Data</strong>: Pages visited, actions performed,
            timestamps.
          </li>
          <li>
            <strong>Device Information</strong>: Browser type, OS, IP address
            (for analytics/security).
          </li>
        </ul>

        <h3 className="text-xl font-semibold mb-2">
          3. How We Use Your Information
        </h3>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide and improve NoteHub's features.</li>
          <li>Sync and store your notes securely.</li>
          <li>Analyze usage for app optimization.</li>
          <li>Ensure security and prevent abuse.</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2">
          4. How Your Data Is Stored
        </h3>
        <ul className="list-disc pl-6 mb-4">
          <li>
            Notes and user data are securely stored in our database (e.g.,
            MongoDB).
          </li>
          <li>We use HTTPS to encrypt data in transit.</li>
          <li>Access to user data is restricted and protected.</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2">5. Third-Party Services</h3>
        <p className="mb-2">We may use third-party services like:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Google Authentication</strong> for login.
          </li>
          <li>
            <strong>Analytics tools</strong> to understand user behavior.
          </li>
        </ul>
        <p className="mb-4">
          These services may collect their own data according to their policies.
        </p>

        <h3 className="text-xl font-semibold mb-2">
          6. Cookies & Local Storage
        </h3>
        <p className="mb-4">
          We use cookies/local storage to maintain sessions and store minimal
          preferences (like themes or recent files).
        </p>

        <h3 className="text-xl font-semibold mb-2">7. Your Rights</h3>
        <ul className="list-disc pl-6 mb-4">
          <li>View, edit, or delete your data anytime.</li>
          <li>Contact us for account/data deletion.</li>
        </ul>

        <h3 className="text-xl font-semibold mb-2">8. Children’s Privacy</h3>
        <p className="mb-4">
          NoteHub is not intended for children under 13. We do not knowingly
          collect data from children.
        </p>

        <h3 className="text-xl font-semibold mb-2">
          9. Changes to This Policy
        </h3>
        <p className="mb-4">
          We may update this Privacy Policy. Changes will be posted on this page
          with a revised date.
        </p>

        <h3 className="text-xl font-semibold mb-2">10. Contact Us</h3>
        <p className="mb-2">For any concerns or queries, email us at:</p>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="mailto:abhijeet62008@gmail.com"
          className="text-blue-600 font-semibold hover:underline"
        >
          abhijeet62008@gmail.com
        </a>
      </div>
    </>
  );
};

export default PrivacyPolicy;
