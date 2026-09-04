import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const I18nContext = createContext({
  locale: 'en',
  dir: 'ltr',
  locales: [],
  t: (key) => key,
  setLocale: async () => {},
  ready: false,
});

function getByPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) return acc[part];
    return undefined;
  }, obj);
}

function formatMessage(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    if (vars[name] === undefined || vars[name] === null) return `{${name}}`;
    return String(vars[name]);
  });
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('en');
  const [dir, setDir] = useState('ltr');
  const [messages, setMessages] = useState({});
  const [locales, setLocales] = useState([]);
  const [ready, setReady] = useState(false);

  const applyBundle = useCallback((bundle, list) => {
    const nextLocale = bundle?.locale || 'en';
    const nextDir = bundle?.meta?.dir || 'ltr';
    setLocaleState(nextLocale);
    setDir(nextDir);
    setMessages(bundle?.messages || {});
    if (list) setLocales(list);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextDir;
  }, []);

  const refresh = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.getI18nBundle) {
      setReady(true);
      return;
    }
    const [bundle, list] = await Promise.all([
      api.getI18nBundle(),
      api.getSupportedLocales?.() || Promise.resolve([]),
    ]);
    applyBundle(bundle, list);
    setReady(true);
  }, [applyBundle]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setLocale = useCallback(
    async (code, options = {}) => {
      const api = window.electronAPI;
      if (!api?.setUiLocale) return;
      const bundle = await api.setUiLocale({
        locale: code,
        markChosen: options.markChosen !== false,
      });
      applyBundle(bundle);
      return bundle;
    },
    [applyBundle]
  );

  const t = useCallback(
    (key, vars = {}) => {
      const value = getByPath(messages, key);
      if (typeof value !== 'string') return key;
      return formatMessage(value, vars);
    },
    [messages]
  );

  const value = useMemo(
    () => ({ locale, dir, locales, t, setLocale, ready, refresh }),
    [locale, dir, locales, t, setLocale, ready, refresh]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
