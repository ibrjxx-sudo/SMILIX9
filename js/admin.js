(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const loginScreen = $('#loginScreen');
  const adminShell = $('#adminShell');
  const loginForm = $('#loginForm');
  const contentForm = $('#contentForm');
  const serviceList = $('#serviceList');
  const galleryList = $('#galleryList');
  const publishButton = $('#publishButton');
  const LOCAL_MODE = true;
  const LOCAL_CONTENT_KEY = 'smilix-admin-content';
  const GALLERY_CLEARED_KEY = 'smilix-gallery-cleared-v1';
  const ANALYTICS_KEY = 'smilix_site_analytics';
  const REMINDERS_KEY = 'smilix_appointment_reminders';
  const LOCAL_PASSWORD = '119900';
  let content = null;
  let savedContent = null;

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(path, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      });
    } catch (error) {
      throw new Error('تعذر الاتصال بخادم الإدارة. شغّل node server.js وافتح http://127.0.0.1:8080/admin.html.');
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('لوحة الإدارة تحتاج خادم الموقع. شغّل node server.js وافتح http://127.0.0.1:8080/admin.html.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `تعذر إكمال الطلب (${response.status}).`);
    return result;
  }

  function showLogin(message = '') {
    adminShell.hidden = true;
    loginScreen.hidden = false;
    $('#loginMessage').textContent = message;
    $('#adminPassword').focus();
  }

  function showDashboard() {
    loginScreen.hidden = true;
    adminShell.hidden = false;
  }

  function valueAtPath(object, path) {
    return path.split('.').reduce((value, key) => value == null ? '' : value[key], object);
  }

  function assignAtPath(object, path, value) {
    const keys = path.split('.');
    const finalKey = keys.pop();
    const parent = keys.reduce((current, key) => current[key], object);
    parent[finalKey] = value;
  }

  function makeField(labelText, fieldName, value, options = {}) {
    const label = document.createElement('label');
    label.className = `field${options.wide ? ' field-wide' : ''}`;
    const caption = document.createElement('span');
    caption.textContent = labelText;
    const input = document.createElement(options.multiline ? 'textarea' : 'input');
    input.className = 'text-input';
    input.dataset.itemField = fieldName;
    input.value = value || '';
    if (options.multiline) input.rows = 2;
    else input.type = 'text';
    if (options.direction) input.dir = options.direction;
    label.append(caption, input);
    return label;
  }

  function makeFilePicker(labelText, options = {}) {
    const label = document.createElement('label');
    label.className = `field upload-field${options.wide ? ' field-wide' : ''}`;
    const caption = document.createElement('span');
    caption.textContent = labelText;
    const input = document.createElement('input');
    input.className = 'text-input file-input';
    input.type = 'file';
    input.accept = options.accept || 'image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime';
    input.dataset.itemUpload = '';
    label.append(caption, input);
    return label;
  }

  function setMediaPreview(container, url, type = 'image') {
    if (!container) return;
    container.replaceChildren();
    if (!url) {
      container.hidden = true;
      return;
    }
    const media = document.createElement(type === 'video' ? 'video' : 'img');
    media.src = url;
    if (type === 'video') {
      media.controls = true;
      media.preload = 'metadata';
    } else {
      media.alt = 'معاينة الملف';
    }
    container.appendChild(media);
    container.hidden = false;
  }

  function updateBrandPreviews() {
    ['logo', 'favicon'].forEach(field => {
      const url = valueAtPath(content, field);
      const prefix = field === 'logo' ? 'logo' : 'favicon';
      setMediaPreview($(`#${prefix}PreviewWrap`), url, 'image');
    });
  }

  async function uploadFile(file) {
    if (file.size > 35 * 1024 * 1024) throw new Error('حجم الملف يجب ألا يتجاوز 35 ميغابايت.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('تعذرت قراءة الملف من الجهاز.'));
      reader.readAsDataURL(file);
    });
    return api('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ mimeType: file.type, data }),
    });
  }

  async function uploadLocalFile(file) {
    if (file.size > 35 * 1024 * 1024) throw new Error('حجم الملف يجب ألا يتجاوز 35 ميغابايت.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('تعذرت قراءة الملف من الجهاز.'));
      reader.readAsDataURL(file);
    });
    return { url: data };
  }

  function makeCollectionCard(kind, item, index) {
    const card = document.createElement('article');
    card.className = 'collection-card';
    card.dataset.kind = kind;
    if (kind === 'gallery' && item.hidden === true) card.classList.add('is-hidden');
    const number = document.createElement('span');
    number.className = 'collection-index';
    number.textContent = String(index + 1).padStart(2, '0');
    const fields = document.createElement('div');
    fields.className = 'collection-fields';

    if (kind === 'service') {
      fields.append(
        makeField('اسم الخدمة', 'title', item.title),
        makeField('السعر المعروض', 'price', item.price),
        makeField('وصف الخدمة', 'description', item.description, { multiline: true, wide: true }),
      );
    } else {
      fields.append(
        makeField('عنوان الصورة', 'caption', item.caption),
        makeField('النص البديل للصورة', 'alt', item.alt),
        makeField('رابط الصورة أو الفيديو', 'image', item.image, { direction: 'ltr', wide: true }),
      );
      const typeLabel = document.createElement('label');
      typeLabel.className = 'field';
      const typeCaption = document.createElement('span');
      typeCaption.textContent = 'نوع الوسائط';
      const typeSelect = document.createElement('select');
      typeSelect.className = 'text-input';
      typeSelect.dataset.itemField = 'type';
      typeSelect.add(new Option('صورة', 'image'));
      typeSelect.add(new Option('فيديو', 'video'));
      typeSelect.value = item.type === 'video' ? 'video' : 'image';
      typeLabel.append(typeCaption, typeSelect);
      const visibilityLabel = document.createElement('label');
      visibilityLabel.className = 'visibility-field';
      const visibilityInput = document.createElement('input');
      visibilityInput.type = 'checkbox';
      visibilityInput.checked = item.hidden === true;
      visibilityInput.dataset.itemField = 'hidden';
      const visibilityCaption = document.createElement('span');
      visibilityCaption.textContent = 'إخفاء من الموقع';
      visibilityLabel.append(visibilityInput, visibilityCaption);
      fields.append(typeLabel, visibilityLabel, makeFilePicker('رفع صورة أو فيديو من الجهاز', { wide: true }));
      if (item.hidden === true) {
        const hiddenNote = document.createElement('small');
        hiddenNote.className = 'hidden-media-note';
        hiddenNote.textContent = 'مخفي من الموقع، ويظهر هنا للإدارة';
        fields.appendChild(hiddenNote);
      }
      const preview = document.createElement('div');
      preview.className = 'asset-preview gallery-preview';
      preview.dataset.preview = '';
      fields.appendChild(preview);
      setMediaPreview(preview, item.image, item.type);
    }

    const remove = document.createElement('button');
    remove.className = 'remove-button';
    remove.type = 'button';
    remove.dataset.remove = '';
    remove.setAttribute('aria-label', kind === 'service' ? 'حذف الخدمة' : 'حذف الصورة');
    remove.title = kind === 'service' ? 'حذف الخدمة' : 'حذف الصورة';
    const removeIcon = document.createElement('span');
    removeIcon.textContent = '×';
    remove.appendChild(removeIcon);
    if (kind === 'gallery') {
      const removeLabel = document.createElement('span');
      removeLabel.textContent = 'حذف الصورة';
      remove.appendChild(removeLabel);
      remove.classList.add('remove-button-labeled');
    }
    card.append(number, fields, remove);
    return card;
  }

  function renderCollection(list, items, kind) {
    list.replaceChildren();
    (items || []).forEach((item, index) => list.appendChild(makeCollectionCard(kind, item, index)));
    const count = kind === 'service' ? $('#serviceListCount') : $('#galleryListCount');
    count.textContent = `${items.length} ${kind === 'service' ? 'خدمة' : 'ملف'}`;
  }

  function renderEditor() {
    $$('[data-field]').forEach(input => {
      const value = valueAtPath(content, input.dataset.field);
      input.value = value == null ? '' : value;
    });
    renderCollection(serviceList, content.services, 'service');
    renderCollection(galleryList, content.gallery.items, 'gallery');
    $('#serviceCount').textContent = content.services.length;
    $('#galleryCount').textContent = content.gallery.items.length;
    $('#primaryColorPicker').value = content.primaryColor || '#0ea5e9';
    updateBrandPreviews();
    $('#saveStatus').textContent = 'محفوظ محلياً';
    $('#publishMessage').textContent = 'التغييرات تُحفظ في هذا المتصفح وتظهر فيه فقط.';
    renderAnalytics();
  }

  function renderAnalytics() {
    let analytics = {};
    let reminders = [];
    try {
      analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
      const savedReminders = JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
      reminders = Array.isArray(savedReminders) ? savedReminders : [];
    } catch (error) {
      analytics = {};
    }
    const firstDay = new Date();
    firstDay.setDate(firstDay.getDate() - 6);
    const firstDayKey = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const dailyViews = analytics.dailyViews && typeof analytics.dailyViews === 'object' ? analytics.dailyViews : {};
    const weeklyViews = Object.entries(dailyViews).reduce((total, [date, count]) => date >= firstDayKey ? total + (Number(count) || 0) : total, 0);
    $('#analyticsTotalVisits').textContent = Number(analytics.totalViews) || 0;
    $('#analyticsWeeklyVisits').textContent = weeklyViews;
    $('#analyticsBookingCount').textContent = reminders.length;
  }

  function updateCounts() {
    $('#serviceCount').textContent = serviceList.children.length;
    $('#galleryCount').textContent = galleryList.children.length;
    $('#serviceListCount').textContent = `${serviceList.children.length} خدمة`;
    $('#galleryListCount').textContent = `${galleryList.children.length} ملف`;
  }

  function collectItems(list) {
    return $$('.collection-card', list).map(card => {
      const item = {};
      $$('[data-item-field]', card).forEach(input => {
        item[input.dataset.itemField] = input.type === 'checkbox' ? input.checked : input.value.trim();
      });
      return item;
    });
  }

  function collectEditorContent() {
    const nextContent = JSON.parse(JSON.stringify(content));
    $$('[data-field]').forEach(input => assignAtPath(nextContent, input.dataset.field, input.value.trim()));
    nextContent.services = collectItems(serviceList);
    nextContent.gallery.items = collectItems(galleryList);
    return nextContent;
  }

  function persistLocalEditorContent() {
    if (!LOCAL_MODE) return;
    content = collectEditorContent();
    localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(content));
    savedContent = JSON.stringify(content);
  }

  function setActivePanel(name) {
    $$('.panel').forEach(panel => panel.classList.toggle('active', panel.id === `panel-${name}`));
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.panel === name));
    $('#pageTitle').textContent = $(`#panel-${name}`).dataset.title;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(message, error = false) {
    const element = $('#toast');
    element.textContent = message;
    element.style.background = error ? '#9b3f39' : '#183b36';
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2800);
  }

  async function loadContent() {
    if (LOCAL_MODE) {
      try {
        const storedContent = localStorage.getItem(LOCAL_CONTENT_KEY);
        content = storedContent ? JSON.parse(storedContent) : JSON.parse(JSON.stringify(window.SMILIX_LOCAL_CONTENT));
        if (!localStorage.getItem(GALLERY_CLEARED_KEY)) {
          if (content.gallery && Array.isArray(content.gallery.items)) content.gallery.items = [];
          localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(content));
          localStorage.setItem(GALLERY_CLEARED_KEY, 'true');
        }
      } catch (error) {
        content = JSON.parse(JSON.stringify(window.SMILIX_LOCAL_CONTENT));
      }
    } else {
      content = await api('/api/content');
    }
    savedContent = JSON.stringify(content);
    renderEditor();
    showDashboard();
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('.login-submit', loginForm);
    button.disabled = true;
    $('#loginMessage').textContent = '';
    try {
      if (LOCAL_MODE) {
        if ($('#adminPassword').value !== LOCAL_PASSWORD) throw new Error('كلمة المرور غير صحيحة.');
      } else {
        await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#adminPassword').value }) });
      }
      await loadContent();
    } catch (error) {
      $('#loginMessage').textContent = error.message;
    } finally {
      button.disabled = false;
      $('#adminPassword').value = '';
    }
  });

  contentForm.addEventListener('submit', async event => {
    event.preventDefault();
    const nextContent = collectEditorContent();
    publishButton.disabled = true;
    $('#publishMessage').textContent = 'جارٍ حفظ التغييرات…';
    try {
      if (LOCAL_MODE) {
        localStorage.setItem(LOCAL_CONTENT_KEY, JSON.stringify(nextContent));
        content = nextContent;
      } else {
        const result = await api('/api/content', { method: 'PUT', body: JSON.stringify(nextContent) });
        content = result.content;
      }
      savedContent = JSON.stringify(content);
      renderEditor();
      $('#saveStatus').textContent = 'تم الحفظ محلياً';
      $('#publishMessage').textContent = 'حُفظت التغييرات، والموقع المفتوح في هذا المتصفح يتحدث تلقائياً.';
      toast('تم حفظ التغييرات محلياً.');
    } catch (error) {
      $('#publishMessage').textContent = error.message;
      if (error.message.includes('سجّل الدخول')) showLogin(error.message);
      else toast(error.message, true);
    } finally {
      publishButton.disabled = false;
    }
  });

  $('#primaryColorPicker').addEventListener('input', event => {
    $('#primaryColorText').value = event.target.value;
  });
  $('#primaryColorText').addEventListener('input', event => {
    if (/^#[0-9a-f]{6}$/i.test(event.target.value)) $('#primaryColorPicker').value = event.target.value;
  });

  contentForm.addEventListener('change', async event => {
    const fileInput = event.target;
    if (!fileInput.matches('[data-upload-field], [data-item-upload]')) return;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    fileInput.disabled = true;
    $('#publishMessage').textContent = LOCAL_MODE ? 'جارٍ تجهيز الملف…' : 'جارٍ رفع الملف إلى مكتبة الموقع…';
    try {
      const result = await (LOCAL_MODE ? uploadLocalFile(file) : uploadFile(file));
      if (fileInput.dataset.uploadField) {
        const target = $$('[data-field]').find(input => input.dataset.field === fileInput.dataset.uploadField);
        if (!target) throw new Error('تعذر تحديد موضع الملف في الصفحة.');
        target.value = result.url;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const card = fileInput.closest('.collection-card');
        const urlInput = $('[data-item-field="image"]', card);
        const typeSelect = $('[data-item-field="type"]', card);
        urlInput.value = result.url;
        typeSelect.value = file.type.startsWith('video/') ? 'video' : 'image';
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        setMediaPreview($('[data-preview]', card), result.url, typeSelect.value);
      }
      persistLocalEditorContent();
      toast(LOCAL_MODE ? 'تم تجهيز الملف وحفظه محلياً.' : 'تم رفع الملف. احفظ وانشر لإظهاره على الموقع.');
      $('#publishMessage').textContent = LOCAL_MODE ? 'تم تجهيز الملف. احفظ التغييرات لتثبيته.' : 'تم رفع الملف. احفظ وانشر لإظهاره على الموقع.';
    } catch (error) {
      toast(error.message, true);
      $('#publishMessage').textContent = error.message;
    } finally {
      fileInput.disabled = false;
      fileInput.value = '';
    }
  });

  contentForm.addEventListener('input', event => {
    const field = event.target.dataset.field;
    if (field === 'logo' || field === 'favicon') setMediaPreview($(`#${field}PreviewWrap`), event.target.value, 'image');
    if (event.target.dataset.itemField === 'image') {
      const card = event.target.closest('.collection-card');
      const type = $('[data-item-field="type"]', card).value;
      setMediaPreview($('[data-preview]', card), event.target.value, type);
    }
  });

  contentForm.addEventListener('change', event => {
    if (event.target.dataset.itemField !== 'type') return;
    const card = event.target.closest('.collection-card');
    setMediaPreview($('[data-preview]', card), $('[data-item-field="image"]', card).value, event.target.value);
  });

  contentForm.addEventListener('change', event => {
    if (event.target.dataset.itemField !== 'hidden') return;
    persistLocalEditorContent();
    toast(event.target.checked ? 'تم إخفاء الوسائط من الموقع.' : 'تم إظهار الوسائط في الموقع.');
  });

  contentForm.addEventListener('input', event => {
    if (!event.target.matches('[data-field], [data-item-field]')) return;
    $('#saveStatus').textContent = 'توجد تعديلات غير محفوظة';
    $('#publishMessage').textContent = 'احفظ التغييرات لتظهر في هذا المتصفح.';
  });

  $$('.nav-item').forEach(button => button.addEventListener('click', () => setActivePanel(button.dataset.panel)));
  window.addEventListener('storage', event => {
    if (event.key === ANALYTICS_KEY || event.key === REMINDERS_KEY) renderAnalytics();
  });
  $$('[data-go]').forEach(button => button.addEventListener('click', () => setActivePanel(button.dataset.go)));
  $('#addService').addEventListener('click', () => {
    serviceList.appendChild(makeCollectionCard('service', { title: '', description: '', price: '' }, serviceList.children.length));
    updateCounts();
    $('.text-input', serviceList.lastElementChild).focus();
  });
  $('#addGalleryItem').addEventListener('click', () => {
    galleryList.appendChild(makeCollectionCard('gallery', { caption: '', alt: '', image: '', type: 'image' }, galleryList.children.length));
    updateCounts();
    $('.text-input', galleryList.lastElementChild).focus();
  });
  $('#saveGalleryButton').addEventListener('click', () => contentForm.requestSubmit());
  [serviceList, galleryList].forEach(list => list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    button.closest('.collection-card').remove();
    $$('.collection-card', list).forEach((card, index) => { $('.collection-index', card).textContent = String(index + 1).padStart(2, '0'); });
    updateCounts();
    if (list === galleryList && LOCAL_MODE) {
      persistLocalEditorContent();
      toast('تم حذف الوسائط من الموقع ولوحة التحكم.');
    }
  }));
  $('#logoutButton').addEventListener('click', async () => {
    if (LOCAL_MODE) return;
    try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch (error) { /* The local session may already have expired. */ }
    showLogin();
  });

  (async function init() {
    loginScreen.hidden = false;
    if (LOCAL_MODE) {
      showLogin();
      return;
    }
    try {
      await api('/api/admin/session');
      await loadContent();
    } catch (error) {
      showLogin(error.message.includes('تحتاج خادم الموقع') || error.message.includes('تعذر الاتصال') ? error.message : '');
    }
  })();
})();
