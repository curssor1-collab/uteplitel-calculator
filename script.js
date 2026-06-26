// Подавление ошибок от браузерных расширений (адблокеры, VPN и т.п.)
window.addEventListener('unhandledrejection', function(e) {
  if (e.reason && typeof e.reason.message === 'string' &&
      e.reason.message.includes('listener indicated an asynchronous response')) {
    e.preventDefault();
  }
});

// ===== БАЗА ДАННЫХ =====

// Нормы сопротивления теплопередаче по регионам РФ (СП 50.13330.2012)
const REGIONS = [
  { id: 'msk', name: 'Москва', r: 3.06 },
  { id: 'spb', name: 'Санкт-Петербург', r: 3.08 },
  { id: 'nsk', name: 'Новосибирск', r: 3.65 },
  { id: 'ekb', name: 'Екатеринбург', r: 3.51 },
  { id: 'kzn', name: 'Казань', r: 3.36 },
  { id: 'nnv', name: 'Нижний Новгород', r: 3.31 },
  { id: 'krd', name: 'Краснодар', r: 2.44 },
  { id: 'rnd', name: 'Ростов-на-Дону', r: 2.63 },
  { id: 'vld', name: 'Владивосток', r: 3.25 },
  { id: 'mmm', name: 'Мурманск', r: 4.05 },
  { id: 'soc', name: 'Сочи', r: 2.01 },
  { id: 'kry', name: 'Красноярск', r: 3.68 },
  { id: 'smr', name: 'Самара', r: 3.31 },
  { id: 'prm', name: 'Пермь', r: 3.51 },
  { id: 'vrn', name: 'Воронеж', r: 3.09 },
  { id: 'vlg', name: 'Волгоград', r: 2.83 },
  { id: 'ufa', name: 'Уфа', r: 3.48 },
  { id: 'chb', name: 'Челябинск', r: 3.48 },
  { id: 'tmn', name: 'Тюмень', r: 3.51 },
  { id: 'irk', name: 'Иркутск', r: 3.73 }
];

// Материалы стен и их теплопроводность
const WALL_MATERIALS = [
  { id: 'brick-red', name: 'Кирпич красный полнотелый', lambda: 0.7 },
  { id: 'brick-sil', name: 'Кирпич силикатный', lambda: 0.76 },
  { id: 'brick-cer', name: 'Кирпич керамический пустотелый', lambda: 0.52 },
  { id: 'gas-d400', name: 'Газобетон D400', lambda: 0.1 },
  { id: 'gas-d500', name: 'Газобетон D500', lambda: 0.12 },
  { id: 'gas-d600', name: 'Газобетон D600', lambda: 0.14 },
  { id: 'foam-d600', name: 'Пенобетон D600', lambda: 0.14 },
  { id: 'foam-d800', name: 'Пенобетон D800', lambda: 0.21 },
  { id: 'wood', name: 'Дерево (сосна поперёк волокон)', lambda: 0.18 },
  { id: 'glulam', name: 'Брус клеёный', lambda: 0.16 },
  { id: 'frame', name: 'Каркасная стена с утеплителем', lambda: 0.052 },
  { id: 'slag', name: 'Шлакоблок', lambda: 0.6 },
  { id: 'ceramzit', name: 'Керамзитобетон', lambda: 0.55 },
  { id: 'sip', name: 'СИП-панель', lambda: 0.038 }
];

// Утеплители и их теплопроводность
const INSULATIONS = [
  { id: 'min-bazalt', name: 'Минеральная вата (базальтовая)', lambda: 0.04 },
  { id: 'min-glass', name: 'Минеральная вата (стекловата)', lambda: 0.044 },
  { id: 'psbs15', name: 'Пенопласт ПСБ-С 15', lambda: 0.042 },
  { id: 'psbs25', name: 'Пенопласт ПСБ-С 25', lambda: 0.039 },
  { id: 'psbs35', name: 'Пенопласт ПСБ-С 35', lambda: 0.037 },
  { id: 'xps', name: 'Экструдированный пенополистирол (XPS)', lambda: 0.03 },
  { id: 'ppu', name: 'Пенополиуретан (ППУ)', lambda: 0.025 },
  { id: 'ecowool', name: 'Эковата', lambda: 0.04 },
  { id: 'pir', name: 'PIR-плиты', lambda: 0.023 }
];

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function getRegion(id) {
  return REGIONS.find(r => r.id === id);
}

