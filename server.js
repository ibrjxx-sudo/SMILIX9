const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');
const ENV_FILES = [path.join(ROOT, '.env'), path.join(ROOT, '1.env')];

function readEnvValue(name) {
  for (const file of ENV_FILES) {
    try {
      const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(entry => entry.trim().startsWith(`${name}=`));
      if (line) return line.trim().slice(name.length + 1).trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
    } catch (error) {
      continue;
    }
  }
  return '';
}

const NODE_ENV = process.env.NODE_ENV || readEnvValue('NODE_ENV') || 'development';
process.env.NODE_ENV = NODE_ENV;
const PORT = Number(process.env.PORT || readEnvValue('PORT') || 8080);
const HOST = process.env.HOST || readEnvValue('HOST') || (NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const ADMIN_PASSWORD = process.env.SMILIX_ADMIN_PASSWORD || readEnvValue('SMILIX_ADMIN_PASSWORD') || '119900';
const sessions = new Set();
const eventClients = new Set();

const DEFAULT_CONTENT = {
  brand: 'SMILIX',
  logo: '',
  favicon: '',
  primaryColor: '#0ea5e9',
  whatsapp: '962782578156',
  navigation: {
    home: 'الرئيسية',
    services: 'الخدمات',
    gallery: 'المعرض',
    booking: 'حجز موعد',
    contact: 'تواصل',
    cta: 'احجز الآن',
  },
  hero: {
    eyebrow: 'عيادة الأسنان الفاخرة في عمان',
    titleLead: 'ابتسامة ناصعة',
    titleAccent: 'تبدو مثالية',
    subtitle: 'نقدم لكم أعلى معايير طب الأسنان الحديث في بيئة فاخرة ومريحة، مع فريق طبي من المتخصصين الأوائل في المنطقة.',
    image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=85',
    ctaPrimary: 'احجز موعدك الآن',
    ctaSecondary: 'اتصل بنا',
    cards: [
      { title: 'مواعيد سريعة', description: 'في خلال 24 ساعة' },
      { title: 'جودة فاخرة', description: 'معايير عالمية' },
      { title: 'راحة مريضة', description: 'بدون ألم 100%' },
    ],
    stats: [
      { value: '+15', label: 'سنة خبرة' },
      { value: '+5000', label: 'مريض سعيد' },
      { value: '+10', label: 'أطباء متخصصون' },
    ],
  },
  services: [
    { title: 'تبييض الأسنان', description: 'احصل على ابتسامة ناصعة بيضاء بأحدث تقنيات التبييض الآمنة والفعالة في جلسة واحدة.', price: '250 دينار' },
    { title: 'زراعة الأسنان', description: 'زراعات أسنان فورية من أجود الأنواع العالمية مع ضمان مدى الحياة ونتائج طبيعية تماماً.', price: '650 دينار' },
    { title: 'الفينير والقشور الخزفية', description: 'قشور خزفية فاخرة تعيد تشكيل وبياض الأسنان للحصول على ابتسامة هوليوود المثالية.', price: '350 دينار' },
    { title: 'تقويم الأسنان', description: 'تقويم شفاف وتقليدي بمحاذاة مثالية وابتسامات متناسقة باحترافية عالية.', price: '850 دينار' },
    { title: 'علاج العصب والحشوات', description: 'حشوات تجميلية متطابقة للون الأسنان وعلاج عصب دقيق بأحدث الأجهزة بدون ألم.', price: '80 دينار' },
    { title: 'جراحة الفم والأسنان', description: 'عمليات جراحية دقيقة لقلع الأسنان والعمليات التجميلية للثة والفكين باحترافية.', price: '150 دينار' },
  ],
  sections: {
    services: {
      eyebrow: 'خدماتنا المميزة',
      titleLead: 'رعاية شاملة لكل',
      titleAccent: 'ابتسامتك',
      description: 'نقدم مجموعة متكاملة من خدمات طب الأسنان باستخدام أحدث التقنيات العالمية في عيادة SMILIX الفاخرة.',
    },
    booking: {
      eyebrow: 'احجز موعدك الآن',
      titleLead: 'ثمّة ابتسامة مثالية',
      titleAccent: 'تنتظرك',
      description: 'املأ النموذج التالي لاختيار التاريخ والوقت المناسب، وسوف نتواصل معك فوراً لتأكيد حجزك.',
      submitLabel: 'تأكيد الحجز عبر واتساب',
      formNote: 'عند الضغط على زر تأكيد الحجز، سيتم فتح واتساب مع تفاصيل حجزك تلقائياً',
      servicePlaceholder: 'اختر نوع الخدمة',
      consultationOption: 'فحص عام واستشارة مجانية',
      otherOption: 'خدمة أخرى',
      formLabels: {
        name: 'الاسم الكامل *',
        phone: 'رقم الهاتف *',
        service: 'نوع الخدمة المطلوبة *',
        date: 'اختر التاريخ *',
        time: 'اختر الوقت *',
        notes: 'ملاحظات إضافية (اختياري)',
      },
      formPlaceholders: {
        name: 'اكتب اسمك الكامل',
        phone: 'مثال: 0791234567',
        notes: 'أي تفاصيل تود إضافتها...',
      },
      features: [
        { title: 'حجز فوري معتمد', description: 'تأكيد الحجز مباشرة عبر واتساب في ثوانٍ' },
        { title: 'مواعيد مرنة', description: 'متاحون طوال أيام الأسبوع من 9 صباحاً - 9 مساءً' },
        { title: 'استشارة مجانية', description: 'فحص عام وتقييم أولي مجاني عند أول زيارة' },
      ],
    },
    contact: {
      eyebrow: 'تواصل معنا',
      titleLead: 'نحن هنا لخدمتك',
      titleAccent: 'دائماً',
      description: 'تواصل معنا عبر أي من القنوات التالية أو زر عيادة SMILIX في أي وقت.',
      cardLabels: { address: 'العنوان', phone: 'الهاتف', hours: 'ساعات العمل', email: 'البريد الإلكتروني' },
      whatsappLabel: 'تواصل مباشر عبر واتساب',
    },
    footerAppTitle: 'حمّل تطبيقنا',
    footerAppDescription: 'قريباً على متاجر التطبيقات',
    footerQuickTitle: 'روابط سريعة',
    footerServicesTitle: 'خدماتنا',
    copyrightNote: 'جميع الحقوق محفوظة.',
  },
  gallery: {
    eyebrow: 'معرض أعمالنا',
    titleLead: 'تحولات',
    titleAccent: 'ابتسامات',
    description: 'نماذج من عمليات التجميل الناجحة وجودة خدماتنا في SMILIX.',
    items: [],
  },
  contact: {
    address: 'عمّان - الجبيهة\nشارع الملكة رانيا، مبنى SMILIX الطبي، الدور الأول',
    phone: '078 257 8156\n06 555 1234',
    hours: 'السبت - الخميس\n9:00 صباحاً - 9:00 مساءً',
    email: 'info@smilix.jo\nbooking@smilix.jo',
    footerDescription: 'عيادة طب الأسنان الفاخرة في عمان. نقدم أعلى معايير الرعاية الطبية بلمسة فنية وابتسامة دائمة.',
    social: { facebook: '', instagram: '', tiktok: '', snapchat: '' },
  },
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function readContent() {
  try {
    const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
    return normalizeContent(content);
  } catch (error) {
    return DEFAULT_CONTENT;
  }
}

function normalizeText(value, fallback, maxLength = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
}

function normalizeItems(items, defaults, fields) {
  if (!Array.isArray(items)) return defaults;
  return items.slice(0, 50).map((item, index) => {
    const fallback = defaults[index] || {};
    const normalized = {};
    fields.forEach(([field, limit]) => {
      normalized[field] = normalizeText(item && item[field], fallback[field] || '', limit);
    });
    return normalized;
  });
}

function normalizeContent(value) {
  const input = value && typeof value === 'object' ? value : {};
  const hero = input.hero && typeof input.hero === 'object' ? input.hero : {};
  const navigation = input.navigation && typeof input.navigation === 'object' ? input.navigation : {};
  const sections = input.sections && typeof input.sections === 'object' ? input.sections : {};
  const serviceSection = sections.services && typeof sections.services === 'object' ? sections.services : {};
  const bookingSection = sections.booking && typeof sections.booking === 'object' ? sections.booking : {};
  const contactSection = sections.contact && typeof sections.contact === 'object' ? sections.contact : {};
  const bookingFormLabels = bookingSection.formLabels && typeof bookingSection.formLabels === 'object' ? bookingSection.formLabels : {};
  const bookingFormPlaceholders = bookingSection.formPlaceholders && typeof bookingSection.formPlaceholders === 'object' ? bookingSection.formPlaceholders : {};
  const contactCardLabels = contactSection.cardLabels && typeof contactSection.cardLabels === 'object' ? contactSection.cardLabels : {};
  const gallery = input.gallery && typeof input.gallery === 'object' ? input.gallery : {};
  const contact = input.contact && typeof input.contact === 'object' ? input.contact : {};
  const social = contact.social && typeof contact.social === 'object' ? contact.social : {};
  return {
    brand: normalizeText(input.brand, DEFAULT_CONTENT.brand, 60) || DEFAULT_CONTENT.brand,
    logo: normalizeText(input.logo, '', 2000),
    favicon: normalizeText(input.favicon, '', 2000),
    primaryColor: /^#[0-9a-f]{6}$/i.test(input.primaryColor || '') ? input.primaryColor : DEFAULT_CONTENT.primaryColor,
    whatsapp: normalizeText(input.whatsapp, DEFAULT_CONTENT.whatsapp, 24).replace(/[^0-9]/g, ''),
    navigation: Object.fromEntries(Object.keys(DEFAULT_CONTENT.navigation).map(key => [key, normalizeText(navigation[key], DEFAULT_CONTENT.navigation[key], 100)])),
    hero: {
      eyebrow: normalizeText(hero.eyebrow, DEFAULT_CONTENT.hero.eyebrow),
      titleLead: normalizeText(hero.titleLead, DEFAULT_CONTENT.hero.titleLead, 100),
      titleAccent: normalizeText(hero.titleAccent, DEFAULT_CONTENT.hero.titleAccent, 100),
      subtitle: normalizeText(hero.subtitle, DEFAULT_CONTENT.hero.subtitle),
      image: normalizeText(hero.image, DEFAULT_CONTENT.hero.image, 2000),
      ctaPrimary: normalizeText(hero.ctaPrimary, DEFAULT_CONTENT.hero.ctaPrimary, 100),
      ctaSecondary: normalizeText(hero.ctaSecondary, DEFAULT_CONTENT.hero.ctaSecondary, 100),
      cards: normalizeItems(hero.cards, DEFAULT_CONTENT.hero.cards, [['title', 100], ['description', 150]]),
      stats: normalizeItems(hero.stats, DEFAULT_CONTENT.hero.stats, [['value', 40], ['label', 80]]),
    },
    services: normalizeItems(input.services, DEFAULT_CONTENT.services, [['title', 100], ['description', 500], ['price', 80]]),
    sections: {
      services: {
        eyebrow: normalizeText(serviceSection.eyebrow, DEFAULT_CONTENT.sections.services.eyebrow, 100),
        titleLead: normalizeText(serviceSection.titleLead, DEFAULT_CONTENT.sections.services.titleLead, 100),
        titleAccent: normalizeText(serviceSection.titleAccent, DEFAULT_CONTENT.sections.services.titleAccent, 100),
        description: normalizeText(serviceSection.description, DEFAULT_CONTENT.sections.services.description),
      },
      booking: {
        eyebrow: normalizeText(bookingSection.eyebrow, DEFAULT_CONTENT.sections.booking.eyebrow, 100),
        titleLead: normalizeText(bookingSection.titleLead, DEFAULT_CONTENT.sections.booking.titleLead, 120),
        titleAccent: normalizeText(bookingSection.titleAccent, DEFAULT_CONTENT.sections.booking.titleAccent, 100),
        description: normalizeText(bookingSection.description, DEFAULT_CONTENT.sections.booking.description),
        submitLabel: normalizeText(bookingSection.submitLabel, DEFAULT_CONTENT.sections.booking.submitLabel, 100),
        formNote: normalizeText(bookingSection.formNote, DEFAULT_CONTENT.sections.booking.formNote, 250),
        servicePlaceholder: normalizeText(bookingSection.servicePlaceholder, DEFAULT_CONTENT.sections.booking.servicePlaceholder, 100),
        consultationOption: normalizeText(bookingSection.consultationOption, DEFAULT_CONTENT.sections.booking.consultationOption, 100),
        otherOption: normalizeText(bookingSection.otherOption, DEFAULT_CONTENT.sections.booking.otherOption, 100),
        formLabels: Object.fromEntries(Object.keys(DEFAULT_CONTENT.sections.booking.formLabels).map(key => [key, normalizeText(bookingFormLabels[key], DEFAULT_CONTENT.sections.booking.formLabels[key], 100)])),
        formPlaceholders: Object.fromEntries(Object.keys(DEFAULT_CONTENT.sections.booking.formPlaceholders).map(key => [key, normalizeText(bookingFormPlaceholders[key], DEFAULT_CONTENT.sections.booking.formPlaceholders[key], 150)])),
        features: normalizeItems(bookingSection.features, DEFAULT_CONTENT.sections.booking.features, [['title', 100], ['description', 200]]),
      },
      contact: {
        eyebrow: normalizeText(contactSection.eyebrow, DEFAULT_CONTENT.sections.contact.eyebrow, 100),
        titleLead: normalizeText(contactSection.titleLead, DEFAULT_CONTENT.sections.contact.titleLead, 120),
        titleAccent: normalizeText(contactSection.titleAccent, DEFAULT_CONTENT.sections.contact.titleAccent, 100),
        description: normalizeText(contactSection.description, DEFAULT_CONTENT.sections.contact.description),
        cardLabels: Object.fromEntries(Object.keys(DEFAULT_CONTENT.sections.contact.cardLabels).map(key => [key, normalizeText(contactCardLabels[key], DEFAULT_CONTENT.sections.contact.cardLabels[key], 100)])),
        whatsappLabel: normalizeText(contactSection.whatsappLabel, DEFAULT_CONTENT.sections.contact.whatsappLabel, 100),
      },
      footerAppTitle: normalizeText(sections.footerAppTitle, DEFAULT_CONTENT.sections.footerAppTitle, 100),
      footerAppDescription: normalizeText(sections.footerAppDescription, DEFAULT_CONTENT.sections.footerAppDescription, 250),
      footerQuickTitle: normalizeText(sections.footerQuickTitle, DEFAULT_CONTENT.sections.footerQuickTitle, 100),
      footerServicesTitle: normalizeText(sections.footerServicesTitle, DEFAULT_CONTENT.sections.footerServicesTitle, 100),
      copyrightNote: normalizeText(sections.copyrightNote, DEFAULT_CONTENT.sections.copyrightNote, 150),
    },
    gallery: {
      eyebrow: normalizeText(gallery.eyebrow, DEFAULT_CONTENT.gallery.eyebrow, 100),
      titleLead: normalizeText(gallery.titleLead, DEFAULT_CONTENT.gallery.titleLead, 100),
      titleAccent: normalizeText(gallery.titleAccent, DEFAULT_CONTENT.gallery.titleAccent, 100),
      description: normalizeText(gallery.description, DEFAULT_CONTENT.gallery.description),
      items: normalizeItems(gallery.items, DEFAULT_CONTENT.gallery.items, [['caption', 100], ['alt', 150], ['image', 2000], ['type', 10]]).map(item => ({ ...item, type: item.type === 'video' ? 'video' : 'image' })),
    },
    contact: {
      address: normalizeText(contact.address, DEFAULT_CONTENT.contact.address, 500),
      phone: normalizeText(contact.phone, DEFAULT_CONTENT.contact.phone, 150),
      hours: normalizeText(contact.hours, DEFAULT_CONTENT.contact.hours, 200),
      email: normalizeText(contact.email, DEFAULT_CONTENT.contact.email, 200),
      footerDescription: normalizeText(contact.footerDescription, DEFAULT_CONTENT.contact.footerDescription, 500),
      social: {
        facebook: normalizeText(social.facebook, '', 500),
        instagram: normalizeText(social.instagram, '', 500),
        tiktok: normalizeText(social.tiktok, '', 500),
        snapchat: normalizeText(social.snapchat, '', 500),
      },
    },
  };
}

function saveContent(content) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = CONTENT_FILE + '.tmp';
  fs.writeFileSync(temporaryFile, JSON.stringify(content, null, 2), 'utf8');
  fs.renameSync(temporaryFile, CONTENT_FILE);
}

function readRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyBytes = 0;
    req.on('data', chunk => {
      bodyBytes += chunk.length;
      body += chunk;
      if (bodyBytes > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

const UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
};

function storeUpload(payload) {
  const mimeType = String(payload && payload.mimeType || '').toLowerCase();
  const extension = UPLOAD_TYPES[mimeType];
  const match = typeof (payload && payload.data) === 'string' && payload.data.match(/^data:([^;,]+);base64,([a-z\d+/=]+)$/i);
  if (!extension || !match || match[1].toLowerCase() !== mimeType) throw new Error('صيغة الملف غير مدعومة.');
  const fileData = Buffer.from(match[2], 'base64');
  if (!fileData.length || fileData.length > 35 * 1024 * 1024) throw new Error('حجم الملف يجب ألا يتجاوز 35 ميغابايت.');
  const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  const uploadDirectory = path.join(ROOT, 'assets', 'uploads');
  fs.mkdirSync(uploadDirectory, { recursive: true });
  fs.writeFileSync(path.join(uploadDirectory, filename), fileData, { flag: 'wx' });
  return `/assets/uploads/${filename}`;
}

function hasAdminSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('smilix_admin='));
  return !!sessionCookie && sessions.has(sessionCookie.slice('smilix_admin='.length));
}

function publishContentChange() {
  const event = `data: ${JSON.stringify({ type: 'content-updated', at: Date.now() })}\n\n`;
  eventClients.forEach(client => client.write(event));
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/content' && req.method === 'GET') {
    return sendJson(res, 200, readContent());
  }

  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    eventClients.add(res);
    req.on('close', () => eventClients.delete(res));
    return;
  }

  if (pathname === '/api/admin/session' && req.method === 'GET') {
    return sendJson(res, hasAdminSession(req) ? 200 : 401, { authenticated: hasAdminSession(req) });
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    let submitted;
    try { submitted = await readRequestBody(req); } catch (error) { return sendJson(res, 400, { error: 'بيانات الدخول غير صالحة.' }); }
    const candidate = Buffer.from(String(submitted.password || ''));
    const expected = Buffer.from(ADMIN_PASSWORD);
    const matches = candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    if (!matches) return sendJson(res, 401, { error: 'كلمة المرور غير صحيحة.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': `smilix_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const cookieHeader = req.headers.cookie || '';
    const sessionCookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('smilix_admin='));
    if (sessionCookie) sessions.delete(sessionCookie.slice('smilix_admin='.length));
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'smilix_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    if (!hasAdminSession(req)) return sendJson(res, 401, { error: 'سجّل الدخول أولاً.' });
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
      return sendJson(res, 403, { error: 'مصدر الطلب غير مسموح.' });
    }
    try {
      const uploadUrl = storeUpload(await readRequestBody(req, 48 * 1024 * 1024));
      return sendJson(res, 201, { url: uploadUrl });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || 'تعذر رفع الملف.' });
    }
  }

  if (pathname === '/api/content' && req.method === 'PUT') {
    if (!hasAdminSession(req)) return sendJson(res, 401, { error: 'سجّل الدخول أولاً.' });
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
      return sendJson(res, 403, { error: 'مصدر الطلب غير مسموح.' });
    }
    try {
      const content = normalizeContent(await readRequestBody(req));
      saveContent(content);
      publishContentChange();
      return sendJson(res, 200, { ok: true, content });
    } catch (error) {
      return sendJson(res, 400, { error: 'تعذر حفظ المحتوى. تحقق من البيانات وحاول مجدداً.' });
    }
  }

  return sendJson(res, 404, { error: 'المسار غير موجود.' });
}

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(parsedUrl.pathname || '/');
    if (pathname.toLowerCase() === '/1.env' || pathname.toLowerCase() === '/.env') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    if (pathname.startsWith('/api/')) {
      handleApi(req, res, pathname).catch(error => {
        console.error('API error:', error);
        if (!res.headersSent) sendJson(res, 500, { error: 'حدث خطأ في الخادم.' });
      });
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(ROOT, '.' + pathname);
    const relativePath = path.relative(ROOT, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found: ' + pathname);
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Length': stats.size,
      });
      const read = fs.createReadStream(filePath);
      read.on('error', () => {
        try { res.destroy(); } catch (_) { /* ignore */ }
      });
      read.pipe(res);
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error: ' + String(e && e.message || e));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SMILIX Server running → http://${HOST}:${PORT}/`);
  console.log(`Serving folder: ${ROOT}`);
  console.log('Admin password is configured.');
});
