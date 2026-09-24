/**
 * Accessibility menu: lets visitors adjust font size, contrast, and link
 * underlining. Preferences persist in localStorage and apply document-wide.
 * The site itself aims to conform to WCAG 2.0 AA (IS 5568); this menu is an
 * added convenience, not a substitute for an accessible site.
 */

import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'accessibility-preferences';
const FONT_STEPS = [100, 110, 125, 150];

const DEFAULTS = { fontStep: 0, highContrast: false, underlineLinks: false };

const loadPrefs = () => {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
        return { ...DEFAULTS };
    }
};

const applyPrefs = (prefs) => {
    const root = document.documentElement;
    root.style.fontSize = `${FONT_STEPS[prefs.fontStep]}%`;
    root.classList.toggle('a11y-high-contrast', prefs.highContrast);
    root.classList.toggle('a11y-underline-links', prefs.underlineLinks);
};

/**
 * @returns {JSX.Element} Floating accessibility menu.
 */
const AccessibilityMenu = () => {
    const [open, setOpen] = useState(false);
    const [prefs, setPrefs] = useState(loadPrefs);

    useEffect(() => {
        applyPrefs(prefs);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            /* storage unavailable - preferences apply for this session only */
        }
    }, [prefs]);

    const update = (patch) => setPrefs((prev) => ({ ...prev, ...patch }));
    const reset = () => setPrefs({ ...DEFAULTS });

    return (
        <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1060 }}>
            {open && (
                <div
                    role="dialog"
                    aria-label="Accessibility options"
                    className="glass-panel border border-secondary border-opacity-25 rounded p-3 mb-2"
                    style={{ minWidth: '240px' }}
                >
                    <h2 className="h6 fw-bold mb-3">Accessibility</h2>

                    <div className="mb-3">
                        <span className="small text-secondary d-block mb-1">Text size</span>
                        <div className="btn-group btn-group-sm w-100" role="group" aria-label="Text size">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => update({ fontStep: Math.max(0, prefs.fontStep - 1) })}
                                disabled={prefs.fontStep === 0}
                                aria-label="Decrease text size"
                            >
                                A-
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => update({ fontStep: Math.min(FONT_STEPS.length - 1, prefs.fontStep + 1) })}
                                disabled={prefs.fontStep === FONT_STEPS.length - 1}
                                aria-label="Increase text size"
                            >
                                A+
                            </button>
                        </div>
                    </div>

                    <div className="form-check form-switch mb-2">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="a11y-contrast"
                            checked={prefs.highContrast}
                            onChange={(e) => update({ highContrast: e.target.checked })}
                        />
                        <label className="form-check-label small" htmlFor="a11y-contrast">
                            High contrast
                        </label>
                    </div>

                    <div className="form-check form-switch mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="a11y-underline"
                            checked={prefs.underlineLinks}
                            onChange={(e) => update({ underlineLinks: e.target.checked })}
                        />
                        <label className="form-check-label small" htmlFor="a11y-underline">
                            Underline links
                        </label>
                    </div>

                    <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={reset}>
                        Reset
                    </button>
                </div>
            )}

            <button
                type="button"
                className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
                onClick={() => setOpen((prev) => !prev)}
                aria-label={open ? 'Close accessibility menu' : 'Open accessibility menu'}
                aria-expanded={open}
            >
                <i className="bi bi-universal-access-circle fs-5" aria-hidden="true"></i>
            </button>
        </div>
    );
};

export default AccessibilityMenu;
