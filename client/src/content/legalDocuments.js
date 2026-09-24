/**
 * Legal documents for Share & Copy: Terms of Service, Privacy Policy,
 * and Accessibility Statement, each in English and Hebrew.
 *
 * The content reflects the app's actual data practices as implemented in
 * the code: account details with bcrypt-hashed passwords, httpOnly auth
 * cookies (`token` / `refreshToken`, SameSite=None over HTTPS), paired
 * device records, optional Web Push subscriptions, per-user transfer
 * counters and aggregate daily statistics. Files themselves travel
 * peer-to-peer over WebRTC and are never stored on the server.
 */

export const LEGAL_CONTACT_EMAIL = 'yaronserlindev@gmail.com';
export const LEGAL_VERSION = '1.0';
export const LEGAL_LAST_UPDATED = 'September 2026';

export const TERMS_OF_SERVICE_EN = {
    title: 'Terms of Service',
    version: LEGAL_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
        {
            heading: '1. Acceptance of Terms',
            content: `By registering for, accessing, or using Share & Copy ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.`
        },
        {
            heading: '2. Description of the Service',
            content: `Share & Copy is a peer-to-peer file and clipboard sharing service. It lets you pair your devices, or connect with a guest, and transfer files and text directly between devices over a real-time connection. Files are transferred directly between your devices (P2P) and are not stored on our servers.`
        },
        {
            heading: '3. User Accounts',
            content: `• You must provide accurate and complete registration details (name and email address) and keep them up to date.
• You are responsible for keeping your password confidential and for all activity that occurs under your account, including activity on devices you pair with it.
• You must be at least 18 years old, or at least 16 years old with the consent of a parent or legal guardian, to open an account.
• Notify us immediately of any unauthorized use of your account at ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '4. Acceptable Use',
            content: `You agree not to:
• Use the Service to transfer, store, or share content that is unlawful, infringing, harmful, or malicious (including viruses or malware).
• Interfere with or disrupt the Service, its security controls, rate limits, or device-pairing mechanisms, or attempt to access another user's account, room, or transfers without permission.
• Perform automated scraping, bulk data collection, or reverse engineering of the Service, except where permitted by law.
• Use the Service in any way that violates applicable law.`
        },
        {
            heading: '5. Your Content',
            content: `You retain all rights to the files and text you transfer through the Service. Because transfers happen directly between devices, your content is not hosted by us; you grant us only the limited rights technically required to operate the signaling and pairing functions of the Service. You are solely responsible for the content you transfer and for having the rights to transfer it.`
        },
        {
            heading: '6. Intellectual Property',
            content: `The Service's software, design, logo, and documentation are the property of the Service operator and are protected by intellectual property laws. These Terms do not grant you any right to use them except as needed to use the Service as intended.`
        },
        {
            heading: '7. Disclaimers and Limitation of Liability',
            content: `The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, whether express or implied, including availability, reliability, or fitness for a particular purpose. To the maximum extent permitted by law, the Service operator shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of data, failed or interrupted transfers, or service downtime, arising out of or related to your use of the Service.`
        },
        {
            heading: '8. Changes to These Terms',
            content: `We may update these Terms from time to time. We will provide reasonable advance notice of material changes (for example, in the app or by email). Your continued use of the Service after the updated Terms take effect constitutes acceptance of them.`
        },
        {
            heading: '9. Suspension and Termination',
            content: `We may suspend or terminate access to the Service for accounts that violate these Terms or that use the Service in a way that harms other users or the Service itself. You may stop using the Service and request deletion of your account at any time via ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '10. Governing Law and Jurisdiction',
            content: `These Terms are governed by the laws of the State of Israel, without regard to conflict-of-laws rules. The competent courts of the State of Israel shall have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Service.`
        },
        {
            heading: '11. Contact',
            content: `For questions about these Terms, contact: ${LEGAL_CONTACT_EMAIL}.`
        }
    ]
};

export const TERMS_OF_SERVICE_HE = {
    title: 'תנאי שימוש',
    version: LEGAL_VERSION,
    lastUpdated: 'ספטמבר 2026',
    sections: [
        {
            heading: '1. קבלה והסכמה לתנאים',
            content: `בהרשמה לשירות Share & Copy ("השירות"), בגישה אליו או בשימוש בו, אתה מסכים לתנאי שימוש אלה. אם אינך מסכים לתנאים, אל תשתמש בשירות.`
        },
        {
            heading: '2. תיאור השירות',
            content: `Share & Copy הוא שירות שיתוף קבצים ולוח גזירים (clipboard) בין מכשירים. השירות מאפשר לצמד את המכשירים שלך, או להתחבר כאורח, ולהעביר קבצים וטקסט ישירות בין המכשירים באמצעות חיבור בזמן אמת. הקבצים מועברים ישירות בין המכשירים (P2P) ואינם נשמרים בשרתי השירות.`
        },
        {
            heading: '3. חשבון משתמש',
            content: `• עליך למסור פרטי הרשמה מדויקים ומלאים (שם וכתובת אימייל) ולעדכנם במידת הצורך.
• האחריות לשמירת סודיות הסיסמה ולכל פעילות המתבצעת בחשבונך, לרבות ממכשירים שצימדת אליו, חלה עליך.
• הרשמה מותרת מגיל 18 ומעלה, או מגיל 16 בהסכמת הורה או אפוטרופוס חוקי.
• יש להודיע מיד על כל שימוש לא מורשה בחשבון לכתובת ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '4. שימוש מותר',
            content: `אתה מתחייב שלא:
• להשתמש בשירות להעברה, אחסון או שיתוף של תוכן בלתי חוקי, מפר זכויות, מזיק או זדוני (לרבות וירוסים או תוכנות זדוניות).
• להפריע לשירות, לפקדבי האבטחה שלו, למגבלות הקצב או למנגנוני צימוד המכשירים, או לנסות לגשת לחשבון, לחדר או להעברות של משתמש אחר ללא הרשאה.
• לבצע scraping אוטומטי, איסוף מידע המוני או הנדסה לאחור של השירות, אלא אם הדבר מותר על פי דין.
• להשתמש בשירות בכל אופן המפר את החוק.`
        },
        {
            heading: '5. תוכן המשתמש',
            content: `כל הזכויות בקבצים ובטקסט שאתה מעביר באמצעות השירות נשארות בבעלותך. מאחר שההעברה מתבצעת ישירות בין מכשירים, התוכן שלך אינו מאוחסן אצלנו; אתה מעניק לנו רק את הזכויות המוגבלות הנדרשות טכנית להפעלת מנגנוני האיתות והצימוד של השירות. האחריות הבלעדית לתוכן שאתה מעביר ולזכויותך בו חלה עליך.`
        },
        {
            heading: '6. קניין רוחני',
            content: `הקוד, העיצוב, הלוגו והתיעוד של השירות הם רכושו של מפעיל השירות ומוגנים בדיני קניין רוחני. תנאים אלה אינם מעניקים לך זכות כלשהי בהם, למעט ככל שנדרש לשימוש תקין בשירות.`
        },
        {
            heading: '7. הגבלת אחריות',
            content: `השירות מוצע "כפי שהוא" (AS IS) ו"כפי שהוא זמין", ללא כל התחייבות או אחריות, מפורשת או משתמעת, לרבות לגבי זמינות, אמינות או התאמה למטרה מסוימת. במידה המרבית המותרת בחוק, מפעיל השירות לא יישא באחריות לנזקים עקיפים, מקריים, תוצאתיים או עונשיים, לרבות אובדן מידע, העברות שנכשלו או הופסקו, או השבתת השירות.`
        },
        {
            heading: '8. שינויים בתנאים',
            content: `אנו רשאים לעדכן את התנאים מעת לעת. על שינויים מהותיים תינתן הודעה מראש סבירה (למשל באפליקציה או באימייל). המשך שימוש בשירות לאחר כניסת התנאים המעודכנים לתוקף מהווה הסכמה להם.`
        },
        {
            heading: '9. השעיה וסיום',
            content: `אנו רשאים להשעות או לסיים את הגישה לשירות עבור חשבונות המפרים תנאים אלה או הפוגעים במשתמשים אחרים או בשירות עצמו. באפשרותך להפסיק את השימוש ולבקש מחיקת החשבון בכל עת דרך ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '10. דין חל וסמכות שיפוט',
            content: `על תנאים אלה יחולו דיני מדינת ישראל, מבלי ליתן תוקף לכללי ברירת הדין. סמכות השיפוט הבלעדית בכל מחלוקת הנובעת מתנאים אלה או מהשירות תימסר לבתי המשפט המוסמכים של מדינת ישראל.`
        },
        {
            heading: '11. יצירת קשר',
            content: `לשאלות על תנאי השימוש: ${LEGAL_CONTACT_EMAIL}.`
        }
    ]
};

export const PRIVACY_POLICY_EN = {
    title: 'Privacy Policy',
    version: LEGAL_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
        {
            heading: '1. Who We Are',
            content: `Share & Copy is operated by Yaron Serlin, an independent developer. For any privacy question or request, contact: ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '2. Information We Collect',
            content: `• Account information: first and last name, email address, and a password that is stored only as a cryptographic hash (bcrypt). Accounts also carry an administrator-permission flag where applicable.
• Paired devices: a device identifier, device name, last-active time, and a token identifier used to sign devices in and to revoke access.
• Guest sessions: a temporary guest identifier when you use the Service without registering.
• Push notifications (optional): if you enable notifications, we store your browser's push subscription (endpoint and encryption keys), the linked device, and your notification preferences.
• Usage statistics: per-account counters (data transferred, upload and download counts) and aggregated daily statistics (total data transferred, total uploads, active users, guest sessions). These aggregates are not linked to an identified individual.
• Technical logs: standard server logs (such as IP address, browser type, and timestamps) used for security and troubleshooting.
• Your files: files and clipboard content are transferred directly between your devices over an encrypted peer-to-peer connection and are never stored on our servers.`
        },
        {
            heading: '3. Why We Process This Information',
            content: `• To operate the Service: authentication, device pairing, session continuity, and transfer signaling.
• To secure the Service: preventing abuse, enforcing rate limits, and revoking compromised sessions.
• To deliver optional push notifications about transfers, pairing, devices, and security events (each category can be turned off in the app's notification settings or in your browser/device settings).
• To produce aggregate usage statistics that help us understand and improve the Service.`
        },
        {
            heading: '4. Third-Party Service Providers',
            content: `We do not sell your personal information. We share data only with the infrastructure providers needed to run the Service:
• Render (hosting) - runs the application servers.
• MongoDB Atlas (database) - stores account, device, and statistics data.
• Browser push services (for example Google Firebase Cloud Messaging or Apple Push Notification service, depending on your browser) - deliver Web Push notifications when you enable them.
Each provider processes data on our behalf under its own data protection terms.`
        },
        {
            heading: '5. Cookies and Local Storage',
            content: `The Service uses only strictly necessary cookies and storage:
• "token" and "refreshToken" - httpOnly authentication cookies that keep you signed in. On the HTTPS deployment they are sent with SameSite=None and Secure so the app can reach the API across sites.
• Local storage - used for interface preferences (such as theme) and to remember that you dismissed the cookie notice.
We do not use tracking, analytics, or advertising cookies.`
        },
        {
            heading: '6. Data Retention and Deletion',
            content: `Your account data is kept for as long as your account is active. Expired push subscriptions are pruned automatically. You may request deletion of your account and personal data at any time by emailing ${LEGAL_CONTACT_EMAIL}; after deletion, remaining aggregate statistics can no longer be linked to you.`
        },
        {
            heading: '7. Your Rights',
            content: `Under the Israeli Protection of Privacy Law (as amended by Amendment 13) and other applicable laws, you have the right to access the personal information held about you, to request its correction, to request its deletion, and to object to certain processing. To exercise any of these rights, email ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '8. Data Security',
            content: `We protect your data with bcrypt password hashing, short-lived JSON Web Tokens with refresh-token rotation and revocation, httpOnly cookies, rate limiting, and HTTPS encryption in transit. Peer-to-peer file transfers are encrypted by the WebRTC protocol itself.`
        },
        {
            heading: '9. International Data Transfer',
            content: `The Service's infrastructure providers (Render, MongoDB Atlas) may process data outside Israel. Such transfers are performed in accordance with applicable data protection law.`
        },
        {
            heading: '10. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. Material changes will be announced with reasonable advance notice. The "last updated" date above reflects the current version.`
        }
    ]
};