function getWallMaterial(id) {
  return WALL_MATERIALS.find(m => m.id === id);
}

function getInsulation(id) {
  return INSULATIONS.find(i => i.id === id);
}

function roundToStandard(mm) {
  // Стандартные толщины утеплителя: 50, 100, 150, 200 мм
  if (mm <= 0) return 0;
  if (mm <= 50) return 50;
  return Math.ceil(mm / 50) * 50;
}

// ===== ОСНОВНАЯ ФУНКЦИЯ РАСЧЁТА =====

function calculateInsulation(regionId, wallMatId, wallThickness, insulId) {
  // Валидация
  if (!regionId || !wallMatId || !insulId || !wallThickness) {
    return { error: 'Заполните все поля' };
  }

  const thickness = parseFloat(wallThickness);
  if (isNaN(thickness) || thickness < 50 || thickness > 2000) {
    return { error: 'Толщина стены должна быть от 50 до 2000 мм' };
  }

  const region = getRegion(regionId);
  const wallMat = getWallMaterial(wallMatId);
  const insulation = getInsulation(insulId);

  if (!region || !wallMat || !insulation) {
    return { error: 'Ошибка данных. Попробуйте перезагрузить страницу.' };
  }

  // 1. Сопротивление теплопередаче стены
  const wallR = (thickness / 1000) / wallMat.lambda;

  // 2. Требуемое сопротивление по региону
  const requiredR = region.r;

  // 3. Необходимое добавочное сопротивление
  const neededR = requiredR - wallR;

  // 4. Если утеплитель не нужен
  if (neededR <= 0) {
    return {
      isWarm: true,
      message: 'Утеплитель не требуется',
      details: [
        { label: 'Норма сопротивления для региона', value: requiredR.toFixed(3) + ' м²·°C/Вт' },
        { label: 'Сопротивление стены', value: wallR.toFixed(3) + ' м²·°C/Вт' },
        { label: 'Фактическое сопротивление', value: wallR.toFixed(3) + ' м²·°C/Вт' },
        { label: 'Результат', value: 'Стена удовлетворяет нормам' }
      ]
    };
  }

  // 5. Толщина утеплителя
  const insulThicknessM = neededR * insulation.lambda;
  const insulThicknessMM = insulThicknessM * 1000;
  const roundedMM = roundToStandard(insulThicknessMM);

  return {
    isWarm: false,
    rawThickness: insulThicknessMM,
    roundedThickness: roundedMM,
    details: [
      { label: 'Норма сопротивления для региона', value: requiredR.toFixed(3) + ' м²·°C/Вт' },
      { label: 'Сопротивление стены', value: wallR.toFixed(3) + ' м²·°C/Вт' },
      { label: 'Необходимое добавочное сопротивление', value: neededR.toFixed(3) + ' м²·°C/Вт' },
      { label: 'Расчётная толщина утеплителя', value: insulThicknessMM.toFixed(1) + ' мм' },
      { label: 'Рекомендуемая стандартная толщина', value: roundedMM + ' мм' }
    ]
  };
}

// ===== ПОСТРОЕНИЕ ФОРМЫ =====

function populateSelect(selectId, data, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">' + placeholder + '</option>';
  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    sel.appendChild(opt);
  });
}

// ===== ПОКАЗ РЕЗУЛЬТАТА =====

