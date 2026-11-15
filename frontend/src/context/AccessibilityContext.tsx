import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'mr';
export type FontSize = 'normal' | 'large' | 'xlarge';

interface AccessibilityContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    medications: 'My Medications',
    appointments: 'Appointments',
    ai_companion: 'AI Care Companion',
    timeline: 'Health Timeline',
    family_circle: 'Family Circle',
    medical_vault: 'Medical Vault',
    analytics: 'Analytics',
    emergency_sos: 'Emergency SOS',
    settings: 'Settings',
    confirm_taken: 'Confirm Taken',
    scheduled: 'Scheduled',
    taken: 'Taken',
    skipped: 'Skipped',
    pending: 'Pending',
    high_contrast: 'High Contrast',
    font_size: 'Font Size',
    voice_assist: 'Voice Assistance',
    call_doctor: 'Call Doctor',
    tagline: 'Your Health. Your Choices. Your Circle of Care.',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    medications: 'मेरी दवाइयाँ',
    appointments: 'डॉक्टर की मुलाक़ातें',
    ai_companion: 'केयर साथी (AI)',
    timeline: 'स्वास्थ्य समयरेखा',
    family_circle: 'परिवार व देखभाल चक्र',
    medical_vault: 'दस्तावेज़ वॉल्ट',
    analytics: 'स्वास्थ्य रिपोर्ट व आँकड़े',
    emergency_sos: 'आपातकालीन सहायता (SOS)',
    settings: 'सेटिंग्स',
    confirm_taken: 'दवा ले ली है',
    scheduled: 'निर्धारित',
    taken: 'ले ली गई',
    skipped: 'छोड़ दी',
    pending: 'लंबित',
    high_contrast: 'उच्च कंट्रास्ट',
    font_size: 'फ़ॉन्ट आकार',
    voice_assist: 'आवाज़ सहायता',
    call_doctor: 'डॉक्टर को कॉल करें',
    tagline: 'आपका स्वास्थ्य। आपकी पसंद। आपकी देखभाल का दायरा।',
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    medications: 'माझी औषधे',
    appointments: 'डॉक्टरांच्या भेटी',
    ai_companion: 'आरोग्य सहकारी (AI)',
    timeline: 'आरोग्य टाइमलाइन',
    family_circle: 'कुटुंब काळजी मंडळ',
    medical_vault: 'वैद्यकीय तिजोरी',
    analytics: 'आरोग्य विश्लेषण',
    emergency_sos: 'तातडीची मदत (SOS)',
    settings: 'सेटिंग्ज',
    confirm_taken: 'औषध घेतले',
    scheduled: 'नियोजित',
    taken: 'घेतले',
    skipped: 'टाळले',
    pending: 'प्रलंबित',
    high_contrast: 'उच्च कॉन्ट्रास्ट',
    font_size: 'अक्षर आकार',
    voice_assist: 'आवाज सहाय्य',
    call_doctor: 'डॉक्टरांना कॉल करा',
    tagline: 'तुमचे आरोग्य. तुमची निवड. तुमचे काळजी मंडळ.',
  },
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [highContrast, setHighContrast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (fontSize === 'xlarge') {
      root.style.fontSize = '120%';
    } else if (fontSize === 'large') {
      root.style.fontSize = '110%';
    } else {
      root.style.fontSize = '100%';
    }
  }, [highContrast, fontSize]);

  const toggleHighContrast = () => setHighContrast(!highContrast);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (language === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (language === 'mr') {
      utterance.lang = 'mr-IN';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 0.9; // Slightly slower, clear cadence for elderly users
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <AccessibilityContext.Provider
      value={{
        language,
        setLanguage,
        fontSize,
        setFontSize,
        highContrast,
        toggleHighContrast,
        speakText,
        stopSpeaking,
        isSpeaking,
        t,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
};