export const PRIVACY_POLICY_HE = {
    title: 'מדיניות פרטיות',
    version: LEGAL_VERSION,
    lastUpdated: 'ספטמבר 2026',
    sections: [
        {
            heading: '1. מי אנחנו',
            content: `Share & Copy מופעל על ידי ירון סרלין, מפתח עצמאי. לכל שאלה או בקשה בנושא פרטיות: ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '2. איזה מידע נאסף',
            content: `• פרטי חשבון: שם פרטי ושם משפחה, כתובת אימייל, וסיסמה הנשמרת כגיבוב (hash) קריפטוגרפי בלבד (bcrypt). בחשבונות מתאימים קיימת גם הרשאת מנהל.
• מכשירים מצומדים: מזהה מכשיר, שם מכשיר, זמן פעילות אחרון, ומזהה טוקן המשמש לחיבור מכשירים ולביטול גישתם.
• הפעלות אורח: מזהה אורח זמני בעת שימוש בשירות ללא הרשמה.
• התראות (אופציונלי): אם הפעלת התראות, אנו שומרים את מנוי ה-push של הדפדפן (נקודת קצה ומפתחות הצפנה), המכשיר המקושר והעדפות ההתראה שלך.
• סטטיסטיקות שימוש: מונים ברמת החשבון (נפח נתונים שהועבר, מספר העלאות והורדות) וסטטיסטיקות יומיות מצטברות (סך נתונים שהועברו, סך העלאות, משתמשים פעילים, הפעלות אורח). הנתונים המצטברים אינם מקושרים לאדם מזוהה.
• לוגים טכניים: לוגי שרת סטנדרטיים (כגון כתובת IP, סוג דפדפן וחותמות זמן) לצורכי אבטחה ופתרון תקלות.
• הקבצים שלך: קבצים ותוכן לוח הגזירים מועברים ישירות בין המכשירים שלך בחיבור מוצפן עמית-לעמית (P2P) ולעולם אינם נשמרים בשרתי השירות.`
        },
        {
            heading: '3. מטרות העיבוד',
            content: `• הפעלת השירות: אימות, צימוד מכשירים, המשכיות הפעלה, ואיתות להעברות.
• אבטחת השירות: מניעת שימוש לרעה, אכיפת מגבלות קצב, וביטול הפעלות שנפרצו.
• משלוח התראות push אופציונליות על העברות, צימוד, מכשירים ואירועי אבטחה (כל קטגוריה ניתנת לכיבוי בהגדרות ההתראות באפליקציה או בהגדרות הדפדפן/המכשיר).
• הפקת סטטיסטיקות שימוש מצטברות המסייעות להבין ולשפר את השירות.`
        },
        {
            heading: '4. ספקי שירות חיצוניים',
            content: `איננו מוכרים מידע אישי. אנו משתפים מידע רק עם ספקי התשתית הנדרשים להפעלת השירות:
• Render (אחסון אתרים) - מריץ את שרתי האפליקציה.
• MongoDB Atlas (בסיס נתונים) - שומר את נתוני החשבון, המכשירים והסטטיסטיקות.
• שירותי push של הדפדפנים (למשל Firebase Cloud Messaging של גוגל או Apple Push Notification service, בהתאם לדפדפן שלך) - מבצעים את משלוח ההתראות כאשר הופעלו.
כל ספק מעבד מידע בשמנו ובכפוף לתנאי הגנת המידע שלו.`
        },
        {
            heading: '5. עוגיות ואחסון מקומי',
            content: `השירות משתמש בעוגיות ובאחסון חיוניים בלבד:
• "token" ו-"refreshToken" - עוגיות httpOnly לצורך אימות והתחברות. בפריסת ה-HTTPS הן נשלחות עם SameSite=None ו-Secure כדי שהאפליקציה תוכל לפנות ל-API בין אתרים.
• אחסון מקומי (localStorage) - משמש להעדפות ממשק (כגון ערכת נושא) ולשמירת הסגירה של הודעת העוגיות.
איננו משתמשים בעוגיות מעקב, אנליטיקה או פרסום.`
        },
        {
            heading: '6. שמירה ומחיקה',
            content: `נתוני החשבון נשמרים כל עוד החשבון פעיל. מנויי push שפג תוקפם נמחקים אוטומטית. באפשרותך לבקש מחיקת החשבון והמידע האישי בכל עת באימייל ${LEGAL_CONTACT_EMAIL}; לאחר המחיקה, הסטטיסטיקות המצטברות שנותרו אינן ניתנות עוד לקישור אליך.`
        },
        {
            heading: '7. הזכויות שלך',
            content: `בהתאם לחוק הגנת הפרטיות (לרבות תיקון 13) ולדינים החלים אחרים, אתה זכאי לעיין במידע האישי המוחזק אודותיך, לבקש את תיקונו, לבקש את מחיקתו, ולהתנגד לעיבודים מסוימים. למימוש הזכויות: ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '8. אבטחת מידע',
            content: `אנו מגנים על המידע באמצעות גיבוב סיסמאות bcrypt, טוקנים (JWT) קצרי-חיים עם רוטציה וביטול של refresh token, עוגיות httpOnly, מגבלות קצב, והצפנת HTTPS בהעברה. העברות ה-P2P של הקבצים מוצפנות על ידי פרוטוקול WebRTC עצמו.`
        },
        {
            heading: '9. העברת מידע מחוץ לישראל',
            content: `ספקי התשתית של השירות (Render, MongoDB Atlas) עשויים לעבד מידע מחוץ לישראל. העברות כאלה נעשות בהתאם לדיני הגנת הפרטיות החלים.`
        },
        {
            heading: '10. שינויים במדיניות',
            content: `אנו רשאים לעדכן מדיניות זו מעת לעת. על שינויים מהותיים תינתן הודעה מראש סבירה. תאריך "העדכון האחרון" לעיל משקף את הגרסה הנוכחית.`
        }
    ]
};

