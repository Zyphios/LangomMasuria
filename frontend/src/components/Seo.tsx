import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { seoFor, type SeoData } from '../seo/routes';

function setMeta(selector: string, create: () => HTMLElement, attr: 'content' | 'href', value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.append(el);
  }
  el.setAttribute(attr, value);
}

function meta(attrName: 'name' | 'property', key: string) {
  return () => {
    const el = document.createElement('meta');
    el.setAttribute(attrName, key);
    return el;
  };
}

export function applySeo(seo: SeoData) {
  document.title = seo.title;
  document.documentElement.lang = seo.lang;
  setMeta('meta[name="description"]', meta('name', 'description'), 'content', seo.description);
  setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', seo.canonical);
  setMeta('meta[property="og:title"]', meta('property', 'og:title'), 'content', seo.title);
  setMeta('meta[property="og:description"]', meta('property', 'og:description'), 'content', seo.description);
  setMeta('meta[property="og:url"]', meta('property', 'og:url'), 'content', seo.canonical);
  setMeta('meta[property="og:image"]', meta('property', 'og:image'), 'content', seo.image);
  const robots = document.head.querySelector('meta[name="robots"]');
  if (seo.noindex) {
    setMeta('meta[name="robots"]', meta('name', 'robots'), 'content', 'noindex');
  } else {
    robots?.remove();
  }
}

export default function Seo() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    applySeo(seoFor(pathname, i18n.language));
  }, [pathname, i18n.language]);

  return null;
}
