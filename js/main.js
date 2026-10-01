(function () {
  'use strict';

  // ===== CONSTANTS =====
  let clinicWaNumber = '962782578156';
  let clinicBrand = 'SMILIX';
  const STORAGE_KEYS = {
    BOOKINGS: 'smilix_bookings',
    LAST_RESET: 'smilix_last_reset_date',
    REMINDERS: 'smilix_appointment_reminders',
    ANALYTICS: 'smilix_site_analytics',
    SITE_CONTENT: 'smilix-admin-content',
    GALLERY_CLEARED: 'smilix-gallery-cleared-v1',
  };
  const WORK_START_HOUR = 9;
  const WORK_END_HOUR = 21;
  const SLOT_MINUTES = 30;
  const DAYS_TO_SHOW = 7;
  const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const WEEKDAYS_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const FRIDAY = 5;

  // ===== DOM ELEMENTS =====
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const defaultLogoMarkup = $$('.logo-icon').map(element => element.innerHTML);

  const header = $('#header');
  const menuToggle = $('#menuToggle');
  const navMobile = $('#navMobile');
  const navMobileLinks = $$('#navMobile .nav-link');
  const scrollTopBtn = $('#scrollTop');
  const bookingForm = $('#bookingForm');
  const dateScroller = $('#dateScroller');
  const timeSlotsEl = $('#timeSlots');
  const selectedDateInput = $('#selectedDate');
  const selectedTimeInput = $('#selectedTime');
  const formAlert = $('#formAlert');
  const submitBtn = $('#submitBtn');
  const toastEl = $('#toast');
  const waFloatBtn = $('.wa-float');
  const notificationBell = $('#notificationBell');
  const notificationPanel = $('#notificationPanel');
  const notificationList = $('#notificationList');
  const notificationCount = $('#notificationCount');
  const notificationReadAll = $('#notificationReadAll');
  const notificationEnable = $('#notificationEnable');
  const notificationPermissionText = $('#notificationPermissionText');

  // ===== UTILITIES =====
  function padZero(n) { return n < 10 ? '0' + n : '' + n; }

  function todayKey(dateObj = null) {
    const d = dateObj || new Date();
    return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
  }

  function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function showToast(msg, type = 'success') {
    toastEl.className = 'toast ' + type;
    toastEl.innerHTML = '';
    if (type === 'success') {
      toastEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    } else {
      toastEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
    toastEl.innerHTML += `<span>${msg}</span>`;
    setTimeout(() => toastEl.classList.add('show'), 10);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 3500);
  }

  function showAlert(msg, type = 'error') {
    formAlert.textContent = msg;
    formAlert.className = 'form-alert show ' + type;
    clearTimeout(showAlert._t);
    showAlert._t = setTimeout(() => formAlert.classList.remove('show'), 5500);
  }

  function safeWebUrl(value, fallback = '') {
    if (!value) return fallback;
    if (/^data:(image|video)\//i.test(value)) return value;
    try {
      const baseUrl = new URL('.', document.baseURI);
      const parsed = value.startsWith('/')
        ? new URL(value.slice(1), baseUrl)
        : new URL(value, document.baseURI);
      const localFile = parsed.protocol === 'file:' && window.location.protocol === 'file:';
      return ['http:', 'https:'].includes(parsed.protocol) || localFile ? parsed.href : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function setLines(element, value) {
    if (!element) return;
    element.replaceChildren();
    String(value || '').split('\n').forEach((line, index) => {
      if (index) element.appendChild(document.createElement('br'));
      element.appendChild(document.createTextNode(line));
    });
  }

  function setButtonLabel(button, label) {
    if (!button || label === undefined || label === null) return;
    const icon = $('svg', button);
    const iconFirst = icon && button.firstChild === icon;
    button.replaceChildren();
    if (iconFirst) button.appendChild(icon);
    button.appendChild(document.createTextNode(label || ''));
    if (icon && !iconFirst) button.appendChild(icon);
  }

  function renderSectionTitle(element, lead, accent, suffix = '') {
    if (!element || (lead === undefined && accent === undefined)) return;
    element.replaceChildren(document.createTextNode(lead || ''));
    const highlight = document.createElement('span');
    highlight.className = 'gradient-text';
    highlight.textContent = accent || '';
    element.append(highlight, document.createTextNode(suffix));
  }

  function renderServices(services, bookingSettings = {}) {
    const grid = $('.services-grid');
    if (!grid || !Array.isArray(services)) return;
    const iconPaths = [
      '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>',
      '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
      '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      '<circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>',
    ];
    const iconClasses = ['gradient-icon', 'gradient-icon-2', 'gradient-icon-3', 'gradient-icon-4', 'gradient-icon-5', 'gradient-icon-6'];
    grid.replaceChildren();
    services.forEach((service, index) => {
      const card = document.createElement('article');
      card.className = `service-card reveal in-view${index % 3 === 1 ? ' delay-100' : index % 3 === 2 ? ' delay-200' : ''}`;
      const icon = document.createElement('div');
      icon.className = `service-icon ${iconClasses[index % iconClasses.length]}`;
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconPaths[index % iconPaths.length]}</svg>`;
      const title = document.createElement('h3');
      title.textContent = service.title;
      const description = document.createElement('p');
      description.textContent = service.description;
      const price = document.createElement('div');
      price.className = 'service-price';
      const priceLabel = document.createElement('span');
      priceLabel.textContent = 'بدءاً من';
      const priceValue = document.createElement('strong');
      priceValue.textContent = service.price;
      price.append(priceLabel, priceValue);
      card.append(icon, title, description, price);
      grid.appendChild(card);
    });

    if (bookingForm) {
      const select = $('#serviceSelect');
      const selected = select.value;
      select.replaceChildren(new Option(bookingSettings.servicePlaceholder || 'اختر نوع الخدمة', ''));
      select.add(new Option(bookingSettings.consultationOption || 'فحص عام واستشارة مجانية', 'فحص عام واستشارة'));
      services.forEach(service => select.add(new Option(service.title, service.title)));
      select.add(new Option(bookingSettings.otherOption || 'خدمة أخرى', 'خدمة أخرى'));
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
    }
  }

  function renderGallery(gallery) {
    const grid = $('.gallery-grid');
    if (!grid || !gallery || !Array.isArray(gallery.items)) return;
    grid.replaceChildren();
    gallery.items.filter(item => !item.hidden).forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `gallery-item reveal in-view${index % 3 === 1 ? ' tall' : ''}`;
      const media = document.createElement(item.type === 'video' ? 'video' : 'img');
      media.src = safeWebUrl(item.image);
      if (item.type === 'video') {
        media.controls = true;
        media.preload = 'metadata';
        media.playsInline = true;
        media.setAttribute('aria-label', item.alt || item.caption);
      } else {
        media.alt = item.alt;
        media.loading = 'lazy';
      }
      const overlay = document.createElement('div');
      overlay.className = 'gallery-overlay';
      const caption = document.createElement('span');
      caption.textContent = item.caption;
      overlay.appendChild(caption);
      card.append(media, overlay);
      grid.appendChild(card);
    });
  }

  function renderSiteContent(content) {
    if (!content) return;
    clinicBrand = content.brand || clinicBrand;
    clinicWaNumber = content.whatsapp || clinicWaNumber;
    document.querySelectorAll('.logo-text').forEach(element => { element.textContent = clinicBrand; });
    document.title = `${clinicBrand} | عيادة طب الأسنان`;
    const brandLogo = safeWebUrl(content.logo);
    $$('.logo-icon').forEach((element, index) => {
      if (brandLogo) {
        const image = document.createElement('img');
        image.src = brandLogo;
        image.alt = `${clinicBrand} logo`;
        element.replaceChildren(image);
      } else {
        element.innerHTML = defaultLogoMarkup[index] || defaultLogoMarkup[0] || '';
      }
    });
    const favicon = $('#siteFavicon');
    if (favicon) {
      const faviconUrl = safeWebUrl(content.favicon);
      if (faviconUrl) {
        favicon.href = faviconUrl;
        favicon.type = new URL(faviconUrl).pathname.toLowerCase().endsWith('.ico') ? 'image/x-icon' : 'image/png';
      }
      else favicon.removeAttribute('href');
    }
    document.documentElement.style.setProperty('--c-primary', content.primaryColor || '#0ea5e9');
    document.documentElement.style.setProperty('--grad-primary', `linear-gradient(135deg, ${content.primaryColor || '#0ea5e9'} 0%, #06b6d4 55%, #0f766e 100%)`);

    const navigation = content.navigation || {};
    $$('.nav-link').forEach(link => {
      const sectionKey = (link.getAttribute('href') || '').slice(1);
      const label = { home: 'home', services: 'services', gallery: 'gallery', booking: 'booking', contact: 'contact' }[sectionKey];
      if (label && navigation[label]) link.textContent = navigation[label];
    });
    setButtonLabel($('.header .btn-cta'), navigation.cta);

    const hero = content.hero || {};
    const badge = $('.badge-hero');
    if (badge) {
      badge.replaceChildren();
      const dot = document.createElement('span');
      dot.className = 'badge-dot';
      badge.append(dot, document.createTextNode(hero.eyebrow || ''));
    }
    const heading = $('.hero-title');
    if (heading) {
      heading.replaceChildren(document.createTextNode(hero.titleLead || ''));
      const accent = document.createElement('span');
      accent.className = 'gradient-text';
      accent.textContent = hero.titleAccent || '';
      heading.append(accent, document.createElement('br'), document.createTextNode('مع '));
      const brand = document.createElement('span');
      brand.className = 'brand-name';
      brand.textContent = clinicBrand;
      heading.appendChild(brand);
    }
    const heroButtons = $$('.hero-actions .btn');
    setButtonLabel(heroButtons[0], hero.ctaPrimary);
    setButtonLabel(heroButtons[1], hero.ctaSecondary);
    $('.hero-subtitle').textContent = hero.subtitle || '';
    const heroImage = $('.hero-image img');
    if (heroImage) {
      heroImage.src = safeWebUrl(hero.image, heroImage.src);
      heroImage.alt = clinicBrand;
    }
    $$('.floating-card').forEach((card, index) => {
      const item = (hero.cards || [])[index];
      if (item) {
        $('.card-title', card).textContent = item.title;
        $('.card-text', card).textContent = item.description;
      }
    });
    const stats = $$('.hero-stats .stat');
    (hero.stats || []).slice(0, 3).forEach((stat, index) => {
      if (stats[index]) {
        $('.stat-num', stats[index]).textContent = stat.value;
        $('.stat-label', stats[index]).textContent = stat.label;
      }
    });

    const sections = content.sections || {};
    renderServices(content.services || [], sections.booking || {});
    const servicesSection = sections.services || {};
    const servicesHead = $('#services .section-head');
    if (servicesHead) {
      if (servicesSection.eyebrow !== undefined) $('.eyebrow', servicesHead).textContent = servicesSection.eyebrow;
      renderSectionTitle($('.section-title', servicesHead), servicesSection.titleLead, servicesSection.titleAccent);
      if (servicesSection.description !== undefined) $('.section-desc', servicesHead).textContent = servicesSection.description;
    }
    const gallery = content.gallery || {};
    const galleryHead = $('#gallery .section-head');
    if (galleryHead) {
      if (gallery.eyebrow !== undefined) $('.eyebrow', galleryHead).textContent = gallery.eyebrow;
      renderSectionTitle($('.section-title', galleryHead), gallery.titleLead, gallery.titleAccent, ' ناجحة');
      if (gallery.description !== undefined) $('.section-desc', galleryHead).textContent = gallery.description;
    }
    renderGallery(gallery);

    const booking = sections.booking || {};
    const bookingLabels = booking.formLabels || {};
    const bookingLabelKeys = ['name', 'phone', 'service', 'date', 'time', 'notes'];
    $$('.booking-form .form-group label').forEach((label, index) => {
      if (bookingLabels[bookingLabelKeys[index]]) label.textContent = bookingLabels[bookingLabelKeys[index]];
    });
    const bookingPlaceholders = booking.formPlaceholders || {};
    ['patientName', 'patientPhone', 'patientNotes'].forEach((id, index) => {
      const placeholderKey = ['name', 'phone', 'notes'][index];
      const input = $('#' + id);
      if (input && bookingPlaceholders[placeholderKey]) input.placeholder = bookingPlaceholders[placeholderKey];
    });
    const bookingInfo = $('.booking-info');
    if (bookingInfo) {
      if (booking.eyebrow !== undefined) $('.eyebrow', bookingInfo).textContent = booking.eyebrow;
      renderSectionTitle($('.section-title', bookingInfo), booking.titleLead, booking.titleAccent);
      if (booking.description !== undefined) $('.booking-desc', bookingInfo).textContent = booking.description;
      $$('.bf-item').forEach((item, index) => {
        const feature = (booking.features || [])[index];
        if (feature) {
          $('h4', item).textContent = feature.title;
          $('p', item).textContent = feature.description;
        }
      });
    }
    setButtonLabel($('.btn-text', submitBtn), booking.submitLabel);
    const bookingNote = $('.form-note');
    if (bookingNote) setButtonLabel(bookingNote, booking.formNote);

    const contactSection = sections.contact || {};
    const contactHead = $('#contact .section-head');
    if (contactHead) {
      if (contactSection.eyebrow !== undefined) $('.eyebrow', contactHead).textContent = contactSection.eyebrow;
      renderSectionTitle($('.section-title', contactHead), contactSection.titleLead, contactSection.titleAccent);
      if (contactSection.description !== undefined) $('.section-desc', contactHead).textContent = contactSection.description;
    }
    const contactWhatsApp = $('.contact-whatsapp a');
    if (contactWhatsApp) {
      const textNode = Array.from(contactWhatsApp.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode && contactSection.whatsappLabel !== undefined) textNode.textContent = contactSection.whatsappLabel;
    }

    const contact = content.contact || {};
    const contactCards = $$('.contact-grid .contact-card');
    const contactLabels = contactSection.cardLabels || {};
    ['address', 'phone', 'hours', 'email'].forEach((key, index) => {
      if (contactCards[index] && contactLabels[key]) $('h4', contactCards[index]).textContent = contactLabels[key];
    });
    [contact.address, contact.phone, contact.hours, contact.email].forEach((value, index) => {
      if (contactCards[index]) setLines($('p', contactCards[index]), value);
    });
    const footerDescription = $('.footer-brand > p');
    if (footerDescription) footerDescription.textContent = contact.footerDescription || '';
    const footerApp = $('.footer-app');
    if (footerApp) {
      if (sections.footerAppTitle !== undefined) $('h5', footerApp).textContent = sections.footerAppTitle;
      if (sections.footerAppDescription !== undefined) $('p', footerApp).textContent = sections.footerAppDescription;
    }
    const footerColumns = $$('.footer-links');
    if (footerColumns[0] && sections.footerQuickTitle !== undefined) $('h5', footerColumns[0]).textContent = sections.footerQuickTitle;
    if (footerColumns[1]) {
      if (sections.footerServicesTitle !== undefined) $('h5', footerColumns[1]).textContent = sections.footerServicesTitle;
      const footerServiceLinks = $$('li', footerColumns[1]);
      footerServiceLinks.forEach((item, index) => {
        const service = (content.services || [])[index];
        item.hidden = !service;
        if (service) $('a', item).textContent = service.title;
      });
    }
    if (footerColumns[0]) {
      const footerLabels = [navigation.home, navigation.services, navigation.gallery, navigation.booking, navigation.contact];
      $$('li a', footerColumns[0]).forEach((link, index) => {
        if (footerLabels[index]) link.textContent = footerLabels[index];
      });
    }
    const copyright = $('.footer-bottom .container p');
    if (copyright && sections.copyrightNote !== undefined) copyright.textContent = `© ${new Date().getFullYear()} ${clinicBrand} لطب الأسنان. ${sections.copyrightNote}`;
    const socialNames = ['facebook', 'instagram', 'tiktok', 'snapchat'];
    $$('.social-links a').forEach((link, index) => {
      const socialUrl = safeWebUrl(contact.social && contact.social[socialNames[index]]);
      link.href = socialUrl || '#';
      link.hidden = !socialUrl;
    });
    const whatsappUrl = `https://wa.me/${clinicWaNumber}`;
    $$('.wa-float, .contact-whatsapp a').forEach(link => { link.href = whatsappUrl; });
  }

  let liveContentApiAvailable = false;

  async function loadSiteContent() {
    try {
      const apiUrl = new URL('api/content', document.baseURI);
      const response = await fetch(apiUrl, { cache: 'no-store' });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        liveContentApiAvailable = true;
        renderSiteContent(await response.json());
        return;
      }
    } catch (error) {
      liveContentApiAvailable = false;
    }

    try {
      const localContent = localStorage.getItem(STORAGE_KEYS.SITE_CONTENT);
      if (localContent) {
        const content = JSON.parse(localContent);
        if (!localStorage.getItem(STORAGE_KEYS.GALLERY_CLEARED)) {
          if (content.gallery && Array.isArray(content.gallery.items)) content.gallery.items = [];
          localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(content));
          localStorage.setItem(STORAGE_KEYS.GALLERY_CLEARED, 'true');
        }
        renderSiteContent(content);
        return;
      }
    } catch (error) {
      // Continue with the bundled content fallback.
    }

    try {
      const contentUrl = new URL('data/site-content.json', document.baseURI);
      const response = await fetch(contentUrl, { cache: 'no-store' });
      if (response.ok) renderSiteContent(await response.json());
    } catch (error) {
      console.warn('Site content could not be loaded.', error);
    }
  }

  function listenForSiteUpdates() {
    window.addEventListener('storage', event => {
      if (event.key !== STORAGE_KEYS.SITE_CONTENT || !event.newValue) return;
      try {
        renderSiteContent(JSON.parse(event.newValue));
      } catch (error) {
        console.warn('Local site content could not be updated.', error);
      }
    });
    if (!liveContentApiAvailable || !('EventSource' in window)) return;
    const events = new EventSource(new URL('api/events', document.baseURI));
    events.addEventListener('message', () => loadSiteContent());
  }

  // ===== STORAGE & RESET LOGIC =====
  function getBookings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  function getReminders() {
    try {
      const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
      return Array.isArray(reminders) ? reminders : [];
    } catch (e) {
      return [];
    }
  }

  function saveReminders(reminders) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  }

  function recordPageView() {
    try {
      const analytics = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYTICS) || '{}');
      const dailyViews = analytics.dailyViews && typeof analytics.dailyViews === 'object' ? analytics.dailyViews : {};
      const today = todayKey();
      dailyViews[today] = (Number(dailyViews[today]) || 0) + 1;
      const firstDay = todayKey(addDays(new Date(), -6));
      Object.keys(dailyViews).forEach(date => {
        if (date < firstDay) delete dailyViews[date];
      });
      analytics.totalViews = (Number(analytics.totalViews) || 0) + 1;
      analytics.dailyViews = dailyViews;
      localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
    } catch (error) {
    }
  }

  function appointmentDate(reminder) {
    const [year, month, day] = reminder.dateKey.split('-').map(Number);
    const [hour, minute] = reminder.timeValue.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }

  function formatAppointmentDate(dateKey, timeLabel) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return `${WEEKDAYS[date.getDay()]} ${day} ${MONTHS[month - 1]}، الساعة ${timeLabel}`;
  }

  function addReminder(formData) {
    const reminders = getReminders();
    reminders.push({
      id: `${formData.dateKey}-${formData.timeValue}-${Date.now()}`,
      name: formData.name,
      service: formData.service,
      dateKey: formData.dateKey,
      timeValue: formData.timeValue,
      timeLabel: formData.timeLabel,
      notifiedAt: null,
      read: true,
    });
    saveReminders(reminders);
    renderNotifications();
  }

  function playReminderSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1174, audioContext.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.52);
      oscillator.onended = () => audioContext.close();
    } catch (e) {
      // Audio may be unavailable until the visitor interacts with the page.
    }
  }

  function updateNotificationPermission() {
    if (!('Notification' in window)) {
      notificationPermissionText.textContent = 'إشعارات المتصفح غير مدعومة في هذا المتصفح.';
      notificationEnable.hidden = true;
      return;
    }
    if (Notification.permission === 'granted') {
      notificationPermissionText.textContent = 'إشعارات المتصفح مفعّلة على هذا الجهاز.';
      notificationEnable.hidden = true;
    } else if (Notification.permission === 'denied') {
      notificationPermissionText.textContent = 'تم حظر الإشعارات. غيّر الإذن من إعدادات المتصفح.';
      notificationEnable.hidden = true;
    } else {
      notificationPermissionText.textContent = 'فعّل إشعارات المتصفح لتصلك التنبيهات خارج الصفحة.';
      notificationEnable.hidden = false;
    }
  }

  function renderNotifications() {
    const reminders = getReminders().sort((a, b) => appointmentDate(a) - appointmentDate(b));
    const unreadCount = reminders.filter(reminder => reminder.notifiedAt && !reminder.read).length;
    notificationCount.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    notificationCount.hidden = unreadCount === 0;
    notificationList.innerHTML = '';

    const now = new Date();
    const visibleReminders = reminders
      .filter(reminder => appointmentDate(reminder) > now || reminder.notifiedAt)
      .sort((a, b) => {
        const unreadDifference = Number(!!(b.notifiedAt && !b.read)) - Number(!!(a.notifiedAt && !a.read));
        if (unreadDifference) return unreadDifference;
        const aDate = appointmentDate(a);
        const bDate = appointmentDate(b);
        if (aDate > now && bDate > now) return aDate - bDate;
        if (aDate > now) return -1;
        if (bDate > now) return 1;
        return new Date(b.notifiedAt) - new Date(a.notifiedAt);
      });
    if (!visibleReminders.length) {
      notificationList.innerHTML = '<p class="notification-empty">لا توجد مواعيد أو تذكيرات حالياً.</p>';
    } else {
      visibleReminders.slice(0, 8).forEach(reminder => {
        const item = document.createElement('article');
        item.className = `notification-item${reminder.notifiedAt && !reminder.read ? ' unread' : ''}`;
        const appointmentText = formatAppointmentDate(reminder.dateKey, reminder.timeLabel);
        item.innerHTML = `<span class="notification-status" aria-hidden="true"></span><div><strong>${reminder.notifiedAt ? 'تذكير بموعدك' : 'موعد قادم'}</strong><p>${appointmentText}</p><small>${reminder.service}</small></div>`;
        notificationList.appendChild(item);
      });
    }
    updateNotificationPermission();
  }

  function checkAppointmentReminders() {
    const now = new Date();
    let changed = false;
    const reminders = getReminders().map(reminder => {
      const appointment = appointmentDate(reminder);
      const reminderTime = appointment.getTime() - 60 * 60 * 1000;
      if (!reminder.notifiedAt && reminderTime <= now.getTime() && appointment > now) {
        reminder.notifiedAt = now.toISOString();
        reminder.read = false;
        changed = true;
        const message = `موعد ${reminder.service} بعد ساعة، ${formatAppointmentDate(reminder.dateKey, reminder.timeLabel)}.`;
        showToast('تذكير: موعدك بعد ساعة', 'success');
        playReminderSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('تذكير موعد SMILIX', { body: message, tag: reminder.id });
          } catch (e) {
            // Keep the in-page reminder even if the browser blocks system notifications.
          }
        }
      }
      return reminder;
    });
    if (changed) {
      saveReminders(reminders);
      renderNotifications();
    }
  }

  function setupNotifications() {
    notificationBell.addEventListener('click', () => {
      const isOpen = !notificationPanel.hidden;
      notificationPanel.hidden = isOpen;
      notificationBell.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) renderNotifications();
    });

    notificationReadAll.addEventListener('click', () => {
      saveReminders(getReminders().map(reminder => ({ ...reminder, read: true })));
      renderNotifications();
    });

    notificationEnable.addEventListener('click', async () => {
      if (!('Notification' in window)) return;
      try {
        await Notification.requestPermission();
      } finally {
        updateNotificationPermission();
      }
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.notification-wrap')) {
        notificationPanel.hidden = true;
        notificationBell.setAttribute('aria-expanded', 'false');
      }
    });

    renderNotifications();
    checkAppointmentReminders();
    window.setInterval(checkAppointmentReminders, 30000);
  }

  function needsDailyReset() {
    const todayStr = todayKey();
    const lastReset = localStorage.getItem(STORAGE_KEYS.LAST_RESET) || '';
    return lastReset !== todayStr;
  }

  function performDailyResetIfNeeded() {
    if (!needsDailyReset()) return false;
    const bookings = getBookings();
    const todayK = todayKey();
    const today = new Date();
    const filtered = {};
    Object.keys(bookings).forEach(dateKey => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const bookingDate = new Date(y, m - 1, d);
      if (bookingDate >= today) {
        filtered[dateKey] = bookings[dateKey];
      }
    });
    saveBookings(filtered);
    localStorage.setItem(STORAGE_KEYS.LAST_RESET, todayK);
    return true;
  }

  function addBooking(dateKey, time) {
    const bookings = getBookings();
    if (!bookings[dateKey]) bookings[dateKey] = {};
    bookings[dateKey][time] = true;
    saveBookings(bookings);
  }

  function isTimeBooked(dateKey, time) {
    const bookings = getBookings();
    return !!(bookings[dateKey] && bookings[dateKey][time]);
  }

  // ===== GENERATE DATES & TIMES =====
  function generateDates() {
    const dates = [];
    let cursor = new Date();
    let added = 0;
    let guard = 0;
    while (added < DAYS_TO_SHOW && guard < 30) {
      guard++;
      if (cursor.getDay() !== FRIDAY) {
        dates.push(new Date(cursor.getTime()));
        added++;
      }
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  function formatTime(h, m) {
    const period = h < 12 ? 'ص' : 'م';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${padZero(h12)}:${padZero(m)} ${period}`;
  }

  function formatTime24(h, m) {
    return `${padZero(h)}:${padZero(m)}`;
  }

  function generateTimes() {
    const times = [];
    for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        times.push({ h, m, label: formatTime(h, m), value: formatTime24(h, m) });
      }
    }
    return times;
  }

  // ===== RENDER DATE & TIME PICKERS =====
  function renderDates() {
    const dates = generateDates();
    const today = new Date();
    dateScroller.innerHTML = '';
    dates.forEach(date => {
      const key = todayKey(date);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'date-item';
      item.dataset.dateKey = key;

      if (selectedDateInput.value === key) item.classList.add('selected');

      const weekdayIdx = date.getDay();
      const isToday = isSameDay(date, today);

      item.innerHTML = `
        <div class="date-day">${isToday ? 'اليوم' : WEEKDAYS_SHORT[weekdayIdx]}</div>
        <div class="date-num">${date.getDate()}</div>
        <div class="date-month">${MONTHS[date.getMonth()].slice(0, 4)}</div>
      `;

      item.addEventListener('click', () => {
        selectedDateInput.value = key;
        selectedTimeInput.value = '';
        $$('.date-item', dateScroller).forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        renderTimes(key);
      });

      dateScroller.appendChild(item);
    });

    if (dates.length > 0 && !selectedDateInput.value) {
      const firstItem = $('.date-item', dateScroller);
      if (firstItem) firstItem.click();
    }
  }

  function renderTimes(dateKey) {
    const times = generateTimes();
    const now = new Date();
    const todayK = todayKey();
    const isToday = dateKey === todayK;

    timeSlotsEl.innerHTML = '';

    if (!dateKey) {
      timeSlotsEl.innerHTML = '<div class="empty-times">الرجاء اختيار التاريخ أولاً</div>';
      return;
    }

    if (times.length === 0) {
      timeSlotsEl.innerHTML = '<div class="empty-times">لا توجد أوقات متاحة</div>';
      return;
    }

    times.forEach(t => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'time-slot';
      slot.dataset.time = t.value;
      slot.textContent = t.label;

      const booked = isTimeBooked(dateKey, t.value);
      let disabledNow = false;
      if (isToday) {
        const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m);
        disabledNow = slotDate <= now;
      }
      if (booked) {
        slot.classList.add('booked');
        slot.disabled = true;
        slot.title = 'هذا الوقت محجوز';
      } else if (disabledNow) {
        slot.classList.add('disabled');
        slot.disabled = true;
        slot.title = 'انتهى وقت هذا الموعد';
      } else {
        slot.addEventListener('click', () => {
          $$('.time-slot', timeSlotsEl).forEach(el => el.classList.remove('selected'));
          slot.classList.add('selected');
          selectedTimeInput.value = t.value + '|' + t.label;
        });
        if (selectedTimeInput.value.startsWith(t.value + '|')) {
          slot.classList.add('selected');
        }
      }

      timeSlotsEl.appendChild(slot);
    });
  }

  // ===== SCROLL & NAV =====
  function setupScrollHeader() {
    const onScroll = () => {
      if (window.scrollY > 40) header.classList.add('scrolled');
      else header.classList.remove('scrolled');

      if (window.scrollY > 500) scrollTopBtn.classList.add('show');
      else scrollTopBtn.classList.remove('show');

      updateActiveLink();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function updateActiveLink() {
    const sections = ['home', 'services', 'gallery', 'booking', 'contact'];
    const offset = 120;
    let active = sections[0];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top - offset <= 0) {
        active = id;
      }
    });
    $$('.nav-link').forEach(l => {
      const href = l.getAttribute('href');
      if (href === '#' + active) l.classList.add('active');
      else l.classList.remove('active');
    });
  }

  function setupMobileMenu() {
    if (!menuToggle || !navMobile) return;
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navMobile.classList.toggle('open');
      document.body.style.overflow = navMobile.classList.contains('open') ? 'hidden' : '';
    });
    navMobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navMobile.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    navMobile.addEventListener('click', (e) => {
      if (e.target === navMobile) {
        menuToggle.classList.remove('active');
        navMobile.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  function setupScrollTop() {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===== REVEAL ANIMATIONS =====
  function setupReveal() {
    const els = $$('.reveal');
    document.documentElement.classList.add('js-ready');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
  }

  // ===== PARALLAX (LIGHT) =====
  function setupParallax() {
    const heroVisual = $('.hero-visual');
    if (!heroVisual) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 800) {
          const val = y * 0.08;
          heroVisual.style.transform = `translateY(${-val}px)`;
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // ===== BOOKING FORM SUBMIT =====
  function buildWhatsAppMessage(data) {
    const dateParts = data.dateKey.split('-');
    const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    const weekday = WEEKDAYS[dateObj.getDay()];
    const dateFormatted = `${weekday} ${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    const lines = [
      `مرحباً عيادة ${clinicBrand}`,
      '',
      'لدي طلب حجز موعد جديد:',
      '----------------------------------------',
      `الاسم: ${data.name}`,
      `الهاتف: ${data.phone}`,
      `الخدمة: ${data.service}`,
      `التاريخ: ${dateFormatted}`,
      `الوقت: ${data.timeLabel}`,
    ];

    if (data.notes && data.notes.trim()) {
      lines.push(`ملاحظات: ${data.notes.trim()}`);
    }

    lines.push('----------------------------------------');
    lines.push('من موقع SMILIX الرسمي');
    lines.push('شكراً لكم، بانتظار تأكيد الحجز');

    return lines.join('\n');
  }

  function validateForm(data) {
    if (!data.name || data.name.trim().length < 3) {
      showAlert('الرجاء إدخال الاسم الكامل (3 أحرف على الأقل)');
      return false;
    }
    if (!data.phone || data.phone.trim().replace(/[^\d+]/g, '').length < 8) {
      showAlert('الرجاء إدخال رقم هاتف صحيح');
      return false;
    }
    if (!data.service) {
      showAlert('الرجاء اختيار نوع الخدمة المطلوبة');
      return false;
    }
    if (!data.dateKey) {
      showAlert('الرجاء اختيار التاريخ المناسب');
      return false;
    }
    if (!data.timeValue) {
      showAlert('الرجاء اختيار الوقت المناسب');
      return false;
    }
    if (isTimeBooked(data.dateKey, data.timeValue)) {
      showAlert('عذراً، هذا الوقت تم حجزه قبل قليل. الرجاء اختيار وقت آخر.');
      renderTimes(data.dateKey);
      return false;
    }
    return true;
  }

  function setupBookingForm() {
    if (!bookingForm) return;
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal = $('#patientName').value.trim();
      const phoneVal = $('#patientPhone').value.trim();
      const serviceVal = $('#serviceSelect').value;
      const dateVal = selectedDateInput.value;
      const timeParts = (selectedTimeInput.value || '').split('|');
      const timeValue = timeParts[0] || '';
      const timeLabel = timeParts[1] || '';
      const notesVal = $('#patientNotes').value;

      const formData = {
        name: nameVal,
        phone: phoneVal,
        service: serviceVal,
        dateKey: dateVal,
        timeValue,
        timeLabel,
        notes: notesVal,
      };

      if (!validateForm(formData)) {
        bookingForm.classList.add('shake');
        setTimeout(() => bookingForm.classList.remove('shake'), 500);
        return;
      }

      submitBtn.disabled = true;
      $('.btn-text', submitBtn).style.opacity = '0.5';
      $('.btn-loader', submitBtn).style.display = 'inline-block';

      await new Promise(r => setTimeout(r, 700));

      try {
        addBooking(formData.dateKey, formData.timeValue);
        addReminder(formData);
        const msg = buildWhatsAppMessage(formData);
        const encodedMsg = encodeURIComponent(msg);
        const waUrl = `https://wa.me/${clinicWaNumber}?text=${encodedMsg}`;

        submitBtn.disabled = false;
        $('.btn-text', submitBtn).style.opacity = '1';
        $('.btn-loader', submitBtn).style.display = 'none';

        showAlert('تم تجهيز حجزك بنجاح. سيتم فتح واتساب لتأكيد الحجز الآن...', 'success');
        showToast('تم تجهيز الحجز بنجاح!', 'success');

        window.open(waUrl, '_blank', 'noopener,noreferrer');

        renderTimes(formData.dateKey);
        bookingForm.reset();
        selectedTimeInput.value = '';
        $$('.time-slot', timeSlotsEl).forEach(el => el.classList.remove('selected'));

        setTimeout(() => {
          document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);

      } catch (err) {
        console.error(err);
        submitBtn.disabled = false;
        $('.btn-text', submitBtn).style.opacity = '1';
        $('.btn-loader', submitBtn).style.display = 'none';
        showAlert('حدث خطأ أثناء معالجة الحجز. الرجاء المحاولة مرة أخرى.', 'error');
      }
    });
  }

  // ===== WA FLOAT EXTRA CLICK =====
  function setupWAFloat() {
    if (waFloatBtn) {
      waFloatBtn.addEventListener('click', () => {
        showToast('سيتم فتح واتساب الآن...', 'success');
      });
    }
  }

  // ===== SMOOTH SCROLL FOR INTERNAL LINKS =====
  function setupSmoothLinks() {
    $$('a[href^="#"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      a.addEventListener('click', (e) => {
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  // ===== FORM SHAKE ANIMATION =====
  const formShakeStyle = document.createElement('style');
  formShakeStyle.textContent = `
    .shake { animation: _shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes _shake {
      10%, 90% { transform: translate3d(-2px,0,0); }
      20%, 80% { transform: translate3d(4px,0,0); }
      30%, 50%, 70% { transform: translate3d(-8px,0,0); }
      40%, 60% { transform: translate3d(8px,0,0); }
    }
  `;
  document.head.appendChild(formShakeStyle);

  // ===== INIT =====
  function init() {
    recordPageView();
    performDailyResetIfNeeded();
    setupScrollHeader();
    setupMobileMenu();
    setupScrollTop();
    setupReveal();
    setupParallax();
    setupSmoothLinks();
    loadSiteContent().then(listenForSiteUpdates);
    renderDates();
    setupBookingForm();
    setupWAFloat();
    setupNotifications();

    setTimeout(() => {
      const savedReset = localStorage.getItem(STORAGE_KEYS.LAST_RESET);
      if (!savedReset) {
        localStorage.setItem(STORAGE_KEYS.LAST_RESET, todayKey());
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