export const ACCESSIBILITY_STATEMENT_EN = {
    title: 'Accessibility Statement',
    version: LEGAL_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED,
    sections: [
        {
            heading: 'General',
            content: `We place great importance on making Share & Copy accessible to people with disabilities and work to align it with the Israeli Standard SI 5568, based on WCAG 2.0 Level AA.`
        },
        {
            heading: 'Accessibility Adjustments Made',
            content: `• Full keyboard navigation support across the app.
• Semantic HTML structure with ARIA attributes where needed.
• Color schemes (light and dark themes) designed for sufficient contrast.
• Responsive layout for different screen sizes.
• Legal documents available in Hebrew with right-to-left (RTL) layout.`
        },
        {
            heading: 'Known Limitations',
            content: `The Service is under continuous improvement. If you encounter an accessibility barrier, please let us know - we treat these reports as bugs to fix.`
        },
        {
            heading: 'Contact for Accessibility Requests',
            content: `For accessibility questions, requests, or reports, contact: ${LEGAL_CONTACT_EMAIL}. We are committed to responding within 14 days.`
        }
    ]
};

export const ACCESSIBILITY_STATEMENT_HE = {
    title: 'הצהרת נגישות',
    version: LEGAL_VERSION,
    lastUpdated: 'ספטמבר 2026',
    sections: [
        {
            heading: 'כללי',
            content: `אנו רואים חשיבות רבה בהנגשת שירות Share & Copy לאנשים עם מוגבלות, ופועלים להתאמתו לתקן הישראלי ת"י 5568 על בסיס WCAG 2.0 רמה AA.`
        },
        {
            heading: 'ההתאמות שבוצעו',
            content: `• תמיכה מלאה בניווט באמצעות מקלדת בכל רחבי האפליקציה.
• מבנה HTML סמנטי עם תגיות ARIA היכן שנדרש.
• ערכות צבע (בהירה וכהה) המתוכננות לניגודיות מספקת.
• פריסה רספונסיבית המתאימה לגדלי מסך שונים.
• המסמכים המשפטיים זמינים בעברית בפריסת ימין-לשמאל (RTL).`
        },
        {
            heading: 'חריגות ידועות',
            content: `השירות נמצא בשיפור מתמיד. אם נתקלת במחסום נגישות, נודה אם תעדכן אותנו - אנו מתייחסים לדיווחים אלה כתקלות לתיקון.`
        },
        {
            heading: 'יצירת קשר לפניות נגישות',
            content: `לשאלות, בקשות או דיווחים בנושא נגישות: ${LEGAL_CONTACT_EMAIL}. אנו מתחייבים למענה תוך 14 יום.`
        }
    ]
};

export const COOKIE_NOTICE = {
    en: 'Share & Copy uses only essential cookies to keep you signed in and operate the Service. No tracking or advertising cookies are used. See the Privacy Policy for details.',
    he: 'Share & Copy משתמש בעוגיות חיוניות בלבד לצורך התחברות ותפעול תקין של השירות. לא נעשה שימוש בעוגיות מעקב או פרסום. פרטים מלאים במדיניות הפרטיות.'
};

export const LEGAL_DOCS = {
    terms: { en: TERMS_OF_SERVICE_EN, he: TERMS_OF_SERVICE_HE },
    privacy: { en: PRIVACY_POLICY_EN, he: PRIVACY_POLICY_HE },
    accessibility: { en: ACCESSIBILITY_STATEMENT_EN, he: ACCESSIBILITY_STATEMENT_HE }
};