function displayResult(result) {
  const block = document.getElementById('result-block');
  const card = document.getElementById('result-card');
  const errorBlock = document.getElementById('calc-error');

  if (!block) return;

  // Скрываем ошибку
  if (errorBlock) errorBlock.textContent = '';

  if (result.error) {
    if (errorBlock) errorBlock.textContent = result.error;
    block.classList.remove('visible');
    return;
  }

  block.classList.add('visible');

  if (result.isWarm) {
    card.className = 'result-card result-card--warm';
    card.innerHTML = `
      <div class="result-label">Результат расчёта</div>
      <div class="result-value">✅ Утеплитель не нужен</div>
      <div class="result-unit">Ваша стена удовлетворяет нормам теплосопротивления</div>
      <div class="result-standards">Согласно СП 50.13330.2012, дополнительное утепление не требуется</div>
    `;
  } else {
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-label">Необходимая толщина утеплителя</div>
      <div class="result-value">${result.roundedThickness}</div>
      <div class="result-unit">мм</div>
      <div class="result-standards">Стандартный размер: ${result.roundedThickness} мм 
        (расчётное значение: ${result.rawThickness.toFixed(1)} мм)</div>
    `;
  }

  // Подробный расчёт
  const detailsBlock = document.getElementById('result-details');
  if (detailsBlock && result.details) {
    detailsBlock.style.display = 'block';
    detailsBlock.querySelector('h3').textContent = result.isWarm ? 'Параметры расчёта' : 'Подробный расчёт';
    const rows = detailsBlock.querySelector('.detail-rows');
    if (rows) {
      rows.innerHTML = result.details.map(d =>
        '<div class="detail-row"><span class="detail-label">' + d.label + '</span><span class="detail-value">' + d.value + '</span></div>'
      ).join('');
    }
  }

  // Прокрутка к результату
  block.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener('DOMContentLoaded', function() {
  // Заполняем выпадающие списки
  populateSelect('calc-region', REGIONS, '— Выберите регион —');
  populateSelect('calc-wall', WALL_MATERIALS, '— Выберите материал стены —');
  populateSelect('calc-insulation', INSULATIONS, '— Выберите утеплитель —');

  // Обработчик кнопки "Рассчитать"
  const btn = document.getElementById('calc-btn');
  if (btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();

      const region = document.getElementById('calc-region').value;
      const wallMat = document.getElementById('calc-wall').value;
      const wallThick = document.getElementById('calc-thickness').value;
      const insul = document.getElementById('calc-insulation').value;

      // Визуальная валидация
      const fields = [
        { el: document.getElementById('calc-region'), error: 'calc-error-region' },
        { el: document.getElementById('calc-wall'), error: 'calc-error-wall' },
        { el: document.getElementById('calc-thickness'), error: 'calc-error-thickness' },
        { el: document.getElementById('calc-insulation'), error: 'calc-error-insulation' }
      ];

      let hasError = false;
      fields.forEach(f => {
        if (!f.el.value) {
          f.el.classList.add('error');
          const errEl = document.getElementById(f.error);
          if (errEl) errEl.textContent = 'Обязательное поле';
          hasError = true;
        } else {
          f.el.classList.remove('error');
          const errEl = document.getElementById(f.error);
          if (errEl) errEl.textContent = '';
        }
      });

      // Дополнительная проверка толщины
      const thickVal = parseFloat(wallThick);
      if (wallThick && (isNaN(thickVal) || thickVal < 50 || thickVal > 2000)) {
        const thickEl = document.getElementById('calc-thickness');
        thickEl.classList.add('error');
        const errEl = document.getElementById('calc-error-thickness');
        if (errEl) errEl.textContent = 'Введите число от 50 до 2000';
        hasError = true;
      }

      if (hasError) return;

      const result = calculateInsulation(region, wallMat, wallThick, insul);
      displayResult(result);
    });
  }

  // Мобильное меню
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });

    // Закрытие меню при клике на ссылку
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // FAQ аккордеон
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', function() {
      const item = this.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      item.classList.toggle('open');
      this.setAttribute('aria-expanded', !isOpen);
    });
  });

  // Cookie-уведомление
  const cookieNotice = document.getElementById('cookie-notice');
  const cookieBtn = document.getElementById('cookie-accept');

  if (cookieNotice && cookieBtn) {
    if (!localStorage.getItem('cookies_accepted')) {
      setTimeout(function() {
        cookieNotice.classList.add('visible');
      }, 500);
    }

    cookieBtn.addEventListener('click', function() {
      localStorage.setItem('cookies_accepted', 'true');
      cookieNotice.classList.remove('visible');
    });
  }

  // Форма обратной связи (заглушка)
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const msg = document.getElementById('contact-message').value.trim();
      const consent = document.getElementById('contact-consent').checked;

      if (!name || !email || !msg) {
        alert('Пожалуйста, заполните все обязательные поля.');
        return;
      }

      if (!consent) {
        alert('Необходимо дать согласие на обработку персональных данных.');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Пожалуйста, введите корректный email.');
        return;
      }

      alert('Спасибо! Ваше сообщение отправлено. Мы ответим вам в течение 48 часов.');
      contactForm.reset();
    });
  }

  // Обновление года в футере
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
