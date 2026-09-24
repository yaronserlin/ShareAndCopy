/**
 * Public legal document page. Renders one of the Terms of Service,
 * Privacy Policy, or Accessibility Statement from
 * {@link module:content/legalDocuments}, with an English/Hebrew language
 * toggle. Hebrew renders right-to-left.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { LEGAL_DOCS } from '../../content/legalDocuments';

/**
 * @param {Object} props
 * @param {'terms'|'privacy'|'accessibility'} props.docKey - Which legal document to show.
 * @returns {JSX.Element} The legal document page.
 */
const LegalPage = ({ docKey }) => {
    const [lang, setLang] = useState('en');
    const doc = LEGAL_DOCS[docKey][lang];
    const isRtl = lang === 'he';

    return (
        <div className="container py-4 py-md-5" style={{ maxWidth: '800px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="btn-group btn-group-sm" role="group" aria-label="Language">
                    <button
                        type="button"
                        className={`btn ${lang === 'en' ? 'btn-primary' : ''}`}
                        style={lang === 'en' ? undefined : { color: 'var(--bs-body-color)', border: '1px solid var(--bs-border-color)' }}
                        onClick={() => setLang('en')}
                    >
                        English
                    </button>
                    <button
                        type="button"
                        className={`btn ${lang === 'he' ? 'btn-primary' : ''}`}
                        style={lang === 'he' ? undefined : { color: 'var(--bs-body-color)', border: '1px solid var(--bs-border-color)' }}
                        onClick={() => setLang('he')}
                    >
                        עברית
                    </button>
                </div>
            </div>

            <article dir={isRtl ? 'rtl' : 'ltr'} lang={lang} className="glass-panel p-3 p-md-4 rounded">
                <header className="mb-4">
                    <h1 className="h3 fw-bold">{doc.title}</h1>
                    <p className="text-secondary small mb-0">
                        Version {doc.version} · Last updated: {doc.lastUpdated}
                    </p>
                </header>

                {doc.sections.map((section, idx) => (
                    <section key={idx} className="mb-4">
                        <h2 className="h6 fw-bold">{section.heading}</h2>
                        <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                            {section.content}
                        </p>
                    </section>
                ))}

            </article>
        </div>
    );
};

LegalPage.propTypes = {
    docKey: PropTypes.oneOf(['terms', 'privacy', 'accessibility']).isRequired
};

export default LegalPage;
